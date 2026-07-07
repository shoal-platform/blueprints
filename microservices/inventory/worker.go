package main

import (
	"context"
	"log"
)

type Worker struct {
	store            *Store
	shipDelaySeconds int
}

// Reserve claims pending orders and reserves stock for them. Triggered by an
// external scheduler.
func (w *Worker) Reserve(ctx context.Context) error {
	return w.reserve(ctx, "pending")
}

// Restock simulates a supplier delivery, then retries backordered orders
// against the new stock. Triggered by an external scheduler.
func (w *Worker) Restock(ctx context.Context) error {
	if err := w.store.Restock(ctx, 5, 20, 200); err != nil {
		return err
	}
	log.Println("restocked all products (simulated supplier sync)")
	return w.reserve(ctx, "backordered")
}

// Ship ships confirmed orders whose simulated fulfillment delay has elapsed.
// Triggered by an external scheduler. Returns the shipped order IDs.
func (w *Worker) Ship(ctx context.Context) ([]int64, error) {
	ids, err := w.store.ShipConfirmed(ctx, w.shipDelaySeconds)
	if err != nil {
		return nil, err
	}
	for _, id := range ids {
		log.Printf("order %d shipped", id)
	}
	return ids, nil
}

func (w *Worker) reserve(ctx context.Context, fromStatus string) error {
	ids, err := w.store.OrderIDs(ctx, fromStatus)
	if err != nil {
		return err
	}
	for _, id := range ids {
		newStatus, err := w.store.TryReserve(ctx, id, fromStatus)
		if err != nil {
			log.Printf("reserving order %d failed: %v", id, err)
			continue
		}
		if newStatus != "" {
			log.Printf("order %d: %s -> %s", id, fromStatus, newStatus)
		}
	}
	return nil
}
