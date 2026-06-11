package main

import (
	"canvas-backend/canvas"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"
)

const dataFile = "bytes"
const saveInterval = 30 * time.Second

func envInt(key string) int {
	v, _ := strconv.Atoi(os.Getenv(key))
	if(v == 0) {
		return 100
	}
	return v
}

func main() {
	c, err := canvas.Load(dataFile, envInt("CANVAS_SIZE_X"), envInt("CANVAS_SIZE_Y"))
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("canvas loaded")

	ticker := time.NewTicker(saveInterval)
	go func() {
		for range ticker.C {
			if err := c.Save(); err != nil {
				log.Printf("save: %v", err)
			}
		}
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sig
		ticker.Stop()
		c.Save()
		os.Exit(0)
	}()

	http.HandleFunc("GET /canvas/size", func(w http.ResponseWriter, r *http.Request) {
		x, y := c.Size()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(struct {
			X int `json:"x"`
			Y int `json:"y"`
		}{x, y})
	})

	http.HandleFunc("GET /canvas", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/octet-stream")
		w.Write(c.Bytes())
	})

	http.HandleFunc("POST /canvas/set", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Index int  `json:"index"`
			Value byte `json:"value"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}
		if err := c.Set(req.Index, req.Value); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
