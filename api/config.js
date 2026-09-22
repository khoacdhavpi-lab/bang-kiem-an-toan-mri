/**
 * Vercel Serverless Function: Trả về cấu hình môi trường công khai
 */
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const firebaseUrl = process.env.FIREBASE_DATABASE_URL || process.env.NEXT_PUBLIC_FIREBASE_URL || '';
  const hospitalName = process.env.HOSPITAL_NAME || 'BỆNH VIỆN ĐA KHOA VĨNH PHÚC';

  res.status(200).json({
    firebaseUrl,
    hospitalName
  });
};
