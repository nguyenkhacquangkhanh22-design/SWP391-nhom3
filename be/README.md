# Backend authentication API

## Environment

Copy `.env.example` values into `.env` and configure MongoDB Atlas, a random
`JWT_SECRET` of at least 32 characters, Google OAuth web client ID, SMTP
credentials, and the frontend URL used for password reset links. Never commit
`.env`.

Google sign-in expects an ID token from a client configured with
`GOOGLE_CLIENT_ID`; a Google API key is not used to authenticate users.

## Endpoints

All routes use the `/api/auth` prefix. Protected routes require
`Authorization: Bearer <token>`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/register/send-otp` | No | Email a 6-digit registration verification code (`email`) |
| POST | `/register/verify-otp` | No | Verify code (`email`, `otp`) and receive one-time verification token |
| POST | `/register` | No | Create account (`name`, `email`, `password`, `verificationToken`) |
| POST | `/login` | No | Sign in (`email`, `password`) |
| POST | `/google` | No | Google sign-in (`idToken`) |
| POST | `/logout` | Yes | Revoke all active JWT sessions for this account |
| POST | `/change-password` | Yes | Change password (`currentPassword`, `newPassword`); returns a replacement token |
| POST | `/forgot-password` | No | Email a time-limited reset link (`email`) |
| POST | `/reset-password` | No | Set a new password (`email`, `token`, `newPassword`) |
| GET | `/profile` | Yes | Read the current profile |
| PATCH | `/profile` | Yes | Update the current profile (`name`) |

### Owner (`/api/owner`) - Bảng 4 Use Cases

Protected with role `owner` or `systemadmin`:

| Method | Path | Use Case | Purpose |
| --- | --- | --- | --- |
| GET | `/overview` | UC_O01 | Thống kê số liệu tổng quan của Owner |
| GET | `/equipments` | UC_O04 | Danh sách thiết bị của Owner |
| POST | `/equipments` | UC_O03 | Tạo bài đăng thiết bị mới kèm ảnh |
| GET | `/equipments/:id` | UC_O04 | Xem chi tiết thiết bị để chỉnh sửa |
| PUT | `/equipments/:id` | UC_O04, UC_O06 | Cập nhật thông tin, giá thuê & điều khoản |
| PATCH | `/equipments/:id/visibility` | UC_O04 | Ẩn/Hiện bài đăng trên sàn |
| POST | `/equipments/:id/schedule` | UC_O05 | Thiết lập lịch khả dụng (không ghi đè lịch đã cam kết) |
| POST | `/equipments/:id/status-request` | UC_O16 | Gửi yêu cầu cập nhật trạng thái kiểm duyệt |
| GET | `/rental-requests` | UC_O07 | Danh sách yêu cầu thuê từ Renter |
| PATCH | `/rental-requests/:id/respond` | UC_O07 | Chấp nhận hoặc từ chối yêu cầu (kèm lý do) |
| GET | `/contracts` | UC_O12 | Danh sách hợp đồng thuê |
| POST | `/contracts` | UC_O12 | Lập hợp đồng thuê theo mẫu từ yêu cầu đã duyệt |
| PUT | `/contracts/:id` | UC_O13 | Sửa hợp đồng nháp & tăng version (v1->v2) |
| POST | `/contracts/:id/submit-approval` | UC_O14 | Gửi hợp đồng đến Rental Moderator duyệt |
| POST | `/contracts/:id/confirm-e-contract` | UC_O15 | Xác nhận ký hợp đồng điện tử E-Contract |
| GET | `/contracts/:id/handover` | UC_O08, UC_O09 | Xem biên bản bàn giao / trả thiết bị |
| POST | `/contracts/:id/handover` | UC_O08 | Lập biên bản bàn giao thiết bị trực tiếp |
| POST | `/contracts/:id/return-inspection` | UC_O09 | Lập biên bản kiểm tra nhận trả & đối chiếu bàn giao |
| GET | `/settlements` | UC_O10 | Danh sách quyết toán |
| POST | `/settlements/:contractId/confirm` | UC_O10 | Xác nhận quyết toán & yêu cầu giải ngân |
| GET | `/revenue-history` | UC_O11 | Theo dõi doanh thu, lịch sử hợp đồng & giải ngân |
| POST | `/disputes` | UC_O17 | Gửi khiếu nại Renter kèm bằng chứng |
| GET | `/disputes` | UC_O17 | Danh sách khiếu nại của Owner |
| POST | `/support-tickets` | UC_O18 | Gửi yêu cầu hỗ trợ |
| GET | `/support-tickets` | UC_O18 | Theo dõi tiến độ xử lý ticket hỗ trợ |

### Owner Registration & Marketplace

| Method | Path | Use Case | Purpose |
| --- | --- | --- | --- |
| POST | `/api/owner-registration` | UC_O02 | Guest/Renter nộp hồ sơ đăng ký trở thành Owner |
| GET | `/api/owner-registration/status` | UC_O02 | Kiểm tra trạng thái duyệt hồ sơ Owner |
| GET | `/api/admin/owner-applications` | UC_O02 | Admin xem danh sách hồ sơ đăng ký Owner |
| PATCH | `/api/admin/owner-applications/:id/review` | UC_O02 | Admin phê duyệt / từ chối hồ sơ đăng ký |
### System Admin (`/api/admin`) - Bảng 5 Use Cases

Protected with role `systemadmin`:

| Method | Path | Use Case | Purpose |
| --- | --- | --- | --- |
| GET | `/overview` | UC_A02 | Xem tổng quan chỉ số và danh sách người dùng |
| PATCH | `/users/:userId/role` | UC_A05 | Cấp / hạ quyền người dùng (User <-> Systemadmin) |
| PATCH | `/users/:userId/status` | UC_A04 | Khóa / mở khóa tài khoản và thu hồi token tức thì |
| GET | `/owner-applications` | UC_A07 | Danh sách hồ sơ đăng ký Owner chờ duyệt |
| PATCH | `/owner-applications/:id/review` | UC_A07 | Phê duyệt hoặc từ chối cấp quyền Owner |
| GET | `/support-tickets` | UC_A17 | Tra cứu danh sách yêu cầu hỗ trợ (có lọc & thống kê) |
| POST | `/support-tickets/:id/reply` | UC_A17 | Trả lời yêu cầu hỗ trợ & cập nhật trạng thái |
| PATCH | `/support-tickets/:id/status` | UC_A17 | Cập nhật trực tiếp trạng thái yêu cầu hỗ trợ |

Passwords must contain at least 8 characters. Password reset links expire after
15 minutes and are single-use. The forgot-password endpoint returns the same
response whether or not the account exists. Logout revokes all sessions for the
account because the current JWT strategy tracks a per-user token version.

Registration requires sending an OTP, verifying the 6-digit code, then creating
the account with the returned one-time verification token. OTP codes expire
after 10 minutes, can be resent once per minute, and allow at most five
incorrect attempts. The verification token also expires after 10 minutes and
is consumed during account creation.
