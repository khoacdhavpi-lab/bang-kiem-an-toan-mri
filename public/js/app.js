/**
 * Frontend Logic cho Bệnh nhân điền Bảng kiểm an toàn MRI
 */

let currentLang = 'vi';
let selectedGender = 'male';
let selectedPatientType = 'outpatient';
let questionAnswers = {};
let sigPad = null;

document.addEventListener('DOMContentLoaded', () => {
  initLanguageButtons();
  initSignaturePad();
  initToggleButtons();
  initInstructionAccordion();
  initStaffLoginModal();
  initFormSubmission();

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
  let femaleHeaderAdded = false;

  t.questions.forEach((q) => {
    // Nếu câu hỏi dành riêng cho nữ và người dùng đã chọn nữ
    if (q.femaleOnly) {
      if (!femaleHeaderAdded) {
        const femaleBanner = document.createElement('div');
        femaleBanner.className = 'female-section-header';
        femaleBanner.id = 'female-section-banner';
        femaleBanner.innerHTML = `<span>🌸</span> <span>${t.femaleSectionTitle || 'Phần dành riêng cho phụ nữ'}</span>`;
        // Ẩn nếu bệnh nhân là nam
        if (selectedGender === 'male') femaleBanner.style.display = 'none';
        container.appendChild(femaleBanner);
        femaleHeaderAdded = true;
      }
    }

    // Thiết lập giá trị mặc định nếu chưa có
    if (questionAnswers[q.id] === undefined) {
      questionAnswers[q.id] = false; // Mặc định là Không (an toàn)
    }

    const item = document.createElement('div');
    item.className = 'question-item';
    item.id = `q-item-${q.id}`;
    if (q.femaleOnly && selectedGender === 'male') {
      item.style.display = 'none';
    }

    const isCurrentYes = questionAnswers[q.id] === true;

    item.innerHTML = `
      <div class="question-text-block">
        <p class="question-title">
          <span class="question-number">${q.id}.</span> ${q.text}
        </p>
        ${q.critical ? `<span class="critical-badge">${t.criticalBadge || '⚠️ Khảo sát an toàn bắt buộc'}</span>` : ''}
      </div>
      <div class="choice-actions">
        <button type="button" class="choice-btn no-btn ${!isCurrentYes ? 'selected' : ''}" data-qid="${q.id}" data-val="no">
          <span>✓</span> <span>${t.no}</span>
        </button>
        <button type="button" class="choice-btn yes-btn ${isCurrentYes ? 'selected' : ''}" data-qid="${q.id}" data-val="yes">
          <span>⚠️</span> <span>${t.yes}</span>
        </button>
      </div>
    `;

    // Gắn sự kiện chọn Có / Không
    const noBtn = item.querySelector('.no-btn');
    const yesBtn = item.querySelector('.yes-btn');

    noBtn.addEventListener('click', () => {
      questionAnswers[q.id] = false;
      noBtn.classList.add('selected');
      yesBtn.classList.remove('selected');
    });

    yesBtn.addEventListener('click', () => {
      questionAnswers[q.id] = true;
      yesBtn.classList.add('selected');
      noBtn.classList.remove('selected');
    });

    container.appendChild(item);
  });
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
  const femaleBanner = document.getElementById('female-section-banner');
  if (femaleBanner) {
    femaleBanner.style.display = show ? 'flex' : 'none';
  }

  // Câu 14 & 15 là dành cho nữ
  const q14 = document.getElementById('q-item-14');
  const q15 = document.getElementById('q-item-15');
  if (q14) q14.style.display = show ? 'flex' : 'none';
  if (q15) q15.style.display = show ? 'flex' : 'none';

  if (!show) {
    questionAnswers[14] = false;
    questionAnswers[15] = false;
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
      signature: signatureDataUrl,
      submittedAt: new Date().toISOString()
    };

    // Kiểm tra mức độ rủi ro (Risk Evaluation)
    // Các câu hỏi rủi ro cao: 1, 2, 3, 4, 5, 6, 8, 11, 14
    const criticalQuestions = [1, 2, 3, 4, 5, 6, 8, 11, 14];
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
