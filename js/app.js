const demoUrl = "data/demo-stocks.json";

const strategies = {
  overall: {
    label: "Overall",
    weights: {
      valuation: 20,
      profitability: 20,
      growth: 20,
      dividend: 15,
      strength: 15,
      momentum: 10
    }
  },
  growth: {
    label: "Growth",
    weights: {
      valuation: 15,
      profitability: 20,
      growth: 30,
      dividend: 5,
      strength: 10,
      momentum: 20
    }
  },
  income: {
    label: "Income",
    weights: {
      valuation: 20,
      profitability: 15,
      growth: 10,
      dividend: 30,
      strength: 20,
      momentum: 5
    }
  }
};

let rawData = [];
let scoredData = [];
let activeStrategy = "overall";
let comparison = [];
let scoreChart = null;

const els = {
  stockCount: document.getElementById("stockCount"),
  strongCount: document.getElementById("strongCount"),
  topScore: document.getElementById("topScore"),
  medianScore: document.getElementById("medianScore"),
  threshold: document.getElementById("threshold"),
  thresholdValue: document.getElementById("thresholdValue"),
  minLiquidity: document.getElementById("minLiquidity"),
  liquidityValue: document.getElementById("liquidityValue"),
  topCandidates: document.getElementById("topCandidates"),
  candidateNote: document.getElementById("candidateNote"),
  rankBody: document.querySelector("#rankTable tbody"),
  searchBox: document.getElementById("searchBox"),
  csvInput: document.getElementById("csvInput"),
  resetData: document.getElementById("resetData"),
  comparison: document.getElementById("comparison"),
  clearCompare: document.getElementById("clearCompare"),
  weights: document.getElementById("weights"),
  exportBtn: document.getElementById("exportBtn"),
  themeToggle: document.getElementById("themeToggle")
};

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function percentileRank(values, value, higherIsBetter = true) {
  const clean = values.filter(v => Number.isFinite(v)).sort((a,b) => a-b);
  if (!clean.length || value === null || !Number.isFinite(value)) return 50;
  const below = clean.filter(v => v < value).length;
  const equal = clean.filter(v => v === value).length;
  let pct = ((below + 0.5 * equal) / clean.length) * 100;
  return higherIsBetter ? pct : 100 - pct;
}

function mean(arr) {
  const valid = arr.filter(Number.isFinite);
  return valid.length ? valid.reduce((a,b)=>a+b,0)/valid.length : 50;
}

function metricArrays(data) {
  const keys = ["pe","pb","eps_growth","revenue_growth","roe","debt_equity","dividend_yield","dividend_consistency","volume","momentum_6m","momentum_12m"];
  const out = {};
  keys.forEach(k => out[k] = data.map(d => num(d[k])).filter(Number.isFinite));
  return out;
}

function scoreStocks(data) {
  const a = metricArrays(data);
  const w = strategies[activeStrategy].weights;

  scoredData = data.map(d => {
    const valuation = mean([
      percentileRank(a.pe, num(d.pe), false),
      percentileRank(a.pb, num(d.pb), false)
    ]);
    const profitability = percentileRank(a.roe, num(d.roe), true);
    const growth = mean([
      percentileRank(a.eps_growth, num(d.eps_growth), true),
      percentileRank(a.revenue_growth, num(d.revenue_growth), true)
    ]);
    const dividend = mean([
      percentileRank(a.dividend_yield, num(d.dividend_yield), true),
      percentileRank(a.dividend_consistency, num(d.dividend_consistency), true)
    ]);
    const strength = percentileRank(a.debt_equity, num(d.debt_equity), false);
    const momentum = mean([
      percentileRank(a.momentum_6m, num(d.momentum_6m), true),
      percentileRank(a.momentum_12m, num(d.momentum_12m), true)
    ]);
    const liquidity = percentileRank(a.volume, num(d.volume), true);

    const total = (
      valuation*w.valuation +
      profitability*w.profitability +
      growth*w.growth +
      dividend*w.dividend +
      strength*w.strength +
      momentum*w.momentum
    ) / 100;

    return {
      ...d,
      componentScores: { valuation, profitability, growth, dividend, strength, momentum, liquidity },
      score: Math.round(total * 10) / 10
    };
  }).sort((x,y)=>y.score-x.score);
}

function statusFor(stock) {
  const t = Number(els.threshold.value);
  const minL = Number(els.minLiquidity.value);
  if (stock.componentScores.liquidity < minL) return "Low liquidity";
  if (stock.score >= t) return "Strong candidate";
  if (stock.score >= t - 8) return "Watchlist";
  return "Review";
}

function format(v, digits=2) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString(undefined,{maximumFractionDigits:digits}) : "—";
}

function topReasons(s) {
  const entries = Object.entries(s.componentScores)
    .filter(([k]) => k !== "liquidity")
    .sort((a,b)=>b[1]-a[1]);
  const labels = {
    valuation:"Attractive valuation relative to loaded universe",
    profitability:"Strong profitability",
    growth:"Strong growth profile",
    dividend:"Strong dividend profile",
    strength:"Favourable balance-sheet strength",
    momentum:"Positive relative momentum"
  };
  return entries.slice(0,3).map(([k])=>labels[k]);
}

function renderSummary() {
  const strong = scoredData.filter(s => statusFor(s) === "Strong candidate");
  const scores = scoredData.map(s=>s.score).sort((a,b)=>a-b);
  const mid = scores.length ? (
    scores.length % 2 ? scores[(scores.length-1)/2] :
    (scores[scores.length/2-1] + scores[scores.length/2])/2
  ) : 0;

  els.stockCount.textContent = scoredData.length;
  els.strongCount.textContent = strong.length;
  els.topScore.textContent = scoredData.length ? scoredData[0].score.toFixed(1) : "—";
  els.medianScore.textContent = scoredData.length ? mid.toFixed(1) : "—";
}

function renderCandidates() {
  const minL = Number(els.minLiquidity.value);
  const threshold = Number(els.threshold.value);
  const eligible = scoredData.filter(s => s.componentScores.liquidity >= minL && s.score >= threshold);
  const top = eligible.slice(0,3);

  els.candidateNote.textContent = eligible.length >= 3
    ? `Top 3 of ${eligible.length} qualifying stocks`
    : `${eligible.length} qualifying stock${eligible.length===1?"":"s"}`;

  if (!top.length) {
    els.topCandidates.innerHTML = `<div class="candidate"><strong>No stock currently passes both filters.</strong><p>Lower the threshold, reduce the liquidity requirement, or review the input data.</p></div>`;
    return;
  }

  els.topCandidates.innerHTML = top.map((s,i)=>`
    <article class="candidate">
      <div class="section-head">
        <div>
          <span class="pill">#${i+1}</span>
          <div class="ticker">${s.ticker}</div>
          <div>${s.company}</div>
        </div>
        <div class="score">${s.score.toFixed(1)}</div>
      </div>
      <div class="bar"><span style="width:${Math.min(100,s.score)}%"></span></div>
      <div><strong>${s.sector}</strong> · Price ${format(s.price)}</div>
      <ul class="reason-list">${topReasons(s).map(r=>`<li>${r}</li>`).join("")}</ul>
    </article>
  `).join("");
}

function renderTable() {
  const q = els.searchBox.value.trim().toLowerCase();
  const rows = scoredData.filter(s => [s.ticker,s.company,s.sector].some(v => String(v).toLowerCase().includes(q)));
  els.rankBody.innerHTML = rows.map((s,idx)=>{
    const status = statusFor(s);
    const statusClass = status === "Strong candidate" ? "status-strong" :
      status === "Watchlist" ? "status-watch" : "status-review";
    const checked = comparison.includes(s.ticker) ? "checked" : "";
    return `<tr>
      <td>${idx+1}</td>
      <td><strong>${s.ticker}</strong></td>
      <td>${s.company}</td>
      <td>${s.sector}</td>
      <td>${format(s.price)}</td>
      <td class="score-cell">${s.score.toFixed(1)}</td>
      <td class="${statusClass}">${status}</td>
      <td><input class="compare-check" type="checkbox" data-ticker="${s.ticker}" ${checked}></td>
    </tr>`;
  }).join("");

  document.querySelectorAll(".compare-check").forEach(cb=>{
    cb.addEventListener("change", e=>{
      const t = e.target.dataset.ticker;
      if (e.target.checked) {
        if (comparison.length >= 3) {
          e.target.checked = false;
          alert("Select up to three stocks.");
          return;
        }
        comparison.push(t);
      } else {
        comparison = comparison.filter(x=>x!==t);
      }
      renderComparison();
    });
  });
}

function renderChart() {
  const ctx = document.getElementById("scoreChart");
  const labels = scoredData.map(s=>s.ticker);
  const values = scoredData.map(s=>s.score);
  if (scoreChart) scoreChart.destroy();
  scoreChart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ label: `${strategies[activeStrategy].label} score`, data: values }] },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { min: 0, max: 100 } }
    }
  });
}

function renderWeights() {
  const w = strategies[activeStrategy].weights;
  const labels = {
    valuation:"Valuation",
    profitability:"Profitability",
    growth:"Growth",
    dividend:"Dividend",
    strength:"Financial strength",
    momentum:"Momentum"
  };
  els.weights.innerHTML = Object.entries(w).map(([k,v])=>`
    <div class="weight-row">
      <div class="line"><span>${labels[k]}</span><strong>${v}%</strong></div>
      <div class="bar"><span style="width:${v*3}%"></span></div>
    </div>
  `).join("");
}

function renderComparison() {
  const selected = comparison.map(t => scoredData.find(s=>s.ticker===t)).filter(Boolean);
  if (!selected.length) {
    els.comparison.innerHTML = `<p>No stocks selected. Tick up to three companies in the ranking table.</p>`;
    return;
  }
  els.comparison.innerHTML = `<div class="compare-grid">${selected.map(s=>`
    <article class="compare-card">
      <h3>${s.ticker} · ${s.score.toFixed(1)}/100</h3>
      <p>${s.company}</p>
      <dl>
        <dt>P/E</dt><dd>${format(s.pe)}</dd>
        <dt>P/B</dt><dd>${format(s.pb)}</dd>
        <dt>ROE</dt><dd>${format(s.roe)}%</dd>
        <dt>EPS growth</dt><dd>${format(s.eps_growth)}%</dd>
        <dt>Revenue growth</dt><dd>${format(s.revenue_growth)}%</dd>
        <dt>Dividend yield</dt><dd>${format(s.dividend_yield)}%</dd>
        <dt>Debt/equity</dt><dd>${format(s.debt_equity)}</dd>
        <dt>6m momentum</dt><dd>${format(s.momentum_6m)}%</dd>
        <dt>12m momentum</dt><dd>${format(s.momentum_12m)}%</dd>
        <dt>Liquidity score</dt><dd>${s.componentScores.liquidity.toFixed(0)}/100</dd>
      </dl>
    </article>
  `).join("")}</div>`;
}

function renderAll() {
  scoreStocks(rawData);
  renderSummary();
  renderCandidates();
  renderTable();
  renderChart();
  renderWeights();
  renderComparison();
}

function parseCsv(text) {
  const lines = text.replace(/\r/g,"").trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(x=>x.trim());
  return lines.slice(1).filter(Boolean).map(line=>{
    // Basic CSV parser suitable for simple, unquoted numeric/company data.
    // For complex quoted fields, pre-clean the CSV or extend this parser.
    const vals = line.split(",").map(x=>x.trim().replace(/^"|"$/g,""));
    const obj = {};
    headers.forEach((h,i)=>obj[h]=vals[i] ?? "");
    return obj;
  });
}

async function loadDemo() {
  const response = await fetch(demoUrl);
  rawData = await response.json();
  comparison = [];
  renderAll();
}

els.csvInput.addEventListener("change", async e=>{
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  const parsed = parseCsv(text);
  if (!parsed.length) {
    alert("No valid rows found in CSV.");
    return;
  }
  rawData = parsed;
  comparison = [];
  renderAll();
});

els.resetData.addEventListener("click", loadDemo);
els.threshold.addEventListener("input", ()=>{
  els.thresholdValue.textContent = els.threshold.value;
  renderSummary(); renderCandidates(); renderTable();
});
els.minLiquidity.addEventListener("input", ()=>{
  els.liquidityValue.textContent = els.minLiquidity.value;
  renderSummary(); renderCandidates(); renderTable();
});
els.searchBox.addEventListener("input", renderTable);

document.querySelectorAll(".strategy").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".strategy").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");
    activeStrategy = btn.dataset.strategy;
    renderAll();
  });
});

els.clearCompare.addEventListener("click", ()=>{
  comparison = [];
  renderTable();
  renderComparison();
});

els.themeToggle.addEventListener("click", ()=>{
  document.body.classList.toggle("dark");
});

els.exportBtn.addEventListener("click", ()=>{
  const header = ["rank","ticker","company","sector","price","score","status"];
  const rows = scoredData.map((s,i)=>[
    i+1, s.ticker, `"${String(s.company).replaceAll('"','""')}"`, `"${String(s.sector).replaceAll('"','""')}"`,
    s.price, s.score, statusFor(s)
  ]);
  const csv = [header.join(","), ...rows.map(r=>r.join(","))].join("\n");
  const blob = new Blob([csv], {type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nse-ranked-${activeStrategy}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

loadDemo();
