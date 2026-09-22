# HƯỚNG DẪN TRIỂN KHAI VERCEL 100% ONLINE & MIỄN PHÍ VĨNH VIỄN
## BẢNG KIỂM AN TOÀN CHỤP CỘNG HƯỞNG TỪ (MRI) ĐA NGÔN NGỮ

Tài liệu này hướng dẫn bạn từng bước đưa ứng dụng lên **Vercel** và kết nối **Cơ sở dữ liệu đám mây (Google Firebase)** để hệ thống vận hành 24/7 trên Internet, hoàn toàn **MIỄN PHÍ 100%**, không cần thẻ ngân hàng, dữ liệu đồng bộ tức thì giữa điện thoại bệnh nhân và máy tính KTV phòng chụp.

---

## 🏗️ 1. NGUYÊN LÝ HOẠT ĐỘNG & LUỒNG DỮ LIỆU (WORKFLOW)

```
[ BỆNH NHÂN ] (Điện thoại 4G/WiFi bất kỳ)
   │
   ├─► Quét mã QR dán trước cửa phòng MRI
   ├─► Chọn 1 trong 13 ngôn ngữ (Việt, Anh, Pháp, Trung, Hàn, Nhật...)
   ├─► Điền họ tên, tuổi, vùng chụp & tích chọn 15 câu hỏi an toàn
   ├─► Ký tên bằng ngón tay lên màn hình cảm ứng
   └─► Bấm "GỬI BẢNG KIỂM AN TOÀN"
             │
             ▼ (Truyền trực tiếp qua Internet)
┌────────────────────────────────────────────────────────┐
│  GOOGLE FIREBASE REALTIME DATABASE (Đám mây miễn phí)  │
│  - Lưu trữ phiếu khảo sát & hình ảnh chữ ký an toàn    │
│  - Phát tín hiệu thời gian thực (Realtime WebSockets)  │
└────────────────────────────────────────────────────────┘
             │
             ▼ (Tự động cập nhật tức thì < 0.5 giây)
[ MÁY TÍNH KTV PHÒNG MRI ] (Truy cập qua link Vercel)
   │
   ├─► Chuông âm thanh reo nhẹ báo có bệnh nhân mới
   ├─► Tự động hiển thị tên bệnh nhân ở đầu danh sách
   ├─► Phân loại cờ cảnh báo rủi ro:
   │     🔴 CẢNH BÁO NGUY CƠ CAO (Máy tạo nhịp, dị vật, van tim...)
   │     🟢 AN TOÀN BÌNH THƯỜNG
   ├─► KTV bấm "Xem chi tiết" để thẩm định & ghi chú
   └─► KTV bấm "In A4" -> Máy in xuất tờ khai chuẩn 1 trang A4 ngay lập tức!
```

---

## 📋 2. CÁC BƯỚC THỰC HIỆN CHI TIẾT (STEP-BY-STEP)

### BƯỚC 1: Khởi tạo Cơ sở dữ liệu đám mây Google Firebase (Mất 2-3 phút)
*(Hoàn toàn miễn phí, không yêu cầu thẻ tín dụng, tài khoản Google nào cũng dùng được)*

1. Truy cập trang quản trị Firebase của Google: [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Đăng nhập bằng tài khoản Gmail của bạn.
3. Nhấn nút **"Add project"** (Thêm dự án):
   - Đặt tên dự án: ví dụ `mri-vinhphuc-safety` (hoặc tên bệnh viện của bạn).
   - Nhấn **Continue**.
   - Ở bước Google Analytics: Bạn có thể gạt tắt (Enable Google Analytics -> Tắt) cho nhanh -> Nhấn **Create project**.
   - Chờ vài giây rồi nhấn **Continue**.
4. Tạo Database thời gian thực:
   - Ở thanh menu bên trái, nhấn vào mục **Build** -> Chọn **Realtime Database**.
   - Nhấn nút **Create Database** (Tạo cơ sở dữ liệu).
   - Chọn vị trí máy chủ: Chọn **Singapore (`asia-southeast1`)** để tốc độ tải tại Việt Nam nhanh nhất -> Nhấn **Next**.
   - Tại mục bảo mật (Security rules): Chọn **"Start in test mode"** (Bắt đầu ở chế độ thử nghiệm) -> Nhấn **Enable**.
5. Cấu hình quyền đọc/ghi dữ liệu (Rules):
   - Chuyển sang tab **Rules** (Quy tắc).
   - Dán đoạn mã sau để cho phép bệnh nhân gửi phiếu và KTV đọc phiếu:
     ```json
     {
       "rules": {
         ".read": true,
         ".write": true
       }
     }
     ```
   - Nhấn nút **Publish** (Xuất bản).
6. **Lấy đường link Database:**
   - Quay lại tab **Data**.
   - Bạn sẽ nhìn thấy một đường link màu xanh trên đầu bảng dữ liệu, có dạng:
     `https://mri-vinhphuc-safety-default-rtdb.asia-southeast1.firebasedatabase.app/`
   - **Sao chép (Copy) đường link này** để sử dụng ở Bước 2.

---

### BƯỚC 2: Tải Dự Án Lên GitHub (Mất 2 phút)

Gói mã nguồn nén sẵn đã được tạo tại máy tính của bạn:
`C:\Users\bbt\.gemini\antigravity\scratch\mri-safety-checklist-deploy.zip`

1. Truy cập [https://github.com/](https://github.com/) và đăng nhập (nếu chưa có tài khoản, đăng ký miễn phí bằng email).
2. Nhấn dấu **`+`** ở góc trên bên phải -> Chọn **New repository**.
3. Đặt tên kho: `bang-kiem-an-toan-mri` -> Chọn chế độ **Public** -> Nhấn **Create repository**.
4. Tại trang vừa tạo, nhấn vào liên kết **"uploading an existing file"** (tải tệp có sẵn lên).
5. Giải nén file `mri-safety-checklist-deploy.zip` trên máy tính của bạn và kéo toàn bộ các file trong thư mục vào cửa sổ GitHub:
   - `public/` (chứa giao diện bệnh nhân, KTV, css, js)
   - `api/` (chứa các hàm serverless)
   - `assets/`
   - `vercel.json`
   - `package.json`
   - `README.md`
6. Nhấn nút **Commit changes** màu xanh ở dưới cùng.

---

### BƯỚC 3: Triển Khai Lên Vercel (Mất 1-2 phút)

1. Truy cập [https://vercel.com/](https://vercel.com/) và đăng nhập bằng tài khoản GitHub vừa dùng.
2. Nhấn nút **"Add New..."** -> Chọn **Project**.
3. Danh sách các kho GitHub của bạn sẽ hiện ra:
   - Tìm kho `bang-kiem-an-toan-mri` và nhấn nút **Import**.
4. Cấu hình biến môi trường (Environment Variables):
   - Mở rộng mục **Environment Variables** và thêm 2 biến sau:
     - **Biến 1:**
       - Name: `FIREBASE_DATABASE_URL`
       - Value: *(Dán đường link Firebase bạn đã copy ở Bước 1)*
     - **Biến 2:**
       - Name: `STAFF_PASSWORD`
       - Value: `mrivinhphucvpi`
5. Nhấn nút **Deploy**.
6. Chờ khoảng 40 giây, Vercel sẽ thông báo màn hình chúc mừng **"Congratulations! What will you build next?"** kèm đường link trang web của bạn, ví dụ:
   `https://bang-kiem-an-toan-mri.vercel.app`

---

### BƯỚC 4: Kiểm Tra & Bật Đồng Bộ Dữ Liệu Thực Tế

1. Mở trang web Vercel vừa tạo:
   - Trang bệnh nhân: `https://ten-du-an-cua-ban.vercel.app`
   - Trang KTV: `https://ten-du-an-cua-ban.vercel.app/admin`
2. Tại trang KTV, nhập mật khẩu: `mrivinhphucvpi` để vào bảng điều khiển.
3. Chuyển sang tab **⚙️ Cài đặt đơn vị**:
   - Nếu bạn đã điền biến môi trường ở Bước 3, mục **Đường dẫn Firebase Database URL** sẽ tự động được nhận diện và hiển thị huy hiệu xanh: `● Đang đồng bộ Online (Vercel Env)`.
   - Nếu chưa nhập biến môi trường, bạn chỉ cần dán đường link Firebase vào ô đó và bấm **"⚡ Lưu & Bật đồng bộ Online"**.
   - Bấm nút **"🔍 Thử kết nối đám mây"**: Nếu xuất hiện thông báo màu xanh *"KẾT NỐI ĐÁM MÂY THÀNH CÔNG!"* tức là hệ thống đã hoạt động 100% trơn tru!

---

### BƯỚC 5: In Poster Mã QR Dán Trước Cửa Phòng MRI

1. Trong trang quản trị KTV (`/admin`), chuyển sang tab **🖨️ In Poster Mã QR phòng chụp**.
2. Hệ thống tự động nhận diện tên miền online của bạn và sinh mã QR sắc nét cùng hướng dẫn 3 bước cho bệnh nhân.
3. Nhấn nút **"🖨️ IN POSTER A4 NGAY"**:
   - Hộp thoại in của trình duyệt sẽ mở ra.
   - Chọn khổ giấy **A4**, in màu (hoặc đen trắng) và dán ngay tại cửa phòng chụp hoặc bàn tiếp đón.
4. Thử nghiệm thực tế: Dùng camera điện thoại hoặc Zalo quét mã trên poster -> Điền thử 1 phiếu -> Bạn sẽ thấy màn hình máy tính của KTV reo chuông và hiển thị phiếu ngay tức thì!

---

## 🔒 DANH MỤC CÁC BIẾN MÔI TRƯỜNG TRÊN VERCEL (SUMMARY)

| Tên Biến (Key) | Giá Trị Mẫu | Ý Nghĩa |
| :--- | :--- | :--- |
| `FIREBASE_DATABASE_URL` | `https://mri-vinhphuc-default-rtdb.asia-southeast1.firebasedatabase.app` | Đường dẫn kết nối CSDL Firebase miễn phí |
| `STAFF_PASSWORD` | `mrivinhphucvpi` | Mật khẩu truy cập cố định cho Kỹ thuật viên |
| `HOSPITAL_NAME` | `BỆNH VIỆN ĐA KHOA VĨNH PHÚC` | Tên bệnh viện in trên đầu biểu mẫu A4 |
