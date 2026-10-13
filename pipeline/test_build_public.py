"""Credibility checks for the published fund directory."""

import copy
import json
from pathlib import Path
import unittest

from build_public import build_performance, build_visualizations, validate_funds


DATA = Path(__file__).resolve().parents[1] / "dashboard" / "data"


class ConfirmedFundTests(unittest.TestCase):
    def setUp(self):
        self.funds = json.loads((DATA / "funds.json").read_text())
        self.discovery = json.loads((DATA / "discovery.json").read_text())

    def test_current_directory_has_exact_entity_evidence(self):
        validate_funds(self.funds)
        chart = build_visualizations(self.funds, self.discovery)
        self.assertEqual(chart["fundCount"], 3)
        self.assertEqual(sum(row["count"] for row in chart["strategyCounts"]), 3)

    def test_rejects_wrong_legal_entity_and_fake_performance(self):
        wrong_entity = copy.deepcopy(self.funds)
        wrong_entity["funds"][0]["filing"]["entity"] = "Another fund"
        with self.assertRaises(AssertionError):
            validate_funds(wrong_entity)
        fake_return = copy.deepcopy(self.funds)
        fake_return["funds"][0]["returnYtd"] = 20
        with self.assertRaises(AssertionError):
            validate_funds(fake_return)

    def test_performance_requires_fund_specific_primary_series(self):
        source = json.loads((DATA.parents[1] / "pipeline" / "performance.json").read_text())
        market = json.loads((DATA.parents[1] / "pipeline" / "market" / "btc-usd.json").read_text())
        built = build_performance(self.funds, source, market)
        self.assertEqual(built["coveredFundCount"], 0)
        self.assertGreaterEqual(len(built["benchmark"]["points"]), 30)
        bad = copy.deepcopy(source)
        bad["series"] = [{"fundId": "pantera-liquid", "shareClass": "A", "returnBasis": "gross", "sourceType": "manager", "sourceDate": "2026-10-12", "sourceUrl": "https://panteracapital.com/", "points": [{"date": "2026-09-01", "returnPct": 1.0}, {"date": "2026-10-01", "returnPct": 2.0}]}]
        with self.assertRaises(AssertionError):
            build_performance(self.funds, bad, market)


if __name__ == "__main__":
    unittest.main()
