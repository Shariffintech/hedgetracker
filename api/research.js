const sources = require('../dashboard/data/research_sources.json');

async function checkPage(url, phrase) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5500);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'HedgeTracker Fund Research (public source review)', Accept: 'text/html' } });
    if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
    const html = await response.text();
    const plain = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
    return { passed: plain.includes(phrase.toLowerCase()), error: null };
  } catch (error) {
    return { passed: false, error: error.name === 'AbortError' ? 'Source timed out' : error.message };
  } finally {
    clearTimeout(timer);
  }
}

async function evaluate(item) {
  const product = await checkPage(item.managerUrl, item.name);
  const location = item.locationUrl && item.locationPhrase ? await checkPage(item.locationUrl, item.locationPhrase) : { passed: false, error: null };
  const checks = [
    { name: 'Named fund on manager page', passed: product.passed, source: item.managerUrl },
    { name: 'Manager location on primary source', passed: location.passed, source: item.locationUrl || null },
    { name: 'Dated fund return series', passed: false, source: null },
  ];
  return {
    name: item.name, manager: item.manager, strategy: item.strategy,
    region: location.passed ? item.region : 'Location unverified',
    managerUrl: item.managerUrl, locationUrl: location.passed ? item.locationUrl : null,
    status: product.passed ? 'manager_confirmed' : 'needs_recheck',
    evidenceScore: checks.filter(check => check.passed).length,
    checks, performanceStatus: 'No dated public fund return series verified',
    evidence: product.passed
      ? `${item.manager} currently names this fund on its own product page. ${location.passed ? 'Manager location is supported by its official site.' : 'Manager location remains unverified.'} Fund returns are unavailable for a performance chart.`
      : `The reviewed manager source could not be reconfirmed during this run${product.error ? ` (${product.error})` : ''}. Keep this as a research lead.`,
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const evaluated = await Promise.all(sources.candidates.map(evaluate));
  const candidates = evaluated.filter(item => item.status === 'manager_confirmed').sort((a, b) => b.evidenceScore - a.evidenceScore || a.name.localeCompare(b.name)).slice(0, 25);
  const regions = ['United States', 'New York City', 'Switzerland', 'Lisbon', 'Germany'];
  const scans = regions.map(region => ({ region, count: candidates.filter(item => item.region === region).length, error: null }));
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  return res.status(200).json({ generatedAt: new Date().toISOString(), target: 25, ranking: 'Current manager product page, location evidence, then performance source', candidates, scans, source: 'Live manager-owned product pages', warning: 'These are manager-confirmed study candidates. No public return series passed review; a zero-result region is not filled with unverified products.' });
};
