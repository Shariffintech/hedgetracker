"""Build Vercel's static site and Polars-backed chart datasets."""

from __future__ import annotations

import json
from pathlib import Path
import shutil

import polars as pl


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "dashboard" / "data"
PUBLIC = ROOT / "public"


def build_visualizations(funds: dict, discovery: dict) -> dict:
    performance = pl.DataFrame(
        [
            {"fundId": fund["id"], "period": index, "index": value}
            for fund in funds["funds"]
            for index, value in enumerate(fund["history"])
        ]
    ).sort("fundId", "period")
    filings = pl.DataFrame(
        [
            {"month": candidate["filingDate"][:7], "status": candidate["status"]}
            for candidate in discovery["candidates"]
        ],
        schema={"month": pl.String, "status": pl.String},
    )
    monthly = (
        filings.group_by("month")
        .agg(pl.len().alias("count"))
        .sort("month")
        .to_dicts()
    )
    status = (
        filings.group_by("status")
        .agg(pl.len().alias("count"))
        .sort("status")
        .to_dicts()
    )
    return {
        "source": "Polars 1.34.0",
        "performance": performance.to_dicts(),
        "filingsByMonth": monthly,
        "reviewStatus": status,
        "sampleData": True,
    }


def main() -> None:
    funds = json.loads((DATA / "funds.json").read_text())
    discovery = json.loads((DATA / "discovery.json").read_text())
    chart_data = build_visualizations(funds, discovery)
    (DATA / "visualizations.json").write_text(json.dumps(chart_data, indent=2) + "\n")
    (PUBLIC / "data").mkdir(parents=True, exist_ok=True)
    for name in ("index.html", "style.css", "app.js"):
        shutil.copyfile(ROOT / "dashboard" / "src" / name, PUBLIC / name)
    for name in ("funds.json", "discovery.json", "visualizations.json"):
        shutil.copyfile(DATA / name, PUBLIC / "data" / name)


if __name__ == "__main__":
    main()
