/**
 * Vercel Serverless Function: Lấy danh sách phiếu khảo sát cho KTV
 */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const firebaseUrl = process.env.FIREBASE_DATABASE_URL || process.env.NEXT_PUBLIC_FIREBASE_URL;

  if (firebaseUrl) {
    try {
      const cleanUrl = firebaseUrl.replace(/\/+$/, '');
      const resp = await fetch(`${cleanUrl}/checklists.json`);
      if (resp.ok) {
        const data = await resp.json();
        if (!data) {
          res.status(200).json([]);
          return;
        }
        const list = Object.keys(data).map(key => ({ ...data[key], id: data[key].id || key }));
        list.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
        res.status(200).json(list);
        return;
      }
    } catch (err) {
      console.error('Fetch Firebase Error:', err);
    }
  }

  res.status(200).json([]);
};
