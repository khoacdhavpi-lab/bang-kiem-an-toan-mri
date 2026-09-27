/**
 * Frontend Logic cho Bệnh nhân điền Bảng kiểm an toàn MRI
 */

let currentLang = 'vi';
let selectedGender = 'male';
let selectedPatientType = 'outpatient';
let questionAnswers = {};
let questionDetails = {};
let sigPad = null;

document.addEventListener('DOMContentLoaded', () => {
  initLanguageButtons();
  initSignaturePad();
  initToggleButtons();
  initInstructionAccordion();
  initStaffLoginModal();
  initFormSubmission();
  initPresetSelections();

  // Áp dụng ngôn ngữ mặc định
  applyLanguage(currentLang);
});

/**
 * Khởi tạo danh sách 13 ngôn ngữ
 */
function initLanguageButtons() {
  const container = document.getElementById('lang-button-container');
  if (!container) return;

  container.innerHTML = '';
  const langKeys = Object.keys(MRI_TRANSLATIONS);

  langKeys.forEach((code) => {
    const lang = MRI_TRANSLATIONS[code];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `lang-btn ${code === currentLang ? 'active' : ''}`;
    btn.dataset.lang = code;
    btn.innerHTML = `<span>${lang.flag}</span> <span>${lang.name}</span>`;

    btn.addEventListener('click', () => {
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyLanguage(code);
    });

    container.appendChild(btn);
  });
}

/**
 * Cập nhật toàn bộ giao diện theo ngôn ngữ đã chọn
 */
function applyLanguage(code) {
  if (!MRI_TRANSLATIONS[code]) return;
  currentLang = code;
  const t = MRI_TRANSLATIONS[code];

  // Đặt hướng văn bản (LTR hoặc RTL cho Ả Rập)
  document.documentElement.dir = t.dir || 'ltr';
  document.documentElement.lang = code;

  // Header & Brand
  setText('txt-header-dept', t.department);
  setText('txt-header-sub', t.subTitle);
  setText('txt-select-language', `🌐 ${t.selectLanguage}`);

  // Instructions
  setText('txt-instructions-title', t.instructionsTitle);
  setText('txt-instructions-subtitle', t.instructionsSubtitle);
  setText('txt-intro', t.introText);
  setText('txt-section1-title', t.section1Title);
  setText('txt-section2-title', t.section2Title);
  setText('txt-start-btn', t.startBtn);

  // Danh sách hướng dẫn
  renderInstructionList('list-section1', t.section1Points);
  renderInstructionList('list-section2', t.section2Points);

  // Demographic Form Labels & Placeholders
  setText('txt-patient-info-title', t.patientInfoTitle);
  setText('lbl-fullName', t.fullName);
  setPlaceholder('inp-fullName', t.fullNamePlaceholder);
  setText('lbl-patientId', t.patientId);
  setPlaceholder('inp-patientId', t.patientIdPlaceholder);
  setText('lbl-ageOrYob', t.ageOrYob);
  setPlaceholder('inp-ageOrYob', t.ageOrYobPlaceholder);
  setText('lbl-gender', t.gender);
  setText('lbl-male', t.male);
  setText('lbl-female', t.female);
  setText('lbl-weight', t.weight);
  setPlaceholder('inp-weight', t.weightPlaceholder);
  setText('lbl-phone', t.phone);
  setPlaceholder('inp-phone', t.phonePlaceholder);
  setText('lbl-patientType', t.patientType);
  setText('lbl-inpatient', t.inpatient);
  setText('lbl-outpatient', t.outpatient);
  setText('lbl-departmentRoom', t.departmentRoom);
  setPlaceholder('inp-departmentRoom', t.departmentRoomPlaceholder);
  setText('lbl-scanArea', t.scanArea);
  setPlaceholder('inp-scanArea', t.scanAreaPlaceholder);

  // Questions header
  setText('txt-questions-title', t.questionsTitle);
  setText('txt-questions-warning', t.questionsWarningNotice);

  // Render questions
  renderQuestions(t);

  // Consent & Signature
  setText('txt-consent-title', t.consentTitle);
  setText('txt-consent-checkbox', t.consentCheckbox);
  setText('lbl-signature', t.signatureLabel);
  setText('txt-signature-placeholder', t.signaturePlaceholder);
  setText('lbl-clear-signature', t.clearSignature);
  setText('txt-submit-btn', t.submitBtn);

  // Footer
  setText('txt-footer-quote', t.footerQuote);
  setText('txt-footer-notice', t.footerNotice);
  setText('txt-staff-portal-btn', t.staffPortalBtn);
}

function renderInstructionList(containerId, points) {
  const container = document.getElementById(containerId);
  if (!container || !points) return;
  container.innerHTML = points.map(pt => `<li>${pt}</li>`).join('');
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el && text !== undefined) el.textContent = text;
}

function setPlaceholder(id, ph) {
  const el = document.getElementById(id);
  if (el && ph !== undefined) el.placeholder = ph;
}

/**
 * Hiển thị danh sách 15 câu hỏi
 */
function renderQuestions(t) {
  const container = document.getElementById('questions-container');
  if (!container) return;

  container.innerHTML = '';
  let femaleCard = null;

  t.questions.forEach((q) => {
    // Thiết lập giá trị mặc định nếu chưa có
    if (questionAnswers[q.id] === undefined) {
      questionAnswers[q.id] = false; // Mặc định là Không (an toàn)
    }

    const item = document.createElement('div');
    item.className = 'question-item';
    item.id = `q-item-${q.id}`;

    const isCurrentYes = questionAnswers[q.id] === true;
    const currentDetailVal = questionDetails[q.id] || '';

    item.innerHTML = `
      <div class="question-main-row">
        <div class="question-text-block">
          <p class="question-title">
            <span class="question-number">${q.id}.</span> ${q.text}
          </p>
          ${q.critical ? `<span class="critical-badge">${t.criticalBadge || '⚠️ Khảo sát kỹ thuật an toàn bắt buộc'}</span>` : ''}
        </div>
        <div class="choice-actions">
          <button type="button" class="choice-btn no-btn ${!isCurrentYes ? 'selected' : ''}" data-qid="${q.id}" data-val="no">
            <span>✓</span> <span>${t.no}</span>
          </button>
          <button type="button" class="choice-btn yes-btn ${isCurrentYes ? 'selected' : ''}" data-qid="${q.id}" data-val="yes">
            <span>⚠️</span> <span>${t.yes}</span>
          </button>
        </div>
      </div>
      <div class="question-detail-box" id="q-detail-${q.id}" style="${isCurrentYes ? 'display: block;' : 'display: none;'}">
        <label class="question-detail-label" for="inp-q-detail-${q.id}">
          ✍️ <span>${t.specifyDetailLabel || 'Ghi rõ nội dung chi tiết:'}</span>
        </label>
        <input type="text" 
               class="question-detail-input" 
               id="inp-q-detail-${q.id}" 
               placeholder="" 
               value="${currentDetailVal.replace(/"/g, '&quot;')}" />
      </div>
    `;

    // Gắn sự kiện chọn Có / Không
    const noBtn = item.querySelector('.no-btn');
    const yesBtn = item.querySelector('.yes-btn');
    const detailBox = item.querySelector(`#q-detail-${q.id}`);
    const detailInp = item.querySelector(`#inp-q-detail-${q.id}`);

    noBtn.addEventListener('click', () => {
      questionAnswers[q.id] = false;
      noBtn.classList.add('selected');
      yesBtn.classList.remove('selected');
      if (detailBox) detailBox.style.display = 'none';
      if (detailInp) {
        detailInp.value = '';
        delete questionDetails[q.id];
      }
    });

    yesBtn.addEventListener('click', () => {
      questionAnswers[q.id] = true;
      yesBtn.classList.add('selected');
      noBtn.classList.remove('selected');
      if (detailBox) {
        detailBox.style.display = 'block';
        if (detailInp) detailInp.focus();
      }
    });

    if (detailInp) {
      detailInp.addEventListener('input', () => {
        questionDetails[q.id] = detailInp.value.trim();
      });
    }

    // Nếu là câu hỏi dành riêng cho phụ nữ, bỏ vào khung hồng riêng
    if (q.femaleOnly) {
      if (!femaleCard) {
        femaleCard = document.createElement('div');
        femaleCard.className = 'female-section-card';
        femaleCard.id = 'female-section-card';
        femaleCard.style.display = selectedGender === 'female' ? 'block' : 'none';
        femaleCard.innerHTML = `
          <div class="female-section-title">
            <span>🌸</span> <span>${t.femaleSectionTitle || 'PHẦN DÀNH RIÊNG CHO PHỤ NỮ'}</span>
          </div>
        `;
        container.appendChild(femaleCard);
      }
      femaleCard.appendChild(item);
    } else {
      container.appendChild(item);
    }
  });

  if (femaleCard) {
    femaleCard.style.display = selectedGender === 'female' ? 'block' : 'none';
  }
}

/**
 * Khởi tạo bảng chữ ký
 */
function initSignaturePad() {
  const canvas = document.getElementById('signature-canvas');
  const placeholder = document.getElementById('signature-placeholder');
  if (!canvas) return;

  sigPad = new SignaturePad(canvas, {
    placeholderEl: placeholder,
    strokeColor: '#0f172a',
    lineWidth: 2.5
  });

  const clearBtn = document.getElementById('btn-clear-signature');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      sigPad.clear();
    });
  }
}

/**
 * Nút chuyển đổi Giới tính & Đối tượng điều trị
 */
function initToggleButtons() {
  // Giới tính
  const maleBtn = document.getElementById('btn-gender-male');
  const femaleBtn = document.getElementById('btn-gender-female');

  if (maleBtn && femaleBtn) {
    maleBtn.addEventListener('click', () => {
      selectedGender = 'male';
      maleBtn.classList.add('active');
      femaleBtn.classList.remove('active');
      updateFemaleQuestionsVisibility(false);
    });

    femaleBtn.addEventListener('click', () => {
      selectedGender = 'female';
      femaleBtn.classList.add('active');
      maleBtn.classList.remove('active');
      updateFemaleQuestionsVisibility(true);
    });
  }

  // Đối tượng bệnh nhân
  const inpatientBtn = document.getElementById('btn-type-inpatient');
  const outpatientBtn = document.getElementById('btn-type-outpatient');

  if (inpatientBtn && outpatientBtn) {
    inpatientBtn.addEventListener('click', () => {
      selectedPatientType = 'inpatient';
      inpatientBtn.classList.add('active');
      outpatientBtn.classList.remove('active');
    });

    outpatientBtn.addEventListener('click', () => {
      selectedPatientType = 'outpatient';
      outpatientBtn.classList.add('active');
      inpatientBtn.classList.remove('active');
    });
  }
}

function updateFemaleQuestionsVisibility(show) {
  const femaleCard = document.getElementById('female-section-card');
  if (femaleCard) {
    femaleCard.style.display = show ? 'block' : 'none';
    if (!show) {
      [8, 9].forEach(id => {
        questionAnswers[id] = false;
        delete questionDetails[id];
        const noBtn = document.querySelector(`.no-btn[data-qid="${id}"]`);
        const yesBtn = document.querySelector(`.yes-btn[data-qid="${id}"]`);
        if (noBtn) noBtn.classList.add('selected');
        if (yesBtn) yesBtn.classList.remove('selected');
        const detailBox = document.getElementById(`q-detail-${id}`);
        if (detailBox) detailBox.style.display = 'none';
        const detailInp = document.getElementById(`inp-q-detail-${id}`);
        if (detailInp) detailInp.value = '';
      });
    }
  }
}

/**
 * Đóng/mở khung hướng dẫn
 */
function initInstructionAccordion() {
  const header = document.getElementById('btn-toggle-instructions');
  const body = document.getElementById('instruction-content');
  const icon = document.getElementById('instruction-toggle-icon');
  const scrollBtn = document.getElementById('btn-scroll-to-form');

  if (header && body && icon) {
    header.addEventListener('click', () => {
      const isOpen = body.style.display !== 'none';
      body.style.display = isOpen ? 'none' : 'block';
      icon.textContent = isOpen ? '▼' : '▲';
    });
  }

  if (scrollBtn) {
    scrollBtn.addEventListener('click', () => {
      const formEl = document.getElementById('form-patient-anchor');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
}

/**
 * Xử lý nộp form an toàn
 */
function initFormSubmission() {
  const form = document.getElementById('patient-safety-form');
  const submitBtn = document.getElementById('btn-submit-form');
  const txtSubmitBtn = document.getElementById('txt-submit-btn');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const t = MRI_TRANSLATIONS[currentLang] || MRI_TRANSLATIONS['vi'];

    // 1. Kiểm tra họ tên và tuổi
    const fullName = document.getElementById('inp-fullName').value.trim();
    const ageOrYob = document.getElementById('inp-ageOrYob').value.trim();
    const consentChecked = document.getElementById('chk-consent').checked;

    if (!fullName || !ageOrYob || !consentChecked) {
      alert(t.requiredFieldsMissing || 'Vui lòng điền đầy đủ các thông tin bắt buộc (*)!');
      return;
    }

    // 2. Kiểm tra chữ ký
    if (!sigPad || sigPad.isEmpty()) {
      alert(t.signatureLabel || 'Vui lòng vẽ chữ ký xác nhận của bạn vào ô chữ ký!');
      document.getElementById('signature-container').scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Thu thập dữ liệu
    const signatureDataUrl = sigPad.toDataURL();
    const payload = {
      language: currentLang,
      fullName: fullName,
      patientId: document.getElementById('inp-patientId').value.trim(),
      ageOrYob: ageOrYob,
      gender: selectedGender,
      weight: document.getElementById('inp-weight').value.trim(),
      phone: document.getElementById('inp-phone').value.trim(),
      departmentRoom: document.getElementById('inp-departmentRoom').value.trim(),
      patientType: selectedPatientType,
      scanArea: document.getElementById('inp-scanArea').value.trim(),
      answers: questionAnswers,
      answerDetails: questionDetails,
      signature: signatureDataUrl,
      submittedAt: new Date().toISOString()
    };

    // Kiểm tra mức độ rủi ro (Risk Evaluation)
    // Các câu hỏi rủi ro cao: 1, 2, 3, 6, 8
    const criticalQuestions = [1, 2, 3, 6, 8];
    let hasHighRisk = false;
    criticalQuestions.forEach(id => {
      if (questionAnswers[id] === true) hasHighRisk = true;
    });
    payload.hasHighRisk = hasHighRisk;

    // Hiển thị trạng thái đang gửi
    submitBtn.disabled = true;
    txtSubmitBtn.textContent = t.submitting || 'Đang gửi...';

    try {
      // Tự động nạp cấu hình đám mây từ /api/config nếu chưa có
      if (!CloudDB.getConfig().firebaseUrl) {
        try {
          const cfgRes = await fetch('/api/config');
          if (cfgRes.ok) {
            const cfg = await cfgRes.json();
            if (cfg.firebaseUrl) {
              CloudDB.saveConfig({ ...CloudDB.getConfig(), firebaseUrl: cfg.firebaseUrl });
            }
          }
        } catch (e) {}
      }

      const result = await CloudDB.submitChecklist(payload);

      // Hiển thị modal thành công
      showSuccessModal(result.id || payload.id, payload.submittedAt);

      // Reset form
      form.reset();
      sigPad.clear();
      resetPresetSelections();
      questionDetails = {};
      // Đặt lại câu trả lời về Không
      Object.keys(questionAnswers).forEach(k => { questionAnswers[k] = false; });
      applyLanguage(currentLang);

    } catch (error) {
      console.error('Lỗi khi gửi bảng kiểm:', error);
      alert('Không thể gửi thông tin. Vui lòng báo trực tiếp với Kỹ thuật viên!');
    } finally {
      submitBtn.disabled = false;
      txtSubmitBtn.textContent = t.submitBtn || 'GỬI BẢNG KIỂM AN TOÀN';
    }
  });
}

function showSuccessModal(id, isoTime) {
  const modal = document.getElementById('success-modal');
  const codeEl = document.getElementById('modal-patient-code');
  const timeEl = document.getElementById('modal-patient-time');
  const closeBtn = document.getElementById('btn-close-success-modal');

  if (codeEl) codeEl.textContent = id;
  if (timeEl) {
    const d = new Date(isoTime);
    timeEl.textContent = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} - ${d.toLocaleDateString('vi-VN')}`;
  }

  modal.classList.add('open');

  closeBtn.onclick = () => {
    modal.classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
}

/**
 * Xử lý đăng nhập cổng KTV
 */
function initStaffLoginModal() {
  const modal = document.getElementById('staff-login-modal');
  const openBtn1 = document.getElementById('btn-open-staff-login');
  const openBtn2 = document.getElementById('btn-open-staff-login-header');
  const closeBtn = document.getElementById('btn-close-staff-modal');
  const loginForm = document.getElementById('staff-login-form');
  const errBox = document.getElementById('staff-login-error');

  const openModal = () => {
    // Nếu đã đăng nhập trước đó thì chuyển thẳng sang admin
    const token = localStorage.getItem('mri_staff_token');
    if (token) {
      window.location.href = '/admin/';
      return;
    }
    modal.classList.add('open');
    document.getElementById('inp-staff-pass').focus();
  };

  if (openBtn1) openBtn1.addEventListener('click', openModal);
  if (openBtn2) openBtn2.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('open'));

  // Đóng modal khi bấm ra ngoài
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      errBox.style.display = 'none';

      const user = document.getElementById('inp-staff-user').value.trim();
      const pass = document.getElementById('inp-staff-pass').value.trim();
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Đang xác thực...';
      }

      try {
        const authRes = await CloudDB.authenticate(user, pass);
        if (authRes.success && authRes.user) {
          localStorage.setItem('mri_staff_token', 'token_' + Date.now());
          localStorage.setItem('mri_staff_user', JSON.stringify(authRes.user));
          window.location.href = '/admin/';
          return;
        } else {
          errBox.textContent = authRes.message || 'Mật khẩu không chính xác! Vui lòng thử lại.';
          errBox.style.display = 'block';
        }
      } catch (err) {
        errBox.textContent = 'Lỗi kết nối xác thực: ' + (err.message || 'Vui lòng thử lại');
        errBox.style.display = 'block';
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '🚀 ĐĂNG NHẬP HỆ THỐNG KTV';
        }
      }
    });
  }
}

/**
 * ========================================================
 * DANH MỤC CHỌN NHANH KHOA / PHÒNG & CHỈ ĐỊNH CHỤP MRI
 * ========================================================
 */
let selectedScanAreas = new Set();

async function initPresetSelections() {
  const deptSelect = document.getElementById('sel-departmentRoom');
  const deptChipsContainer = document.getElementById('dept-chips-container');
  const inpDept = document.getElementById('inp-departmentRoom');

  const scanChipsContainer = document.getElementById('scan-chips-container');
  const inpScan = document.getElementById('inp-scanArea');

  // Lấy cài đặt từ CloudDB hoặc danh mục chuẩn y khoa mặc định
  let settings = null;
  try {
    settings = await CloudDB.getHospitalSettings();
  } catch (e) {}

  const depts = (settings && Array.isArray(settings.departments) && settings.departments.length > 0)
    ? settings.departments
    : [
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
      ];

  const scanAreas = (settings && Array.isArray(settings.scanAreas) && settings.scanAreas.length > 0)
    ? settings.scanAreas
    : [
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
      ];

  // Helper gán icon theo vùng chụp
  function getScanIcon(name) {
    const n = name.toLowerCase();
    if (n.includes('sọ') || n.includes('não') || n.includes('mra') || n.includes('mạch')) return '🧠';
    if (n.includes('cột sống') || n.includes('lưng') || n.includes('cổ') || n.includes('ngực')) return '🦴';
    if (n.includes('gối') || n.includes('chân')) return '🦵';
    if (n.includes('vai') || n.includes('tay')) return '💪';
    if (n.includes('háng')) return '🦴';
    if (n.includes('bụng') || n.includes('chậu')) return '🫄';
    if (n.includes('gan') || n.includes('mật') || n.includes('tụy')) return '🫁';
    if (n.includes('vú')) return '🌸';
    if (n.includes('tim')) return '🫀';
    return '🔍';
  }

  // 1. Dropdown chọn nhanh Khoa / Phòng
  if (deptSelect) {
    deptSelect.innerHTML = '<option value="">-- Bấm chọn nhanh Khoa / Phòng gửi chụp --</option>';
    depts.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      deptSelect.appendChild(opt);
    });

    deptSelect.addEventListener('change', () => {
      if (deptSelect.value) {
        inpDept.value = deptSelect.value;
        if (deptChipsContainer) {
          deptChipsContainer.querySelectorAll('.quick-chip').forEach(c => {
            c.classList.toggle('active', c.dataset.val === deptSelect.value);
          });
        }
      }
    });
  }

  // Nút bấm nhanh các khoa phổ biến (1-chạm)
  if (deptChipsContainer) {
    deptChipsContainer.innerHTML = '';
    const topDepts = depts.slice(0, 6);
    topDepts.forEach(d => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'quick-chip';
      chip.dataset.val = d;
      chip.innerHTML = `<span class="chip-check">✓</span> <span>${d}</span>`;
      chip.addEventListener('click', () => {
        inpDept.value = d;
        if (deptSelect) deptSelect.value = d;
        deptChipsContainer.querySelectorAll('.quick-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
      deptChipsContainer.appendChild(chip);
    });
  }

  // 2. Thẻ tích chọn Chỉ định chụp (Vùng chụp)
  if (scanChipsContainer) {
    scanChipsContainer.innerHTML = '';
    scanAreas.forEach(areaName => {
      const icon = getScanIcon(areaName);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'quick-chip';
      chip.dataset.area = areaName;
      chip.innerHTML = `<span class="chip-check">✓</span> <span class="chip-icon">${icon}</span> <span>${areaName}</span>`;

      chip.addEventListener('click', () => {
        if (selectedScanAreas.has(areaName)) {
          selectedScanAreas.delete(areaName);
          chip.classList.remove('active');
        } else {
          selectedScanAreas.add(areaName);
          chip.classList.add('active');
        }
        inpScan.value = Array.from(selectedScanAreas).join(', ');
      });

      scanChipsContainer.appendChild(chip);
    });
  }

  // Khi người dùng gõ tay vào ô inp-scanArea, đồng bộ trạng thái thẻ chip
  if (inpScan) {
    inpScan.addEventListener('input', () => {
      const currentVal = inpScan.value;
      if (scanChipsContainer) {
        scanChipsContainer.querySelectorAll('.quick-chip').forEach(c => {
          const area = c.dataset.area;
          const isPresent = currentVal.toLowerCase().includes(area.toLowerCase());
          c.classList.toggle('active', isPresent);
          if (isPresent) selectedScanAreas.add(area);
          else selectedScanAreas.delete(area);
        });
      }
    });
  }
}

function resetPresetSelections() {
  selectedScanAreas.clear();
  const scanChipsContainer = document.getElementById('scan-chips-container');
  if (scanChipsContainer) {
    scanChipsContainer.querySelectorAll('.quick-chip').forEach(c => c.classList.remove('active'));
  }
  const deptChipsContainer = document.getElementById('dept-chips-container');
  if (deptChipsContainer) {
    deptChipsContainer.querySelectorAll('.quick-chip').forEach(c => c.classList.remove('active'));
  }
  const deptSelect = document.getElementById('sel-departmentRoom');
  if (deptSelect) deptSelect.value = '';
}
