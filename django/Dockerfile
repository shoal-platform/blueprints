FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd --no-create-home app
USER app

ENV PORT=8080
EXPOSE 8080

CMD ["/bin/sh", "-c", "exec gunicorn helloworld.wsgi --bind 0.0.0.0:${PORT} --workers 2 --access-logfile -"]
