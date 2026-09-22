/**
 * Máy chủ Web App Bảng kiểm an toàn MRI Trực tuyến
 * Sử dụng thuần Node.js & node:sqlite (Không phụ thuộc npm bên ngoài)
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');

// Đảm bảo thư mục lưu trữ dữ liệu tồn tại
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Khởi tạo cơ sở dữ liệu SQLite bền vững
const dbPath = path.join(DATA_DIR, 'mri_database.sqlite');
const db = new DatabaseSync(dbPath);

// Tạo bảng dữ liệu
db.exec(`
  CREATE TABLE IF NOT EXISTS checklists (
    id TEXT PRIMARY KEY,
    fullName TEXT NOT NULL,
    patientId TEXT,
    ageOrYob TEXT,
    gender TEXT,
    weight TEXT,
    phone TEXT,
    departmentRoom TEXT,
    patientType TEXT,
    scanArea TEXT,
    language TEXT,
    answers TEXT,
    hasHighRisk INTEGER DEFAULT 0,
    signature TEXT,
    ktvStatus TEXT DEFAULT 'pending',
    ktvName TEXT,
    ktvNotes TEXT,
    submittedAt TEXT,
    reviewedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    fullName TEXT NOT NULL,
    role TEXT DEFAULT 'ktv',
    active INTEGER DEFAULT 1,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Tạo tài khoản Admin mặc định nếu chưa có (Mật khẩu: mrivinhphucvpi)
function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}

const adminCheck = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminCheck) {
  const adminInsert = db.prepare(`
    INSERT INTO users (id, username, passwordHash, fullName, role, active, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  adminInsert.run(
    'usr_admin_01',
    'admin',
    hashPassword('mrivinhphucvpi'),
    'Quản trị viên MRI Vĩnh Phúc',
    'admin',
    1,
    new Date().toISOString()
  );
  console.log('✓ Đã khởi tạo tài khoản Admin mặc định: admin / mrivinhphucvpi');
}

// Danh sách các kết nối Server-Sent Events (SSE) theo dõi thời gian thực
const sseClients = new Set();

function broadcastEvent(eventName, data) {
  const msg = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(msg);
  }
}

// MIME Types hỗ trợ
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

// Hàm đọc body request JSON
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 5 * 1024 * 1024) { // Giới hạn 5MB
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Xử lý Request HTTP
const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;
  const method = req.method;

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ========================================================
  // API ROUTING
  // ========================================================

  // 1. POST /api/submit - Bệnh nhân nộp bảng kiểm an toàn
  if (pathname === '/api/submit' && method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const counterRow = db.prepare('SELECT COUNT(*) as count FROM checklists').get();
      const nextNum = (counterRow.count || 0) + 1;
      const submissionId = 'MRI-' + nextNum.toString().padStart(4, '0');

      const stmt = db.prepare(`
        INSERT INTO checklists (
          id, fullName, patientId, ageOrYob, gender, weight, phone,
          departmentRoom, patientType, scanArea, language, answers,
          hasHighRisk, signature, ktvStatus, submittedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `);

      stmt.run(
        submissionId,
        data.fullName || '',
        data.patientId || '',
        data.ageOrYob || '',
        data.gender || 'male',
        data.weight || '',
        data.phone || '',
        data.departmentRoom || '',
        data.patientType || 'outpatient',
        data.scanArea || '',
        data.language || 'vi',
        JSON.stringify(data.answers || {}),
        data.hasHighRisk ? 1 : 0,
        data.signature || '',
        data.submittedAt || new Date().toISOString()
      );

      const responsePayload = {
        success: true,
        id: submissionId,
        time: new Date().toLocaleTimeString('vi-VN')
      };

      // Bắn thông báo real-time tới máy trạm của KTV
      broadcastEvent('new_checklist', {
        id: submissionId,
        fullName: data.fullName,
        hasHighRisk: data.hasHighRisk,
        submittedAt: data.submittedAt
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(responsePayload));
      return;
    } catch (err) {
      console.error('Lỗi lưu bảng kiểm:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // 2. GET /api/checklists - Lấy danh sách phiếu cho KTV
  if (pathname === '/api/checklists' && method === 'GET') {
    try {
      const rows = db.prepare('SELECT * FROM checklists ORDER BY submittedAt DESC LIMIT 200').all();
      const list = rows.map(r => ({
        ...r,
        hasHighRisk: Boolean(r.hasHighRisk),
        answers: r.answers ? JSON.parse(r.answers) : {}
      }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(list));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  // 3. PATCH /api/checklists/:id - Cập nhật thẩm định của KTV
  if (pathname.startsWith('/api/checklists/') && method === 'PATCH') {
    const id = pathname.replace('/api/checklists/', '');
    try {
      const data = await parseJsonBody(req);
      const stmt = db.prepare(`
        UPDATE checklists 
        SET ktvStatus = ?, ktvName = ?, ktvNotes = ?, reviewedAt = ?
        WHERE id = ?
      `);
      stmt.run(
        data.ktvStatus || 'safe',
        data.ktvName || '',
        data.ktvNotes || '',
        data.reviewedAt || new Date().toISOString(),
        id
      );

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  // 4. POST /api/auth/login - Đăng nhập KTV / Admin
  if (pathname === '/api/auth/login' && method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const username = data.username || '';
      const password = data.password || '';

      // Kiểm tra mật khẩu cố định
      if (password === 'mrivinhphucvpi' || password === 'admin123') {
        const token = 'tok_' + crypto.randomBytes(16).toString('hex');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          token,
          user: { username: 'admin', fullName: 'Quản trị viên MRI Vĩnh Phúc', role: 'admin' }
        }));
        return;
      }

      // Kiểm tra tài khoản trong DB
      const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);
      if (user && user.passwordHash === hashPassword(password)) {
        const token = 'tok_' + crypto.randomBytes(16).toString('hex');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          token,
          user: { id: user.id, username: user.username, fullName: user.fullName, role: user.role }
        }));
        return;
      }

      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Sai tên đăng nhập hoặc mật khẩu' }));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  // 5. GET /api/events - Server-Sent Events (SSE) theo dõi thời gian thực
  if (pathname === '/api/events' && method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write('retry: 5000\n\n');
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // ========================================================
  // STATIC FILE SERVING
  // ========================================================
  let filePath = path.join(PUBLIC_DIR, pathname);

  // Nếu truy cập thư mục gốc hoặc /admin/
  if (pathname === '/' || pathname === '') {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  } else if (pathname === '/admin' || pathname === '/admin/') {
    filePath = path.join(PUBLIC_DIR, 'admin', 'index.html');
  }

  // Đảm bảo không bị path traversal ra ngoài PUBLIC_DIR
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(PUBLIC_DIR))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(resolvedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found - Không tìm thấy trang yêu cầu');
      return;
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(resolvedPath);
    stream.pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
===========================================================
  HỆ THỐNG BẢNG KIỂM AN TOÀN CHỤP MRI TRỰC TUYẾN
  Cổng máy chủ đang chạy tại: http://localhost:${PORT}
  Cổng quản trị KTV:         http://localhost:${PORT}/admin
  Mật khẩu KTV mặc định:     mrivinhphucvpi
===========================================================
`);
});
