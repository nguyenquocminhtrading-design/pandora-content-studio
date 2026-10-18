# 🚀 KẾ HOẠCH TRIỂN KHAI CLOUD RENDER VỚI 2 NGUỒN AI MỞ (100% MIỄN PHÍ - 24/7)

Kế hoạch này hướng dẫn chi tiết cách triển khai **Pandora Sales Content Studio** lên máy chủ đám mây **Render.com** kết hợp cơ chế xoay tua thông minh **2 nhà cung cấp API mở & miễn phí**: **Google Gemini** và **NVIDIA NIM**.

> [!NOTE]
> Khi lên Cloud, hệ thống hoàn toàn độc lập với máy tính của bạn. Dù bạn tắt máy, đi ngủ hay ngắt mạng, nhân viên bán hàng vẫn truy cập web trên điện thoại/laptop và tạo bài viết bình thường 24/7!

---

## 🧭 1. KIẾN TRÚC HOẠT ĐỘNG CLOUD & CƠ CHẾ DỰ PHÒNG 2 LỚP (CASCADING FALLBACK)

```mermaid
flowchart TD
    Staff["📱 Nhân viên bán hàng\n(Truy cập https://pandora-content-studio.onrender.com)"] -->|Chọn sản phẩm & Bấm 'Tạo bài'| Render["☁️ Render.com Web Service\n(Node.js Server 24/7)"]
    
    subgraph MultiProvider ["Hệ thống xoay tua AI tự động (Cascading Fallback)"]
        Render -->|1. Ưu tiên 1| Gemini["🟢 Google Gemini API\n(gemini-3.8-flash / 15 RPM Free)"]
        Gemini -.->|Nếu hết quota / lỗi| Nvidia["🔵 NVIDIA NIM API\n(Llama 3.2 11B Vision / 1000 credits free)"]
        Nvidia -.->|Dự phòng khi test máy ở nhà| LocalProxy["💻 Localhost:3001 Proxy"]
    end
    
    Gemini -->|Trả về JSON 3 mẫu bài| Output["✨ 3 Mẫu Copy (Zalo 1-1, Social, Short)"]
    Nvidia -->|Trả về JSON 3 mẫu bài| Output
    LocalProxy -->|Trả về JSON 3 mẫu bài| Output
```

---

## 🔑 2. TỔNG HỢP 2 NGUỒN API MỞ ĐỂ ĐIỀN VÀO `.env` VÀ RENDER

| STT | Nhà cung cấp | Model khuyến nghị | Link lấy Key miễn phí | Đặc điểm / Quota |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Google Gemini** | `gemini-3.8-flash` | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) | 15 yêu cầu/phút (RPM) Free vĩnh viễn, tốc độ cực nhanh (< 1.5s), Tiếng Việt hoàn hảo. |
| **2** | **NVIDIA NIM** | `meta/llama-3.2-11b-vision-instruct` | [build.nvidia.com](https://build.nvidia.com) | Tặng sẵn 1.000 credits miễn phí, chạy model Llama 3.2 thế hệ mới mượt mà. |

### Cấu hình chuẩn trong file `.env` máy bạn:
```env
# 1. Google Gemini API
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-3.8-flash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai

# 2. NVIDIA NIM API
NVIDIA_NIM_API_KEY=nvapi-...
NVIDIA_NIM_MODEL=meta/llama-3.2-11b-vision-instruct
NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1

# Local Proxy dự phòng
LOCAL_LLM_URL=http://localhost:3001/v1
LOCAL_LLM_API_KEY=freellmapi-db0b02100a84e67c074f72c495cbeb071573a91846c97f46
LOCAL_LLM_MODEL=auto
```

---

## 📋 3. MASTER PLAN TRIỂN KHAI 4 BƯỚC LÊN RENDER (100% FREE)

### BƯỚC 1: Đẩy mã nguồn & Cache 941 sản phẩm lên GitHub
1. Mở trang [https://github.com](https://github.com), đăng nhập và tạo 1 repository mới (ví dụ: `pandora-content-studio`).
2. Chạy các lệnh Git tại thư mục dự án trên máy tính:
   ```powershell
   git add .
   git commit -m "feat: complete pandora studio with Gemini 3.8 and NVIDIA NIM"
   git push origin main
   ```

---

### BƯỚC 2: Tạo Web Service Miễn Phí trên Render.com
1. Mở [https://render.com](https://render.com) và đăng nhập bằng tài khoản GitHub.
2. Tại trang chủ Dashboard, bấm **New +** $\rightarrow$ chọn **Web Service**.
3. Chọn tùy chọn **Build and deploy from a Git repository**, chọn repo `pandora-content-studio`.
4. Điền các trường cấu hình:
   - **Name**: `pandora-content-studio`
   - **Region**: `Singapore` *(tối ưu độ trễ cho người dùng tại Việt Nam)*
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Chọn **Free ($0/month)**.

---

### BƯỚC 3: Điền Environment Variables trên Render
Tại phần **Environment Variables** (Biến môi trường) của Render, bạn cập nhật các biến sau:

| Tên biến (Key) | Giá trị mẫu (Value) | Ghi chú |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port lắng nghe |
| `NODE_ENV` | `production` | Chạy chế độ production |
| `GEMINI_API_KEY` | *(Key của bạn từ Google AI Studio)* | Bắt đầu bằng `AIzaSy...` hoặc key Google của bạn |
| `GEMINI_MODEL` | `gemini-3.8-flash` | Model chính siêu nhanh & thông minh |
| `GEMINI_BASE_URL` | `https://generativelanguage.googleapis.com/v1beta/openai` | Chuẩn OpenAI tương thích |
| `NVIDIA_NIM_API_KEY`| *(Key của bạn từ NVIDIA)* | Bắt đầu bằng `nvapi-...` |
| `NVIDIA_NIM_MODEL` | `meta/llama-3.2-11b-vision-instruct` | Dự phòng Lớp 1 |
| `NVIDIA_NIM_BASE_URL`| `https://integrate.api.nvidia.com/v1` | Chuẩn OpenAI tương thích |

> [!TIP]
> Hệ thống được lập trình **tự động xoay tua**: Ưu tiên chạy Google Gemini (`gemini-3.8-flash`), nếu Gemini gặp lỗi hoặc hết quota sẽ tự động chuyển sang NVIDIA NIM (`meta/llama-3.2-11b-vision-instruct`) mà không làm gián đoạn người dùng!

---

### BƯỚC 4: Bàn giao link cho nhân viên sử dụng
Render cấp đường link HTTPS miễn phí cho bạn. Đường dẫn chính xác để mở giao diện Studio:

👉 **Link đang chạy trực tiếp ngay bây giờ:**
**`https://pandora-content-studio.onrender.com/admin/writer.html`**

*(Tương ứng với link bạn chạy ở local: `http://localhost:3000/admin/writer.html`)*

> [!TIP]
> **Nâng cấp vào thẳng trang chủ:**
> Đã cấu hình thêm để bạn chỉ cần gõ link rút gọn:
> 👉 **`https://pandora-content-studio.onrender.com/`** (sẽ tự động mở luôn giao diện Studio mà không cần thêm đuôi `/admin/writer.html`).
> Chỉ cần push commit mới nhất lên GitHub, Render sẽ tự động cập nhật trong 1 phút!

- Bạn có thể tắt máy tính hoàn toàn.
- Bất cứ nhân viên nào mở link trên điện thoại hoặc máy tính ở bất kỳ đâu đều có thể:
  1. Xem danh mục 941 sản phẩm Pandora (tìm kiếm nhanh, lọc theo 6 danh mục & các kiểu vòng).
  2. Bấm **Tạo bài viết** để sinh ngay 3 mẫu nội dung Zalo, Social, Ngắn.
  3. Bấm **Copy** để dán gửi cho khách hàng.
