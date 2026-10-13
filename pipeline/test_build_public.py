"""Credibility checks for the published fund directory."""

import copy
import json
from pathlib import Path
import unittest

from build_public import build_visualizations, validate_funds


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


if __name__ == "__main__":
    unittest.main()
