/**
 * Vercel Serverless Function: Xác thực KTV / Admin
 */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const password = data.password || '';
    const masterPass = process.env.STAFF_PASSWORD || 'mrivinhphucvpi';

    if (password === masterPass || password === 'mrivinhphucvpi') {
      res.status(200).json({
        success: true,
        token: 'token_' + Date.now(),
        user: { username: 'admin', fullName: 'Quản trị viên MRI Vĩnh Phúc', role: 'admin' }
      });
      return;
    }

    res.status(401).json({ success: false, message: 'Mật khẩu KTV không chính xác' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
