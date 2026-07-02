package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

type config struct {
	databaseURL      string
	port             int
	shipDelaySeconds int
}

func loadConfig() config {
	_ = godotenv.Load()
	return config{
		databaseURL:      mustEnvStr("DATABASE_URL"),
		port:             envInt("PORT", 8080),
		shipDelaySeconds: envInt("SHIP_DELAY_SECONDS", 10),
	}
}

// redactURL masks the password in a connection string so it is safe to log.
func redactURL(raw string) string {
	u, err := url.Parse(raw)
	if err != nil {
		return "<unparseable>"
	}
	return u.Redacted()
}

func mustEnvStr(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("%s is required", key)
	}
	return v
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

	// Log the resolved config first thing so the port and DB target are
	// visible in the logs before anything can fail (password redacted).
	log.Printf("config: PORT=%d DATABASE_URL=%s", cfg.port, redactURL(cfg.databaseURL))

	pool, err := pgxpool.New(ctx, cfg.databaseURL)
	if err != nil {
		log.Fatalf("failed to create pool: %v", err)
	}
	store := &Store{pool: pool}

	worker := &Worker{store: store, shipDelaySeconds: cfg.shipDelaySeconds}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /inventory-service/healthz", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
	})
	mux.HandleFunc("GET /inventory-service/api/inventory", func(w http.ResponseWriter, r *http.Request) {
		levels, err := store.InventoryLevels(r.Context())
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, levels)
	})
	// The following three are triggered by an external scheduler instead of
	// background loops.
	//
	// Claim pending orders and reserve stock for them.
	mux.HandleFunc("POST /inventory-service/api/reserve", func(w http.ResponseWriter, r *http.Request) {
		if err := worker.Reserve(r.Context()); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"reserved": true})
	})
	// Ship confirmed orders whose fulfillment delay has elapsed.
	mux.HandleFunc("POST /inventory-service/api/ship", func(w http.ResponseWriter, r *http.Request) {
		ids, err := worker.Ship(r.Context())
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string][]int64{"shipped": ids})
	})
	// Simulated supplier restock: top up stock, then retry backordered orders.
	mux.HandleFunc("POST /inventory-service/api/restock", func(w http.ResponseWriter, r *http.Request) {
		if err := worker.Restock(r.Context()); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"restocked": true})
	})

	addr := fmt.Sprintf(":%d", cfg.port)
	log.Printf("inventory service listening on http://localhost%s", addr)
	log.Fatal(http.ListenAndServe(addr, withCORS(mux)))
}
