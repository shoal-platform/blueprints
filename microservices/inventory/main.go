package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

type config struct {
	databaseURL      string
	port             int
	pollInterval     time.Duration
	restockInterval  time.Duration
	shipDelaySeconds int
}

func loadConfig() config {
	_ = godotenv.Load()
	return config{
		databaseURL:      envStr("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/dropship"),
		port:             envInt("PORT", 8082),
		pollInterval:     time.Duration(envInt("POLL_INTERVAL_MS", 2000)) * time.Millisecond,
		restockInterval:  time.Duration(envInt("RESTOCK_INTERVAL_MS", 15000)) * time.Millisecond,
		shipDelaySeconds: envInt("SHIP_DELAY_SECONDS", 10),
	}
}

func envStr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

// The webapp calls this service directly from the browser; demo only, so CORS
// is wide open.
func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func main() {
	cfg := loadConfig()
	ctx := context.Background()

	pool, err := pgxpool.New(ctx, cfg.databaseURL)
	if err != nil {
		log.Fatalf("failed to create pool: %v", err)
	}
	store := &Store{pool: pool}

	// The orders service owns the schema; wait until it has created the tables.
	if err := store.WaitForSchema(ctx, 60*time.Second); err != nil {
		log.Fatalf("schema never appeared: %v", err)
	}
	log.Println("schema ready")

	worker := &Worker{store: store, shipDelaySeconds: cfg.shipDelaySeconds}
	go worker.RunReserveLoop(ctx, cfg.pollInterval)
	go worker.RunRestockLoop(ctx, cfg.restockInterval)
	go worker.RunShipLoop(ctx, cfg.pollInterval)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
	})
	mux.HandleFunc("GET /api/inventory", func(w http.ResponseWriter, r *http.Request) {
		levels, err := store.InventoryLevels(r.Context())
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, levels)
	})

	addr := fmt.Sprintf(":%d", cfg.port)
	log.Printf("inventory service listening on http://localhost%s", addr)
	log.Fatal(http.ListenAndServe(addr, withCORS(mux)))
}
