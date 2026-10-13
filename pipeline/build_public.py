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
    (DATA / "visualizations.json").write_text(json.dumps(chart_data, indent=2) + "\n")
    (PUBLIC / "data").mkdir(parents=True, exist_ok=True)
    for name in ("index.html", "style.css", "app.js"):
        shutil.copyfile(ROOT / "dashboard" / "src" / name, PUBLIC / name)
    for name in ("funds.json", "discovery.json", "visualizations.json"):
        shutil.copyfile(DATA / name, PUBLIC / "data" / name)


if __name__ == "__main__":
    main()
