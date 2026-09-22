/**
 * Vercel Serverless Function: Tiếp nhận bảng kiểm an toàn MRI
 */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const submissionId = data.id || ('MRI-' + Math.floor(1000 + Math.random() * 9000));
    data.id = submissionId;
    data.submittedAt = data.submittedAt || new Date().toISOString();

    const firebaseUrl = process.env.FIREBASE_DATABASE_URL || process.env.NEXT_PUBLIC_FIREBASE_URL;

    if (firebaseUrl) {
      const cleanUrl = firebaseUrl.replace(/\/+$/, '');
      const resp = await fetch(`${cleanUrl}/checklists/${submissionId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!resp.ok) {
        throw new Error(`Firebase save error: ${resp.statusText}`);
      }
    }

    res.status(200).json({
      success: true,
      id: submissionId,
      time: new Date().toLocaleTimeString('vi-VN')
    });
  } catch (err) {
    console.error('Submit API Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
