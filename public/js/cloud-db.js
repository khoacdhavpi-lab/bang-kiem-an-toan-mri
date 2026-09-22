/**
 * Bộ điều hợp dữ liệu đám mây (Cloud Data Adapter)
 * Tự động đồng bộ trực tuyến 100% miễn phí qua Firebase Realtime Database
 */

const DEFAULT_FIREBASE_URL = 'https://mri-vinhphucvpi-safety-default-rtdb.asia-southeast1.firebasedatabase.app';

const CloudDB = {
  // Cấu hình mặc định
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

    // Gửi thẳng lên Firebase Realtime Database (Online 100%, không cần server)
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

    // Dự phòng lưu tạm cục bộ nếu mất mạng
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
  }
};

window.CloudDB = CloudDB;
