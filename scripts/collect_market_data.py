#!/usr/bin/env python3
"""NSE Investment Screener v2 public-data collector.

This collector is deliberately source-adapter based rather than a generic crawler.
It uses public pages, records provenance, tolerates missing values, and never
fabricates unavailable fundamentals.

Current default adapter:
- KenyanStocks company pages for public quote/fundamental fields when available.

The source list is configurable in data/companies.json. Official NSE/CMA and
issuer-report adapters can be added without changing the dashboard.
"""
from __future__ import annotations
import json, re, time
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
UA = "Mozilla/5.0 (compatible; NSE-Investment-Screener/2.0; public research collector)"

def fetch(url: str) -> str:
    req = Request(url, headers={"User-Agent": UA, "Accept": "text/html,application/xhtml+xml"})
    with urlopen(req, timeout=25) as r:
        return r.read().decode("utf-8", errors="replace")

def text_value(html: str, label: str):
    # Conservative parser: only capture a short numeric value close to an explicit label.
    plain = re.sub(r"<[^>]+>", " ", html)
    plain = re.sub(r"\\s+", " ", plain)
    patterns = [
        rf"{re.escape(label)}\\s*[:]?\\s*(?:KES|KSh)?\\s*([-+]?\\d[\\d,]*(?:\\.\\d+)?)\\s*(%)?",
        rf"{re.escape(label)}.*?(?:KES|KSh)?\\s*([-+]?\\d[\\d,]*(?:\\.\\d+)?)\\s*(%)?"
    ]
    for p in patterns:
        m = re.search(p, plain, re.I)
        if m:
            try: return float(m.group(1).replace(",", ""))
            except ValueError: pass
    return None

def pct_change(current, old):
    if current is None or old in (None, 0): return None
    return ((current / old) - 1) * 100

def confidence(row):
    core = ["price","pe","pb","eps_growth","revenue_growth","roe","debt_equity",
            "dividend_yield","dividend_consistency","volume","momentum_6m","momentum_12m"]
    present = sum(row.get(k) is not None for k in core)
    # Price/source provenance are weighted as essential.
    score = round((present / len(core)) * 85)
    if row.get("source_url"): score += 8
    if row.get("observed_date"): score += 7
    return min(score, 100)

def collect_company(c):
    ticker = c["ticker"]
    url = c.get("source_url") or f"https://kenyanstocks.com/stock/nse/{ticker}"
    row = {
        "ticker": ticker, "company": c["company"], "sector": c.get("sector",""),
        "price": None, "pe": None, "pb": None, "eps_growth": None,
        "revenue_growth": None, "roe": None, "debt_equity": None,
        "dividend_yield": None, "dividend_consistency": None, "volume": None,
        "momentum_6m": None, "momentum_12m": None,
        "source_name": c.get("source_name","KenyanStocks"),
        "source_url": url, "observed_date": datetime.now(timezone.utc).date().isoformat()
    }
    try:
        html = fetch(url)
        row["price"] = text_value(html, "Current Price") or text_value(html, "Price")
        row["pe"] = text_value(html, "P/E Ratio") or text_value(html, "P/E")
        row["pb"] = text_value(html, "P/B Ratio") or text_value(html, "Price to Book")
        row["roe"] = text_value(html, "ROE") or text_value(html, "Return on Equity")
        row["debt_equity"] = text_value(html, "Debt to Equity") or text_value(html, "Debt/Equity")
        row["dividend_yield"] = text_value(html, "Dividend Yield")
        row["volume"] = text_value(html, "Volume")
        row["eps_growth"] = text_value(html, "EPS Growth")
        row["revenue_growth"] = text_value(html, "Revenue Growth")
        # Historical fields remain null unless an adapter can verify them.
        row["collection_status"] = "ok"
    except (HTTPError, URLError, TimeoutError, OSError) as e:
        row["collection_status"] = f"failed: {type(e).__name__}"
    row["data_confidence"] = confidence(row)
    return row

def main():
    companies = json.loads((DATA / "companies.json").read_text(encoding="utf-8"))
    previous = {}
    out_path = DATA / "stocks.json"
    if out_path.exists():
        try:
            previous = {r["ticker"]: r for r in json.loads(out_path.read_text(encoding="utf-8"))}
        except Exception:
            previous = {}

    rows=[]
    for i,c in enumerate(companies):
        r=collect_company(c)
        # Do not overwrite previously verified values with nulls after a temporary source failure.
        old=previous.get(r["ticker"], {})
        if r["collection_status"] != "ok" and old:
            for k in ["price","pe","pb","eps_growth","revenue_growth","roe","debt_equity",
                      "dividend_yield","dividend_consistency","volume","momentum_6m","momentum_12m"]:
                if r.get(k) is None: r[k]=old.get(k)
            r["data_confidence"]=confidence(r)
            r["collection_status"] += "; retained prior values"
        rows.append(r)
        time.sleep(0.4)

    DATA.mkdir(exist_ok=True)
    out_path.write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")
    ok=sum(1 for r in rows if r["collection_status"]=="ok")
    status={
        "version":"2.0",
        "updated_at":datetime.now(timezone.utc).isoformat(),
        "successful_records":ok,
        "total_records":len(rows),
        "primary_source":"Public source adapters",
        "message":f"Automated collection completed: {ok}/{len(rows)} source pages retrieved. Missing metrics remain unavailable rather than being estimated."
    }
    (DATA/"update-status.json").write_text(json.dumps(status,indent=2),encoding="utf-8")
    print(status["message"])

if __name__ == "__main__":
    main()
