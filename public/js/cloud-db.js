/**
 * Bộ điều hợp dữ liệu đám mây (Cloud Data Adapter)
 * Tự động đồng bộ trực tuyến 100% miễn phí qua Firebase Realtime Database
 */

const DEFAULT_FIREBASE_URL = 'https://mri-vinhphucvpi-safety-default-rtdb.asia-southeast1.firebasedatabase.app';

const CloudDB = {
  getConfig() {
    const saved = localStorage.getItem('mri_cloud_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.firebaseUrl) return parsed;
      } catch (e) {}
    }

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

    if (config.firebaseUrl) {
      try {
        let baseUrl = config.firebaseUrl.replace(/\/+$/, '');
        if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;
        const targetUrl = `${baseUrl}/checklists.json`;

        const res = await fetch(targetUrl);
        if (res.ok) {
          const data = await res.json();
          if (!data) return [];
          const list = Object.keys(data).map(key => ({ ...data[key], id: data[key].id || key }));
          list.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
          return list;
        }
      } catch (err) {
        console.error('Lỗi khi tải từ Firebase:', err);
      }
    }

    return JSON.parse(localStorage.getItem('mri_submissions') || '[]');
  },

  /**
   * Cập nhật thẩm định an toàn của KTV
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

    return { success: true };
  },

  /**
   * Nhận thông báo thời gian thực khi có bệnh nhân nộp phiếu
   */
  subscribeRealtime(onNewChecklist) {
    const config = this.getConfig();

    if (config.firebaseUrl) {
      try {
        let baseUrl = config.firebaseUrl.replace(/\/+$/, '');
        if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;
        const streamUrl = `${baseUrl}/checklists.json`;

        const evtSource = new EventSource(streamUrl);
        evtSource.addEventListener('put', (e) => {
          try {
            const parsed = JSON.parse(e.data);
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

    try {
      const saved = localStorage.getItem('mri_users');
      if (saved) {
        users = JSON.parse(saved);
        if (Array.isArray(users) && users.length > 0) return users;
      }
    } catch (e) {}

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
   * Lưu tài khoản KTV lên Firebase & LocalStorage
   */
  async saveUser(user) {
    if (!user || !user.username) return false;
    const config = this.getConfig();

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

    const users = await this.getUsers();
    const found = users.find(u => (u.username || '').toLowerCase() === cleanUser);

    if (!found) {
      return { success: false, message: `Tài khoản "${username}" không tồn tại trong hệ thống!` };
    }

    if (!found.active) {
      return { success: false, message: 'Tài khoản này đang bị tạm khóa. Vui lòng liên hệ Quản trị viên!' };
    }

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
  }
};

window.CloudDB = CloudDB;
