/**
 * Bộ điều hợp dữ liệu đám mây (Cloud Data Adapter)
 * Hỗ trợ đồng bộ dữ liệu trực tuyến 100% miễn phí qua Firebase Realtime Database / Vercel Serverless
 */

const CloudDB = {
  // Cấu hình mặc định hoặc tải từ bộ nhớ
  getConfig() {
    // 1. Kiểm tra cấu hình đã lưu trong trình duyệt
    const saved = localStorage.getItem('mri_cloud_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }

    // 2. Cấu hình mặc định (KTV có thể điền link Firebase vào mục Cài đặt)
    return {
      type: 'firebase', // 'firebase' | 'local_api'
      firebaseUrl: window.ENV_FIREBASE_URL || ''
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
  }
};

window.CloudDB = CloudDB;
