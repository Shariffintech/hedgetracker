const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
const colors = ['#08b899', '#4979c6', '#e3aa4e'];
const assetColors = { BTC: '#08b899', ETH: '#4979c6', SOL: '#e3aa4e', Stablecoins: '#9ab0be' };
const byId = id => document.getElementById(id);

function lineChart(series, width = 600, height = 205) {
  const all = series.flatMap(item => item.values);
  const min = Math.floor((Math.min(...all) - 2) / 5) * 5;
  const max = Math.ceil((Math.max(...all) + 2) / 5) * 5;
  const pad = 12;
  const x = i => pad + i * (width - 2 * pad) / (series[0].values.length - 1);
  const y = value => height - pad - (value - min) * (height - 2 * pad) / (max - min || 1);
  const grid = [0, 1, 2, 3].map(i => {
    const pos = pad + i * (height - 2 * pad) / 3;
    return `<line class="chart-grid" x1="0" y1="${pos}" x2="${width}" y2="${pos}"/>`;
  }).join('');
  const lines = series.map(item => {
    const points = item.values.map((value, i) => `${x(i)},${y(value)}`).join(' ');
    return `<polyline class="chart-line" points="${points}" stroke="${item.color}"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">${grid}${lines}</svg>`;
}

function renderFunds(data) {
  const funds = data.funds;
  const sum = key => funds.reduce((total, fund) => total + fund[key], 0);
  byId('total-aum').textContent = money(sum('aum'));
  byId('fund-count').textContent = funds.length;
  byId('average-return').textContent = (sum('returnYtd') / funds.length).toFixed(1) + '%';
  byId('average-change').textContent = '+' + (sum('change30d') / funds.length).toFixed(1) + '%';
  byId('performance-chart').innerHTML = lineChart(funds.map((fund, i) => ({ values: fund.history, color: colors[i] })));
  const legend = byId('chart-legend');
  funds.forEach((fund, i) => {
    const item = document.createElement('span');
    const dot = document.createElement('i');
    dot.style.background = colors[i];
    item.append(dot, document.createTextNode(fund.name));
    legend.append(item);
  });
  const select = byId('fund-select');
  funds.forEach(fund => {
    const option = document.createElement('option');
    option.value = fund.id;
    option.textContent = fund.name;
    select.append(option);
  });
  function renderAllocation() {
    const fund = funds.find(item => item.id === select.value);
    const bars = byId('allocation-bars');
    bars.replaceChildren();
    Object.entries(fund.allocation).forEach(([asset, share]) => {
      const row = document.createElement('div');
      row.className = 'allocation-row';
      const name = document.createElement('span');
      name.textContent = asset;
      const track = document.createElement('div');
      track.className = 'bar-track';
      const fill = document.createElement('div');
      fill.className = 'bar-fill';
      fill.style.width = share + '%';
      fill.style.background = assetColors[asset];
      track.append(fill);
      const percent = document.createElement('b');
      percent.textContent = share + '%';
      row.append(name, track, percent);
      bars.append(row);
    });
  }
  select.addEventListener('change', renderAllocation);
  renderAllocation();
  const rows = byId('fund-rows');
  funds.forEach(fund => {
    const row = document.createElement('tr');
    const cells = [
      fund.name, fund.strategy, money(fund.aum),
      '+' + fund.returnYtd.toFixed(1) + '%',
      '+' + fund.change30d.toFixed(1) + '%', fund.risk
    ];
    cells.forEach((value, i) => {
      const cell = document.createElement('td');
      if (i === 0) {
        const icon = document.createElement('span');
        icon.className = 'fund-icon';
        icon.textContent = fund.name[0];
        cell.append(icon);
      }
      if (i === 3 || i === 4) cell.className = 'positive';
      if (i === 5) {
        const badge = document.createElement('span');
        badge.className = 'risk';
        badge.textContent = value;
        cell.append(badge);
      } else cell.append(document.createTextNode(value));
      row.append(cell);
    });
    rows.append(row);
  });
}

async function calculate(event) {
  if (event) event.preventDefault();
  const form = byId('projection-form');
  const query = new URLSearchParams(new FormData(form));
  const error = byId('projection-error');
  error.textContent = '';
  try {
    const response = await fetch('/api/projection?' + query);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Projection failed');
    byId('projected-value').textContent = money(result.points.at(-1).value);
    byId('projection-chart').innerHTML = lineChart([{ values: result.points.map(point => point.value), color: colors[0] }], 360, 85);
    byId('projection-chart').setAttribute('aria-label', `Projected value from ${money(result.principal)} to ${money(result.points.at(-1).value)} over ${result.years} years`);
  } catch (cause) {
    error.textContent = cause.message;
  }
}

async function renderDiscovery() {
  const list = byId('discovery-list');
  try {
    const response = await fetch('/api/discovery');
    if (!response.ok) throw new Error('No discovery report is available yet.');
    const report = await response.json();
    const candidates = report.candidates || [];
    if (report.sourceErrors && report.sourceErrors.length) {
      byId('discovery-source-errors').textContent = `${report.sourceErrors.length} source queries failed. See the discovery report before reviewing these leads.`;
    }
    if (report.stale) {
      byId('discovery-source-errors').textContent += ' This report is older than 14 days; active status has been withdrawn pending refresh.';
    }
    const verified = candidates.filter(item => item.status === 'verified_active').length;
    byId('discovery-count').textContent = `${candidates.length} leads · ${verified} reviewed active`;
    if (!candidates.length) {
      list.textContent = 'No recent filings matched the search.';
      return;
    }
    candidates.forEach(item => {
      const row = document.createElement('article');
      row.className = 'discovery-item';
      const details = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = item.fundName;
      const badge = document.createElement('span');
      badge.className = 'discovery-status' + (item.status === 'verified_active' ? ' verified' : '');
      badge.textContent = item.status === 'verified_active' ? 'Reviewed active' : 'Needs review';
      title.append(badge);
      const meta = document.createElement('small');
      meta.textContent = `SEC Form ${item.form} · Filed ${item.filingDate} · CIK ${item.cik}`;
      const checks = document.createElement('details');
      checks.className = 'discovery-checks';
      const summary = document.createElement('summary');
      const passed = item.checks.filter(check => check.passed).length;
      summary.textContent = `Credibility checks: ${passed}/${item.checks.length} passed`;
      checks.append(summary);
      const checkList = document.createElement('ul');
      item.checks.forEach(check => {
        const entry = document.createElement('li');
        entry.textContent = `${check.passed ? '✓' : '○'} ${check.name}: ${check.explanation}`;
        checkList.append(entry);
      });
      checks.append(checkList);
      details.append(title, meta, checks);
      row.append(details);
      if (item.filingUrl.startsWith('https://www.sec.gov/Archives/')) {
        const link = document.createElement('a');
        link.href = item.filingUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'View SEC filing ↗';
        row.append(link);
      }
      list.append(row);
    });
    const updated = new Date(report.generatedAt);
    byId('discovery-updated').textContent = `Source: ${report.source}. Searched ${updated.toLocaleString()}.`;
  } catch (cause) {
    byId('discovery-count').textContent = 'Unavailable';
    list.textContent = cause.message;
  }
}

async function start() {
  byId('projection-form').addEventListener('submit', calculate);
  calculate();
  renderDiscovery();
  try {
    const response = await fetch('/api/funds');
    if (!response.ok) throw new Error('Unable to load fund data');
    renderFunds(await response.json());
  } catch (cause) {
    byId('fund-rows').textContent = cause.message;
  }
}
start();
