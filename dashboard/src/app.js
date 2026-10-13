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

let performanceData;
let selectedFund;
let selectedPeriod = 30;

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
  badge.textContent = performanceData?.series.some(item => item.fundId === fund.id) ? 'RETURNS VERIFIED' : 'RETURNS UNPUBLISHED';
  const arrow = document.createElement('span');
  arrow.className = 'card-arrow';
  arrow.textContent = '↗';
  const coverage = document.createElement('span');
  coverage.className = 'card-coverage';
  coverage.textContent = performanceData?.series.some(item => item.fundId === fund.id) ? 'Fund series available ↗' : 'Fund series unavailable · BTC context ↗';
  side.append(strategy, badge, coverage, arrow);
  summary.append(ordinal, main, side);
  card.append(summary);

  const detail = document.createElement('div');
  detail.className = 'card-detail';
  const study = document.createElement('div');
  study.className = 'study-block';
  const studyLabel = document.createElement('span');
  studyLabel.className = 'detail-label';
  studyLabel.textContent = 'PERFORMANCE STUDY';
  const studyTitle = document.createElement('h3');
  studyTitle.textContent = 'Public return coverage';
  const studyCopy = document.createElement('p');
  studyCopy.textContent = performanceData?.series.some(item => item.fundId === fund.id)
    ? 'A dated fund-level return series is available. Select this fund in the performance desk above to explore it.'
    : 'No dated, fund-specific return series has passed the source review. The BTC chart above shows market movement only; it is not this fund’s performance.';
  const studyAction = document.createElement('button');
  studyAction.type = 'button';
  studyAction.textContent = 'VIEW IN PERFORMANCE DESK ↗';
  studyAction.addEventListener('click', () => { byId('performance-fund').value = fund.id; selectedFund = fund.id; renderPerformance(); byId('performance').scrollIntoView({ behavior: 'smooth' }); });
  study.append(studyLabel, studyTitle, studyCopy, studyAction);
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
  const evidence = document.createElement('details');
  evidence.className = 'study-evidence';
  const evidenceTitle = document.createElement('summary');
  evidenceTitle.textContent = 'VIEW HISTORICAL FILING EVIDENCE ↘';
  evidence.append(evidenceTitle, filingBlock);
  detail.append(study, managerBlock, evidence);
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
  byId('filing-count').textContent = performanceData.coveredFundCount;
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

function renderPerformance() {
  const fundSeries = performanceData.series.find(item => item.fundId === selectedFund);
  const market = performanceData.benchmark.points.slice(-selectedPeriod);
  const labels = market.map(item => item.date);
  const values = market.map(item => item.closeUsd / market[0].closeUsd * 100);
  byId('performance-chart').innerHTML = lineChart(values, 800, 210);
  byId('performance-chart').setAttribute('aria-label', `BTC USD market price index from ${labels[0]} to ${labels.at(-1)}, starting at 100. This is not fund performance.`);
  byId('chart-start').textContent = labels[0];
  byId('chart-end').textContent = labels.at(-1);
  byId('return-coverage').textContent = `${performanceData.coveredFundCount} / ${performanceData.fundCount}`;
  byId('performance-status').textContent = fundSeries
    ? `${fundSeries.shareClass} net return series available. Source dated ${fundSeries.sourceDate}.`
    : 'No verified public fund return series for this selection. Chart shows BTC market context only.';
  byId('benchmark-source').replaceChildren(makeLink(`BTC-USD daily close · Coinbase Exchange · retrieved ${performanceData.benchmark.retrievedAt} ↗`, performanceData.benchmark.sourceUrl));
  byId('performance-chart-label').textContent = 'BTC / USD MARKET PRICE INDEX · START = 100';
  document.querySelectorAll('[data-period]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.period) === selectedPeriod)));
}

function renderResearch(data, region = 'All') {
  const filters = byId('research-filters');
  filters.replaceChildren();
  const regions = ['All', 'United States', 'New York City', 'Switzerland', 'Lisbon', 'Portugal', 'Germany', 'Location unverified'];
  regions.forEach(name => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = name;
    button.className = name === region ? 'active' : '';
    button.addEventListener('click', () => renderResearch(data, name));
    filters.append(button);
  });
  const visible = region === 'All' ? data.candidates : data.candidates.filter(item => item.region === region);
  byId('research-summary').textContent = `${data.candidates.length} / ${data.target} studies · evidence ranked`;
  const list = byId('research-list');
  list.replaceChildren();
  visible.forEach((item, index) => {
    const row = document.createElement('article');
    row.className = 'research-row';
    const meta = document.createElement('span');
    meta.textContent = `${String(index + 1).padStart(2, '0')} / ${item.region} / ${item.manager || 'Manager source'}`;
    const title = document.createElement('h4');
    title.textContent = item.name;
    const note = document.createElement('p');
    note.textContent = item.evidence;
    row.append(meta, title, note, makeLink('View manager fund page ↗', item.managerUrl));
    list.append(row);
  });
  if (!visible.length) { const empty = document.createElement('p'); empty.className = 'research-empty'; empty.textContent = 'No manager-confirmed study candidates with location evidence in this region yet.'; list.append(empty); }
  byId('research-status').textContent = data.warning;
}

async function runResearch() {
  const button = byId('research-button');
  button.disabled = true;
  button.textContent = 'RESEARCHING…';
  byId('research-results').hidden = false;
  byId('research-status').textContent = 'Checking manager fund pages and ranking the evidence…';
  try {
    const response = await fetch('/api/research');
    if (!response.ok) throw new Error(`Research service returned ${response.status}`);
    renderResearch(await response.json());
  } catch (error) {
    byId('research-status').textContent = `Research could not complete: ${error.message}`;
  } finally {
    button.disabled = false;
    button.innerHTML = 'FIND NEW FUNDS <span>↗</span>';
  }
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
  byId('research-button').addEventListener('click', runResearch);
  byId('performance-fund').addEventListener('change', event => { selectedFund = event.target.value; renderPerformance(); });
  document.querySelectorAll('[data-period]').forEach(button => button.addEventListener('click', () => { selectedPeriod = Number(button.dataset.period); renderPerformance(); }));
  byId('projection-form').addEventListener('submit', calculate);
  calculate();
  try {
    const [fundResponse, chartResponse, performanceResponse] = await Promise.all([fetch('/data/funds.json'), fetch('/data/visualizations.json'), fetch('/data/performance.json')]);
    if (!fundResponse.ok || !chartResponse.ok || !performanceResponse.ok) throw new Error('Unable to load verified fund data.');
    const [funds, charts, performance] = await Promise.all([fundResponse.json(), chartResponse.json(), performanceResponse.json()]);
    performanceData = performance;
    for (const fund of funds.funds) { const option = document.createElement('option'); option.value = fund.id; option.textContent = fund.name; byId('performance-fund').append(option); }
    selectedFund = funds.funds[0].id;
    renderPerformance();
    renderFunds(funds, charts);
  } catch (cause) {
    byId('fund-error').textContent = cause.message;
  }
}

start();
