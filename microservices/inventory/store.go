package main

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pool *pgxpool.Pool
}

type InventoryLevel struct {
	ProductID  int    `json:"product_id"`
	SKU        string `json:"sku"`
	Name       string `json:"name"`
	Supplier   string `json:"supplier"`
	PriceCents int    `json:"price_cents"`
	Stock      int    `json:"stock"`
}

func (s *Store) WaitForSchema(ctx context.Context, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for {
		var ready bool
		err := s.pool.QueryRow(ctx,
			`SELECT to_regclass('public.orders') IS NOT NULL
			    AND to_regclass('public.inventory') IS NOT NULL`).Scan(&ready)
		if err == nil && ready {
			return nil
		}
		if time.Now().After(deadline) {
			if err == nil {
				err = errors.New("tables not created yet")
			}
			return fmt.Errorf("waiting for schema: %w", err)
		}
		time.Sleep(2 * time.Second)
	}
}

func (s *Store) InventoryLevels(ctx context.Context) ([]InventoryLevel, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT p.id::int, p.sku, p.name, p.supplier, p.price_cents,
		        COALESCE(inv.stock, 0)::int
		 FROM products p
		 LEFT JOIN inventory inv ON inv.product_id = p.id
		 ORDER BY p.id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	levels := []InventoryLevel{}
	for rows.Next() {
		var l InventoryLevel
		if err := rows.Scan(&l.ProductID, &l.SKU, &l.Name, &l.Supplier, &l.PriceCents, &l.Stock); err != nil {
			return nil, err
		}
		levels = append(levels, l)
	}
	return levels, rows.Err()
}

// OrderIDs returns the ids of orders currently in the given status.
func (s *Store) OrderIDs(ctx context.Context, status string) ([]int64, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id FROM orders WHERE status = $1 ORDER BY id`, status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// TryReserve attempts to reserve stock for one order. The order row is claimed
// with FOR UPDATE SKIP LOCKED so multiple inventory replicas never process the
// same order twice. Returns the new status ("" when the order was skipped or
// its status did not change).
func (s *Store) TryReserve(ctx context.Context, orderID int64, fromStatus string) (string, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	var claimed int64
	err = tx.QueryRow(ctx,
		`SELECT id FROM orders WHERE id = $1 AND status = $2 FOR UPDATE SKIP LOCKED`,
		orderID, fromStatus).Scan(&claimed)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil // someone else got it, or status changed under us
	}
	if err != nil {
		return "", err
	}

	rows, err := tx.Query(ctx,
		`SELECT i.product_id, i.qty, inv.stock
		 FROM order_items i
		 JOIN inventory inv ON inv.product_id = i.product_id
		 WHERE i.order_id = $1
		 ORDER BY i.product_id
		 FOR UPDATE OF inv`, orderID)
	if err != nil {
		return "", err
	}
	type line struct {
		productID int64
		qty       int
		stock     int
	}
	var lines []line
	inStock := true
	for rows.Next() {
		var l line
		if err := rows.Scan(&l.productID, &l.qty, &l.stock); err != nil {
			rows.Close()
			return "", err
		}
		if l.qty > l.stock {
			inStock = false
		}
		lines = append(lines, l)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return "", err
	}

	newStatus := ""
	if inStock {
		for _, l := range lines {
			if _, err := tx.Exec(ctx,
				`UPDATE inventory SET stock = stock - $2 WHERE product_id = $1`,
				l.productID, l.qty); err != nil {
				return "", err
			}
		}
		newStatus = "confirmed"
	} else if fromStatus == "pending" {
		newStatus = "backordered"
	}
	// A backordered order that still cannot be filled keeps its status and
	// gets no duplicate event.
	if newStatus != "" {
		if err := setStatus(ctx, tx, orderID, newStatus); err != nil {
			return "", err
		}
	}
	return newStatus, tx.Commit(ctx)
}

// Restock simulates a supplier sync: products below the cap get a random
// top-up. The cap keeps stock from growing without bound while idle.
func (s *Store) Restock(ctx context.Context, minUnits, maxUnits, maxStock int) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE inventory
		 SET stock = stock + ($1::int + floor(random() * ($2::int - $1::int + 1)))::int
		 WHERE stock < $3::int`,
		minUnits, maxUnits, maxStock)
	return err
}

// ShipConfirmed marks confirmed orders older than delaySeconds as shipped and
// returns their ids.
func (s *Store) ShipConfirmed(ctx context.Context, delaySeconds int) ([]int64, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	rows, err := tx.Query(ctx,
		`UPDATE orders SET status = 'shipped', updated_at = now()
		 WHERE status = 'confirmed'
		   AND updated_at < now() - make_interval(secs => $1)
		 RETURNING id`, delaySeconds)
	if err != nil {
		return nil, err
	}
	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return nil, err
		}
		ids = append(ids, id)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}
	for _, id := range ids {
		if _, err := tx.Exec(ctx,
			`INSERT INTO order_events (order_id, status) VALUES ($1, 'shipped')`,
			id); err != nil {
			return nil, err
		}
	}
	return ids, tx.Commit(ctx)
}

func setStatus(ctx context.Context, tx pgx.Tx, orderID int64, status string) error {
	if _, err := tx.Exec(ctx,
		`UPDATE orders SET status = $2, updated_at = now() WHERE id = $1`,
		orderID, status); err != nil {
		return err
	}
	_, err := tx.Exec(ctx,
		`INSERT INTO order_events (order_id, status) VALUES ($1, $2)`,
		orderID, status)
	return err
}
