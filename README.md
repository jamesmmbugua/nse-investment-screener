# NSE Investment Screener — Version 2

**Bila Data, Huwezi Ukaelewa.**

A transparent NSE stock-screening research dashboard published with GitHub Pages.

## Version 2

Version 2 adds an automated public-data pipeline. The public website remains a static GitHub Pages site deployed directly from the `main` branch.

### Data flow

```
public source adapters
        ↓
GitHub Actions weekday refresh
        ↓
scripts/collect_market_data.py
        ↓
data/stocks.json + update-status.json
        ↓
GitHub Pages dashboard
```

The collector records a source URL, observation date, collection status and data-confidence score. Missing financial metrics are left unavailable rather than invented.

## Automatic refresh

The workflow is:

```
.github/workflows/update-market-data.yml
```

It runs on weekdays after the Nairobi market close and can also be started manually from **Actions → Refresh market data → Run workflow**.

The first manual run is recommended after installing Version 2.

## Source registry

`data/companies.json` controls the company universe and source pages. The collector is intentionally adapter-based rather than an unrestricted internet crawler. This makes provenance and failures auditable and allows official NSE, CMA and issuer-report adapters to be added later.

## Candidate ranking

The dashboard retains three strategies:

- Overall
- Growth
- Income

It combines valuation, profitability, growth, dividend, financial-strength and momentum components. A separate data-confidence score prevents poorly populated records from being presented as strong candidates.

A company with data confidence below 45% is labelled **Insufficient data**.

## GitHub Pages

Use the simple deployment already configured for this repository:

**Settings → Pages → Deploy from a branch → main → / (root)**

No Pages deployment workflow is required.

## Important limitation

Automated collection does not make the underlying web information authoritative. Source pages can change, become unavailable, or report metrics on different accounting periods. Rankings should therefore be interpreted together with source provenance, observation date and company filings.

This project is a research/decision-support tool, not investment advice.
