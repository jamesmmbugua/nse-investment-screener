# NSE Investment Screener

A static, transparent stock-screening dashboard designed for deployment on **GitHub Pages**.

## What it does

- Loads a demo stock universe or your own CSV.
- Calculates a 0–100 score for each stock.
- Supports three strategies: **Overall**, **Growth**, and **Income**.
- Applies a candidate threshold and liquidity screen.
- Flags up to three top qualifying stocks, but does not force three if fewer pass.
- Provides stock comparison, ranking visualisation, and CSV export.
- Runs entirely in the browser.

## Important

The bundled `data/demo-stocks.json` contains **illustrative demo values**, not verified live market fundamentals. Replace these data before making any financial decision.

## CSV format

Use these columns:

```text
ticker,company,sector,price,pe,pb,eps_growth,revenue_growth,roe,debt_equity,dividend_yield,dividend_consistency,volume,momentum_6m,momentum_12m
```

Example:

```text
ABC,Example Plc,Banking,40.5,7.2,1.1,12.0,9.0,18.0,1.3,5.5,90,250000,8.0,16.0
```

## Scoring method

Metrics are converted to within-universe percentile-style scores.

- Lower is better: P/E, P/B, debt/equity
- Higher is better: ROE, EPS growth, revenue growth, dividend yield, dividend consistency, momentum, volume

Composite category scores are then combined using strategy-specific weights.

### Overall
- Valuation 20%
- Profitability 20%
- Growth 20%
- Dividend 15%
- Financial strength 15%
- Momentum 10%

### Growth
- Valuation 15%
- Profitability 20%
- Growth 30%
- Dividend 5%
- Financial strength 10%
- Momentum 20%

### Income
- Valuation 20%
- Profitability 15%
- Growth 10%
- Dividend 30%
- Financial strength 20%
- Momentum 5%

## Deploy to GitHub Pages

### Option A: GitHub Pages from branch

1. Create a new repository, e.g. `nse-investment-screener`.
2. Upload all files in this project.
3. Commit and push.
4. Open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select `main` and `/ (root)`.
7. Save.

The site will appear at:

```text
https://YOUR-USERNAME.github.io/nse-investment-screener/
```

### Option B: Included GitHub Actions workflow

The included `.github/workflows/pages.yml` can publish the project through GitHub Actions. In repository Pages settings, set the source to **GitHub Actions**.

## Next development stage

A production version should separate:

1. Data acquisition and validation
2. Fundamental-data normalisation
3. Daily price/momentum updates
4. Static JSON generation
5. GitHub Pages presentation

This avoids exposing API credentials in client-side JavaScript.

## Local testing

Because the app loads JSON with `fetch()`, open it through a local web server rather than double-clicking `index.html`.

Python example:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```
