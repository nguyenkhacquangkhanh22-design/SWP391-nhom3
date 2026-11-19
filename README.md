# 🎬 SMARTEQUIP — NỀN TẢNG CHO THUÊ THIẾT BỊ QUAY CHỤP & ĐIỆN ẢNH CHUYÊN NGHIỆP

> **Dự án tốt nghiệp / Đồ án thực chiến:** SWP391 — Nhóm 3  
> **Phiên bản:** v2.4 (Cập nhật đồng bộ toàn diện trên nhánh `main`)  
> **Công nghệ sử dụng:** React 18, TypeScript, Vite, Tailwind CSS, Node.js, Express, MongoDB Atlas, Socket.IO, PayOS SDK  

---

## 📑 MỤC LỤC & TÀI LIỆU HỆ THỐNG

1. [Tổng Quan Nền Tảng & Kiến Trúc 4 Vai Trò (Roles)](#1-tổng-quan-nền-tảng--kiến-trúc-4-vai-trò)
2. [Hướng Dẫn Khởi Chạy Dự Án (Getting Started)](#2-hướng-dẫn-khởi-chạy-dự-án-getting-started)
3. [Tài Khoản Kiểm Thử Mặc Định (Demo & Testing Accounts)](#3-tài-khoản-kiểm-thử-mặc-định)
4. [Đặc Tả Nghiệp Vụ & Luồng Hoạt Động Phân Hệ System Admin (7 Use Case)](#4-đặc-tả-nghiệp-vụ-phân-hệ-system-admin)
5. [Sơ Đồ Kiến Trúc Bảo Mật 5 Lớp (5-Tier Architecture)](#5-sơ-đồ-kiến-trúc-bảo-mật-5-lớp)
6. [Hướng Dẫn Kiểm Thử Thủ Công Trọn Vẹn 1 Chu Trình (10 Bước Test Flow)](#6-hướng-dẫn-kiểm-thử-thủ-công-trọn-vẹn-1-chu-trình)

---

## 1. TỔNG QUAN NỀN TẢNG & KIẾN TRÚC 4 VAI TRÒ

**SMARTEQUIP** là nền tảng thương mại điện tử chuyên biệt kết nối nhu cầu cho thuê thiết bị điện ảnh cao cấp (Cinema Camera, Lens Anamorphic/Prime, Đèn công suất lớn, Gimbal, Bộ truyền không dây) giữa Chủ thiết bị (Owner) và Khách thuê (Renter) với hợp đồng điện tử pháp lý và bảo mật thanh toán.

Hệ thống được thiết kế theo mô hình phân quyền chặt chẽ (RBAC) gồm 4 vai trò chính:
- **Renter (Người thuê):** Khám phá thiết bị, so sánh cấu hình quang học, cấu hình phụ kiện add-on & chọn mức thế chân linh hoạt, ký hợp đồng điện tử và thanh toán cọc qua cổng trực tuyến PayOS.
- **Owner (Chủ máy):** Quản lý kho máy, thiết lập giá thuê theo ngày (tối thiểu từ 2.000 VNĐ), cấu hình điều khoản thuê, lịch bận cá nhân (Blackout), phân tích doanh thu & quản lý ví rút tiền qua mã QR.
- **Rental Moderator (Kiểm duyệt viên):** Thẩm định chất lượng thiết bị đăng tải, kiểm tra tính xác thực của thông tin quang học, phê duyệt hợp đồng thuê và làm trọng tài hòa giải khiếu nại.
- **System Admin (Quản trị viên tối cao):** Giám sát tổng quan chỉ số toàn sàn, phân quyền tài khoản, khóa nick vi phạm chính sách kèm cơ chế Force Logout, duyệt hồ sơ định danh Owner, duyệt lệnh rút tiền qua QR ngân hàng và phản hồi Ticket hỗ trợ qua Socket.IO Realtime.

---

## 2. HƯỚNG DẪN KHỞI CHẠY DỰ ÁN (GETTING STARTED)

### Yêu cầu môi trường
- **Node.js:** `>= 18.x`
- **MongoDB:** MongoDB Atlas hoặc Local MongoDB URI

### Bước 1: Khởi động Backend
```bash
cd be
npm install
npm run dev
# Máy chủ Backend khởi chạy tại: http://localhost:3000
```

### Bước 2: Khởi động Frontend
```bash
cd fe
npm install
npm run dev
# Ứng dụng Frontend khởi chạy tại: http://localhost:5173
```

---

## 3. TÀI KHOẢN KIỂM THỬ MẶC ĐỊNH

| Vai Trò (Role) | Email Đăng Nhập | Mật Khẩu | Quyền Hạn & Màn Hình Chính |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@smartequip.com` | `Admin@123456` | Toàn quyền quản trị hệ thống, điều hành tại `/admin` |
| **Rental Moderator** | `moderator@example.com` | `123456` | Kiểm duyệt thiết bị & giải quyết tranh chấp tại `/moderator` |
| **Owner (Chủ máy)** | `owner@example.com` | `123456` | Đăng bài, quản lý kho máy, ví doanh thu tại `/owner` |
| **Renter (Khách thuê)** | `renter@example.com` | `123456` | Thuê thiết bị, ký hợp đồng, thanh toán tại `/marketplace` |

---

## 4. ĐẶC TẢ NGHIỆP VỤ PHÂN HỆ SYSTEM ADMIN

### Bảng Tra Cứu Use Case Quản Trị Hệ Thống

| Mã UC | Nghiệp Vụ Quản Trị | API Endpoint (Backend) | Controller & Service | Giao Diện Phụ Trách (Frontend) |
| :---: | :--- | :--- | :--- | :--- |
| **`UC_A01`** | **Đăng nhập Quản trị viên** | `POST /api/auth/login` | `authController.login`<br>➔ `authService.loginUser` | `LoginPage.tsx`<br>`AuthContext.tsx` |
| **`UC_A02`** | **Dashboard & Thống kê KPI** | `GET /api/admin/overview` | `adminController.getOverview` | `AdminDashboard.tsx`<br>`AdminStatsGrid.tsx` |
| **`UC_A03`** | **Tra cứu & Lọc người dùng** | `GET /api/admin/overview` | `adminController.getOverview` | `AdminUserTable.tsx` |
| **`UC_A04`** | **Khóa / Mở tài khoản & Force Logout** | `PATCH /api/admin/users/:userId/status` | `adminController.updateUserStatus` | `AdminUserTable.tsx` |
| **`UC_A05`** | **Phân quyền & Chặn tự hạ cấp** | `PATCH /api/admin/users/:userId/role` | `adminController.updateUserRole` | `AdminUserTable.tsx` |
| **`UC_A07`** | **Xét duyệt đơn đăng ký Owner** | `GET /api/admin/owner-applications`<br>`PATCH /api/admin/owner-applications/:id/review` | `ownerRegistrationController.adminListApplications`<br>`ownerRegistrationController.adminReviewApplication` | `AdminDashboard.tsx`<br>(Tab `owner-apps`) |
| **`UC_A17`** | **Ticket hỗ trợ & Chat Realtime** | `GET /api/admin/support-tickets`<br>`POST /api/admin/support-tickets/:id/reply`<br>`PATCH /api/admin/support-tickets/:id/status` | `adminController.listSupportTickets`<br>`adminController.replySupportTicket`<br>`adminController.updateSupportTicketStatus` | `AdminDashboard.tsx`<br>(Tab `support`) |
| **`Fin-01`** | **Duyệt Rút Tiền & Quét QR Ngân Hàng** | `GET /api/wallets/admin/withdrawals`<br>`PATCH /api/wallets/admin/withdrawals/:id/approve` | `walletController.listWithdrawals`<br>`walletController.approveWithdrawal` | `AdminFinanceManager.tsx`<br>(Tab `finance`) |
| **`Prof-01`** | **Hồ sơ cá nhân Quản trị viên** | `GET /api/auth/me`<br>`PUT /api/auth/profile` | `authController.getMe`<br>`authController.updateProfile` | `AdminProfileTab.tsx`<br>(Tab `profile`) |

---

## 5. SƠ ĐỒ KIẾN TRÚC BẢO MẬT 5 LỚP

```text
┌───────────────────────────────────────────────────────────────────────────────┐
│ 1. GIAO DIỆN NGƯỜI DÙNG (FRONTEND PRESENTATION TIER)                         │
│    React 18 | TypeScript | Vite | Tailwind CSS | Socket.IO Client             │
│    ├── AdminDashboard.tsx      : Màn hình trung tâm điều hành & Tab switcher   │
│    ├── AdminStatsGrid.tsx       : Thẻ KPI đo lường thời gian thực              │
│    ├── AdminUserTable.tsx       : Quản lý người dùng, phân quyền, khóa nick    │
│    ├── AdminFinanceManager.tsx  : Duyệt lệnh rút tiền & Preview mã QR ngân hàng│
│    └── AdminProfileTab.tsx      : Quản trị hồ sơ và bảo mật cá nhân            │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │ HTTP + Authorization: Bearer <JWT>
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│ 2. CỔNG TRUYỀN THÔNG & PROXY (GATEWAY & REVERSE PROXY TIER)                   │
│    Vite Proxy (/api -> :3000) | Express Router | JSON Body Parser (25MB)      │
│    CORS Policy | Helmet Security Headers | Request Rate Limiter               │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│ 3. TẦNG BẢO MẬT & PHÂN QUYỀN (SECURITY & AUTHORIZATION MIDDLEWARE TIER)       │
│    ├── authenticate.js : Kiểm tra chữ ký JWT & so khớp token_version trong DB │
│    ├── authorize.js    : Rào chắn RBAC nghiêm ngặt (chỉ cho phép systemadmin) │
│    └── Safe Guard      : Chặn tự khóa, chặn tự hạ quyền của chính Admin       │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│ 4. NGHIỆP VỤ & ĐIỀU PHỐI (CONTROLLER & REALTIME EVENT TIER)                   │
│    ├── adminController.js             : Thống kê tổng quan, quản lý người dùng│
│    ├── ownerRegistrationController.js : Quy trình duyệt hồ sơ Owner           │
│    ├── walletController.js            : Xử lý giao dịch & lệnh rút tiền       │
│    ├── socket.js                      : Kênh phát tin tức thì (ticket:replied)│
│    └── auditLogger.js                 : Ghi vết kiểm toán (Actor, IP, Action) │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│ 5. TẦNG DỮ LIỆU BỀN VỮNG (PERSISTENCE & DATABASE TIER)                        │
│    MongoDB ReplicaSet | Mongoose ODM                                          │
│    Collection: User | OwnerApplication | SupportTicket | Withdrawal | AuditLog│
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. HƯỚNG DẪN KIỂM THỬ THỦ CÔNG TRỌN VẸN 1 CHU TRÌNH

Toàn bộ nghiệp vụ quản trị được thiết kế theo một luồng khép kín (End-to-End Life-Cycle) gồm 10 bước liên tục:

| Bước | Mã Use Case / Tính Năng | Tên Bước Trong Chu Trình | Màn Hình / Route | Thao Tác Cốt Lõi | Kết Quả Kỳ Vọng |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **01** | `UC_A01` | **Đăng nhập Admin an toàn** | `/login` | Nhập email: `admin@smartequip.com`, pass: `Admin@123456` | Cấp JWT, chuyển hướng ngay sang `/admin` |
| **02** | `UC_A02` | **Quan sát Dashboard & KPI** | `/admin` ➔ Tab *Tổng quan* | Xem thẻ thống kê, bấm nút *Làm mới* | Số liệu toàn sàn cập nhật theo thời gian thực |
| **03** | `Prof-01` | **Quản lý Hồ sơ cá nhân** | `/admin` ➔ *Hồ sơ cá nhân* | Xem thông tin cá nhân, cập nhật SĐT liên hệ | Lưu thông tin mượt mà, không bị treo tab |
| **04** | `UC_A07` | **Thẩm định hồ sơ Owner** | `/admin` ➔ Tab *owner-apps* | Xem ảnh CCCD 2 mặt, bấm Duyệt hồ sơ | Hồ sơ `approved`, tự động cấp quyền `owner` |
| **05** | `UC_A03` | **Tra cứu & Lọc người dùng** | `/admin` ➔ Tab *users* | Gõ tên/email, chọn dropdown vai trò | Bảng lọc tức thì Client-side không reload trang |
| **06** | `UC_A04` | **Khóa tài khoản & Force Logout** | `/admin` ➔ Tab *users* | Bấm Khóa nick, thử đăng nhập ẩn danh | Bị chặn đăng nhập, thu hồi JWT token tức thì |
| **07** | `UC_A05` | **Phân quyền & Chặn tự hạ cấp** | `/admin` ➔ Tab *users* | Đổi role user, thử hạ quyền chính mình | Nút hạ quyền chính mình bị khóa kèm tooltip |
| **08** | `Fin-01` | **Quét mã QR duyệt rút tiền** | `/admin` ➔ Tab *Duyệt Rút Tiền* | Bấm nút *Xem mã QR*, quét banking chuyển tiền | Hiện ảnh QR ngân hàng cỡ lớn, duyệt lệnh thành công |
| **09** | `UC_A17` | **Xử lý Ticket Chat Realtime** | `/admin` ➔ Tab *support* | Nhận ticket qua Socket, gửi tin trả lời | Tin nhắn xuất hiện hai chiều tức thì không F5 |
| **10** | `Nav-01` | **Điều hướng Header đa cổng** | Header `/owner` & `/admin` | Bấm chuyển đổi giữa Admin ↔ Mod ↔ Owner | Chuyển cổng linh hoạt, không mất phiên làm việc |

---

### Giấy Phép & Bản Quyền
Dự án được xây dựng và phát triển phục vụ mục đích nghiên cứu, học thuật và bảo vệ đồ án tốt nghiệp khóa SWP391 - Nhóm 3. Mọi quyền sở hữu trí tuệ thuộc về nhóm tác giả.
