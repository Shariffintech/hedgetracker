# Fund discovery agent

The agent's job is to find **traditional digital asset hedge fund leads**, then separate current, fund-specific evidence from old filings and manager-level figures. It never labels a search hit or a Form D filing as an active fund by itself.

## Run sequence

1. Run `openbb_discover.py` to search recent SEC Form D filings through the [OpenBB SEC provider](https://docs.openbb.co/odp/python/reference/sec/full_text_search). It also queries [OpenBB adviser firms](https://docs.openbb.co/odp/python/reference/sec/adviser_firms) for possible manager matches.
2. Run the Rust `fund_agent` evaluator. Inspect `dashboard/data/discovery.json` and its failed checks. The dashboard shows these as leads only.
3. For a promising lead, open its original SEC filing, compare the fund and manager identifiers, and inspect the latest adviser record in [IAPD](https://adviserinfo.sec.gov/) or [OpenBB adviser universe](https://docs.openbb.co/odp/python/reference/sec/adviser_universe). A similar name is not enough to establish a match.
4. Find an official manager page that names the **specific fund** and makes a dated statement that it is operating or open. Save a current page snapshot in `pipeline/evidence/`. Add a review row to `pipeline/reviews.json` with the matching SEC filing URL, manager URL, operating URL, exact excerpt, statement date, snapshot filename and fetch date, and a named human reviewer.
5. Run the evaluator again. It promotes a lead only when every check passes. If evidence is absent, conflicting, stale, or ambiguous, leave it in `needs_review`.

## Claim rules

- SEC Form D confirms that an exempt offering was filed, not that the fund is now operating. The offering's amount sold is not fund AUM.
- OpenBB's Form ADV adviser data describes the adviser. Its regulatory assets under management are not a specific fund's NAV or AUM.
- Never copy a performance, return, or fund AUM figure from a directory, award, adviser aggregate, or search snippet. Such fields need a dated, fund-specific primary disclosure and a separate metric validation step before display.
- Keep the SEC filing URL, source retrieval date, and every failed evaluation in the review report. Do not hide source errors.
- A regulator record or manager page can contain filer errors. Human review is required for a claim of current operation.

Primary source definitions: [SEC Form D datasets](https://www.sec.gov/data-research/sec-markets-data/form-d-data-sets), [SEC adviser reports](https://www.sec.gov/data-research/sec-markets-data/information-about-registered-investment-advisers-exempt-reporting-advisers), [EDGAR API](https://www.sec.gov/search-filings/edgar-application-programming-interfaces).
