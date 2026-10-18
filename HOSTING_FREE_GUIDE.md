# 🆓 HƯỚNG DẪN TRIỂN KHAI 100% MIỄN PHÍ (ZERO COST HOSTING)

Tài liệu này hướng dẫn bạn cách đưa toàn bộ hệ thống **Pandora Sales Content Studio** lên mạng Internet để nhân viên truy cập trên điện thoại/laptop từ xa mà **KHÔNG TỐN MỘT ĐỒNG NÀO (0đ)**.

---

## 🎯 3 GIẢI PHÁP MIỄN PHÍ HOÀN TOÀN TỐT NHẤT

| Tiêu chí | Cách 1: Cloudflare Tunnel (Khuyên Dùng Nhất ⭐) | Cách 2: Render.com / Railway | Cách 3: Oracle Cloud Free Tier |
| :--- | :--- | :--- | :--- |
| **Bản chất** | Biến máy tính của bạn thành Server bằng đường hầm an toàn của Cloudflare | Deploy lên máy chủ Cloud miễn phí | Thuê VPS Cloud miễn phí trọn đời (Always Free) |
| **Chi phí** | **0đ vĩnh viễn** | **0đ** | **0đ vĩnh viễn** |
| **Ưu điểm** | - Giữ nguyên 941 file cache và Local LLM Proxy cổng `3001` đang chạy mượt mà trên máy bạn.<br>- Có sẵn HTTPS bảo mật, tên miền miễn phí.<br>- Setup chỉ mất đúng 3 phút! | - Chạy độc lập trên Cloud không cần bật máy tính. | - Là VPS thật (4 Core, 24GB RAM free vĩnh viễn). |
| **Nhược điểm** | Máy tính cá nhân cần mở và có mạng khi nhân viên dùng. | Bị sleep nếu 15 phút không có người vào; bộ nhớ đệm cache có thể bị reset khi restart. | Cần thẻ Visa/Mastercard để xác minh lúc đăng ký (không bị trừ tiền). |

---

## 🚀 HƯỚNG DẪN CÁCH 1: CLOUDFLARE TUNNEL (NHANH NHẤT - 3 PHÚT)

Đây là cách các lập trình viên sử dụng nhiều nhất: Tạo một đường hầm mã hóa bảo mật từ cổng `3000` trên máy tính của bạn ra ngoài Internet, cấp luôn link HTTPS chính thức cho nhân viên truy cập.

### Bước 1: Tải công cụ Cloudflare Tunnel (`cloudflared`)
Mở PowerShell trên máy tính của bạn và chạy lệnh tải file chạy:
```powershell
winget install --id Cloudflare.cloudflared
```
*(Hoặc tải trực tiếp file `.exe` từ: `https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.msi`)*

### Bước 2: Bật đường hầm Internet
Sau khi cài xong, bạn chỉ cần gõ 1 dòng lệnh duy nhất trong PowerShell:
```powershell
cloudflared tunnel --url http://localhost:3000
```

### Bước 3: Nhận link truy cập
Màn hình sẽ in ra một đường link công khai dạng:
```
https://random-subdomain.trycloudflare.com
```
👉 Bạn gửi link này cho nhân viên:
`https://random-subdomain.trycloudflare.com/admin/writer.html`

Nhân viên mở điện thoại hay máy tính ở bất kỳ đâu cũng vào được ngay, gọi AI qua cổng 3001 và nạp 941 sản phẩm hoàn toàn bình thường!

---

## ☁️ HƯỚNG DẪN CÁCH 2: DEPLOY LÊN RENDER.COM (KHÔNG CẦN TREO MÁY)

Nếu bạn muốn tắt máy tính đi mà web vẫn hoạt động:

1. **Chuẩn bị code**:
   - Đẩy toàn bộ thư mục code lên **GitHub** (kể cả thư mục `cache/products/`).
2. **Đăng ký tài khoản miễn phí** tại: [https://render.com](https://render.com).
3. **Tạo Web Service mới**:
   - Bấm **New** $\rightarrow$ **Web Service** $\rightarrow$ Chọn repository GitHub của bạn.
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. **Cấu hình Environment Variables (Biến môi trường)**:
   - `LOCAL_LLM_URL`: Điền URL proxy AI của bạn (nếu proxy đưa lên cloud) hoặc URL OpenAI/Gemini tương thích.
   - `LOCAL_LLM_API_KEY`: `freellmapi-db0b02100a84e67c074f72c495cbeb071573a91846c97f46`
   - `LOCAL_LLM_MODEL`: `auto`
5. Bấm **Create Web Service**:
   - Render sẽ cấp cho bạn một domain miễn phí dạng: `https://pandora-studio.onrender.com`.

---

## 💡 ĐÁNH GIÁ & KHUYÊN DÙNG

👉 **Nếu bạn đang dùng máy tính hàng ngày**: Dùng **Cách 1 (Cloudflare Tunnel)** là hoàn hảo nhất vì:
1. Không phải di chuyển hay cấu hình lại cổng 3001 (Proxy AI).
2. Tận dụng 100% 941 file cache siêu nhanh trên máy bạn.
3. Hoàn toàn miễn phí, không cần đăng ký tài khoản rườm rà.
