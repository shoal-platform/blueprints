FROM rust:1.99.0-slim-trixie AS build

WORKDIR /app

COPY . .
RUN cargo build --release --locked

# Same Debian release as the build image, so the binary's glibc matches.
FROM debian:trixie-slim

RUN useradd --no-create-home app
COPY --from=build /app/target/release/rust-hello-world /usr/local/bin/rust-hello-world
USER app

ENV PORT=8000
EXPOSE 8000

CMD ["rust-hello-world"]
