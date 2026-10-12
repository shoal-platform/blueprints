# Rust Hello World Blueprint

Rust web app blueprint, hosted on [platform201.com](https://platform201.com).

## Stack

- Rust + [Axum](https://github.com/tokio-rs/axum) 0.8 (no database)
- Tokio (async runtime)
- Page and logo are embedded in the binary — no static files to ship

## Usage

```bash
cargo run     # run locally on :8000
cargo test    # run tests
```

```
GET /                      → Hello World page
GET /api/hello?name=Louis  → {"message":"hello, Louis"}
GET /healthz               → {"status":"ok"}
```

## Configuration (env vars)

- `PORT` — listen port (default `8000`).

## Deployment

Add this folder to a container node, attach a gateway, hit deploy!
