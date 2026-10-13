# HedgeTracker

A Rust-backed digital-asset fund research dashboard with a static Vercel build. The directory lists manager-confirmed fund products with linked public filing records. It does not display unsourced fund AUM or performance.

## Run locally

```sh
cd dashboard
cargo run
```

Open http://127.0.0.1:8080. Set `HEDGETRACKER_ADDR` for another address. The Rust server provides `/api/funds`, `/api/discovery`, and `/api/projection`.

## Confirmed fund directory

The three displayed funds were checked against current manager product pages and exact-name public filings on 2026-10-12. [The evidence review](pipeline/evidence/confirmed-funds.md) records the sources. “Confirmed” means fund identity and public manager listing. It does not establish AUM, audited returns, or subscription status. After 14 days, the UI marks source confirmation for recheck.

The main fund cards show manager and strategy. Opening a card reveals manager evidence and filing details. The visual theme uses a dark editorial layout inspired by the supplied quant learning lab reference. Polars prepares the strategy mix chart from the confirmed fund data during the Vercel build.

To rebuild the static site locally:

```sh
python3 -m pip install -r pipeline/requirements-visualization.txt
python3 pipeline/build_public.py
```

Vercel serves `public/` through `vercel.json`. The original API paths also work there: `/api/funds` and `/api/discovery` are rewrites, and `/api/projection` is a Vercel function.

## New fund research pipeline

OpenBB searches recent SEC Form D filings for leads. The Rust `fund_agent` evaluates identities, filing recency, source links, operating evidence, and human review. Leads stay separate from the confirmed directory until manager and filing evidence is checked. The existing [agent runbook](pipeline/AGENT.md) and [weekly GitHub Action](.github/workflows/fund-discovery.yml) describe this process.

To refresh leads:

```sh
python3 -m venv .venv
.venv/bin/pip install openbb-sec==2.0.0
.venv/bin/python pipeline/openbb_discover.py --output dashboard/data/intake.json
cargo run --manifest-path dashboard/Cargo.toml --bin fund_agent -- dashboard/data/intake.json pipeline/reviews.json dashboard/data/discovery.json
```

## Check

```sh
cargo test --manifest-path dashboard/Cargo.toml
cargo fmt --manifest-path dashboard/Cargo.toml --check
python3 pipeline/build_public.py
```
