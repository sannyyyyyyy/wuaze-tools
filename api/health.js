module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
};