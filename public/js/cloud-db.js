/**
 * Bộ điều hợp dữ liệu đám mây (Cloud Data Adapter)
 * Hỗ trợ đồng bộ dữ liệu trực tuyến 100% miễn phí qua Firebase Realtime Database / Vercel Serverless
 */

const DEFAULT_FIREBASE_URL = 'https://mri-vinhphucvpi-safety-default-rtdb.asia-southeast1.firebasedatabase.app';

const CloudDB = {
  // Cấu hình mặc định hoặc tải từ bộ nhớ
  getConfig() {
    // 1. Kiểm tra cấu hình đã lưu trong trình duyệt
    const saved = localStorage.getItem('mri_cloud_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.firebaseUrl) return parsed;
      } catch (e) {}
    }

    // 2. Mặc định dùng thẳng CSDL Firebase Realtime đã cấu hình
    return {
      type: 'firebase',
      firebaseUrl: DEFAULT_FIREBASE_URL
    };
  },

  saveConfig(config) {
    localStorage.setItem('mri_cloud_config', JSON.stringify(config));
  },

  /**
   * Lưu phiếu khảo sát mới của bệnh nhân
   */
  async submitChecklist(payload) {
    const config = this.getConfig();
    let submissionId = payload.id;

    if (!submissionId) {
      submissionId = 'MRI-' + Math.floor(1000 + Math.random() * 9000);
      payload.id = submissionId;
    }

    // Phương án 1: Dùng Firebase Realtime Database trực tiếp (100% Online, Miễn phí)
    if (config.firebaseUrl) {
      let baseUrl = config.firebaseUrl.replace(/\/+$/, '');
      if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;
      const targetUrl = `${baseUrl}/checklists/${submissionId}.json`;

      const res = await fetch(targetUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Firebase HTTP ${res.status}`);
      return { success: true, id: submissionId, time: new Date().toLocaleTimeString('vi-VN') };
    }

    // Phương án 2: Gọi Serverless API (/api/submit) của Vercel hoặc Server nội bộ
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('API /api/submit không khả dụng, lưu cục bộ:', err);
    }

    // Dự phòng: Lưu vào LocalStorage của thiết bị
    const stored = JSON.parse(localStorage.getItem('mri_submissions') || '[]');
    stored.unshift(payload);
    localStorage.setItem('mri_submissions', JSON.stringify(stored));
    return { success: true, id: submissionId, time: new Date().toLocaleTimeString('vi-VN') };
  },

  /**
   * Lấy danh sách phiếu khảo sát cho KTV
   */
  async getChecklists() {
    const config = this.getConfig();

    // 1. Lấy từ Firebase nếu có cấu hình
    if (config.firebaseUrl) {
      try {
        let baseUrl = config.firebaseUrl.replace(/\/+$/, '');
        if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;
        const targetUrl = `${baseUrl}/checklists.json`;

        const res = await fetch(targetUrl);
        if (res.ok) {
          const data = await res.json();
          if (!data) return [];
          // Chuyển object Firebase thành mảng và sắp xếp thời gian mới nhất lên đầu
          const list = Object.keys(data).map(key => ({ ...data[key], id: data[key].id || key }));
          list.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
          return list;
        }
      } catch (err) {
        console.error('Lỗi khi tải từ Firebase:', err);
      }
    }

    // 2. Lấy từ Serverless API / Local Server
    try {
      const res = await fetch('/api/checklists');
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) return list;
      }
    } catch (err) {
      console.warn('API /api/checklists không phản hồi:', err);
    }

    // 3. Fallback: LocalStorage
    return JSON.parse(localStorage.getItem('mri_submissions') || '[]');
  },

  /**
   * Cập nhật đánh giá thẩm định an toàn của KTV
   */
  async updateChecklist(id, updateData) {
    const config = this.getConfig();

    if (config.firebaseUrl) {
      try {
        let baseUrl = config.firebaseUrl.replace(/\/+$/, '');
        if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;
        const targetUrl = `${baseUrl}/checklists/${id}.json`;

        await fetch(targetUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });
        return { success: true };
      } catch (err) {
        console.error('Lỗi cập nhật Firebase:', err);
      }
    }

    try {
      await fetch(`/api/checklists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
    } catch (e) {}

    return { success: true };
  },

  /**
   * Đăng ký nhận thông báo thời gian thực khi có bệnh nhân nộp phiếu
   */
  subscribeRealtime(onNewChecklist) {
    const config = this.getConfig();

    if (config.firebaseUrl) {
      try {
        let baseUrl = config.firebaseUrl.replace(/\/+$/, '');
        if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;
        const streamUrl = `${baseUrl}/checklists.json`;

        // Firebase hỗ trợ chuẩn EventSource (SSE) bản địa
        const evtSource = new EventSource(streamUrl);

        evtSource.addEventListener('put', (e) => {
          try {
            const parsed = JSON.parse(e.data);
            // Nếu có dữ liệu mới được thêm
            if (parsed && parsed.data && parsed.path !== '/') {
              onNewChecklist(parsed.data);
            }
          } catch (err) {}
        });

        return evtSource;
      } catch (err) {
        console.warn('Không thể mở EventSource Firebase:', err);
      }
    }

    return null;
  },

  /**
   * Lấy danh sách tài khoản KTV / Admin từ Firebase / LocalStorage
   */
  async getUsers() {
    const config = this.getConfig();
    let users = [];

    // 1. Thử lấy từ Firebase
    if (config.firebaseUrl) {
      try {
        let baseUrl = config.firebaseUrl.replace(/\/+$/, '');
        if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;
        const res = await fetch(`${baseUrl}/users.json`);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object') {
            users = Object.keys(data).map(k => ({
              ...data[k],
              username: data[k].username || k
            }));
            localStorage.setItem('mri_users', JSON.stringify(users));
            return users;
          }
        }
      } catch (err) {
        console.warn('Không thể tải users từ Firebase:', err);
      }
    }

    // 2. Lấy từ LocalStorage
    try {
      const saved = localStorage.getItem('mri_users');
      if (saved) {
        users = JSON.parse(saved);
        if (Array.isArray(users) && users.length > 0) return users;
      }
    } catch (e) {}

    // 3. Mặc định nếu chưa có
    return [
      {
        id: 'u1',
        username: 'admin',
        fullName: 'Quản trị viên MRI Vĩnh Phúc',
        role: 'admin',
        password: 'mrivinhphucvpi',
        active: true,
        createdAt: '2026-09-01'
      }
    ];
  },

  /**
   * Lưu hoặc cập nhật tài khoản KTV lên Firebase & LocalStorage
   */
  async saveUser(user) {
    if (!user || !user.username) return false;
    const config = this.getConfig();

    // Lưu LocalStorage
    let localUsers = [];
    try {
      localUsers = JSON.parse(localStorage.getItem('mri_users') || '[]');
    } catch (e) {}
    const idx = localUsers.findIndex(u => (u.username || '').toLowerCase() === user.username.toLowerCase());
    if (idx >= 0) {
      localUsers[idx] = { ...localUsers[idx], ...user };
    } else {
      localUsers.push(user);
    }
    localStorage.setItem('mri_users', JSON.stringify(localUsers));

    // Đồng bộ lên Firebase Realtime Database
    if (config.firebaseUrl) {
      try {
        let baseUrl = config.firebaseUrl.replace(/\/+$/, '');
        if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;
        await fetch(`${baseUrl}/users/${user.username}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user)
        });
      } catch (err) {
        console.error('Lỗi lưu user lên Firebase:', err);
      }
    }
    return true;
  },

  /**
   * Xóa tài khoản KTV khỏi Firebase & LocalStorage
   */
  async deleteUser(username) {
    if (!username) return false;
    let localUsers = [];
    try {
      localUsers = JSON.parse(localStorage.getItem('mri_users') || '[]');
    } catch (e) {}
    localUsers = localUsers.filter(u => (u.username || '').toLowerCase() !== username.toLowerCase());
    localStorage.setItem('mri_users', JSON.stringify(localUsers));

    const config = this.getConfig();
    if (config.firebaseUrl) {
      try {
        let baseUrl = config.firebaseUrl.replace(/\/+$/, '');
        if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;
        await fetch(`${baseUrl}/users/${username}.json`, { method: 'DELETE' });
      } catch (e) {}
    }
    return true;
  },

  /**
   * Xác thực đăng nhập KTV / Admin
   */
  async authenticate(username, password) {
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!cleanPass) {
      return { success: false, message: 'Vui lòng nhập mật khẩu đăng nhập!' };
    }

    // 1. Mật khẩu khẩn cấp hệ thống (Master Key)
    if (cleanPass === 'mrivinhphucvpi' || cleanPass === 'admin123') {
      if (cleanUser && cleanUser !== 'admin') {
        const users = await this.getUsers();
        const matched = users.find(u => (u.username || '').toLowerCase() === cleanUser);
        if (matched) {
          if (!matched.active) {
            return { success: false, message: 'Tài khoản này đang bị tạm khóa. Vui lòng liên hệ Quản trị viên!' };
          }
          return {
            success: true,
            user: {
              username: matched.username,
              fullName: matched.fullName || matched.username,
              role: matched.role || 'ktv'
            }
          };
        }
      }
      return {
        success: true,
        user: {
          username: cleanUser || 'admin',
          fullName: 'Quản trị viên MRI Vĩnh Phúc',
          role: 'admin'
        }
      };
    }

    // 2. Tra cứu tài khoản trong CSDL Firebase & LocalStorage
    const users = await this.getUsers();
    const found = users.find(u => (u.username || '').toLowerCase() === cleanUser);

    if (!found) {
      return { success: false, message: `Tài khoản "${username}" không tồn tại trong hệ thống!` };
    }

    if (!found.active) {
      return { success: false, message: 'Tài khoản này đang bị tạm khóa. Vui lòng liên hệ Quản trị viên!' };
    }

    // Kiểm tra mật khẩu
    if (found.password) {
      if (found.password === cleanPass) {
        return {
          success: true,
          user: {
            username: found.username,
            fullName: found.fullName || found.username,
            role: found.role || 'ktv'
          }
        };
      } else {
        return { success: false, message: 'Mật khẩu không chính xác! Vui lòng thử lại.' };
      }
    } else {
      // Tài khoản tạo trước đó chưa gán mật khẩu -> Cập nhật luôn mật khẩu vừa nhập cho KTV
      found.password = cleanPass;
      this.saveUser(found);
      return {
        success: true,
        user: {
          username: found.username,
          fullName: found.fullName || found.username,
          role: found.role || 'ktv'
        }
      };
    }
  },

  /**
   * Lấy cấu hình đơn vị & danh mục khoa phòng, vùng chụp
   */
  async getHospitalSettings() {
    const config = this.getConfig();
    let settings = null;

    if (config.firebaseUrl) {
      try {
        let baseUrl = config.firebaseUrl.replace(/\/+$/, '');
        if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;
        const res = await fetch(`${baseUrl}/hospital_settings.json`);
        if (res.ok) {
          settings = await res.json();
          if (settings && typeof settings === 'object') {
            localStorage.setItem('mri_hospital_settings', JSON.stringify(settings));
            return settings;
          }
        }
      } catch (e) {}
    }

    try {
      const saved = localStorage.getItem('mri_hospital_settings');
      if (saved) settings = JSON.parse(saved);
    } catch (e) {}

    return settings || {
      hospName: 'BỆNH VIỆN ĐA KHOA VĨNH PHÚC',
      deptName: 'KHOA CHẨN ĐOÁN HÌNH ẢNH • PHÒNG CHỤP CỘNG HƯỞNG TỪ (MRI)',
      quickPin: 'mrivinhphucvpi',
      leadDoctor: 'BS.CKI Nguyễn Văn B',
      departments: [
        'Khoa Khám bệnh',
        'Khoa Cấp cứu',
        'Khoa Ngoại Thần kinh - Cột sống',
        'Khoa Nội Thần kinh',
        'Khoa Chấn thương Chỉnh hình',
        'Khoa Ung bướu',
        'Khoa Hồi sức tích cực (ICU)',
        'Khoa Nội Tổng hợp - Tim mạch',
        'Khoa Nhi',
        'Phòng khám Theo yêu cầu',
        'Tự đến khám (Tự nguyện)'
      ],
      scanAreas: [
        'MRI Sọ não',
        'MRI Mạch máu não (MRA)',
        'MRI Cột sống thắt lưng',
        'MRI Cột sống cổ',
        'MRI Cột sống ngực',
        'MRI Khớp gối',
        'MRI Khớp vai',
        'MRI Khớp háng',
        'MRI Vùng bụng - Chậu',
        'MRI Gan - Mật - Tụy',
        'MRI Tuyến vú',
        'MRI Cổ chân / Bàn chân'
      ]
    };
  },

  /**
   * Lưu cấu hình đơn vị & danh mục khoa phòng, vùng chụp
   */
  async saveHospitalSettings(settings) {
    localStorage.setItem('mri_hospital_settings', JSON.stringify(settings));
    const config = this.getConfig();
    if (config.firebaseUrl) {
      try {
        let baseUrl = config.firebaseUrl.replace(/\/+$/, '');
        if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;
        await fetch(`${baseUrl}/hospital_settings.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings)
        });
      } catch (e) {
        console.error('Lỗi lưu hospital_settings lên Firebase:', e);
      }
    }
    return true;
  }
};

window.CloudDB = CloudDB;
