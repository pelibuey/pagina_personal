module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    version: '1.0.44',
    buildTime: 1758747780000,
    buildDate: '2026-09-24T23:03:00.000Z',
    hash: 'cris-v44-2fa-enforce'
  });
};
