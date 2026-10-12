//! Hello world web server: an HTML page, a JSON endpoint and a health check.

use std::{env, error::Error, net::SocketAddr};

use axum::{
    Json, Router,
    extract::Query,
    http::{HeaderName, HeaderValue, header},
    middleware,
    response::{Html, IntoResponse, Response},
    routing::get,
};
use serde::{Deserialize, Serialize};
use tokio::{net::TcpListener, signal};
use tower_http::trace::{DefaultMakeSpan, DefaultOnResponse, TraceLayer};
use tracing::Level;

// Embedded at compile time, so the binary needs no files beside it.
const INDEX_HTML: &str = include_str!("../static/index.html");
const LOGO_PNG: &[u8] = include_bytes!("../static/platform201-mark.png");

const DEFAULT_PORT: u16 = 8000;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    tracing_subscriber::fmt().with_max_level(Level::INFO).init();

    let port = parse_port(env::var("PORT").ok().as_deref())?;
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = TcpListener::bind(addr).await?;
    tracing::info!("listening on {addr}");

    axum::serve(listener, app())
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

/// Reads the listen port, defaulting when unset and refusing garbage.
fn parse_port(value: Option<&str>) -> Result<u16, String> {
    let Some(value) = value else {
        return Ok(DEFAULT_PORT);
    };
    value
        .parse()
        .map_err(|_| format!("PORT must be a port number, got {value:?}"))
}

fn app() -> Router {
    Router::new()
        .route("/", get(index))
        .route("/api/hello", get(hello))
        .route("/healthz", get(healthz))
        .route("/static/platform201-mark.png", get(logo))
        .layer(middleware::map_response(security_headers))
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(DefaultMakeSpan::new().level(Level::INFO))
                .on_response(DefaultOnResponse::new().level(Level::INFO)),
        )
}

async fn index() -> Html<&'static str> {
    Html(INDEX_HTML)
}

#[derive(Deserialize)]
struct HelloParams {
    name: Option<String>,
}

#[derive(Serialize)]
struct Message {
    message: String,
}

async fn hello(Query(params): Query<HelloParams>) -> impl IntoResponse {
    let name = params
        .name
        .filter(|name| !name.is_empty())
        .unwrap_or_else(|| "world".to_owned());
    let message = Message {
        message: format!("hello, {name}"),
    };
    // Frontends on other origins (e.g. a Vite blueprint) call this directly.
    ([(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")], Json(message))
}

#[derive(Serialize)]
struct Health {
    status: &'static str,
}

async fn healthz() -> Json<Health> {
    Json(Health { status: "ok" })
}

async fn logo() -> impl IntoResponse {
    (
        [
            (header::CONTENT_TYPE, "image/png"),
            (header::CACHE_CONTROL, "public, max-age=60"),
        ],
        LOGO_PNG,
    )
}

/// Baseline security headers on every response.
async fn security_headers(mut response: Response) -> Response {
    let headers = response.headers_mut();
    headers.insert(header::X_FRAME_OPTIONS, HeaderValue::from_static("DENY"));
    headers.insert(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    );
    headers.insert(
        header::REFERRER_POLICY,
        HeaderValue::from_static("same-origin"),
    );
    headers.insert(
        HeaderName::from_static("cross-origin-opener-policy"),
        HeaderValue::from_static("same-origin"),
    );
    response
}

/// Resolves on Ctrl+C or SIGTERM (what container platforms send on shutdown).
async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c().await.expect("failed to listen for Ctrl+C");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to listen for SIGTERM")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        () = ctrl_c => {},
        () = terminate => {},
    }
}

#[cfg(test)]
mod tests {
    use axum::{
        body::{Body, Bytes},
        http::{Method, Request, StatusCode},
    };
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    use super::*;

    async fn send(method: Method, uri: &str) -> Response {
        let request = Request::builder()
            .method(method)
            .uri(uri)
            .body(Body::empty())
            .unwrap();
        app().oneshot(request).await.unwrap()
    }

    async fn get_ok(uri: &str) -> (Response, Bytes) {
        let response = send(Method::GET, uri).await;
        assert_eq!(response.status(), StatusCode::OK);
        let (parts, body) = response.into_parts();
        let bytes = body.collect().await.unwrap().to_bytes();
        (Response::from_parts(parts, Body::empty()), bytes)
    }

    async fn get_text(uri: &str) -> String {
        let (_, body) = get_ok(uri).await;
        String::from_utf8(body.to_vec()).unwrap()
    }

    #[tokio::test]
    async fn index_renders_hello_world_page() {
        let page = get_text("/").await;

        assert!(page.contains("<h1>Hello World</h1>"));
        assert!(page.contains(r#"href="/api/hello?name=Platform201""#));
    }

    #[tokio::test]
    async fn index_shows_platform201_logo() {
        let page = get_text("/").await;

        assert!(page.contains(r#"src="/static/platform201-mark.png""#));
        assert!(
            page.contains(r#"rel="icon" type="image/png" href="/static/platform201-mark.png""#)
        );
    }

    #[tokio::test]
    async fn hello_defaults_to_world() {
        assert_eq!(
            get_text("/api/hello").await,
            r#"{"message":"hello, world"}"#
        );
    }

    #[tokio::test]
    async fn hello_empty_name_defaults_to_world() {
        assert_eq!(
            get_text("/api/hello?name=").await,
            r#"{"message":"hello, world"}"#
        );
    }

    #[tokio::test]
    async fn hello_greets_name() {
        assert_eq!(
            get_text("/api/hello?name=Louis").await,
            r#"{"message":"hello, Louis"}"#
        );
    }

    #[tokio::test]
    async fn hello_allows_cross_origin_reads() {
        let (response, _) = get_ok("/api/hello").await;

        assert_eq!(response.headers()[header::ACCESS_CONTROL_ALLOW_ORIGIN], "*");
    }

    #[tokio::test]
    async fn hello_rejects_post() {
        let response = send(Method::POST, "/api/hello").await;

        assert_eq!(response.status(), StatusCode::METHOD_NOT_ALLOWED);
    }

    #[tokio::test]
    async fn healthz_reports_ok() {
        assert_eq!(get_text("/healthz").await, r#"{"status":"ok"}"#);
    }

    #[tokio::test]
    async fn healthz_answers_head() {
        let response = send(Method::HEAD, "/healthz").await;

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn logo_is_served_as_png() {
        let (response, body) = get_ok("/static/platform201-mark.png").await;

        assert_eq!(response.headers()[header::CONTENT_TYPE], "image/png");
        assert_eq!(body.as_ref(), LOGO_PNG);
        assert!(body.starts_with(b"\x89PNG\r\n\x1a\n"));
    }

    #[tokio::test]
    async fn responses_carry_security_headers() {
        let (response, _) = get_ok("/").await;

        assert_eq!(response.headers()[header::X_FRAME_OPTIONS], "DENY");
        assert_eq!(
            response.headers()[header::X_CONTENT_TYPE_OPTIONS],
            "nosniff"
        );
        assert_eq!(response.headers()[header::REFERRER_POLICY], "same-origin");
        assert_eq!(
            response.headers()["cross-origin-opener-policy"],
            "same-origin"
        );
    }

    #[tokio::test]
    async fn unknown_path_is_not_found() {
        let response = send(Method::GET, "/missing").await;

        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    #[test]
    fn port_defaults_when_unset() {
        assert_eq!(parse_port(None), Ok(DEFAULT_PORT));
    }

    #[test]
    fn port_reads_value() {
        assert_eq!(parse_port(Some("8080")), Ok(8080));
    }

    #[test]
    fn port_rejects_invalid_values() {
        for value in ["", "abc", "70000", "-1"] {
            assert!(parse_port(Some(value)).is_err(), "accepted {value:?}");
        }
    }
}
