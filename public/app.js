const byId = id => document.getElementById(id);
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

function lineChart(values, width = 440, height = 110) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = i => 4 + i * (width - 8) / Math.max(1, values.length - 1);
  const y = value => height - 5 - (value - min) * (height - 10) / (max - min || 1);
  const points = values.map((value, i) => `${x(i)},${y(value)}`).join(' ');
  return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="${height - 5}" x2="${width}" y2="${height - 5}" stroke="#25302a"/><polyline points="${points}" fill="none" stroke="#a6d1b1" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
}

function makeLink(label, url) {
  const link = document.createElement('a');
  link.textContent = label;
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

function makeCard(fund, fresh, index) {
  const card = document.createElement('details');
  card.className = 'fund-card';
  const summary = document.createElement('summary');
  const ordinal = document.createElement('span');
  ordinal.className = 'card-index';
  ordinal.textContent = String(index + 1).padStart(2, '0');
  const main = document.createElement('span');
  main.className = 'card-main';
  const manager = document.createElement('span');
  manager.className = 'card-manager';
  manager.textContent = fund.manager.toUpperCase();
  const title = document.createElement('strong');
  title.textContent = fund.name;
  const description = document.createElement('span');
  description.className = 'card-description';
  description.textContent = fund.description;
  main.append(manager, title, description);
  const side = document.createElement('span');
  side.className = 'card-side';
  const strategy = document.createElement('span');
  strategy.textContent = fund.strategy;
  const badge = document.createElement('span');
  badge.className = 'card-badge' + (fresh ? '' : ' expired');
  badge.textContent = fresh ? 'SOURCE CONFIRMED' : 'RECHECK SOURCES';
  const arrow = document.createElement('span');
  arrow.className = 'card-arrow';
  arrow.textContent = '↗';
  side.append(strategy, badge, arrow);
  summary.append(ordinal, main, side);
  card.append(summary);

  const detail = document.createElement('div');
  detail.className = 'card-detail';
  const managerBlock = document.createElement('div');
  const managerLabel = document.createElement('span');
  managerLabel.className = 'detail-label';
  managerLabel.textContent = 'MANAGER EVIDENCE';
  const managerCopy = document.createElement('p');
  managerCopy.textContent = fund.managerEvidence.detail;
  managerBlock.append(managerLabel, managerCopy, makeLink('View manager fund page ↗', fund.managerEvidence.url));

  const filingBlock = document.createElement('div');
  const filingLabel = document.createElement('span');
  filingLabel.className = 'detail-label';
  filingLabel.textContent = 'PUBLIC FILING RECORD';
  const filingName = document.createElement('h3');
  filingName.textContent = fund.filing.entity;
  const filingMeta = document.createElement('p');
  filingMeta.className = 'filing-meta';
  filingMeta.textContent = `${fund.filing.type}  /  ${fund.filing.date}  /  CIK ${fund.filing.cik}`;
  const filingNote = document.createElement('p');
  filingNote.textContent = fund.filing.detail;
  filingBlock.append(filingLabel, filingName, filingMeta, filingNote, makeLink('Open original filing ↗', fund.filing.url));
  if (fund.recentFiling) {
    const recent = document.createElement('div');
    recent.className = 'recent-filing';
    const recentMeta = document.createElement('p');
    recentMeta.className = 'filing-meta';
    recentMeta.textContent = `${fund.recentFiling.type}  /  ${fund.recentFiling.date}`;
    const recentNote = document.createElement('p');
    recentNote.textContent = fund.recentFiling.detail;
    recent.append(recentMeta, recentNote, makeLink('Open later filing ↗', fund.recentFiling.url));
    filingBlock.append(recent);
  }
  detail.append(managerBlock, filingBlock);
  card.append(detail);
  return card;
}

function renderFunds(data, charts) {
  const verified = new Date(`${data.verifiedAt}T00:00:00Z`);
  const age = (Date.now() - verified.getTime()) / 86400000;
  const fresh = Number.isFinite(age) && age >= -1 && age <= 14;
  byId('as-of').textContent = `VERIFIED ${data.verifiedAt}`;
  byId('fund-count').textContent = charts.fundCount;
  byId('manager-count').textContent = charts.managerCount;
  byId('filing-count').textContent = data.funds.filter(fund => fund.filing && fund.filing.url).length;
  byId('freshness').textContent = fresh ? 'CURRENT' : 'RECHECK';
  byId('method-updated').textContent = `Sources checked ${data.verifiedAt}. ${data.definition}`;
  const cards = byId('fund-cards');
  data.funds.forEach((fund, index) => cards.append(makeCard(fund, fresh, index)));
  if (!fresh) byId('fund-error').textContent = 'Source verification is older than 14 days. Recheck manager pages before relying on these listings.';
  const strategyChart = byId('strategy-chart');
  const max = Math.max(...charts.strategyCounts.map(row => row.count));
  charts.strategyCounts.forEach(row => {
    const item = document.createElement('div');
    item.className = 'strategy-row';
    const name = document.createElement('span');
    name.textContent = row.strategy;
    const track = document.createElement('span');
    track.className = 'strategy-track';
    const fill = document.createElement('span');
    fill.style.width = `${row.count / max * 100}%`;
    track.append(fill);
    const count = document.createElement('b');
    count.textContent = String(row.count).padStart(2, '0');
    item.append(name, track, count);
    strategyChart.append(item);
  });
}

function calculate(event) {
  if (event) event.preventDefault();
  const query = new URLSearchParams(new FormData(byId('projection-form')));
  const error = byId('projection-error');
  error.textContent = '';
  try {
    const principal = Number(query.get('principal'));
    const annualReturn = Number(query.get('annual_return'));
    const years = Number(query.get('years'));
    if (!Number.isFinite(principal) || principal < 0 || principal > 1e9) throw new Error('Starting investment must be between 0 and 1 billion.');
    if (!Number.isFinite(annualReturn) || annualReturn < -100 || annualReturn > 100) throw new Error('Annual return must be between -100% and 100%.');
    if (!Number.isInteger(years) || years < 1 || years > 30) throw new Error('Years must be a whole number between 1 and 30.');
    const values = Array.from({ length: years + 1 }, (_, year) => principal * (1 + annualReturn / 100) ** year);
    byId('projected-value').textContent = money(values.at(-1));
    byId('projection-chart').innerHTML = lineChart(values);
    byId('projection-chart').setAttribute('aria-label', `Hypothetical value from ${money(principal)} to ${money(values.at(-1))} over ${years} years`);
  } catch (cause) {
    error.textContent = cause.message;
  }
}

async function start() {
  byId('projection-form').addEventListener('submit', calculate);
  calculate();
  try {
    const [fundResponse, chartResponse] = await Promise.all([fetch('/data/funds.json'), fetch('/data/visualizations.json')]);
    if (!fundResponse.ok || !chartResponse.ok) throw new Error('Unable to load verified fund data.');
    const [funds, charts] = await Promise.all([fundResponse.json(), chartResponse.json()]);
    renderFunds(funds, charts);
  } catch (cause) {
    byId('fund-error').textContent = cause.message;
  }
}

start();
