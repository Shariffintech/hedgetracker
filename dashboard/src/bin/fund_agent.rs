use chrono::{NaiveDate, Utc};
use serde_json::{json, Value};
use std::env;
use std::error::Error;
use std::fs;
use std::path::Path;

fn main() -> Result<(), Box<dyn Error>> {
    let args: Vec<String> = env::args().collect();
    if args.len() != 4 {
        eprintln!("Usage: fund_agent <openbb-intake.json> <reviews.json> <report.json>");
        std::process::exit(2);
    }
    let intake: Value = serde_json::from_str(&fs::read_to_string(&args[1])?)?;
    let reviews: Value = serde_json::from_str(&fs::read_to_string(&args[2])?)?;
    let report = evaluate(&intake, &reviews, Utc::now().date_naive())?;
    if let Some(parent) = Path::new(&args[3]).parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(
        &args[3],
        format!("{}\n", serde_json::to_string_pretty(&report)?),
    )?;
    let count = report["candidates"].as_array().map_or(0, Vec::len);
    println!("Evaluated {count} Form D leads; report: {}", args[3]);
    Ok(())
}

fn field<'a>(item: &'a Value, name: &str) -> &'a str {
    item.get(name).and_then(Value::as_str).unwrap_or("")
}

fn date_age(value: &str, today: NaiveDate) -> Option<i64> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .ok()
        .map(|date| today.signed_duration_since(date).num_days())
}

fn sec_filing(url: &str) -> bool {
    url.starts_with("https://www.sec.gov/Archives/edgar/data/")
        || url.starts_with("https://www.sec.gov/Archives/EDGAR/data/")
}

fn host(url: &str) -> Option<&str> {
    let rest = url.strip_prefix("https://")?;
    let host = rest.split('/').next()?.split(':').next()?;
    if host.is_empty() || !host.contains('.') {
        None
    } else {
        Some(host)
    }
}

fn official_manager_url(url: &str) -> bool {
    match host(url) {
        Some(host) => {
            !host.ends_with(".gov")
                && host != "sec.gov"
                && ![
                    "linkedin.com",
                    "www.linkedin.com",
                    "cryptofundresearch.com",
                    "www.cryptofundresearch.com",
                    "www.youtube.com",
                    "youtube.com",
                ]
                .contains(&host)
        }
        None => false,
    }
}

fn snapshot_contains(review: &Value, excerpt: &str) -> bool {
    let filename = field(review, "snapshotFile");
    if filename.is_empty() || filename.contains('/') || filename.contains('\\') || filename == ".."
    {
        return false;
    }
    let path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../pipeline/evidence")
        .join(filename);
    fs::read_to_string(path).is_ok_and(|text| {
        text.to_ascii_lowercase()
            .contains(&excerpt.to_ascii_lowercase())
    })
}

fn check(name: &str, passed: bool, explanation: &str) -> Value {
    json!({"name": name, "passed": passed, "explanation": explanation})
}

fn evaluate(intake: &Value, reviews: &Value, today: NaiveDate) -> Result<Value, &'static str> {
    let filings = intake["filings"]
        .as_array()
        .ok_or("OpenBB intake must contain a filings array")?;
    let review_rows = reviews["reviews"]
        .as_array()
        .ok_or("Review file must contain a reviews array")?;
    let mut candidates = Vec::new();
    for filing in filings {
        let name = field(filing, "name");
        let cik = field(filing, "cik");
        let url = field(filing, "filingUrl");
        let filing_date = field(filing, "filingDate");
        let form = field(filing, "form");
        let valid_identity = name.len() >= 4
            && !cik.is_empty()
            && cik.len() <= 10
            && cik.bytes().all(|byte| byte.is_ascii_digit());
        let valid_filing = (form == "D" || form == "D/A") && sec_filing(url);
        let recent_filing =
            date_age(filing_date, today).is_some_and(|age| (0..=730).contains(&age));
        let crypto_signal = ["digital asset", "cryptocurrency", "bitcoin", "blockchain"]
            .contains(&field(filing, "matchedQuery").to_ascii_lowercase().as_str());
        let review = review_rows.iter().find(|review| {
            field(review, "cik") == cik && field(review, "fundName").eq_ignore_ascii_case(name)
        });
        let manager_url = review.map_or("", |review| field(review, "managerUrl"));
        let operating_url = review.map_or("", |review| field(review, "operatingUrl"));
        let operating_date = review.map_or("", |review| field(review, "operatingAsOf"));
        let snapshot_date = review.map_or("", |review| field(review, "snapshotFetchedAt"));
        let reviewed_by = review.map_or("", |review| field(review, "reviewedBy"));
        let primary_source = official_manager_url(manager_url)
            && host(manager_url) == host(operating_url)
            && review.is_some_and(|review| field(review, "filingUrl") == url);
        let current_operation = primary_source
            && date_age(operating_date, today).is_some_and(|age| (0..=180).contains(&age))
            && date_age(snapshot_date, today).is_some_and(|age| (0..=14).contains(&age))
            && review.is_some_and(|review| {
                let excerpt = field(review, "operatingExcerpt");
                let lower = excerpt.to_ascii_lowercase();
                snapshot_contains(review, excerpt)
                    && lower.contains(&name.to_ascii_lowercase())
                    && (lower.contains("operating") || lower.contains("open"))
            });
        let human_review = !reviewed_by.trim().is_empty();
        let checks = vec![
            check("stable SEC identity", valid_identity, "Fund name and numeric SEC CIK are required."),
            check("primary Form D filing", valid_filing, "Must link to a Form D filing in SEC EDGAR."),
            check("filing recency", recent_filing, "Filing must be dated within the past two years; recency alone does not prove operation."),
            check("digital asset search signal", crypto_signal, "Matched a digital asset query; this is a lead, not a classification."),
            check("manager source", primary_source, "A reviewer must link a distinct official manager page to this exact SEC filing."),
            check("current operation", current_operation, "A dated manager statement naming this fund must be no more than 180 days old and checked against a page snapshot fetched within 14 days."),
            check("human approval", human_review, "A named reviewer must approve the evidence."),
        ];
        let verified = checks.iter().all(|item| item["passed"] == true);
        let valid_lead = valid_identity && valid_filing && recent_filing && crypto_signal;
        let status = if verified {
            "verified_active"
        } else if valid_lead {
            "needs_review"
        } else {
            "rejected"
        };
        candidates.push(json!({
            "fundName": name,
            "cik": cik,
            "form": form,
            "filingDate": filing_date,
            "filingUrl": url,
            "matchedQuery": field(filing, "matchedQuery"),
            "managerCandidates": filing["adviserMatches"],
            "managerUrl": if primary_source { manager_url } else { "" },
            "operatingAsOf": if current_operation { operating_date } else { "" },
            "snapshotFetchedAt": if current_operation { snapshot_date } else { "" },
            "status": status,
            "checks": checks,
            "note": "Form D and Form ADV do not establish fund-level AUM, NAV, or performance."
        }));
    }
    Ok(json!({
        "mode": "research",
        "source": field(intake, "source"),
        "generatedAt": field(intake, "generatedAt"),
        "sourceErrors": intake["errors"],
        "candidates": candidates
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn today() -> NaiveDate {
        NaiveDate::from_ymd_opt(2026, 10, 13).unwrap()
    }

    fn filing() -> Value {
        json!({"source":"OpenBB SEC provider","generatedAt":"2026-10-13T00:00:00Z","filings":[{
            "name":"Example Digital Asset Fund","cik":"1234567","form":"D",
            "filingDate":"2026-09-01",
            "filingUrl":"https://www.sec.gov/Archives/edgar/data/1234567/example",
            "matchedQuery":"digital asset","adviserMatches":[]
        }]})
    }

    #[test]
    fn filing_is_a_lead_not_active_proof() {
        let output = evaluate(&filing(), &json!({"reviews":[]}), today()).unwrap();
        assert_eq!(output["candidates"][0]["status"], "needs_review");
        assert_eq!(output["candidates"][0]["checks"][5]["passed"], false);
    }

    #[test]
    fn independent_dated_manager_evidence_requires_review() {
        let reviews = json!({"reviews":[{
            "cik":"1234567","fundName":"Example Digital Asset Fund",
            "filingUrl":"https://www.sec.gov/Archives/edgar/data/1234567/example",
            "managerUrl":"https://example-manager.com/funds",
            "operatingUrl":"https://example-manager.com/updates",
            "operatingAsOf":"2026-10-01",
            "operatingExcerpt":"Example Digital Asset Fund is open to qualified investors and operating.",
            "snapshotFile":"example-manager.md",
            "snapshotFetchedAt":"2026-10-12",
            "reviewedBy":"Research reviewer"
        }]});
        let output = evaluate(&filing(), &reviews, today()).unwrap();
        assert_eq!(output["candidates"][0]["status"], "verified_active");
    }

    #[test]
    fn stale_or_third_party_evidence_is_quarantined() {
        let reviews = json!({"reviews":[{
            "cik":"1234567","fundName":"Example Digital Asset Fund",
            "filingUrl":"https://www.sec.gov/Archives/edgar/data/1234567/example",
            "managerUrl":"https://www.linkedin.com/company/example",
            "operatingUrl":"https://www.linkedin.com/posts/example",
            "operatingAsOf":"2025-01-01",
            "operatingExcerpt":"Example Digital Asset Fund is operating.",
            "reviewedBy":"Research reviewer"
        }]});
        let output = evaluate(&filing(), &reviews, today()).unwrap();
        assert_eq!(output["candidates"][0]["status"], "needs_review");
    }
}
