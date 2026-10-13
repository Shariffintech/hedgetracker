use chrono::{DateTime, Utc};
use std::env;
use std::fs;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::thread;
use std::time::Duration;

const INDEX: &str = include_str!("index.html");
const STYLE: &str = include_str!("style.css");
const SCRIPT: &str = include_str!("app.js");

fn main() -> std::io::Result<()> {
    let address = env::var("HEDGETRACKER_ADDR").unwrap_or_else(|_| {
        env::var("PORT")
            .map(|port| format!("0.0.0.0:{port}"))
            .unwrap_or_else(|_| "127.0.0.1:8080".into())
    });
    let listener = TcpListener::bind(&address)?;
    println!("HedgeTracker running at http://{address}");
    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                thread::spawn(move || {
                    if let Err(error) = handle(stream) {
                        eprintln!("Request failed: {error}");
                    }
                });
            }
            Err(error) => eprintln!("Connection failed: {error}"),
        }
    }
    Ok(())
}

fn handle(mut stream: TcpStream) -> std::io::Result<()> {
    stream.set_read_timeout(Some(Duration::from_secs(5)))?;
    let mut buffer = [0u8; 8192];
    let count = stream.read(&mut buffer)?;
    let request = String::from_utf8_lossy(&buffer[..count]);
    let first_line = request.lines().next().unwrap_or("");
    let mut parts = first_line.split_whitespace();
    let method = parts.next().unwrap_or("");
    let target = parts.next().unwrap_or("");
    let (path, query) = target.split_once('?').unwrap_or((target, ""));

    let (status, kind, body) = if method != "GET" {
        (
            "405 Method Not Allowed",
            "text/plain; charset=utf-8",
            "Method not allowed".to_string(),
        )
    } else {
        match path {
            "/" => ("200 OK", "text/html; charset=utf-8", INDEX.to_string()),
            "/style.css" => ("200 OK", "text/css; charset=utf-8", STYLE.to_string()),
            "/app.js" => (
                "200 OK",
                "application/javascript; charset=utf-8",
                SCRIPT.to_string(),
            ),
            "/api/funds" => ("200 OK", "application/json; charset=utf-8", funds_json()),
            "/data/funds.json" => ("200 OK", "application/json; charset=utf-8", funds_json()),
            "/data/visualizations.json" => (
                "200 OK",
                "application/json; charset=utf-8",
                include_str!("../data/visualizations.json").to_string(),
            ),
            "/data/performance.json" => (
                "200 OK",
                "application/json; charset=utf-8",
                include_str!("../data/performance.json").to_string(),
            ),
            "/api/research" => ("200 OK", "application/json; charset=utf-8", research_json()),
            "/api/discovery" => {
                let path = env::var("HEDGETRACKER_DISCOVERY_PATH")
                    .unwrap_or_else(|_| "data/discovery.json".to_string());
                match discovery_json(&path, Utc::now()) {
                    Some(data) => ("200 OK", "application/json; charset=utf-8", data),
                    _ => (
                        "503 Service Unavailable",
                        "application/json; charset=utf-8",
                        r#"{"error":"No validated discovery report is available"}"#.to_string(),
                    ),
                }
            }
            "/data/discovery.json" => {
                let path = env::var("HEDGETRACKER_DISCOVERY_PATH")
                    .unwrap_or_else(|_| "data/discovery.json".to_string());
                match discovery_json(&path, Utc::now()) {
                    Some(data) => ("200 OK", "application/json; charset=utf-8", data),
                    _ => (
                        "503 Service Unavailable",
                        "application/json; charset=utf-8",
                        r#"{"error":"No validated discovery report is available"}"#.to_string(),
                    ),
                }
            }
            "/api/projection" => match projection_json(query) {
                Ok(body) => ("200 OK", "application/json; charset=utf-8", body),
                Err(message) => (
                    "400 Bad Request",
                    "application/json; charset=utf-8",
                    format!("{{\"error\":\"{message}\"}}"),
                ),
            },
            _ => (
                "404 Not Found",
                "text/plain; charset=utf-8",
                "Not found".to_string(),
            ),
        }
    };
    let response = format!(
        "HTTP/1.1 {status}\r\nContent-Type: {kind}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n",
        body.len()
    );
    stream.write_all(response.as_bytes())?;
    stream.write_all(body.as_bytes())
}

fn discovery_json(path: &str, now: DateTime<Utc>) -> Option<String> {
    let mut report: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(path).ok()?).ok()?;
    let generated = DateTime::parse_from_rfc3339(report["generatedAt"].as_str()?)
        .ok()?
        .with_timezone(&Utc);
    let age = now.signed_duration_since(generated).num_days();
    let stale = !(-1..=14).contains(&age);
    report["stale"] = serde_json::Value::Bool(stale);
    if stale {
        for candidate in report["candidates"].as_array_mut()? {
            if candidate["status"] == "verified_active" {
                candidate["status"] = serde_json::Value::String("stale_review".into());
            }
        }
    }
    serde_json::to_string(&report).ok()
}

fn funds_json() -> String {
    include_str!("../data/funds.json").to_string()
}

fn research_json() -> String {
    let report: serde_json::Value =
        serde_json::from_str(include_str!("../data/research_sources.json"))
            .expect("reviewed manager source snapshot");
    let candidates: Vec<serde_json::Value> = report["candidates"]
        .as_array()
        .expect("candidate array")
        .iter()
        .take(25)
        .map(|item| {
            serde_json::json!({
                "name": item["name"],
                "manager": item["manager"],
                "region": if item["locationUrl"].is_null() { serde_json::Value::String("Location unverified".into()) } else { item["region"].clone() },
                "managerUrl": item["managerUrl"],
                "status": "manager_confirmed",
                "evidenceScore": if item["locationUrl"].is_null() { 1 } else { 2 },
                "evidence": "Reviewed manager product page names this fund. No dated public fund return series has passed review. Local mode uses the dated source snapshot."
            })
        })
        .collect();
    serde_json::json!({
        "generatedAt": report["reviewedAt"], "target": 25,
        "ranking": "Manager product and location evidence", "candidates": candidates,
        "scans": [],
        "warning": "Local snapshot of reviewed manager sources. The deployed agent rechecks product pages live. No public fund return series passed review."
    })
    .to_string()
}

fn parameter(query: &str, key: &str) -> Option<f64> {
    query
        .split('&')
        .filter_map(|part| part.split_once('='))
        .find_map(|(name, value)| {
            if name == key {
                value.parse::<f64>().ok()
            } else {
                None
            }
        })
}

fn projection_json(query: &str) -> Result<String, &'static str> {
    let principal = parameter(query, "principal").ok_or("principal must be a number")?;
    let annual_return =
        parameter(query, "annual_return").ok_or("annual_return must be a number")?;
    let years = parameter(query, "years").ok_or("years must be a number")?;
    if !principal.is_finite() || !(0.0..=1_000_000_000.0).contains(&principal) {
        return Err("principal must be between 0 and 1000000000");
    }
    if !annual_return.is_finite() || !(-100.0..=100.0).contains(&annual_return) {
        return Err("annual_return must be between -100 and 100");
    }
    if !years.is_finite() || years.fract() != 0.0 || !(1.0..=30.0).contains(&years) {
        return Err("years must be a whole number between 1 and 30");
    }
    let mut points = Vec::with_capacity(years as usize + 1);
    for year in 0..=years as usize {
        let value = principal * (1.0 + annual_return / 100.0).powi(year as i32);
        points.push(format!("{{\"year\":{year},\"value\":{value:.2}}}"));
    }
    Ok(format!("{{\"principal\":{principal},\"annualReturn\":{annual_return},\"years\":{years},\"points\":[{}]}}", points.join(",")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn projection_compounds_annually() {
        let result = projection_json("principal=1000&annual_return=10&years=2").unwrap();
        assert!(result.contains("\"year\":2,\"value\":1210.00"));
    }

    #[test]
    fn projection_rejects_invalid_inputs() {
        assert!(projection_json("principal=-1&annual_return=10&years=2").is_err());
        assert!(projection_json("principal=100&annual_return=NaN&years=2").is_err());
        assert!(projection_json("principal=100&annual_return=10&years=2.5").is_err());
    }

    #[test]
    fn stale_discovery_cannot_claim_active_status() {
        let path = std::env::temp_dir().join(format!(
            "hedgetracker-discovery-{}.json",
            std::process::id()
        ));
        fs::write(
            &path,
            r#"{"generatedAt":"2026-01-01T00:00:00Z","candidates":[{"status":"verified_active"}]}"#,
        )
        .unwrap();
        let now = chrono::DateTime::parse_from_rfc3339("2026-10-13T00:00:00Z")
            .unwrap()
            .with_timezone(&Utc);
        let report = discovery_json(path.to_str().unwrap(), now).unwrap();
        fs::remove_file(path).unwrap();
        assert!(report.contains("\"status\":\"stale_review\""));
        assert!(report.contains("\"stale\":true"));
    }
}
