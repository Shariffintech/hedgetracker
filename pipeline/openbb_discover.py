#!/usr/bin/env python3
"""Collect recent Form D leads and adviser matches with OpenBB's SEC provider.

This is a discovery feed. A filing or adviser match does not establish that a
fund is operating, nor does it provide fund-level AUM or performance.
"""

import argparse
import json
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path


QUERIES = ("digital asset", "cryptocurrency", "bitcoin", "blockchain")


def as_dict(item):
    if hasattr(item, "model_dump"):
        return item.model_dump(mode="json")
    if isinstance(item, dict):
        return item
    return dict(item)


def collect(obb, since, limit):
    filings = {}
    errors = []
    for query in QUERIES:
        try:
            result = obb.sec.full_text_search(
                query=f'"{query}"',
                form_type="D",
                start_date=since,
                limit=100,
                provider="sec",
            )
            for item in result.results:
                row = as_dict(item)
                url = str(row.get("url") or "")
                filing_date = str(row.get("filing_date") or "")
                if not url or filing_date < since:
                    continue
                cik = str(row.get("cik") or "")
                if not cik:
                    continue
                candidate = {
                    "name": row.get("name"),
                    "cik": cik,
                    "form": row.get("form"),
                    "filingDate": filing_date,
                    "filingUrl": url,
                    "description": row.get("description") or "",
                    "matchedQuery": query,
                    "adviserMatches": [],
                }
                if cik not in filings or filing_date > filings[cik]["filingDate"]:
                    filings[cik] = candidate
        except Exception as exc:
            errors.append({"stage": "filing_search", "query": query, "message": str(exc)})

    recent = sorted(filings.values(), key=lambda item: item["filingDate"], reverse=True)[:limit]
    for record in recent:
        name = record["name"]
        if not name:
            continue
        try:
            query = " ".join(name.split()[:2])
            result = obb.sec.adviser_firms(query=query, limit=5, provider="sec")
            record["adviserMatches"] = [
                {
                    "name": row.get("name"),
                    "crd": str(row.get("crd") or ""),
                    "status": row.get("status"),
                    "secNumber": row.get("sec_number"),
                }
                for row in (as_dict(item) for item in result.results)
            ]
        except Exception as exc:
            if "[Empty]" not in str(exc):
                errors.append({"stage": "adviser_search", "name": name, "message": str(exc)})

    return {
        "source": "OpenBB SEC provider",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "since": since,
        "queries": list(QUERIES),
        "filings": recent,
        "errors": errors,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--since", default=(date.today() - timedelta(days=365)).isoformat())
    parser.add_argument("--limit", type=int, default=25)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.limit < 1 or args.limit > 100:
        parser.error("--limit must be between 1 and 100")
    try:
        from openbb import obb
    except ImportError:
        parser.error("OpenBB SEC provider is missing; install with: pip install openbb-sec")
    report = collect(obb, args.since, args.limit)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(report['filings'])} filing leads; {len(report['errors'])} source errors", file=sys.stderr)
    if report["errors"] and not report["filings"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
