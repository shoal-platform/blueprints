# Go Hello World Blueprint

Go HTTP server blueprint, hosted on [shoalstack.com](https://shoalstack.com).

## Stack

- Go standard library (`net/http`)
- No external dependencies

## Usage

```bash
go run .             # run locally on :8080
go build -o server . # build binary
```

```
GET /?name=Louis
→ {"message":"hello, Louis"}
```

## Deployment

Add this folder to a container node, attach a gateway, hit deploy!
