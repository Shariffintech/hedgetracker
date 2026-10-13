import unittest
from types import SimpleNamespace

from openbb_discover import collect


class FakeSec:
    def full_text_search(self, **_kwargs):
        return SimpleNamespace(
            results=[
                {
                    "name": "Old Digital Fund",
                    "cik": "10",
                    "form": "D",
                    "filing_date": "2024-01-01",
                    "url": "https://www.sec.gov/old",
                },
                {
                    "name": "Example Digital Fund",
                    "cik": "20",
                    "form": "D",
                    "filing_date": "2026-01-01",
                    "url": "https://www.sec.gov/first",
                },
                {
                    "name": "Example Digital Fund",
                    "cik": "20",
                    "form": "D/A",
                    "filing_date": "2026-09-01",
                    "url": "https://www.sec.gov/latest",
                },
            ]
        )

    def adviser_firms(self, **_kwargs):
        return SimpleNamespace(results=[])


class DiscoveryTests(unittest.TestCase):
    def test_filters_old_filings_and_keeps_latest_per_cik(self):
        report = collect(SimpleNamespace(sec=FakeSec()), "2025-10-13", 10)
        self.assertEqual(len(report["filings"]), 1)
        self.assertEqual(report["filings"][0]["filingUrl"], "https://www.sec.gov/latest")
        self.assertEqual(report["errors"], [])


if __name__ == "__main__":
    unittest.main()
