# Zalo AI Chatbot — Setup Guide

Chatbot Zalo OA bằng Node.js/Express. Đã có webhook, rule-based bot, Gemini/Groq fallback, PostgreSQL schema, dashboard admin tối giản, lead/handoff API, knowledge storage và health checks.

> Đây là trạng thái thực tế của source. Redis/BullMQ, semantic RAG, multi-user auth, backup tự động và production deployment đầy đủ chưa được triển khai.

## 1. Kiến trúc và trạng thái

```text
Zalo OA → POST /webhook → signature → rules → LLM → fallback → Zalo reply
Admin /admin → Admin API → PostgreSQL
```

| Hạng mục                   | Trạng thái                  |
| ---------------------------- | ----------------------------- |
| Webhook, HMAC, rule bot      | Đã có                      |
| Gemini → Groq fallback      | Có logic, cần key           |
| PostgreSQL schema/migration  | Đã có, cần database       |
| Dashboard/admin API          | Có bản tối giản           |
| Knowledge storage            | Có keyword-search foundation |
| Semantic RAG/vector search   | Chưa có                     |
| Queue abstraction            | Có inline mode               |
| Redis/BullMQ worker          | Chưa có                     |
| Lead/handoff/analytics API   | Có foundation                |
| Monitoring/backup/production | Chưa hoàn thiện            |

## 2. Yêu cầu

Local: Node.js 18+, npm. Database: PostgreSQL và `pg_dump`/`pg_restore`. Production queue: Redis. Chạy thật cần Zalo OA/App, Gemini key, Groq key tùy chọn, HTTPS hosting, monitoring và backup storage.

## 3. Cài đặt local không cần API

```powershell
Set-Location "C:\Users\Acer\Desktop\My carrer\zalo bot"
npm install
Copy-Item .env.example .env
npm test
npm run check
npm start
```

Kiểm tra:

```text
http://localhost:3000/
http://localhost:3000/health
http://localhost:3000/ready
http://localhost:3000/admin
```

`/ready` có thể trả `503 not_ready` nếu chưa có PostgreSQL; `/health` chỉ kiểm tra process.

## 4. Cấu hình `.env`

```env
PORT=3000
NODE_ENV=development

ZALO_APP_ID=
ZALO_APP_SECRET=
ZALO_ACCESS_TOKEN=
ZALO_API_BASE_URL=https://openapi.zalo.me/v3.0/oa
ZALO_SIGNATURE_HEADER=x-zevent-signature

LLM_PROVIDER=gemini
LLM_API_KEY=
LLM_MODEL=gemini-2.0-flash
LLM_API_URL=https://generativelanguage.googleapis.com/v1beta/models
LLM_TIMEOUT_MS=12000
LLM_FALLBACK_PROVIDER=groq
LLM_FALLBACK_API_KEY=
LLM_FALLBACK_MODEL=llama-3.1-8b-instant
LLM_FALLBACK_API_URL=https://api.groq.com/openai/v1/chat/completions

BOT_NAME=Trợ lý tư vấn
BOT_BRAND=Doanh nghiệp của bạn
BOT_PRODUCT_INFO=Chưa cấu hình thông tin sản phẩm.
BOT_PRICE_INFO=Vui lòng liên hệ nhân viên để nhận báo giá.
BOT_ADDRESS=Chưa cấu hình địa chỉ.
BOT_BUSINESS_HOURS=Thứ 2 - Thứ 7, 08:00 - 17:00
BOT_HUMAN_CONTACT=Vui lòng để lại thông tin, nhân viên sẽ liên hệ.

DATABASE_URL=postgresql://user:password@host:5432/zalo_bot
ADMIN_API_KEY=change-this-to-a-long-random-secret
QUEUE_MODE=inline
REDIS_URL=
RAG_TOP_K=5
MAX_CONTEXT_MESSAGES=8
ALERT_WEBHOOK_URL=
```

`DATABASE_URL` cần cho dashboard/database. `QUEUE_MODE=inline` là local mode. Không bật Redis production chỉ bằng cách đổi biến môi trường vì worker chưa có. Không commit `.env` hoặc API key.

## 5. PostgreSQL

Tạo database rồi chạy:

```powershell
$env:DATABASE_URL="postgresql://user:password@host:5432/zalo_bot"
npm run migrate
```

Migration tạo `users`, `conversations`, `messages`, `products`, `faqs`, `leads`, `knowledge_documents`. Kiểm tra:

```powershell
Invoke-RestMethod http://localhost:3000/ready
```

Kỳ vọng: `{"status":"ready"}`. Files: `database/001_initial.sql`, `scripts/migrate.js`.

## 6. Dashboard và Admin API

Mở `http://localhost:3000/admin`, nhập `ADMIN_API_KEY`, tạo product/FAQ và xem analytics.

```text
GET  /api/admin/products
POST /api/admin/products
GET  /api/admin/faqs
POST /api/admin/faqs
GET  /api/admin/leads
POST /api/admin/leads
GET  /api/admin/conversations
GET  /api/admin/analytics
POST /api/admin/conversations/:id/handoff
```

Header API: `Authorization: Bearer <ADMIN_API_KEY>`. Dashboard hiện chưa có username/password, roles, inbox agent hoặc audit log.

## 7. Gemini và Groq

Điền `LLM_API_KEY` cho Gemini và `LLM_FALLBACK_API_KEY` cho Groq tùy chọn. Restart app, gửi câu hỏi ngoài rule-based, rồi xóa tạm key chính để kiểm tra fallback. Xóa cả hai key để kiểm tra fallback message. Không test bằng production key trong source.

Flow: `Gemini → lỗi/timeout → Groq → lỗi tiếp → fallback message`.

## 8. Zalo OA

1. Tạo Zalo App.
2. Liên kết App với OA.
3. Lấy App ID, App Secret, OA Access Token.
4. Điền các biến `ZALO_*`.
5. Deploy HTTPS.
6. Đăng ký `https://your-domain.com/webhook`.
7. Gửi tin nhắn test.

Webhook là `POST /webhook`. Adapter hỗ trợ user `user_id`/`sender.id`, text `message.text`/`text`/`message.text_content`, ID `message_id`/`event_id`. Signature dùng HMAC-SHA256 trên raw body với App Secret và header `ZALO_SIGNATURE_HEADER`. Đối chiếu payload/header/cơ chế ký với tài liệu Zalo OA hiện hành trước production.

## 9. Product, FAQ và knowledge base

FAQ tạo trong dashboard được lưu vào `faqs` và tạo knowledge document. Hiện search là keyword `ILIKE`, chưa phải semantic RAG.

Đã có: bảng knowledge, lưu content, keyword search. Chưa có: embedding, pgvector/vector DB, semantic search, re-index job và nguồn trích dẫn.

## 10. Queue Redis

Local:

```env
QUEUE_MODE=inline
```

Production mục tiêu:

```env
QUEUE_MODE=redis
REDIS_URL=redis://user:password@host:6379
```

Queue abstraction đã có; Redis connection, BullMQ producer, worker, retry/dead-letter và queue dashboard chưa có. Chưa được xem là queue production.

## 11. Handoff và lead

```text
POST /api/admin/conversations/:id/handoff
Body: {"agent":"agent-01"}
POST /api/admin/leads
GET  /api/admin/leads
```

Đã có schema/API và trạng thái `waiting_human`. Chưa có bot tự hỏi/xác nhận lead, scoring đầy đủ, agent inbox hoặc agent reply qua Zalo.

## 12. Monitoring và alert

Health: `GET /health`, readiness: `GET /ready`. Dùng UptimeRobot/Better Stack ping `https://your-domain.com/health`. Có thể cấu hình `ALERT_WEBHOOK_URL`; alert service mới là foundation, chưa tự động nối mọi lỗi. Sentry/Grafana/Prometheus chưa setup.

## 13. Backup và restore

```powershell
pg_dump $env:DATABASE_URL --format=custom --file=backup.dump
pg_restore --clean --if-exists --dbname=$env:DATABASE_URL backup.dump
```

Không lưu backup duy nhất trên cùng server, không commit file dump, lưu storage khác server, đặt retention và restore thử định kỳ. Command dùng được; scheduled backup, external storage và restore drill vẫn cần setup.

## 14. Deploy AlwaysData prototype

1. Upload source, không upload `.env`.
2. Chạy `npm install --omit=dev`.
3. Cấu hình environment variables.
4. Chạy migration.
5. Đặt start command `npm start`.
6. Bật HTTPS.
7. Kiểm tra `/health` và `/ready`.
8. Đăng ký Zalo webhook.
9. Gửi tin nhắn thật và xem log.

AlwaysData free phù hợp prototype; kiểm tra chính sách thương mại, tài nguyên, process lifetime và database trước khi dùng doanh nghiệp.

## 15. Production và rollback

Production cần HTTPS/domain, database riêng, secret riêng, Redis/worker nếu dùng queue, backup ngoài server, monitoring, alert, restart policy, webhook production, smoke test và rollback.

Rollback: phát hiện lỗi → dừng deploy → giữ database → quay source version trước → restart → kiểm tra `/health`, `/ready`, webhook và tin nhắn test. Không chạy migration destructive nếu chưa backup.

## 16. Troubleshooting

- `DATABASE_URL is required`: đặt URL rồi chạy `npm run migrate`.
- `/ready` `not_ready`: kiểm tra PostgreSQL, URL, SSL và migration.
- Dashboard database unavailable: cần PostgreSQL và migration.
- `401 invalid_signature`: kiểm tra App Secret, header và format Zalo.
- LLM lỗi: kiểm tra key, model, quota, timeout và HTTP status.
- Zalo lỗi: kiểm tra access token, permission, endpoint và user ID.
- Port bận: `$env:PORT=3001; npm start`.
- Redis chưa chạy: giữ `QUEUE_MODE=inline` cho local.

## 17. Readiness checklist

- [ ] `npm install`, `npm test`, `npm run check` pass.
- [ ] `.env` không commit.
- [ ] PostgreSQL provision và migration pass.
- [ ] `/ready` trả `ready`.
- [ ] Dashboard đăng nhập được.
- [ ] Product/FAQ tạo được.
- [ ] Gemini hoạt động.
- [ ] Groq fallback hoạt động.
- [ ] Zalo webhook và reply hoạt động.
- [ ] Backup đã tạo và restore test pass.
- [ ] `/health` monitoring và alert đã test.
- [ ] HTTPS đã bật.
- [ ] Rollback đã test.

## 18. Lệnh thường dùng

```powershell
npm install
npm test
npm run check
npm run migrate
npm start
npm run dev
```

Giới hạn trước production: Redis/BullMQ worker, semantic RAG, multi-user auth, role permissions, agent inbox, automated lead scoring, scheduled encrypted backup, restore drill và production hosting.
