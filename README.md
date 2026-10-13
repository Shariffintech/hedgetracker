# HedgeTracker

A small Rust web dashboard for exploring illustrative crypto hedge fund data. The server uses only the Rust standard library and serves the dashboard, sample fund API, and a scenario projection API.

## Run

```sh
cd dashboard
cargo run
```

Open [http://127.0.0.1:8080](http://127.0.0.1:8080). Set `HEDGETRACKER_ADDR` to bind a different address, for example `HEDGETRACKER_ADDR=127.0.0.1:8081 cargo run`.

For container hosting, the server listens on `0.0.0.0:$PORT` when `PORT` is set. A root `Dockerfile` is included.

## Features

- Portfolio summary, indexed performance comparison, asset allocation, and fund table
- Scenario modeler with annual compounding
- `GET /api/funds` and `GET /api/projection?principal=10000&annual_return=8&years=5`
- Input validation for projection requests

## Data status

The fund names and figures are sample data. The original repository did not include a working market feed, deployed contract address, or contract interface, so this version does **not** claim to show live performance. Connect a real data source before using it to make investment decisions.

## Check

```sh
cd dashboard
cargo test
cargo fmt --check
```
