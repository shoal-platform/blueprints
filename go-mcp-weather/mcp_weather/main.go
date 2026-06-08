// Command weather-check is a minimal MCP server with a single weather tool,
// served over Streamable HTTP so it can run as a container on Cloud Run.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

var httpClient = &http.Client{Timeout: 10 * time.Second}

func main() {
	server := mcp.NewServer(&mcp.Implementation{
		Name:    "weather-check",
		Version: "0.1.0",
	}, nil)

	mcp.AddTool(server, &mcp.Tool{
		Name:        "get_weather",
		Description: "Get the current weather for a city by name, e.g. 'London'.",
	}, getWeather)

	// MCP over Streamable HTTP, mounted at /mcp.
	mcpHandler := mcp.NewStreamableHTTPHandler(
		func(*http.Request) *mcp.Server { return server },
		nil,
	)

	mux := http.NewServeMux()
	mux.Handle("/mcp", mcpHandler)
	// Plain health check so you can curl the service and confirm it's up.
	mux.HandleFunc("/", func(w http.ResponseWriter, _ *http.Request) {
		fmt.Fprintln(w, "weather-check ok — MCP endpoint at /mcp")
	})

	// Cloud Run provides the port to listen on via $PORT (default 8080).
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	addr := ":" + port
	log.Printf("listening on %s (MCP at /mcp)", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}

type weatherArgs struct {
	City string `json:"city" jsonschema:"City name to look up, e.g. 'London'"`
}

func getWeather(ctx context.Context, _ *mcp.CallToolRequest, args weatherArgs) (*mcp.CallToolResult, any, error) {
	if args.City == "" {
		return text("Please provide a city."), nil, nil
	}

	// 1. City name -> coordinates (Open-Meteo geocoding, no API key).
	var geo struct {
		Results []struct {
			Name      string  `json:"name"`
			Country   string  `json:"country"`
			Latitude  float64 `json:"latitude"`
			Longitude float64 `json:"longitude"`
		} `json:"results"`
	}
	gq := url.Values{"name": {args.City}, "count": {"1"}, "format": {"json"}}
	if err := getJSON(ctx, "https://geocoding-api.open-meteo.com/v1/search?"+gq.Encode(), &geo); err != nil {
		return text("Lookup failed: " + err.Error()), nil, nil
	}
	if len(geo.Results) == 0 {
		return text(fmt.Sprintf("Couldn't find %q.", args.City)), nil, nil
	}
	loc := geo.Results[0]

	// 2. Coordinates -> current weather.
	var wx struct {
		Current struct {
			Temperature float64 `json:"temperature_2m"`
			Wind        float64 `json:"wind_speed_10m"`
			Code        int     `json:"weather_code"`
		} `json:"current"`
	}
	wq := url.Values{
		"latitude":  {fmt.Sprintf("%g", loc.Latitude)},
		"longitude": {fmt.Sprintf("%g", loc.Longitude)},
		"current":   {"temperature_2m,wind_speed_10m,weather_code"},
	}
	if err := getJSON(ctx, "https://api.open-meteo.com/v1/forecast?"+wq.Encode(), &wx); err != nil {
		return text("Weather fetch failed: " + err.Error()), nil, nil
	}

	out := fmt.Sprintf("%s, %s: %s, %.1f°C, wind %.1f km/h",
		loc.Name, loc.Country, condition(wx.Current.Code), wx.Current.Temperature, wx.Current.Wind)
	return text(out), nil, nil
}

func getJSON(ctx context.Context, endpoint string, v any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return err
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("status %s", resp.Status)
	}
	return json.NewDecoder(resp.Body).Decode(v)
}

func condition(code int) string {
	switch {
	case code == 0:
		return "Clear"
	case code <= 3:
		return "Cloudy"
	case code <= 48:
		return "Fog"
	case code <= 67:
		return "Rain"
	case code <= 77:
		return "Snow"
	case code <= 82:
		return "Showers"
	case code <= 86:
		return "Snow showers"
	default:
		return "Thunderstorm"
	}
}

func text(s string) *mcp.CallToolResult {
	return &mcp.CallToolResult{Content: []mcp.Content{&mcp.TextContent{Text: s}}}
}
