"""Build Vercel's static site and Polars-backed chart datasets."""

from __future__ import annotations

import json
from pathlib import Path
import shutil
from datetime import date
from urllib.parse import urlparse

import polars as pl


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "dashboard" / "data"
PUBLIC = ROOT / "public"


def build_visualizations(funds: dict, discovery: dict) -> dict:
    rows = pl.DataFrame(
        [{"strategy": fund["strategy"], "manager": fund["manager"], "filingYear": fund["filing"]["date"][:4]}
         for fund in funds["funds"]]
    )
    return {
        "source": "Polars 1.34.0",
        "strategyCounts": rows.group_by("strategy").agg(pl.len().alias("count")).sort("strategy").to_dicts(),
        "filingYears": rows.group_by("filingYear").agg(pl.len().alias("count")).sort("filingYear").to_dicts(),
        "managerCount": rows.select(pl.col("manager").n_unique()).item(),
        "fundCount": rows.height,
        "researchLeadCount": len(discovery["candidates"]),
    }


def build_performance(funds: dict, source: dict, market: dict) -> dict:
    known = {fund["id"] for fund in funds["funds"]}
    series = []
    for item in source["series"]:
        assert item["fundId"] in known
        assert item["shareClass"] and item["returnBasis"] == "net"
        assert item["sourceType"] in ("manager", "administrator")
        assert item["sourceDate"] <= date.today().isoformat()
        source_url = urlparse(item["sourceUrl"])
        assert source_url.scheme == "https" and source_url.hostname
        points = pl.DataFrame(item["points"], schema={"date": pl.String, "returnPct": pl.Float64})
        assert points.height >= 2
        assert points.select(pl.col("date").n_unique()).item() == points.height
        assert points.select(pl.col("returnPct").is_finite().all()).item()
        assert all(date.fromisoformat(day) <= date.today() for day in points["date"])
        series.append({**item, "points": points.sort("date").to_dicts()})
    market_rows = pl.DataFrame(market["rows"], schema={"date": pl.String, "closeUsd": pl.Float64}).sort("date")
    assert market_rows.height >= 30
    assert market_rows.select(pl.col("closeUsd").is_finite().all()).item()
    assert market_rows.select((pl.col("closeUsd") > 0).all()).item()
    assert market_rows.select(pl.col("date").n_unique()).item() == market_rows.height
    assert all(date.fromisoformat(day) <= date.today() for day in market_rows["date"])
    return {
        "definition": source["definition"],
        "series": series,
        "benchmark": {"name": "BTC-USD", "source": market["source"], "sourceUrl": market["sourceUrl"], "retrievedAt": market["retrievedAt"], "points": market_rows.to_dicts()},
        "fundCount": len(known),
        "coveredFundCount": len({item["fundId"] for item in series}),
        "preparedWith": "Polars",
    }


def validate_funds(funds: dict) -> None:
    assert funds["mode"] == "manager_confirmed"
    assert date.fromisoformat(funds["verifiedAt"]) <= date.today()
    ids = set()
    for fund in funds["funds"]:
        assert fund["id"] not in ids
        ids.add(fund["id"])
        assert fund["name"] and fund["legalName"] and fund["manager"]
        assert not any(key in fund for key in ("aum", "returnYtd", "change30d", "history"))
        manager = urlparse(fund["managerEvidence"]["url"])
        filing = urlparse(fund["filing"]["url"])
        assert manager.scheme == "https" and manager.hostname
        assert filing.scheme == "https" and filing.hostname == "www.sec.gov"
        assert filing.path.startswith("/Archives/edgar/data/")
        assert fund["filing"]["entity"].casefold() == fund["legalName"].casefold()
        assert date.fromisoformat(fund["filing"]["date"]) <= date.today()
        if "recentFiling" in fund:
            recent = urlparse(fund["recentFiling"]["url"])
            assert recent.scheme == "https" and recent.hostname == "www.sec.gov"
            assert recent.path.startswith("/Archives/edgar/data/")
            assert fund["recentFiling"]["entity"].casefold() == fund["legalName"].casefold()
            assert date.fromisoformat(fund["recentFiling"]["date"]) <= date.today()


def main() -> None:
    funds = json.loads((DATA / "funds.json").read_text())
    discovery = json.loads((DATA / "discovery.json").read_text())
    validate_funds(funds)
    chart_data = build_visualizations(funds, discovery)
    performance = build_performance(funds, json.loads((ROOT / "pipeline" / "performance.json").read_text()), json.loads((ROOT / "pipeline" / "market" / "btc-usd.json").read_text()))
    (DATA / "visualizations.json").write_text(json.dumps(chart_data, indent=2) + "\n")
    (DATA / "performance.json").write_text(json.dumps(performance, indent=2) + "\n")
    (PUBLIC / "data").mkdir(parents=True, exist_ok=True)
    for name in ("index.html", "style.css", "app.js"):
        shutil.copyfile(ROOT / "dashboard" / "src" / name, PUBLIC / name)
    for name in ("funds.json", "discovery.json", "visualizations.json", "performance.json"):
        shutil.copyfile(DATA / name, PUBLIC / "data" / name)


if __name__ == "__main__":
    main()
