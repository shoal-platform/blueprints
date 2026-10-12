# Django Hello World Blueprint

Django web app blueprint, hosted on [shoalstack.com](https://shoalstack.com).

## Stack

- Django 6.1 (no database)
- Gunicorn (production server)

## Usage

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
DJANGO_DEBUG=1 python manage.py runserver 8080   # run locally on :8080
python manage.py test                            # run tests
```

```
GET /                      → Hello World page
GET /api/hello?name=Louis  → {"message": "hello, Louis"}
GET /healthz               → {"status": "ok"}
```

## Configuration (env vars)

- `PORT` — listen port (default `8080`).
- `DJANGO_DEBUG` — `1` to enable debug mode. Off by default.
- `DJANGO_SECRET_KEY` — signing key. A random one is generated at startup if unset.
- `DJANGO_ALLOWED_HOSTS` — comma-separated hostnames. Defaults to `*`.

## Deployment

Add this folder to a container node, attach a gateway, hit deploy!
