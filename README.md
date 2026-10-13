# HedgeTracker

A Rust-backed digital-asset fund research dashboard with a static Vercel build. Each manager-confirmed product opens a performance study. Fund returns appear only when a dated, fund-specific primary series passes review.

## Run locally

```sh
cd dashboard
cargo run
```

Open http://127.0.0.1:8080. Set `HEDGETRACKER_ADDR` for another address. The Rust server provides `/api/funds`, `/api/discovery`, and `/api/projection`.

## Confirmed fund directory

The three displayed funds were checked against current manager product pages and exact-name public filings on 2026-10-12. [The evidence review](pipeline/evidence/confirmed-funds.md) records the sources. “Confirmed” means fund identity and public manager listing. It does not establish AUM, audited returns, or subscription status. After 14 days, the UI marks source confirmation for recheck.

The performance desk appears before the fund cards. Its BTC-USD price index is explicit market context, based on [Coinbase Exchange daily candles](https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=86400). The Vercel build refreshes completed daily candles and retains the dated snapshot when the provider is unavailable. It is not a fund return. The three confirmed funds currently have no verified public return series, so the coverage indicator reads 0/3. Opening a fund card presents that gap, the manager's strategy, and a secondary historical filing section. Polars validates and prepares the chart data during the Vercel build.

Add fund return observations to `pipeline/performance.json` only with an exact fund ID, share class, net return basis, source type, source URL and date, and at least two dated period returns (`returnPct`). The chart compounds these into an index starting at 100. `pipeline/build_public.py` checks the dates, values, and source domain before publishing. An administrator disclosure also needs its name and evidence URL. A primary document should be reviewed for methodology, fees, and completeness before ingestion.

To rebuild the static site locally:

```sh
python3 -m pip install -r pipeline/requirements-visualization.txt
python3 pipeline/build_public.py
```

Vercel serves `public/` through `vercel.json`. The Research Agent button calls `/api/research`, which rechecks a curated set of manager-owned product pages, verifies any claimed location against a manager source, and ranks up to 25 study candidates by evidence strength. Research candidates stay outside the main directory until their study is reviewed. Regions with no supported candidate remain empty. The original API paths also work there: `/api/funds` and `/api/discovery` are rewrites, and `/api/projection` is a Vercel function. The local Rust server serves a clearly labeled manager-source snapshot for `/api/research`.

## New fund research pipeline

The OpenBB SEC search and Rust filing evaluator remain as optional back-office identity checks. The public research experience uses manager fund pages and performance evidence. The existing [agent runbook](pipeline/AGENT.md) and [weekly GitHub Action](.github/workflows/fund-discovery.yml) document the optional filing review workflow.

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
