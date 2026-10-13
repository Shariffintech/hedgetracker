# HedgeTracker

A small Rust web dashboard for exploring illustrative crypto hedge fund data. The server uses only the Rust standard library and serves the dashboard, sample fund API, and a scenario projection API.

## Run

```sh
cd dashboard
cargo run
```

Open [http://127.0.0.1:8080](http://127.0.0.1:8080). Set `HEDGETRACKER_ADDR` to bind a different address, for example `HEDGETRACKER_ADDR=127.0.0.1:8081 cargo run`.

For container hosting, the server listens on `0.0.0.0:$PORT` when `PORT` is set. A root `Dockerfile` is included.

## Vercel deployment and Polars charts

Vercel serves the generated `public/` directory. The root `vercel.json` installs Polars and runs `pipeline/build_public.py` at build time, so `/`, `/app.js`, `/style.css`, and `/data/*.json` resolve as static assets. The Rust server continues to serve the same dashboard locally. The scenario calculator runs in the browser for static hosting; the Rust `/api/projection` endpoint remains available locally.

Polars turns the labeled sample performance histories into chart points and aggregates recent SEC filing leads by month and review status. These datasets are in `public/data/visualizations.json`. The sample portfolio figures are still illustrative, and Form D lead counts do not imply current fund operation.

To rebuild the static site locally:

```sh
python3 -m pip install -r pipeline/requirements-visualization.txt
python3 pipeline/build_public.py
```

## Features

- Portfolio summary, indexed performance comparison, asset allocation, and fund table
- Scenario modeler with annual compounding
- `GET /api/funds` and `GET /api/projection?principal=10000&annual_return=8&years=5`
- Input validation for projection requests

## Data status

The portfolio fund names and figures are sample data. The original repository did not include a working market feed, deployed contract address, or contract interface, so this version does **not** claim to show live performance. Connect a real data source before using it to make investment decisions.

## Fund discovery pipeline

The **Discovery** panel is a research queue, separate from the sample portfolio. It shows recent SEC Form D filings found through [OpenBB's SEC search](https://docs.openbb.co/odp/python/reference/sec/full_text_search). A Form D filing is an offering notice, not proof that a fund is currently operating. The dashboard shows no fund performance or fund AUM from these filings.

To refresh the queue locally:

```sh
python3 -m venv .venv
.venv/bin/pip install openbb-sec==2.0.0
.venv/bin/python pipeline/openbb_discover.py --output dashboard/data/intake.json
cargo run --manifest-path dashboard/Cargo.toml --bin fund_agent -- dashboard/data/intake.json pipeline/reviews.json dashboard/data/discovery.json
```

The [agent runbook](pipeline/AGENT.md) describes the source checks and review gate. The [weekly GitHub Action](.github/workflows/fund-discovery.yml) produces a downloadable intake and evaluation report; it does not silently add candidates to the tracked sample portfolio. OpenBB adviser matches are possible leads only. See [OpenBB adviser data](https://docs.openbb.co/odp/python/reference/sec/adviser_universe) and [SEC Form D data caveats](https://www.sec.gov/data-research/sec-markets-data/form-d-data-sets).

## Check

```sh
cd dashboard
cargo test
cargo fmt --check
```
