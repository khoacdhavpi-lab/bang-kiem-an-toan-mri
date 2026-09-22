/**
 * Logic Cổng Quản trị viên & Kỹ thuật viên MRI (Admin & Staff Portal)
 */

let allSubmissions = [];
let currentUser = null;
let currentViewingId = null;
let soundEnabled = true;
let knownSubmissionIds = new Set();
let hospitalSettings = {
  hospName: 'BỆNH VIỆN ĐA KHOA VĨNH PHÚC',
  deptName: 'KHOA CHẨN ĐOÁN HÌNH ẢNH • PHÒNG CHỤP CỘNG HƯỞNG TỪ (MRI)',
  quickPin: 'mrivinhphucvpi',
  leadDoctor: 'BS.CKI Nguyễn Văn B'
};

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initTabs();
  initSoundToggle();
  initFilters();
  initDetailModal();
  initPrintHandlers();
  initPosterTab();
  initUserManagement();
  initSettings();

  // Tải dữ liệu ban đầu và bắt đầu chu kỳ đồng bộ thời gian thực
  fetchSubmissions();
  setInterval(fetchSubmissions, 3500); // Tự động làm mới mỗi 3.5 giây
});

/**
 * Kiểm tra quyền đăng nhập
 */
function checkAuth() {
  const token = localStorage.getItem('mri_staff_token');
  const userJson = localStorage.getItem('mri_staff_user');

  if (!token) {
    window.location.href = '/';
    return;
  }

  if (userJson) {
    try {
      currentUser = JSON.parse(userJson);
      document.getElementById('user-fullname-display').textContent = currentUser.fullName || currentUser.username;
      document.getElementById('user-role-badge').textContent = (currentUser.role || 'KTV').toUpperCase();

      // Nếu chỉ là KTV thông thường (không phải admin), ẩn tab phân quyền
      if (currentUser.role !== 'admin') {
        const userTab = document.getElementById('nav-tab-users');
        if (userTab) userTab.style.display = 'none';
      }
    } catch (e) {
      console.error(e);
    }
  }

  document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('mri_staff_token');
    localStorage.removeItem('mri_staff_user');
    window.location.href = '/';
  });
}

/**
 * Quản lý chuyển tab giao diện
 */
function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab:not(.external-link)');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.tab;
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');

      if (targetId === 'tab-users') renderUserList();
      if (targetId === 'tab-qr-poster') updatePosterQR();
    });
  });
}

/**
 * Bật / tắt chuông thông báo âm thanh
 */
function initSoundToggle() {
  const btn = document.getElementById('btn-toggle-sound');
  const txt = document.getElementById('txt-sound-status');
  btn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    txt.textContent = soundEnabled ? 'Chuông: BẬT' : 'Chuông: TẮT';
    btn.style.opacity = soundEnabled ? '1' : '0.6';
  });
}

function playNotificationChime() {
  if (!soundEnabled) return;
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.45);
  } catch (e) {
    console.warn('Cannot play audio chime:', e);
  }
}

/**
 * Tải danh sách phiếu bệnh nhân từ CloudDB (Firebase / API / Local)
 */
async function fetchSubmissions() {
  let list = [];
  try {
    list = await CloudDB.getChecklists();
  } catch (err) {
    console.error('Lỗi khi lấy danh sách phiếu:', err);
    list = JSON.parse(localStorage.getItem('mri_submissions') || '[]');
  }

  // Kiểm tra xem có phiếu mới nộp không để phát chuông
  let hasNew = false;
  list.forEach(sub => {
    if (sub.id && !knownSubmissionIds.has(sub.id)) {
      knownSubmissionIds.add(sub.id);
      hasNew = true;
    }
  });

  if (hasNew && knownSubmissionIds.size > list.length) {
    playNotificationChime();
  }

  allSubmissions = list;
  updateStats();
  renderPatientTable();
}

/**
 * Cập nhật số liệu thống kê
 */
function updateStats() {
  const total = allSubmissions.length;
  let highRisk = 0;
  let safe = 0;
  let pending = 0;

  allSubmissions.forEach(s => {
    if (s.hasHighRisk) highRisk++;
    if (s.ktvStatus === 'safe') safe++;
    if (!s.ktvStatus || s.ktvStatus === 'pending') pending++;
  });

  document.getElementById('badge-total-count').textContent = total;
  document.getElementById('stat-total-today').textContent = total;
  document.getElementById('stat-high-risk').textContent = highRisk;
  document.getElementById('stat-safe').textContent = safe;
  document.getElementById('stat-pending').textContent = pending;
}

/**
 * Lọc và tìm kiếm phiếu
 */
function initFilters() {
  document.getElementById('inp-search').addEventListener('input', renderPatientTable);
  document.getElementById('sel-filter-status').addEventListener('change', renderPatientTable);
  document.getElementById('inp-filter-date').addEventListener('change', renderPatientTable);
  document.getElementById('btn-manual-refresh').addEventListener('click', fetchSubmissions);
  document.getElementById('btn-export-excel').addEventListener('click', exportToCSV);
}

function getFilteredSubmissions() {
  const query = document.getElementById('inp-search').value.toLowerCase().trim();
  const statusFilter = document.getElementById('sel-filter-status').value;
  const dateFilter = document.getElementById('inp-filter-date').value;

  return allSubmissions.filter(sub => {
    // Search query
    if (query) {
      const matchName = (sub.fullName || '').toLowerCase().includes(query);
      const matchId = (sub.id || '').toLowerCase().includes(query) || (sub.patientId || '').toLowerCase().includes(query);
      if (!matchName && !matchId) return false;
    }

    // Status filter
    if (statusFilter === 'high_risk' && !sub.hasHighRisk) return false;
    if (statusFilter === 'safe' && sub.hasHighRisk) return false;
    if (statusFilter === 'pending' && sub.ktvStatus && sub.ktvStatus !== 'pending') return false;

    // Date filter
    if (dateFilter && sub.submittedAt) {
      const subDate = sub.submittedAt.split('T')[0];
      if (subDate !== dateFilter) return false;
    }

    return true;
  });
}

/**
 * Render bảng danh sách bệnh nhân
 */
function renderPatientTable() {
  const tbody = document.getElementById('patient-table-body');
  if (!tbody) return;

  const list = getFilteredSubmissions();

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 40px; color: #94a3b8;">
          Không có phiếu khảo sát nào phù hợp.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map(sub => {
    const timeStr = formatDateTime(sub.submittedAt);
    const isRisk = sub.hasHighRisk;
    const genderIcon = sub.gender === 'female' ? '👩 Nữ' : '👨 Nam';

    let ktvStatusBadge = `<span class="badge-ktv-status pending">⏳ Chờ duyệt</span>`;
    if (sub.ktvStatus === 'safe') {
      ktvStatusBadge = `<span class="badge-ktv-status approved">🟢 Đủ ĐK chụp</span>`;
    } else if (sub.ktvStatus === 'warning') {
      ktvStatusBadge = `<span class="badge-ktv-status" style="background:#fef3c7; color:#b45309;">🟡 Cần hội chẩn</span>`;
    } else if (sub.ktvStatus === 'contraindicated') {
      ktvStatusBadge = `<span class="badge-ktv-status" style="background:#fee2e2; color:#dc2626;">🔴 Chống chỉ định</span>`;
    }

    return `
      <tr>
        <td><strong style="color: #0284c7;">${sub.id}</strong></td>
        <td style="font-size: 12.5px; color: #64748b;">${timeStr}</td>
        <td>
          <div style="font-weight: 700; color: #0f172a;">${sub.fullName}</div>
          ${sub.phone ? `<div style="font-size: 11.5px; color: #94a3b8;">📞 ${sub.phone}</div>` : ''}
        </td>
        <td>${sub.ageOrYob || '--'}</td>
        <td>${genderIcon}</td>
        <td style="color: #334155; font-weight: 500;">${sub.scanArea || 'Chưa chỉ định'}</td>
        <td>
          ${isRisk 
            ? `<span class="badge-risk-high">⚠️ NGUY CƠ CAO</span>` 
            : `<span class="badge-risk-safe">✅ Bình thường</span>`}
        </td>
        <td>${ktvStatusBadge}</td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 6px;">
            <button type="button" class="admin-btn secondary sm" onclick="openDetailModal('${sub.id}')" title="Xem chi tiết phiếu">
              👁️ Xem
            </button>
            <button type="button" class="admin-btn primary sm" onclick="printChecklistA4('${sub.id}')" title="In phiếu khổ A4">
              🖨️ In A4
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function formatDateTime(isoStr) {
  if (!isoStr) return '--:--';
  const d = new Date(isoStr);
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${hours}:${mins} • ${day}/${month}`;
}

/**
 * Xem chi tiết phiếu bệnh nhân & thẩm định KTV
 */
function initDetailModal() {
  const modal = document.getElementById('modal-patient-detail');
  const closeBtn = document.getElementById('btn-close-detail');
  closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });

  // Nút lưu đánh giá KTV
  document.getElementById('btn-save-ktv-eval').addEventListener('click', saveKtvEvaluation);
}

window.openDetailModal = function(id) {
  currentViewingId = id;
  const sub = allSubmissions.find(s => s.id === id);
  if (!sub) return;

  const modal = document.getElementById('modal-patient-detail');
  document.getElementById('detail-patient-name').textContent = sub.fullName;
  document.getElementById('detail-meta-line').textContent = `Mã phiếu: ${sub.id} • Thời gian nộp: ${new Date(sub.submittedAt).toLocaleString('vi-VN')}`;

  document.getElementById('dt-age').textContent = sub.ageOrYob || '--';
  document.getElementById('dt-gender').textContent = sub.gender === 'female' ? 'Nữ' : 'Nam';
  document.getElementById('dt-weight').textContent = sub.weight ? `${sub.weight} kg` : '--';
  document.getElementById('dt-phone').textContent = sub.phone || '--';
  document.getElementById('dt-dept').textContent = sub.departmentRoom || '--';
  document.getElementById('dt-type').textContent = sub.patientType === 'inpatient' ? 'Nội trú' : 'Ngoại trú';
  document.getElementById('dt-scanArea').textContent = sub.scanArea || 'Chưa rõ';

  // Banner rủi ro
  const riskBanner = document.getElementById('dt-risk-banner');
  if (sub.hasHighRisk) {
    riskBanner.style.display = 'block';
    riskBanner.style.background = '#fef2f2';
    riskBanner.style.border = '1.5px solid #f87171';
    riskBanner.style.color = '#991b1b';
    riskBanner.innerHTML = `⚠️ <strong>CẢNH BÁO NGUY CƠ CAO:</strong> Bệnh nhân có câu trả lời "CÓ" ở các mục khảo sát an toàn tuyệt đối (máy tạo nhịp, van nhân tạo, dị vật kim loại...). KTV cần kiểm tra kỹ trước khi đưa vào phòng chụp!`;
  } else {
    riskBanner.style.display = 'block';
    riskBanner.style.background = '#ecfdf5';
    riskBanner.style.border = '1px solid #a7f3d0';
    riskBanner.style.color = '#065f46';
    riskBanner.innerHTML = `✅ <strong>AN TOÀN CƠ BẢN:</strong> Không phát hiện chống chỉ định từ trường trong bảng kiểm.`;
  }

  // Render 15 câu hỏi (lấy theo tiếng Việt cho KTV dễ đọc)
  const qContainer = document.getElementById('dt-questions-list');
  const viQuestions = MRI_TRANSLATIONS['vi'].questions;
  const answers = sub.answers || {};

  qContainer.innerHTML = viQuestions.map(q => {
    const ansYes = answers[q.id] === true;
    const isDanger = ansYes && q.critical;
    return `
      <div class="dt-q-row ${isDanger ? 'danger' : ''}">
        <div>
          <span><strong>${q.id}.</strong> ${q.text}</span>
          ${q.critical ? `<span style="font-size:11px; opacity:0.8; margin-left:6px;">[Khảo sát bắt buộc]</span>` : ''}
        </div>
        <div style="font-weight: 800; font-size: 13.5px; padding-left: 12px;">
          ${ansYes ? '<span style="color:#dc2626;">⚠️ CÓ</span>' : '<span style="color:#059669;">✓ KHÔNG</span>'}
        </div>
      </div>
    `;
  }).join('');

  // Chữ ký
  const sigImg = document.getElementById('dt-sig-image');
  if (sub.signature) {
    sigImg.src = sub.signature;
    sigImg.style.display = 'block';
  } else {
    sigImg.style.display = 'none';
  }

  // Điền thông tin KTV trước đó nếu có
  document.getElementById('dt-ktv-status').value = sub.ktvStatus || (sub.hasHighRisk ? 'warning' : 'safe');
  document.getElementById('dt-ktv-name').value = sub.ktvName || (currentUser ? currentUser.fullName : '');
  document.getElementById('dt-ktv-notes').value = sub.ktvNotes || '';

  // Nút in từ modal
  document.getElementById('btn-print-from-detail').onclick = () => printChecklistA4(sub.id);

  modal.classList.add('open');
};

async function saveKtvEvaluation() {
  if (!currentViewingId) return;
  const sub = allSubmissions.find(s => s.id === currentViewingId);
  if (!sub) return;

  const ktvStatus = document.getElementById('dt-ktv-status').value;
  const ktvName = document.getElementById('dt-ktv-name').value.trim();
  const ktvNotes = document.getElementById('dt-ktv-notes').value.trim();

  sub.ktvStatus = ktvStatus;
  sub.ktvName = ktvName;
  sub.ktvNotes = ktvNotes;
  sub.reviewedAt = new Date().toISOString();

  try {
    await CloudDB.updateChecklist(sub.id, {
      ktvStatus,
      ktvName,
      ktvNotes,
      reviewedAt: sub.reviewedAt
    });
  } catch (err) {
    console.warn('Update cloud error:', err);
  }

  localStorage.setItem('mri_submissions', JSON.stringify(allSubmissions));
  updateStats();
  renderPatientTable();
  document.getElementById('modal-patient-detail').classList.remove('open');
  alert('Đã lưu đánh giá và phê duyệt an toàn của KTV thành công!');
}

/**
 * ========================================================
 * IN PHIẾU KHẢO SÁT AN TOÀN MRI KHỔ A4 TIÊU CHUẨN BỆNH VIỆN
 * ========================================================
 */
function initPrintHandlers() {
  // Có thể gắn sự kiện in bổ sung nếu cần
}

window.printChecklistA4 = function(id) {
  const sub = allSubmissions.find(s => s.id === id);
  if (!sub) return;

  const printArea = document.getElementById('print-a4-area');
  const d = new Date(sub.submittedAt);
  const dateStr = `${d.getHours().toString().padStart(2, '0')} giờ ${d.getMinutes().toString().padStart(2, '0')} phút, ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;

  const viQuestions = MRI_TRANSLATIONS['vi'].questions;
  const answers = sub.answers || {};

  let rowsHtml = '';
  viQuestions.forEach(q => {
    const isYes = answers[q.id] === true;
    rowsHtml += `
      <tr>
        <td class="print-center" style="width: 28px;">${q.id}</td>
        <td>${q.text}</td>
        <td class="print-center" style="width: 44px;">
          <span class="print-checkbox ${!isYes ? 'checked' : ''}">${!isYes ? 'X' : ''}</span>
        </td>
        <td class="print-center" style="width: 44px;">
          <span class="print-checkbox ${isYes ? 'checked' : ''}">${isYes ? 'X' : ''}</span>
        </td>
      </tr>
    `;
  });

  const ktvDecisionText = sub.ktvStatus === 'safe' 
    ? 'ĐỦ ĐIỀU KIỆN CHỤP AN TOÀN' 
    : (sub.ktvStatus === 'contraindicated' ? 'CHỐNG CHỈ ĐỊNH CHỤP MRI' : 'CẦN HỘI CHẨN THÊM');

  printArea.innerHTML = `
    <div class="print-page-a4">
      <!-- Header Table -->
      <table class="print-header-table">
        <tr>
          <td class="print-logo-cell">
            <img src="/brand/logo.jpg" alt="Logo" class="print-logo" />
          </td>
          <td>
            <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase;">${hospitalSettings.hospName}</div>
            <div style="font-size: 9pt; font-weight: bold; color: #334155;">${hospitalSettings.deptName}</div>
            <div style="font-size: 8pt; color: #64748b;">Số phiếu: <strong>${sub.id}</strong></div>
          </td>
          <td style="text-align: right; width: 140px; font-size: 8pt;">
            <div>Mã biểu mẫu: <strong>BM-MRI-01</strong></div>
            <div>Thời gian nộp:</div>
            <div><strong>${d.toLocaleTimeString('vi-VN')} - ${d.toLocaleDateString('vi-VN')}</strong></div>
          </td>
        </tr>
      </table>

      <!-- Title -->
      <div class="print-title">BẢNG KIỂM AN TOÀN CHỤP CỘNG HƯỞNG TỪ (MRI)</div>
      <div class="print-subtitle">(Ban hành kèm theo quy trình an toàn người bệnh trước chụp MRI)</div>

      <!-- Patient Demographics -->
      <table class="print-info-table">
        <tr>
          <td style="width: 50%;"><span class="print-label">Họ và tên người bệnh:</span> <strong style="text-transform: uppercase; font-size: 10.5pt;">${sub.fullName}</strong></td>
          <td style="width: 25%;"><span class="print-label">Tuổi/Năm sinh:</span> ${sub.ageOrYob || '--'}</td>
          <td style="width: 25%;"><span class="print-label">Giới tính:</span> ${sub.gender === 'female' ? 'Nữ' : 'Nam'}</td>
        </tr>
        <tr>
          <td><span class="print-label">Mã số BN (ID/Số BA):</span> ${sub.patientId || '--'}</td>
          <td><span class="print-label">Cân nặng:</span> ${sub.weight ? `${sub.weight} kg` : '--'}</td>
          <td><span class="print-label">Đối tượng:</span> ${sub.patientType === 'inpatient' ? 'Nội trú' : 'Ngoại trú'}</td>
        </tr>
        <tr>
          <td><span class="print-label">Khoa / Phòng:</span> ${sub.departmentRoom || '--'}</td>
          <td colspan="2"><span class="print-label">Số điện thoại liên hệ:</span> ${sub.phone || '--'}</td>
        </tr>
        <tr>
          <td colspan="3"><span class="print-label">Chỉ định khảo sát (Vùng chụp):</span> <strong>${sub.scanArea || 'Chưa ghi rõ'}</strong></td>
        </tr>
      </table>

      <!-- 15 Safety Questions Table -->
      <table class="print-questions-table">
        <thead>
          <tr>
            <th style="width: 28px;">STT</th>
            <th>Nội dung khảo sát các yếu tố an toàn từ trường & kỹ thuật</th>
            <th style="width: 44px;">KHÔNG</th>
            <th style="width: 44px;">CÓ</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <!-- Commitment & Signatures -->
      <div style="font-size: 8pt; font-style: italic; margin-top: 4px; line-height: 1.25;">
        * Người bệnh/thân nhân cam kết các thông tin khai trên là hoàn toàn chính xác. Kỹ thuật viên đã kiểm tra lại các vật dụng kim loại và đối chiếu an toàn trước khi cho người bệnh vào phòng máy MRI.
      </div>

      <table class="print-signature-section">
        <tr>
          <td>
            <div style="font-weight: bold; text-transform: uppercase;">NGƯỜI BỆNH / THÂN NHÂN KÝ TÊN</div>
            <div style="font-size: 8pt; font-style: italic; color: #475569;">(Ký và ghi rõ họ tên)</div>
            ${sub.signature ? `<img src="${sub.signature}" class="print-sig-img" alt="Chữ ký" />` : '<div style="height: 48px;"></div>'}
            <div style="font-weight: bold;">${sub.fullName}</div>
          </td>
          <td>
            <div style="font-style: italic; font-size: 8.5pt;">${dateStr}</div>
            <div style="font-weight: bold; text-transform: uppercase;">KỸ THUẬT VIÊN THẨM ĐỊNH AN TOÀN</div>
            <div style="font-size: 8pt; color: #0284c7; font-weight: bold;">[ ${ktvDecisionText} ]</div>
            <div style="height: 40px; line-height: 40px; font-size: 9pt; color: #059669; font-weight: bold;">✓ ĐÃ DUYỆT ĐIỀU KIỆN CHỤP</div>
            <div style="font-weight: bold;">${sub.ktvName || (currentUser ? currentUser.fullName : 'KTV MRI')}</div>
          </td>
        </tr>
      </table>
    </div>
  `;

  // Gọi in
  printArea.style.display = 'block';
  window.print();
  printArea.style.display = 'none';
};

/**
 * ========================================================
 * POSTER MÃ QR DÁN PHÒNG CHỤP A4
 * ========================================================
 */
function initPosterTab() {
  const urlInp = document.getElementById('inp-poster-url');
  if (urlInp) {
    urlInp.value = window.location.origin;
  }

  document.getElementById('btn-update-poster-qr').addEventListener('click', updatePosterQR);
  document.getElementById('btn-print-poster').addEventListener('click', printPosterA4);
}

function updatePosterQR() {
  const urlInp = document.getElementById('inp-poster-url');
  const targetUrl = (urlInp && urlInp.value) ? urlInp.value.trim() : window.location.origin;
  const qrBox = document.getElementById('poster-qr-svg-container');

  if (qrBox && window.QRCode) {
    qrBox.innerHTML = window.QRCode.generateSVG(targetUrl, 200);
  }
}

function printPosterA4() {
  const posterFrame = document.querySelector('.poster-a4-frame');
  if (!posterFrame) return;

  const printArea = document.getElementById('print-a4-area');
  printArea.innerHTML = `
    <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 20px;">
      ${posterFrame.outerHTML}
    </div>
  `;

  printArea.style.display = 'block';
  window.print();
  printArea.style.display = 'none';
}

/**
 * ========================================================
 * PHÂN QUYỀN TÀI KHOẢN KTV CẤP DƯỚI (USER MANAGEMENT)
 * ========================================================
 */
let userAccounts = [];

async function initUserManagement() {
  const modal = document.getElementById('modal-create-user');
  const openBtn = document.getElementById('btn-open-create-user-modal');
  const closeBtn = document.getElementById('btn-close-create-user');
  const form = document.getElementById('form-create-user');

  if (openBtn) openBtn.addEventListener('click', () => modal.classList.add('open'));
  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('open'));

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fullName = document.getElementById('new-user-fullname').value.trim();
      const username = document.getElementById('new-user-name').value.trim().toLowerCase();
      const password = document.getElementById('new-user-pass').value.trim();
      const role = document.getElementById('new-user-role').value;

      if (!password) {
        alert('Vui lòng nhập mật khẩu đăng nhập cho KTV!');
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang tạo tài khoản...';
      }

      const newUser = {
        id: 'u_' + Date.now(),
        username: username,
        password: password,
        fullName: fullName,
        role: role,
        active: true,
        createdAt: new Date().toISOString().split('T')[0]
      };

      await CloudDB.saveUser(newUser);
      userAccounts = await CloudDB.getUsers();
      form.reset();
      modal.classList.remove('open');
      renderUserList();

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Tạo tài khoản KTV';
      }

      alert(`Đã cấp tài khoản thành công!\n\n• Họ và tên: ${fullName}\n• Tên đăng nhập: ${username}\n• Mật khẩu: ${password}\n• Vai trò: ${role.toUpperCase()}`);
    });
  }

  // Tải danh sách tài khoản từ Cloud / LocalStorage
  userAccounts = await CloudDB.getUsers();
  renderUserList();
}

function renderUserList() {
  const tbody = document.getElementById('user-table-body');
  if (!tbody) return;

  if (!userAccounts || userAccounts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;">Chưa có tài khoản nào.</td></tr>';
    return;
  }

  tbody.innerHTML = userAccounts.map(u => {
    const isRoot = (u.username || '').toLowerCase() === 'admin';
    const pwdDisplay = u.password ? u.password : 'mrivinhphucvpi';

    return `
      <tr>
        <td><strong>${u.fullName || u.username}</strong></td>
        <td>
          <code>${u.username}</code>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
            Mật khẩu: <span style="font-weight: 600; color: #0284c7;">${pwdDisplay}</span>
          </div>
        </td>
        <td>
          <span class="user-role-tag" style="background: ${u.role === 'admin' ? '#0284c7' : '#0d9488'};">
            ${(u.role || 'ktv').toUpperCase()}
          </span>
        </td>
        <td>
          <span style="color: ${u.active ? '#059669' : '#dc2626'}; font-weight: 600;">
            ${u.active ? '● Đang hoạt động' : '○ Tạm khóa'}
          </span>
        </td>
        <td style="color: #64748b; font-size: 12.5px;">${u.createdAt || '2026-09-01'}</td>
        <td style="text-align: right; white-space: nowrap;">
          ${!isRoot ? `
            <button type="button" class="admin-btn secondary sm" onclick="resetUserPassword('${u.username}')" title="Đổi mật khẩu cho KTV này">
              🔑 Đổi MK
            </button>
            <button type="button" class="admin-btn secondary sm" onclick="toggleUserActive('${u.username}')">
              ${u.active ? 'Khóa' : 'Mở'}
            </button>
            <button type="button" class="admin-btn danger sm" onclick="deleteUser('${u.username}')">
              Xóa
            </button>
          ` : '<span style="font-size:12px; color:#94a3b8; font-style:italic;">Tài khoản gốc</span>'}
        </td>
      </tr>
    `;
  }).join('');
}

window.toggleUserActive = async function(username) {
  const u = userAccounts.find(x => (x.username || '').toLowerCase() === (username || '').toLowerCase());
  if (u) {
    u.active = !u.active;
    await CloudDB.saveUser(u);
    userAccounts = await CloudDB.getUsers();
    renderUserList();
  }
};

window.resetUserPassword = async function(username) {
  const u = userAccounts.find(x => (x.username || '').toLowerCase() === (username || '').toLowerCase());
  if (!u) return;

  const newPass = prompt(`Nhập mật khẩu mới cho KTV "${u.fullName || u.username}":`, u.password || '123456');
  if (newPass && newPass.trim()) {
    u.password = newPass.trim();
    await CloudDB.saveUser(u);
    userAccounts = await CloudDB.getUsers();
    renderUserList();
    alert(`Đã đổi mật khẩu cho ${u.fullName || u.username} thành: ${newPass.trim()}`);
  }
};

window.deleteUser = async function(username) {
  if (!confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản "${username}" không?`)) return;
  await CloudDB.deleteUser(username);
  userAccounts = await CloudDB.getUsers();
  renderUserList();
};
};

/**
 * ========================================================
 * CẤU HÌNH ĐƠN VỊ
 * ========================================================
 */
function initSettings() {
  const form = document.getElementById('settings-form');
  const saved = localStorage.getItem('mri_hospital_settings');
  if (saved) {
    try {
      hospitalSettings = JSON.parse(saved);
      document.getElementById('set-hosp-name').value = hospitalSettings.hospName || '';
      document.getElementById('set-dept-name').value = hospitalSettings.deptName || '';
      document.getElementById('set-quick-pin').value = hospitalSettings.quickPin || '';
      document.getElementById('set-lead-doctor').value = hospitalSettings.leadDoctor || '';

      document.getElementById('poster-disp-hosp').textContent = hospitalSettings.hospName;
      document.getElementById('poster-disp-dept').textContent = hospitalSettings.deptName;
    } catch (e) {}
  }

  // Khởi tạo cấu hình Cloud DB
  const cloudCfg = CloudDB.getConfig();
  const firebaseUrlInp = document.getElementById('set-firebase-url');
  const statusBadge = document.getElementById('cloud-status-badge');

  if (firebaseUrlInp) {
    firebaseUrlInp.value = cloudCfg.firebaseUrl || '';
    if (cloudCfg.firebaseUrl) {
      statusBadge.textContent = '● Đang đồng bộ Online';
      statusBadge.style.background = '#ecfdf5';
      statusBadge.style.color = '#059669';
    } else {
      statusBadge.textContent = '○ Chưa cấu hình (Nội bộ)';
      statusBadge.style.background = '#fef3c7';
      statusBadge.style.color = '#b45309';
    }
  }

  // Thử tự động nạp từ /api/config nếu KTV chưa nhập
  fetch('/api/config').then(r => r.json()).then(cfg => {
    if (cfg.firebaseUrl && firebaseUrlInp && !firebaseUrlInp.value) {
      firebaseUrlInp.value = cfg.firebaseUrl;
      CloudDB.saveConfig({ ...CloudDB.getConfig(), firebaseUrl: cfg.firebaseUrl });
      statusBadge.textContent = '● Đang đồng bộ Online (Vercel Env)';
      statusBadge.style.background = '#ecfdf5';
      statusBadge.style.color = '#059669';
    }
  }).catch(() => {});

  // Nút Lưu & Bật đồng bộ
  const btnSaveCloud = document.getElementById('btn-save-cloud-db');
  if (btnSaveCloud) {
    btnSaveCloud.addEventListener('click', () => {
      const url = firebaseUrlInp.value.trim();
      CloudDB.saveConfig({ type: 'firebase', firebaseUrl: url });
      if (url) {
        statusBadge.textContent = '● Đang đồng bộ Online';
        statusBadge.style.background = '#ecfdf5';
        statusBadge.style.color = '#059669';
        alert('Đã kích hoạt đồng bộ đám mây thành công! Bệnh nhân và KTV sẽ được kết nối trực tiếp.');
        fetchSubmissions();
        setupRealtimeSubscription();
      } else {
        statusBadge.textContent = '○ Chưa cấu hình (Nội bộ)';
        statusBadge.style.background = '#fef3c7';
        statusBadge.style.color = '#b45309';
      }
    });
  }

  // Nút Thử kết nối
  const btnTestCloud = document.getElementById('btn-test-cloud-db');
  const testResultEl = document.getElementById('cloud-test-result');
  if (btnTestCloud) {
    btnTestCloud.addEventListener('click', async () => {
      const url = firebaseUrlInp.value.trim();
      if (!url) {
        alert('Vui lòng nhập đường dẫn Firebase Database URL trước khi thử kết nối!');
        return;
      }
      testResultEl.style.display = 'block';
      testResultEl.style.background = '#f1f5f9';
      testResultEl.style.color = '#334155';
      testResultEl.textContent = 'Đang kiểm tra kết nối tới máy chủ đám mây...';

      try {
        let cleanUrl = url.replace(/\/+$/, '');
        if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl;
        const pingUrl = `${cleanUrl}/_ping.json`;

        const resp = await fetch(pingUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ping: Date.now(), test: 'OK' })
        });

        if (resp.ok) {
          testResultEl.style.background = '#ecfdf5';
          testResultEl.style.border = '1px solid #a7f3d0';
          testResultEl.style.color = '#065f46';
          testResultEl.innerHTML = '✅ <strong>KẾT NỐI ĐÁM MÂY THÀNH CÔNG!</strong> Cơ sở dữ liệu Firebase phản hồi tốt. Hệ thống đã sẵn sàng 100% online cho bệnh nhân và KTV.';
        } else {
          throw new Error(`Mã lỗi HTTP: ${resp.status}`);
        }
      } catch (err) {
        testResultEl.style.background = '#fef2f2';
        testResultEl.style.border = '1px solid #fecaca';
        testResultEl.style.color = '#991b1b';
        testResultEl.innerHTML = `❌ <strong>KẾT NỐI THẤT BẠI:</strong> ${err.message}. Vui lòng kiểm tra lại URL Firebase và đảm bảo quyền Rules trong Firebase đã đặt <code>".read": true, ".write": true</code>.`;
      }
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      hospitalSettings = {
        hospName: document.getElementById('set-hosp-name').value.trim(),
        deptName: document.getElementById('set-dept-name').value.trim(),
        quickPin: document.getElementById('set-quick-pin').value.trim(),
        leadDoctor: document.getElementById('set-lead-doctor').value.trim()
      };
      localStorage.setItem('mri_hospital_settings', JSON.stringify(hospitalSettings));
      document.getElementById('poster-disp-hosp').textContent = hospitalSettings.hospName;
      document.getElementById('poster-disp-dept').textContent = hospitalSettings.deptName;
      alert('Đã cập nhật thông tin đơn vị thành công!');
    });
  }

  setupRealtimeSubscription();
}

function setupRealtimeSubscription() {
  CloudDB.subscribeRealtime((newChecklist) => {
    if (newChecklist && newChecklist.id) {
      if (!knownSubmissionIds.has(newChecklist.id)) {
        knownSubmissionIds.add(newChecklist.id);
        playNotificationChime();
        fetchSubmissions();
      }
    }
  });
}

/**
 * Xuất dữ liệu ra file CSV / Excel
 */
function exportToCSV() {
  if (allSubmissions.length === 0) {
    alert('Chưa có dữ liệu phiếu để xuất!');
    return;
  }

  let csv = '\uFEFF'; // UTF-8 BOM
  csv += 'Mã phiếu,Thời gian nộp,Họ và tên,Năm sinh,Giới tính,SĐT,Khoa phòng,Đối tượng,Chỉ định chụp,Đánh giá an toàn,Trạng thái KTV,KTV phụ trách\n';

  allSubmissions.forEach(s => {
    const riskText = s.hasHighRisk ? 'NGUY CƠ CAO' : 'Bình thường';
    csv += `"${s.id}","${s.submittedAt}","${s.fullName}","${s.ageOrYob || ''}","${s.gender === 'female' ? 'Nữ' : 'Nam'}","${s.phone || ''}","${s.departmentRoom || ''}","${s.patientType || ''}","${s.scanArea || ''}","${riskText}","${s.ktvStatus || 'Chờ duyệt'}","${s.ktvName || ''}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Danh_Sach_Bang_Kiem_MRI_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
