module.exports = function projection(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }
  const { principal: principalInput, annual_return: returnInput, years: yearsInput } = request.query;
  const principal = Number(principalInput);
  const annualReturn = Number(returnInput);
  const years = Number(yearsInput);
  if (principalInput === undefined || !Number.isFinite(principal) || principal < 0 || principal > 1e9) {
    return response.status(400).json({ error: 'principal must be between 0 and 1000000000' });
  }
  if (returnInput === undefined || !Number.isFinite(annualReturn) || annualReturn < -100 || annualReturn > 100) {
    return response.status(400).json({ error: 'annual_return must be between -100 and 100' });
  }
  if (yearsInput === undefined || !Number.isInteger(years) || years < 1 || years > 30) {
    return response.status(400).json({ error: 'years must be a whole number between 1 and 30' });
  }
  const points = Array.from({ length: years + 1 }, (_, year) => ({
    year,
    value: Math.round(principal * (1 + annualReturn / 100) ** year * 100) / 100
  }));
  return response.status(200).json({ principal, annualReturn, years, points });
};
