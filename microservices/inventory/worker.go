package main

import (
	"context"
	"log"
	"time"
)

type Worker struct {
	store            *Store
	shipDelaySeconds int
}

// RunReserveLoop claims pending orders and reserves stock for them.
func (w *Worker) RunReserveLoop(ctx context.Context, interval time.Duration) {
	for {
		w.reserve(ctx, "pending")
		time.Sleep(interval)
	}
}

// RunRestockLoop periodically simulates a supplier delivery, then retries
// backordered orders against the new stock.
func (w *Worker) RunRestockLoop(ctx context.Context, interval time.Duration) {
	for {
		time.Sleep(interval)
		if err := w.store.Restock(ctx, 5, 20, 200); err != nil {
			log.Printf("restock failed: %v", err)
			continue
		}
		log.Println("restocked all products (simulated supplier sync)")
		w.reserve(ctx, "backordered")
	}
}

// RunShipLoop ships confirmed orders after a simulated fulfillment delay.
func (w *Worker) RunShipLoop(ctx context.Context, interval time.Duration) {
	for {
		ids, err := w.store.ShipConfirmed(ctx, w.shipDelaySeconds)
		if err != nil {
			log.Printf("ship pass failed: %v", err)
		}
		for _, id := range ids {
			log.Printf("order %d shipped", id)
		}
		time.Sleep(interval)
	}
}

func (w *Worker) reserve(ctx context.Context, fromStatus string) {
	ids, err := w.store.OrderIDs(ctx, fromStatus)
	if err != nil {
		log.Printf("listing %s orders failed: %v", fromStatus, err)
		return
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
}
