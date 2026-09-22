# HỆ THỐNG BẢNG KIỂM AN TOÀN CHỤP CỘNG HƯỞNG TỪ (MRI) TRỰC TUYẾN ĐA NGÔN NGỮ

Dự án số hóa quy trình khảo sát an toàn trước khi chụp MRI dành cho bệnh nhân và cổng quản trị thời gian thực cho Kỹ thuật viên (KTV) MRI. Hỗ trợ **13 ngôn ngữ** chuẩn y khoa, ký tên điện tử trên điện thoại cảm ứng, cảnh báo nguy cơ cao, in phiếu A4 chuẩn 1 trang và triển khai miễn phí lâu dài.

---

## 🌟 Tính Năng Nổi Bật

### 1. Dành cho Người bệnh (Quét mã QR tại cửa phòng MRI)
- **Hỗ trợ 13 ngôn ngữ hoàn chỉnh:**
  - 🇻🇳 Tiếng Việt
  - 🇬🇧 English
  - 🇫🇷 Français
  - 🇨🇳 中文
  - 🇰🇷 한국어
  - 🇯🇵 日本語
  - 🇷🇺 Русский
  - 🇩🇪 Deutsch
  - 🇹🇭 ภาษาไทย
  - 🇮🇳 हिन्दी
  - 🇸🇦 العربية (Hỗ trợ đọc từ phải sang trái RTL)
  - 🇱🇦 ພາສາລາວ
  - 🇰🇭 ភាសាខ្មែរ
- **Hướng dẫn an toàn chụp:** Giải thích thời gian chụp 10-25 phút, tiếng ồn máy đập gõ bình thường, giữ yên tư thế, tháo bỏ kim loại/điện thoại/thẻ từ...
- **Biểu mẫu thông tin hành chính:** Họ tên, tuổi/năm sinh, giới tính, số điện thoại, khoa phòng, cân nặng, đối tượng (nội/ngoại trú), vùng chụp.
- **Bộ 15 câu hỏi an toàn chuẩn y tế:** Nút bấm Có/Không lớn, dễ nhìn trên điện thoại; tự động kích hoạt câu hỏi đặc thù cho bệnh nhân nữ (mang thai, cho con bú).
- **Ký tên cảm ứng trực tiếp:** Vẽ chữ ký mượt mà trên màn hình điện thoại, hỗ trợ xóa và ký lại dễ dàng.

### 2. Dành cho Kỹ thuật viên & Quản trị viên (KTV Portal)
- **Truy cập kín đáo:** Nút ổ khóa bảo mật ở chân trang và thanh điều hướng.
- **Mật khẩu KTV mặc định:** `mrivinhphucvpi`.
- **Phân quyền đa cấp:** Admin có quyền tạo thêm tài khoản riêng cho từng KTV cấp dưới, quản lý trạng thái ca trực và lịch sử thao tác.
- **Bảng điều khiển thời gian thực:** Tự động đồng bộ và phát chuông âm thanh khi có bệnh nhân vừa gửi phiếu.
- **Phân loại rủi ro thông minh:**
  - 🔴 **NGUY CƠ CAO (Flashing Red):** Phát hiện ngay các chống chỉ định tuyệt đối (máy tạo nhịp tim, van tim nhân tạo, dị vật kim loại mắt/sọ não, bơm tiêm điện tử...).
  - 🟢 **AN TOÀN:** Đạt tiêu chuẩn cơ bản trước chụp.
  - 🟡 **CẦN LƯU Ý:** Răng giả tháo lắp, hình xăm, hội chứng sợ buồng kín...
- **In phiếu 1 chạm chuẩn A4 (PDF Ready):** Định dạng chuẩn văn bản y tế bệnh viện thu gọn chính xác trong 1 trang A4, có logo đơn vị, bảng kiểm 15 câu, chữ ký người bệnh và chữ ký phê duyệt của KTV.
- **Xuất Poster Mã QR:** Có sẵn mẫu Poster A4 để KTV in ra và dán trước cửa phòng MRI.
- **Xuất Excel / CSV:** 1 click để tải danh sách bệnh nhân hằng ngày phục vụ lưu trữ và báo cáo.

---

## 🚀 Hướng Dẫn Vận Hành

### Phương án 1: Chạy trực tiếp tại Bệnh viện (Nội bộ LAN / WiFi phòng MRI)
1. Vào thư mục dự án: `C:\Users\bbt\.gemini\antigravity\scratch\mri-safety-checklist`
2. Nhấp đúp vào file **`start-server.bat`** (hoặc mở PowerShell gõ `agy-node server.js` hoặc `node server.js`).
3. Mở trình duyệt truy cập:
   - **Giao diện Bệnh nhân:** `http://localhost:3000`
   - **Cổng Quản trị KTV:** `http://localhost:3000/admin` (Mật khẩu: `mrivinhphucvpi`)
4. Để bệnh nhân quét trên điện thoại: Kết nối điện thoại cùng mạng WiFi phòng chụp và truy cập theo địa chỉ IP máy tính (ví dụ: `http://192.168.1.100:3000`).

---

### Phương án 2: Triển khai Online Miễn Phí 100% Lâu Dài trên Vercel (Giống trang mẫu)
1. **Bước 1:** Đăng ký tài khoản miễn phí tại [Vercel.com](https://vercel.com) (đăng nhập bằng tài khoản GitHub hoặc Email).
2. **Bước 2:** Đưa mã nguồn lên GitHub:
   - Tạo một kho lưu trữ mới trên GitHub (ví dụ: `bang-kiem-an-toan-mri`).
   - Tải toàn bộ thư mục dự án này lên GitHub.
3. **Bước 3:** Trên giao diện Vercel, chọn **Add New Project** -> Chọn kho GitHub vừa tạo -> Nhấn **Deploy**.
4. **Bước 4:** Sau 1 phút, bạn sẽ có ngay một tên miền miễn phí dạng `https://bang-kiem-mri-tenbenhvien.vercel.app` hoạt động vĩnh viễn 24/7!
5. **Bước 5:** Mở Cổng KTV (`/admin`) -> Tab **In Poster Mã QR phòng chụp** -> In Poster A4 dán ngay trước cửa phòng chụp để bệnh nhân quét!

---

## 📁 Cấu Trúc Thư Mục Dự Án

```
mri-safety-checklist/
├── assets/
│   └── logo.jpg               # Logo đơn vị bệnh viện
├── public/
│   ├── index.html             # Trang bệnh nhân điền phiếu
│   ├── brand/
│   │   └── logo.jpg           # Logo hiển thị web & in ấn
│   ├── css/
│   │   └── style.css          # CSS responsive & định dạng in A4 chuẩn
│   ├── js/
│   │   ├── translations.js    # 13 ngôn ngữ hoàn chỉnh chuẩn y khoa
│   │   ├── signature.js       # Xử lý cảm ứng ký tên điện tử mượt mà
│   │   ├── qr-generator.js    # Sinh mã QR thuần JS độc lập
│   │   └── app.js             # Logic ứng dụng bệnh nhân
│   └── admin/
│       ├── index.html         # Bảng điều khiển KTV & Admin
│       ├── admin.css          # Giao diện KTV Portal
│       └── admin.js           # Xử lý duyệt phiếu, in A4, phân quyền KTV
├── data/
│   └── mri_database.sqlite    # Cơ sở dữ liệu SQLite tự động khởi tạo
├── server.js                  # Máy chủ Node.js REST API độc lập
├── package.json               # Cấu hình dự án
├── vercel.json                # Cấu hình Vercel deployment
├── start-server.bat           # File bấm 1 chạm khởi động nhanh trên Windows
└── README.md
```

---

## 🔒 Thông Tin Đăng Nhập & Bảo Mật

- **Mật khẩu KTV nhanh mặc định:** `mrivinhphucvpi`
- **Tài khoản Quản trị viên (Admin):**
  - Tên đăng nhập: `admin`
  - Mật khẩu: `mrivinhphucvpi`
- Bạn có thể vào tab **Cài đặt đơn vị** hoặc **Phân quyền KTV cấp dưới** trong trang Admin để đổi mật khẩu và tạo thêm tài khoản riêng cho từng kỹ thuật viên.
