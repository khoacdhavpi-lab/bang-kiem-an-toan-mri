/**
 * Module Chữ ký điện tử cảm ứng đa điểm (Touch & Mouse Signature Canvas)
 * Hỗ trợ vẽ mượt mà, chống rung, tương thích màn hình Retina/High-DPI trên điện thoại
 */

class SignaturePad {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.strokeColor = options.strokeColor || '#1e293b';
    this.lineWidth = options.lineWidth || 2.5;
    this.isDrawing = false;
    this.hasSigned = false;
    this.points = [];
    this.placeholderEl = options.placeholderEl || null;

    this.init();
  }

  init() {
    this.setupCanvas();
    this.bindEvents();

    // Resize observer để cập nhật kích thước canvas khi xoay màn hình
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  setupCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Lưu lại dữ liệu vẽ trước đó nếu có
    let imgData = null;
    if (this.hasSigned && this.canvas.width > 0 && this.canvas.height > 0) {
      imgData = this.canvas.toDataURL();
    }

    this.canvas.width = (rect.width || 340) * dpr;
    this.canvas.height = (rect.height || 160) * dpr;

    this.ctx.scale(dpr, dpr);
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    if (imgData) {
      const img = new Image();
      img.onload = () => {
        this.ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = imgData;
    }
  }

  handleResize() {
    // Chỉ setup lại nếu kích thước thay đổi đáng kể
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (Math.abs(this.canvas.width - rect.width * dpr) > 10) {
      this.setupCanvas();
    }
  }

  getPos(event) {
    const rect = this.canvas.getBoundingClientRect();
    let clientX, clientY;

    if (event.touches && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  bindEvents() {
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.startStroke(e));
    window.addEventListener('mousemove', (e) => {
      if (this.isDrawing) this.moveStroke(e);
    });
    window.addEventListener('mouseup', () => this.endStroke());

    // Touch events (kèm preventDefault để tránh cuộn trang khi vẽ)
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startStroke(e);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (this.isDrawing) this.moveStroke(e);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.endStroke();
    }, { passive: false });
  }

  startStroke(e) {
    this.isDrawing = true;
    const pos = this.getPos(e);
    this.points = [pos];

    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);

    if (this.placeholderEl) {
      this.placeholderEl.style.opacity = '0';
    }
  }

  moveStroke(e) {
    if (!this.isDrawing) return;
    const pos = this.getPos(e);
    this.points.push(pos);

    if (this.points.length >= 3) {
      const len = this.points.length;
      const xc = (this.points[len - 2].x + this.points[len - 1].x) / 2;
      const yc = (this.points[len - 2].y + this.points[len - 1].y) / 2;
      this.ctx.quadraticCurveTo(this.points[len - 2].x, this.points[len - 2].y, xc, yc);
      this.ctx.stroke();
    } else {
      this.ctx.lineTo(pos.x, pos.y);
      this.ctx.stroke();
    }

    this.hasSigned = true;
  }

  endStroke() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.ctx.closePath();
    this.points = [];
  }

  clear() {
    const dpr = window.devicePixelRatio || 1;
    this.ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
    this.hasSigned = false;
    this.points = [];
    if (this.placeholderEl) {
      this.placeholderEl.style.opacity = '1';
    }
  }

  isEmpty() {
    return !this.hasSigned;
  }

  toDataURL() {
    if (this.isEmpty()) return '';
    return this.canvas.toDataURL('image/png');
  }
}

// Export for browser
window.SignaturePad = SignaturePad;
