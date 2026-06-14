# Postman collection

Import both files into Postman:

- `bitcoin-scheduler.postman_collection.json` — the requests.
- `local.postman_environment.json` — `baseUrl` + `schedulerToken` for local runs.

Then select the **Bitcoin Scheduler - Local** environment. Edit `baseUrl` to
point at a deployed Cloud Run URL, and set `schedulerToken` only if the service
runs with `SCHEDULER_TOKEN` set.

## Requests

| Request | Maps to |
| --- | --- |
| Health check | `GET /healthz` |
| Fetch price (scheduler target) | `POST /tasks/fetch-price` |
| Latest price | `GET /api/prices/latest` |
| Prices over range (raw) | `GET /api/prices?start=&end=` |
| Prices over range (bucketed) | `GET /api/prices?start=&end=&bucket=hour` |
