# TÀI LIỆU ĐẶC TẢ KIẾN TRÚC, LUỒNG HOẠT ĐỘNG & TEST GUIDE PHÂN HỆ SYSTEM ADMIN

> **Dự án:** SMARTEQUIP — Nền tảng Cho thuê Thiết bị Quay chụp & Điện ảnh Chuyên nghiệp  
> **Phân hệ:** Quản trị Hệ thống Cấp cao (System Admin Portal)  
> **Phiên bản:** v2.4 (Cập nhật đồng bộ mã nguồn nhánh `main`)  
> **Người thực hiện:** Đội ngũ Kỹ thuật & System Administrator  

---

## 📑 MỤC LỤC

1. [Bảng Tra Cứu Nhanh Use Case & Thành Phần Hệ Thống](#1-bảng-tra-cứu-nhanh-use-case--thành-phần-hệ-thống)
2. [Chi Tiết Luồng Nghiệp Vụ & Kiến Trúc Từng Use Case](#2-chi-tiết-luồng-nghiệp-vụ--kiến-trúc-từng-use-case)
   - [UC_A01: Đăng nhập Quản trị viên (Admin Login & JWT Session)](#uc_a01-đăng-nhập-quản-trị-viên-admin-login--jwt-session)
   - [UC_A02: Tổng quan Dashboard & Chỉ số KPI (System Analytics)](#uc_a02-tổng-quan-dashboard--chỉ-số-kpi-system-analytics)
   - [UC_A03: Tra cứu & Lọc danh sách người dùng (User Accounts Directory)](#uc_a03-tra-cứu--lọc-danh-sách-người-dùng-user-accounts-directory)
   - [UC_A04: Khóa / Mở khóa tài khoản & Force Logout (Suspend / Reactivate)](#uc_a04-khóa--mở-khóa-tài-khoản--force-logout-suspend--reactivate)
   - [UC_A05: Quản lý Phân quyền & Bảo vệ Quản trị viên (Assign / Revoke Roles)](#uc_a05-quản-lý-phân-quyền--bảo-vệ-quản-trị-viên-assign--revoke-roles)
   - [UC_A07: Thẩm định & Xét duyệt Hồ sơ Chủ thiết bị (Owner Registration Review)](#uc_a07-thẩm-định--xét-duyệt-hồ-sơ-chủ-thiết-bị-owner-registration-review)
   - [UC_A17: Trung tâm Xử lý Hỗ trợ & Chat Realtime (Support Ticket & Socket.IO)](#uc_a17-trung-tâm-xử-lý-hỗ-trợ--chat-realtime-support-ticket--socketio)
   - [Nâng cấp mở rộng: Duyệt Rút tiền với Mã QR & Hồ sơ Admin](#nâng-cấp-mở-rộng-duyệt-rút-tiền-với-mã-qr--hồ-sơ-admin)
3. [Sơ Đồ Kiến Trúc Hệ Thống & Bảo Mật 5 Lớp (5-Tier Architecture)](#3-sơ-đồ-kiến-trúc-hệ-thống--bảo-mật-5-lớp-5-tier-architecture)
4. [Bảng Ma Trận Hướng Dẫn Kiểm Thử Thủ Công (Manual Test Matrix)](#4-bảng-ma-trận-hướng-dẫn-kiểm-thử-thủ-công-manual-test-matrix)

---

## 1. BẢNG TRA CỨU NHANH USE CASE & THÀNH PHẦN HỆ THỐNG

| Mã UC | Nghiệp Vụ Quản Trị | API Endpoint (Backend) | Controller & Service | Giao Diện Phụ Trách (Frontend) |
| :---: | :--- | :--- | :--- | :--- |
| **`UC_A01`** | **Đăng nhập Quản trị viên** | `POST /api/auth/login` | `authController.login`<br>➔ `authService.loginUser` | `LoginPage.tsx`<br>`AuthContext.tsx` |
| **`UC_A02`** | **Dashboard & Thống kê KPI** | `GET /api/admin/overview` | `adminController.getOverview` | `AdminDashboard.tsx`<br>`AdminStatsGrid.tsx` |
| **`UC_A03`** | **Tra cứu & Lọc người dùng** | `GET /api/admin/overview` | `adminController.getOverview` (User find) | `AdminUserTable.tsx` |
| **`UC_A04`** | **Khóa / Mở tài khoản & Force Logout** | `PATCH /api/admin/users/:userId/status` | `adminController.updateUserStatus` | `AdminUserTable.tsx` |
| **`UC_A05`** | **Phân quyền & Chặn tự hạ cấp** | `PATCH /api/admin/users/:userId/role` | `adminController.updateUserRole` | `AdminUserTable.tsx` |
| **`UC_A07`** | **Xét duyệt đơn đăng ký Owner** | `GET /api/admin/owner-applications`<br>`PATCH /api/admin/owner-applications/:id/review` | `ownerRegistrationController.adminListApplications`<br>`ownerRegistrationController.adminReviewApplication` | `AdminDashboard.tsx`<br>(Tab `owner-apps`) |
| **`UC_A17`** | **Ticket hỗ trợ & Chat Realtime** | `GET /api/admin/support-tickets`<br>`POST /api/admin/support-tickets/:id/reply`<br>`PATCH /api/admin/support-tickets/:id/status` | `adminController.listSupportTickets`<br>`adminController.replySupportTicket`<br>`adminController.updateSupportTicketStatus` | `AdminDashboard.tsx`<br>(Tab `support`) |
| **`Fin-01`** | **Duyệt Rút Tiền & Quét QR Ngân Hàng** | `GET /api/wallets/admin/withdrawals`<br>`PATCH /api/wallets/admin/withdrawals/:id/approve` | `walletController.listWithdrawals`<br>`walletController.approveWithdrawal` | `AdminFinanceManager.tsx`<br>(Tab `finance`) |
| **`Prof-01`** | **Hồ sơ cá nhân Quản trị viên** | `GET /api/auth/me`<br>`PUT /api/auth/profile` | `authController.getMe`<br>`authController.updateProfile` | `AdminProfileTab.tsx`<br>(Tab `profile`) |

---

## 2. CHI TIẾT LUỒNG NGHIỆP VỤ & KIẾN TRÚC TỪNG USE CASE

### `UC_A01`: Đăng nhập Quản trị viên (Admin Login & JWT Session)

* **Bản chất nghiệp vụ:** Xác thực danh tính người dùng có quyền quản trị tối cao (`role: "systemadmin"`). Khi đăng nhập thành công, máy chủ cấp mã định danh `accessToken` và lưu thông tin phiên vào bộ nhớ cục bộ.
- **Tệp phụ trách:**
  - **Frontend:** `fe/src/pages/LoginPage.tsx`, `fe/src/context/AuthContext.tsx`, `fe/src/services/authApi.ts`.
  - **Backend:** `be/src/routes/authRoutes.js`, `be/src/controllers/authController.js`, `be/src/services/authService.js`, `be/src/models/User.js`.
- **Luồng xử lý dữ liệu:**

  ```text
  [Quản trị viên nhập Email/Password] ──> [LoginPage.tsx : authApi.login()]
         │ (HTTP POST /api/auth/login)
         ▼
  [authController.login()] ──> [authService.loginUser()]
         │ 1. Truy vấn User theo email (bao gồm password_hash & token_version)
         │ 2. So khớp bcrypt.compare(password, user.password_hash)
         │ 3. Kiểm tra user.status === "active"
         │ 4. Ký mã JWT: jwt.sign({ _id, role, token_version }, JWT_SECRET, { expiresIn: '7d' })
         ▼
  [Trả về Token & User Info] ──> [AuthContext.tsx] ──> Chuyển hướng ngay đến /admin
  ```

---

### `UC_A02`: Tổng quan Dashboard & Chỉ số KPI (System Analytics)

* **Bản chất nghiệp vụ:** Thu thập và tổng hợp chỉ số vận hành toàn hệ thống theo thời gian thực (Real-time aggregation): Tổng người dùng, tài khoản đang hoạt động, thiết bị chờ kiểm duyệt, đơn tranh chấp khiếu nại đang mở, và số lượng ticket cần giải quyết.
- **Tệp phụ trách:**
  - **Frontend:** `fe/src/pages/admin/AdminDashboard.tsx`, `fe/src/components/admin/AdminStatsGrid.tsx`, `fe/src/services/adminApi.ts`.
  - **Backend:** `be/src/routes/adminRoutes.js`, `be/src/controllers/adminController.js` (`getOverview`).
- **Luồng xử lý dữ liệu:**

  ```text
  [AdminDashboard.tsx : loadOverview()] ──> GET /api/admin/overview
         │ (Headers: Authorization Bearer <token>)
         ▼
  [Middleware: authenticate + authorize("systemadmin")]
         ▼
  [adminController.getOverview()]
         │ Chạy song song Promise.all([
         │   User.countDocuments(),
         │   User.countDocuments({ status: "active" }),
         │   Equipment.countDocuments({ approval_status: "pending" }),
         │   Dispute.countDocuments({ status: { $in: ["pending_review", "investigating"] } }),
         │   SupportTicket.countDocuments({ status: "open" })
         │ ])
         ▼
  [Response JSON: stats + users] ──> [AdminStatsGrid.tsx] hiển thị các thẻ KPI thống kê
  ```

---

### `UC_A03`: Tra cứu & Lọc danh sách người dùng (User Accounts Directory)

* **Bản chất nghiệp vụ:** Tra cứu tức thì tài khoản trong cơ sở dữ liệu theo Họ tên, Email, ID người dùng (`User_Id`), đồng thời hỗ trợ lọc đa tầng theo vai trò (`all`, `systemadmin`, `rentalmoderator`, `owner`, `renter`). Tối ưu bộ lọc Client-side mượt mà, không phụ thuộc vào tải mạng.
- **Tệp phụ trách:**
  - **Frontend:** `fe/src/components/admin/AdminUserTable.tsx` (sử dụng State `searchTerm` và `roleFilter`).
  - **Backend:** `be/src/controllers/adminController.js` (loại trừ các trường nhạy cảm `password_hash`, `google_id`).
- **Cơ chế lọc Client-side:**

  ```javascript
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.User_Id && user.User_Id.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === "all" || user.role.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });
  ```

---

### `UC_A04`: Khóa / Mở khóa tài khoản & Force Logout (Suspend / Reactivate)

* **Bản chất nghiệp vụ:** Quản trị viên đình chỉ hoạt động các tài khoản vi phạm chính sách (`status: "blocked"` / `"suspended"`) hoặc kích hoạt lại (`status: "active"`).
- **Cơ chế Force Logout đặc biệt:** Khi tài khoản bị khóa, hệ thống tự động tăng `token_version` lên 1 đơn vị (`user.token_version += 1`). Ngay lập tức, tất cả phiên đăng nhập hiện hành của người dùng trên mọi thiết bị sẽ bị vô hiệu hóa vì Token cũ không còn khớp với `token_version` trong Database.
- **Tệp phụ trách:**
  - **Frontend:** `fe/src/components/admin/AdminUserTable.tsx` (`handleStatusToggle`).
  - **Backend:** `be/src/controllers/adminController.js` (`updateUserStatus`), `be/src/utils/auditLogger.js`.
- **Luồng xử lý an toàn:**

  ```text
  [Admin click "Khóa / Mở khóa"] ──> PATCH /api/admin/users/:userId/status
         │
         ▼
  [adminController.updateUserStatus()]
         │ 1. Chặn tự khóa chính mình: if (user._id === req.user._id) => throw Error
         │ 2. Cập nhật user.status = status
         │ 3. Nếu khóa: user.token_version = (user.token_version || 0) + 1 (Thu hồi JWT tức thì)
         │ 4. Lưu vết Audit Log: recordAuditLog(req, { action: "USER_STATUS_UPDATED" })
         ▼
  [Response JSON] ──> Bảng Admin cập nhật lại badge trạng thái (Active / Blocked)
  ```

---

### `UC_A05`: Quản lý Phân quyền & Bảo vệ Quản trị viên (Assign / Revoke Roles)

* **Bản chất nghiệp vụ:** Điều chỉnh quyền hạn người dùng giữa các vai trò (`systemadmin`, `rentalmoderator`, `owner`, `renter`).
- **Ràng buộc an toàn 2 lớp (Security Safeguards):**
  1. **Chặn tự hạ cấp:** Quản trị viên đang đăng nhập không thể tự hạ quyền của chính mình xuống User thường để tránh tình trạng "tự khóa cổng quản trị". Nút hạ cấp bị vô hiệu hóa kèm tooltip giải thích.
  2. **Bảo vệ System Admin cuối cùng:** Hệ thống kiểm tra số lượng System Admin đang hoạt động. Nếu chỉ còn lại 1 System Admin duy nhất, Backend sẽ từ chối thao tác hạ quyền với mã lỗi 400 và thông báo rõ ràng.
- **Tệp phụ trách:**
  - **Frontend:** `fe/src/components/admin/AdminUserTable.tsx`.
  - **Backend:** `be/src/controllers/adminController.js` (`updateUserRole`).
- **Luồng xử lý an toàn:**

  ```text
  [Admin chọn phân quyền mới / Bấm hạ cấp] ──> PATCH /api/admin/users/:userId/role
         │
         ▼
  [adminController.updateUserRole()]
         │ 1. if (userId === req.user._id && role !== 'systemadmin') 
         │      => 400 Bad Request: "Bạn không thể tự hạ cấp tài khoản của chính mình"
         │ 2. if (user.role === 'systemadmin' && role !== 'systemadmin') {
         │      const adminCount = await User.countDocuments({ role: 'systemadmin', status: 'active' });
         │      if (adminCount <= 1) => 400 Bad Request: "Hệ thống cần ít nhất một System Admin"
         │    }
         │ 3. user.role = newRole; await user.save();
         │ 4. recordAuditLog(req, { action: "USER_ROLE_UPDATED" })
         ▼
  [Response JSON] ──> Cập nhật UI tức thì kèm Toast thông báo thành công
  ```

---

### `UC_A07`: Thẩm định & Xét duyệt Hồ sơ Chủ thiết bị (Owner Registration Review)

* **Bản chất nghiệp vụ:** Tiếp nhận đơn đăng ký kinh doanh cho thuê thiết bị từ Renter (`UC_O02`), kiểm tra tính xác thực của thông tin định danh (CCCD 2 mặt), giấy phép kinh doanh và tài khoản ngân hàng. Quản trị viên quyết định **Phê duyệt** (tự động nâng quyền tài khoản lên `owner`) hoặc **Từ chối** (kèm lý do bổ sung hồ sơ).
- **Tệp phụ trách:**
  - **Frontend:** `fe/src/pages/admin/AdminDashboard.tsx` (Tab `owner-apps`).
  - **Backend:** `be/src/controllers/ownerRegistrationController.js` (`adminListApplications`, `adminReviewApplication`).
  - **Model:** `be/src/models/OwnerApplication.js`, `be/src/models/User.js`.
- **Luồng xử lý dữ liệu:**

  ```text
  [Admin mở Tab "Xét duyệt hồ sơ Owner"] ──> GET /api/admin/owner-applications
         │ Hiển thị danh sách đơn kèm ảnh CCCD & tài khoản ngân hàng
         ▼
  [Admin bấm Duyệt / Từ chối kèm ghi chú] ──> PATCH /api/admin/owner-applications/:id/review
         │
         ▼
  [ownerRegistrationController.adminReviewApplication()]
         │ Nếu action === "approve":
         │   ├── application.status = "approved"
         │   └── User.findByIdAndUpdate(app.user_id, { role: "owner" })  // TỰ ĐỘNG CẤP QUYỀN
         │ Nếu action === "reject":
         │   └── application.status = "rejected"; application.admin_note = note
         │ Ghi nhận admin duyệt: reviewed_by = req.user._id, reviewed_at = new Date()
         ▼
  [Response JSON] ──> Cập nhật trạng thái thẻ hồ sơ, gửi thông báo đến người nộp đơn
  ```

---

### `UC_A17`: Trung tâm Xử lý Hỗ trợ & Chat Realtime (Support Ticket & Socket.IO)

* **Bản chất nghiệp vụ:** Hệ thống Ticket hỗ trợ khách hàng đa kênh theo cấu trúc Thread Chat. Tích hợp kết nối WebSocket (`Socket.IO`) giúp tin nhắn phản hồi của Quản trị viên và Khách hàng hiển thị tức thì trên cả 2 giao diện mà không cần làm mới trang (F5).
- **Tệp phụ trách:**
  - **Frontend:** `fe/src/pages/admin/AdminDashboard.tsx` (Tab `support`), `fe/src/services/socket.ts`.
  - **Backend:** `be/src/controllers/adminController.js` (`listSupportTickets`, `replySupportTicket`), `be/src/config/socket.js`.
  - **Model:** `be/src/models/SupportTicket.js`, `be/src/models/UserNotification.js`.
- **Luồng xử lý Realtime:**

  ```text
  [Admin nhập nội dung phản hồi] ──> POST /api/admin/support-tickets/:id/reply
         │
         ▼
  [adminController.replySupportTicket()]
         │ 1. Thêm tin nhắn vào ticket.replies[]
         │ 2. Cập nhật ticket.status = "in_progress"
         │ 3. Tạo thông báo trong UserNotification
         │ 4. PHÁT SỰ KIỆN REALTIME QUA SOCKET:
         │    getIO().emit("ticket:replied", { ticketId, ticket, reply })
         ▼
  [Client Socket.IO Listener] ──> Cả màn hình Khách hàng và Admin cập nhật tin nhắn ngay lập tức
  ```

---

### Nâng cấp mở rộng: Duyệt Rút tiền với Mã QR & Hồ sơ Admin

1. **Duyệt Lệnh Rút Tiền Kèm Mã QR Ngân Hàng (`Fin-01`):**
   - **Bối cảnh:** Chủ thiết bị (Owner) yêu cầu rút tiền từ doanh thu cho thuê. Để chuyển khoản nhanh và chính xác 100%, Owner upload ảnh mã QR tài khoản nhận tiền (`fe/src/components/owner/OwnerWallet.tsx`).
   - **Phía Admin (`fe/src/components/admin/AdminFinanceManager.tsx`):** Danh sách lệnh rút tiền có nút **"Xem mã QR"**. Khi bấm, hệ thống hiển thị ảnh mã QR cỡ lớn kèm Tên ngân hàng, Số tài khoản, Tên chủ thẻ và Số tiền cần chuyển. Admin dùng App ngân hàng quét trực tiếp mã QR này trước khi bấm xác nhận chuyển tiền.
2. **Điều hướng Nhanh Header Cho System Admin (`Nav-01`):**
   - Tại trang Portal của Owner (`/owner`), thanh Header kiểm tra quyền `systemadmin` và hiển thị đầy đủ các nút chuyển nhanh: **"Chợ thiết bị"** (`/marketplace`), **"Quản trị viên"** (`/admin`), và **"Kiểm duyệt viên"** (`/moderator`).
3. **Quản lý Hồ sơ Quản trị viên (`Prof-01`):**
   - Tích hợp tab **"Hồ sơ cá nhân"** chuyên dụng trong menu bên trái của `/admin` (`fe/src/components/admin/AdminProfileTab.tsx`), giúp Admin xem và cập nhật thông tin cá nhân, số điện thoại, đổi mật khẩu và xem nhật ký phiên làm việc.

---

## 3. SƠ ĐỒ KIẾN TRÚC HỆ THỐNG & BẢO MẬT 5 LỚP (5-TIER ARCHITECTURE)

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

## 4. HƯỚNG DẪN KIỂM THỬ THỦ CÔNG TRỌN VẸN 1 FLOW (END-TO-END SYSTEM ADMIN TEST FLOW)

> 💡 **Khái niệm Luồng Khép Kín:** Toàn bộ 7 Use Case cốt lõi và các tính năng mở rộng được kết nối thành **1 chu trình vận hành quản trị trọn vẹn duy nhất (Daily Life-Cycle of a System Administrator)** gồm 5 giai đoạn tuần tự: **Khởi động phiên & Nắm bắt chỉ số ➔ Thẩm định & Phê duyệt đối tác Owner ➔ Giám sát người dùng & Phân quyền an toàn ➔ Đối soát tài chính & Quét QR rút tiền ➔ Chăm sóc khách hàng Realtime & Điều phối đa cổng**.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🟢 GIAI ĐOẠN 1: KHỞI ĐỘNG PHIÊN QUẢN TRỊ & NẮM BẮT CHỈ SỐ TOÀN SÀN                       │
│    Bước 1: Đăng nhập Admin an toàn ➔ Bước 2: Quan sát Dashboard KPI & Chỉ số thời gian thực│
│    ➔ Bước 3: Kiểm tra & Cập nhật Hồ sơ cá nhân Quản trị viên                           │
└───────────────────────────────────────┬────────────────────────────────────────────────┘
                                        │ (Hệ thống sẵn sàng vận hành)
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🔵 GIAI ĐOẠN 2: THẨM ĐỊNH & PHÊ DUYỆT ĐỐI TÁC CHỦ MÁY (OWNER ONBOARDING)               │
│    Bước 4: Xét duyệt hồ sơ đăng ký Chủ máy Owner (Thẩm định CCCD, Tài khoản ngân hàng)  │
│    ➔ Phê duyệt tự động nâng cấp quyền Owner                                            │
└───────────────────────────────────────┬────────────────────────────────────────────────┘
                                        │ (Chủ máy hoạt động & phát sinh giao dịch)
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🟡 GIAI ĐOẠN 3: GIÁM SÁT NGƯỜI DÙNG, BẢO VỆ PHÂN QUYỀN & XỬ LÝ VI PHẠM                 │
│    Bước 5: Tra cứu & Lọc đa tầng người dùng ➔ Bước 6: Khóa nick vi phạm (Force Logout)  │
│    ➔ Bước 7: Phân quyền an toàn (Chặn tự hạ cấp chính mình & Bảo vệ Admin duy nhất)    │
└───────────────────────────────────────┬────────────────────────────────────────────────┘
                                        │ (Phát sinh yêu cầu rút tiền doanh thu)
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🟠 GIAI ĐOẠN 4: ĐỐI SOÁT TÀI CHÍNH & XÉT DUYỆT RÚT TIỀN (QR CODE BANKING)               │
│    Bước 8: Kiểm tra lệnh rút tiền của Owner ➔ Quét mã QR ngân hàng nhận tiền ➔ Duyệt    │
└───────────────────────────────────────┬────────────────────────────────────────────────┘
                                        │ (Hỗ trợ người dùng & Điều phối đa cổng)
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🔴 GIAI ĐOẠN 5: CHĂM SÓC KHÁCH HÀNG REALTIME & ĐIỀU PHỐI ĐA CỔNG                       │
│    Bước 9: Tiếp nhận & Phản hồi Ticket hỗ trợ khẩn cấp Realtime (Socket.IO) ➔          │
│    Bước 10: Chuyển đổi linh hoạt giữa các cổng Admin ➔ Moderator ➔ Owner qua Header     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 🟢 Giai đoạn 1: Khởi Động Phiên Quản Trị & Nắm Bắt Chỉ Số Toàn Sàn

- **Bước 01 (`UC_A01`): Đăng nhập Quản trị viên & Xác thực JWT Token**
  - **Vị trí màn hình:** `http://localhost:5173/login`
  - **Thao tác kiểm thử:**
    1. Nhập email tài khoản quản trị: `admin@smartequip.com`.
    2. Nhập mật khẩu: `Admin@123456`.
    3. Thử cố tình nhập sai mật khẩu `Admin@wrong` ➔ Quan sát thông báo lỗi đỏ: *"Email hoặc mật khẩu không chính xác"*.
    4. Nhập đúng mật khẩu và bấm **"Đăng nhập"**.
  - **Kết quả kỳ vọng:** Hệ thống cấp JWT `accessToken`, lưu phiên vào `localStorage` và tự động chuyển hướng ngay sang trang quản trị trung tâm `http://localhost:5173/admin`.

- **Bước 02 (`UC_A02`): Quan sát Dashboard KPI & Đo lường sức khỏe toàn sàn**
  - **Vị trí màn hình:** `/admin` ➔ Tab **"Tổng quan"** (`overview`).
  - **Thao tác kiểm thử:**
    1. Quan sát toàn bộ các thẻ KPI thống kê trên đầu trang: *Tổng người dùng*, *Tài khoản hoạt động*, *Thiết bị chờ duyệt*, *Số vụ khiếu nại đang mở*, và *Số ticket hỗ trợ chưa đóng*.
    2. Bấm nút **"Làm mới dữ liệu"** ở góc phải trên.
  - **Kết quả kỳ vọng:** Dữ liệu được tính toán song song qua `Promise.all` và cập nhật tức thì, biểu đồ tăng trưởng tải mượt mà không chớp giật.

- **Bước 03 (`Prof-01`): Quản lý Hồ sơ cá nhân Quản trị viên**
  - **Vị trí màn hình:** Menu thanh bên trái `/admin` ➔ Bấm chọn mục **"Hồ sơ cá nhân"** (ngay trên nút Đăng xuất).
  - **Thao tác kiểm thử:**
    1. Kiểm tra thông tin họ tên, email, số điện thoại và vai trò hiển thị.
    2. Thử cập nhật số điện thoại liên hệ quản trị mới và bấm Lưu thay đổi.
  - **Kết quả kỳ vọng:** Giao diện tải đầy đủ thông tin, không bị treo tab hay trang trắng, thông tin cập nhật thành công và lưu ngay vào DB.

---

### 🔵 Giai đoạn 2: Thẩm Định & Phê Duyệt Đối Tác Chủ Máy (Owner Onboarding)

- **Bước 04 (`UC_A07`): Xét duyệt hồ sơ đăng ký Owner & Tự động nâng cấp quyền**
  - **Vị trí màn hình:** `/admin` ➔ Menu bên trái chọn Tab **"Xét duyệt hồ sơ Owner (UC_O02, UC_A07)"** (`owner-apps`).
  - **Thao tác kiểm thử:**
    1. Xem danh sách các đơn đăng ký làm Chủ thiết bị có trạng thái `pending`.
    2. Bấm vào một hồ sơ để kiểm tra chi tiết: Ảnh CCCD 2 mặt, thông tin ngân hàng giải ngân, địa chỉ kho máy.
    3. **Thao tác Phê duyệt:** Bấm nút xanh **"Duyệt hồ sơ"** ➔ Nhập ghi chú: *"Hồ sơ hợp lệ, đã xác minh CCCD qua VNeID"*.
    4. **Thao tác Từ chối (đối với đơn khác):** Bấm nút đỏ **"Từ chối"** ➔ Nhập lý do: *"Ảnh chụp mặt sau CCCD bị chói sáng, vui lòng chụp lại"*.
  - **Kết quả kỳ vọng:**
    - Đơn duyệt chuyển trạng thái `approved`, tài khoản người dùng tự động được cập nhật `role = "owner"`, cho phép đăng máy cho thuê ngay lập tức.
    - Đơn từ chối chuyển trạng thái `rejected`, hệ thống lưu vết lý do để gửi email/thông báo đến người dùng.

---

### 🟡 Giai đoạn 3: Giám Sát Người Dùng, Bảo Vệ Phân Quyền & Xử Lý Vi Phạm

- **Bước 05 (`UC_A03`): Tra cứu & Lọc đa tầng danh sách người dùng**
  - **Vị trí màn hình:** `/admin` ➔ Tab **"Quản lý người dùng (UC_A03 - UC_A05)"** (`users`).
  - **Thao tác kiểm thử:**
    1. Nhập từ khóa tìm kiếm: Gõ tên hoặc email (ví dụ: `quang`, `trieu`, `owner`).
    2. Chọn lọc theo vai trò từ dropdown menu: `Renter`, `Owner`, `RentalModerator`, `SystemAdmin`.
  - **Kết quả kỳ vọng:** Bảng danh sách lọc Client-side tức thì mà không cần reload trang; hiển thị rõ Avatar, Họ tên, Email, Vai trò, Trạng thái hoạt động và Ngày đăng ký.

- **Bước 06 (`UC_A04`): Khóa tài khoản vi phạm & Thu hồi phiên đăng nhập tức thì (Force Logout)**
  - **Vị trí màn hình:** `/admin` ➔ Tab **"Quản lý người dùng"** ➔ Cột Thao tác trên từng dòng tài khoản.
  - **Thao tác kiểm thử:**
    1. Tìm một người dùng đang có trạng thái xanh `active`.
    2. Bấm nút **"Khóa tài khoản"**, nhập lý do: *"Vi phạm điều khoản bàn giao trễ hạn 3 lần"*.
    3. Mở tab ẩn danh (Incognito), thử đăng nhập bằng chính tài khoản vừa bị khóa đó.
  - **Kết quả kỳ vọng:**
    - Trên bảng Admin: Badge trạng thái đổi ngay sang màu đỏ `blocked` / `suspended`.
    - Tại trang đăng nhập: Bị chặn đăng nhập và nhận thông báo lỗi: *"Tài khoản của bạn đã bị khóa do vi phạm chính sách"*.
    - **Cơ chế Force Logout:** Biến `token_version` trong Database tăng lên 1, khiến mọi Token JWT cũ trên điện thoại/laptop của người dùng đó bị vô hiệu hóa ngay lập tức.
    - Bấm nút **"Mở khóa"** ➔ Tài khoản phục hồi `active` và đăng nhập lại bình thường.

- **Bước 07 (`UC_A05`): Phân quyền an toàn & Chặn tự hạ cấp tài khoản System Admin**
  - **Vị trí màn hình:** `/admin` ➔ Tab **"Quản lý người dùng"** ➔ Cột Vai trò (Role).
  - **Thao tác kiểm thử:**
    1. Đổi quyền người dùng thông thường: Chọn một tài khoản `renter` ➔ Đổi thành `rentalmoderator` (Kiểm duyệt viên).
    2. **Kiểm tra rào chắn an toàn 1 (Chặn tự hạ quyền):** Tìm dòng của chính tài khoản Admin đang đăng nhập ➔ Thử bấm nút **"Hạ xuống User"**.
    3. **Kiểm tra rào chắn an toàn 2 (Bảo vệ Admin duy nhất):** Trường hợp hệ thống chỉ còn đúng 1 tài khoản `systemadmin` ➔ Nút hạ quyền bị vô hiệu hóa hoàn toàn.
  - **Kết quả kỳ vọng:**
    - Đổi quyền người khác thành công, ghi nhận nhật ký Audit Log.
    - Đối với chính Admin: Nút hạ cấp bị `disabled` kèm tooltip tiếng Việt: *"Không thể tự hạ cấp tài khoản đang đăng nhập"* hoặc toast thông báo lỗi rõ ràng.

---

### 🟠 Giai đoạn 4: Đối Soát Tài Chính & Xét Duyệt Rút Tiền (QR Code Banking)

- **Bước 08 (`Fin-01`): Kiểm tra lệnh rút tiền của Owner & Quét mã QR ngân hàng nhận tiền**
  - **Vị trí màn hình:** `/admin` ➔ Menu bên trái chọn **"Duyệt Ngân Hàng & Rút Tiền"** ➔ Tab **"Duyệt Rút Tiền"**.
  - **Thao tác kiểm thử:**
    1. Xem danh sách các yêu cầu rút tiền đang chờ xử lý (`pending`) do Chủ máy (Owner) gửi lên từ ví doanh thu.
    2. Tại dòng yêu cầu, bấm nút **"Xem mã QR"**.
    3. Quan sát modal hiển thị: Ảnh mã QR ngân hàng chuyển khoản, Tên ngân hàng, Số tài khoản, Tên chủ tài khoản và Số tiền cần chuyển.
    4. Dùng app Mobile Banking quét mã QR để đối chiếu tài khoản người nhận.
    5. Sau khi chuyển khoản thành công, bấm nút **"Xác nhận đã chuyển"**.
  - **Kết quả kỳ vọng:** Modal hiển thị ảnh QR sắc nét, chuẩn xác; lệnh rút tiền chuyển sang trạng thái `completed`, ví của Owner được cập nhật trạng thái tiền đã về tài khoản ngân hàng.

---

### 🔴 Giai đoạn 5: Chăm Sóc Khách Hàng Realtime & Điều Phối Đa Cổng

- **Bước 09 (`UC_A17`): Tiếp nhận & Phản hồi Ticket hỗ trợ khẩn cấp Realtime (Socket.IO)**
  - **Vị trí màn hình:** `/admin` ➔ Menu bên trái chọn Tab **"Hỗ trợ khách hàng (UC_A17)"** (`support`).
  - **Thao tác kiểm thử:**
    1. Mở một tab trình duyệt khác đóng vai Khách hàng/Owner gửi một yêu cầu hỗ trợ mới (Category: *Sự cố giao nhận máy*).
    2. Quan sát màn hình Admin Dashboard:
       - **Kết quả kỳ vọng tức thì:** Nhờ **Socket.IO**, ticket mới xuất hiện ngay đầu danh sách và huy hiệu số ticket chưa đọc tự tăng lên mà **không cần bấm F5**.
    3. Admin bấm chọn Ticket đó để mở khung chat trao đổi trực tiếp.
    4. Gõ câu trả lời: *"Chào bạn, Admin SmartEquip đã tiếp nhận thông tin và đang hỗ trợ bạn"* ➔ Bấm **"Gửi phản hồi"**.
    5. Đổi trạng thái vé từ `open` ➔ `in_progress` ➔ `resolved`.
  - **Kết quả kỳ vọng:** Tin nhắn phản hồi của Admin hiển thị ngay lập tức trên màn hình của khách hàng trong tích tắc, trạng thái vé được đồng bộ 100%.

- **Bước 10 (`Nav-01`): Chuyển đổi linh hoạt giữa các cổng Admin ➔ Moderator ➔ Owner qua Header**
  - **Vị trí màn hình:** Thanh Header tại trang Quản lý Chủ máy `http://localhost:5173/owner`.
  - **Thao tác kiểm thử:**
    1. Đang ở vai trò `systemadmin`, bấm vào nút **"Cổng Owner"** để sang `/owner`.
    2. Quan sát thanh Header trên cùng của trang `/owner`.
    3. Bấm nút **"Kiểm duyệt viên"** (`/moderator`) để sang trang duyệt bài đăng thiết bị.
    4. Từ Header Moderator, bấm nút **"Quản trị viên"** để quay về `/admin`.
  - **Kết quả kỳ vọng:** Thanh Header nhận diện chính xác quyền `systemadmin`, hiển thị đầy đủ các nút chuyển nhanh giữa **Chợ thiết bị**, **Kiểm duyệt viên** và **Quản trị viên**, chuyển trang mượt mà không bị văng phiên đăng nhập.

---

## 📊 BẢNG TỔNG HỢP TRA CỨU NHANH 10 BƯỚC TEST FLOW ADMIN

| Bước | Mã Use Case / Tính Năng | Tên Bước Trong Chu Trình | Màn Hình / Route | Thao Tác Cốt Lõi | Kết Quả Kỳ Vọng |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **01** | `UC_A01` | Đăng nhập Admin an toàn | `/login` | Nhập email, pass Admin | Cấp JWT, chuyển hướng ngay sang `/admin` |
| **02** | `UC_A02` | Quan sát Dashboard & KPI | `/admin` ➔ Tab *Tổng quan* | Xem thẻ thống kê, bấm Làm mới | Số liệu toàn sàn cập nhật theo thời gian thực |
| **03** | `Prof-01` | Quản lý Hồ sơ cá nhân | `/admin` ➔ *Hồ sơ cá nhân* | Xem thông tin, đổi SĐT | Lưu thông tin cá nhân mượt mà, không lỗi state |
| **04** | `UC_A07` | Thẩm định hồ sơ Owner | `/admin` ➔ Tab *owner-apps* | Xem ảnh CCCD, bấm Duyệt hồ sơ | Hồ sơ `approved`, tự động nâng cấp quyền `owner` |
| **05** | `UC_A03` | Tra cứu & Lọc người dùng | `/admin` ➔ Tab *users* | Gõ tên/email, chọn dropdown role | Bảng lọc tức thì Client-side không cần F5 |
| **06** | `UC_A04` | Khóa tài khoản & Force Logout | `/admin` ➔ Tab *users* | Bấm Khóa nick, thử đăng nhập ẩn danh | Bị chặn đăng nhập, thu hồi JWT tức thì |
| **07** | `UC_A05` | Phân quyền & Chặn tự hạ cấp | `/admin` ➔ Tab *users* | Đổi role user, thử hạ quyền chính mình | Nút hạ cấp chính mình bị khóa kèm tooltip |
| **08** | `Fin-01` | Quét mã QR duyệt rút tiền | `/admin` ➔ Tab *Duyệt Rút Tiền* | Bấm nút *Xem mã QR*, quét chuyển tiền | Hiện ảnh QR ngân hàng cỡ lớn, duyệt chuyển tiền |
| **09** | `UC_A17` | Xử lý Ticket Chat Realtime | `/admin` ➔ Tab *support* | Nhận ticket qua Socket, gửi trả lời | Tin nhắn xuất hiện tức thì hai chiều không F5 |
| **10** | `Nav-01` | Điều hướng Header đa cổng | Header `/owner` & `/admin` | Bấm chuyển giữa Admin ↔ Mod ↔ Owner | Chuyển cổng linh hoạt, không mất phiên làm việc |

---

> 💡 **Ghi chú nghiệm thu:** Toàn bộ mã nguồn của 7 Use Case và các tính năng mở rộng đều được bảo vệ bằng cơ chế xác thực JWT, ghi log kiểm toán đa tầng và kiểm tra TypeScript nghiêm ngặt (`npm run build` đạt 100% không lỗi).
