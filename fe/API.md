# Tài liệu API Auth cho Frontend

## Cấu hình chung

- Backend local mặc định: `http://localhost:3000`
- Auth base URL khi chạy frontend qua Vite: `/api/auth` (Vite proxy chuyển tiếp
  tới backend `http://localhost:3000`).
- Có thể đặt `VITE_API_BASE_URL` trong `fe/.env` để đổi API base URL khi triển
  khai; ví dụ `https://api.example.com/api/auth`.
- Đăng nhập Google cần `VITE_GOOGLE_CLIENT_ID` trong `fe/.env`. Đây là OAuth
  Client ID công khai dành cho frontend, không phải client secret.
- Request có JSON body cần gửi header `Content-Type: application/json`.
- Các API cần đăng nhập nhận JWT qua header:

```http
Authorization: Bearer <token>
```

Sau khi đăng ký, đăng nhập hoặc đăng nhập Google, lưu `token` và gửi kèm ở
các request được bảo vệ. Khi đăng xuất hoặc đổi mật khẩu, hãy cập nhật/xóa
token phía frontend theo response.

> Backend hiện chưa cấu hình CORS. Nếu frontend chạy ở origin khác, hãy dùng
proxy trong cấu hình dev của frontend hoặc cấu hình CORS ở backend trước khi
gọi API trực tiếp từ trình duyệt.

## Danh sách endpoint

| Method | URL | Cần JWT | Mục đích |
| --- | --- | --- | --- |
| `POST` | `/register/send-otp` | Không | Gửi OTP xác minh email đăng ký |
| `POST` | `/register/verify-otp` | Không | Xác minh OTP, nhận verification token |
| `POST` | `/register` | Không | Tạo tài khoản với email verification token |
| `POST` | `/login` | Không | Đăng nhập email/mật khẩu |
| `POST` | `/google` | Không | Đăng nhập bằng Google ID token |
| `POST` | `/logout` | Có | Đăng xuất, thu hồi các phiên JWT hiện tại |
| `POST` | `/change-password` | Có | Đổi mật khẩu |
| `POST` | `/forgot-password` | Không | Yêu cầu gửi email đặt lại mật khẩu |
| `POST` | `/reset-password` | Không | Đặt mật khẩu mới từ token trong email |
| `GET` | `/profile` | Có | Xem hồ sơ hiện tại |
| `PATCH` | `/profile` | Có | Cập nhật tên hồ sơ |

Ví dụ: `POST http://localhost:3000/api/auth/login`.

## Chi tiết API và JSON

### Đăng ký

Đăng ký gồm ba bước; chỉ gọi API tạo user sau khi email đã xác minh.

#### 1. Gửi OTP

`POST /register/send-otp`

Request:

```json
{
  "email": "a@example.com"
}
```

Thành công `202 Accepted`:

```json
{
  "message": "If this email can be registered, a verification code will be sent."
}
```

Nhập OTP 6 chữ số được gửi tới email. Mã có hiệu lực 10 phút; gửi lại tối đa
mỗi 60 giây. API giới hạn gửi OTP 5 lần/15 phút cho mỗi IP.

#### 2. Xác minh OTP

`POST /register/verify-otp`

Request:

```json
{
  "email": "a@example.com",
  "otp": "012345"
}
```

Thành công `200 OK`:

```json
{
  "message": "Email verified successfully",
  "email": "a@example.com",
  "verificationToken": "<one-time-registration-token>",
  "expiresInSeconds": 600
}
```

OTP chỉ dùng một lần, giới hạn 5 lần nhập sai. `verificationToken` có hiệu lực
10 phút và frontend phải giữ token này tới bước tạo tài khoản.

#### 3. Tạo tài khoản

`POST /register`

Request:

```json
{
  "name": "Nguyen Van A",
  "email": "a@example.com",
  "password": "password123",
  "verificationToken": "<one-time-registration-token>"
}
```

Thành công `201 Created`: `{ "user": {...}, "token": "<jwt>" }`, với cấu trúc
user như các API profile. Mật khẩu tối thiểu 8 ký tự. Verification token bị
tiêu thụ sau khi đăng ký và không thể dùng lại. Trả `403` nếu email chưa được
xác minh/token hết hạn hoặc đã dùng, `409` nếu email đã tồn tại.

### Đăng nhập

`POST /login`

Request:

```json
{
  "email": "a@example.com",
  "password": "password123"
}
```

Thành công `200 OK`: cùng cấu trúc `{ "user": {...}, "token": "<jwt>" }` như
đăng ký. Trả `401` nếu email/mật khẩu sai và `403` nếu tài khoản không active.

### Đăng nhập bằng Google

`POST /google`

Frontend lấy **Google ID token** từ Google Identity Services và gửi token đó
cho backend. Không gửi Google API key thay cho ID token.

Request:

```json
{
  "idToken": "<google-id-token>"
}
```

Thành công `200 OK`: `{ "user": {...}, "token": "<jwt>" }`. Google account cần
có email đã xác minh. Trả `401` nếu ID token không hợp lệ hoặc email chưa xác
minh, `403` nếu tài khoản không active.

### Đăng xuất

`POST /logout`

Header: `Authorization: Bearer <jwt>`.

Không cần request body. Thành công `200 OK`:

```json
{
  "message": "Logged out successfully. All existing sessions have been revoked."
}
```

Backend tăng `token_version`, nên tất cả JWT hiện tại của tài khoản bị thu hồi.
Frontend nên xóa token đã lưu và chuyển người dùng về màn hình đăng nhập.

### Đổi mật khẩu

`POST /change-password`

Header: `Authorization: Bearer <jwt>`.

Request:

```json
{
  "currentPassword": "password123",
  "newPassword": "newPassword456"
}
```

Thành công `200 OK`: `{ "user": {...}, "token": "<new-jwt>" }`. Lưu token mới
được trả về vì token cũ đã bị thu hồi. Mật khẩu mới tối thiểu 8 ký tự. Trả
`400` nếu mật khẩu hiện tại sai hoặc tài khoản Google chưa có mật khẩu.

### Quên mật khẩu

`POST /forgot-password`

Request:

```json
{
  "email": "a@example.com"
}
```

Thành công `202 Accepted`:

```json
{
  "message": "If an account exists for that email, a password reset link will be sent."
}
```

Response giống nhau dù email có tài khoản hay không. Link gửi qua email có
hiệu lực 15 phút và trỏ tới trang `/reset-password` trên frontend, kèm query
parameters `token` và `email`.

### Đặt lại mật khẩu

`POST /reset-password`

Frontend lấy `token` và `email` từ query parameters của link reset email, sau
đó gửi cùng mật khẩu mới:

```json
{
  "email": "a@example.com",
  "token": "<reset-token-from-email>",
  "newPassword": "newPassword456"
}
```

Thành công `200 OK`:

```json
{
  "message": "Password has been reset. Please sign in again."
}
```

Token hết hạn sau 15 phút và chỉ dùng được một lần. Trả `400` nếu token sai,
hết hạn hoặc mật khẩu mới ngắn hơn 8 ký tự. Sau khi thành công, yêu cầu người
dùng đăng nhập lại.

### Xem hồ sơ

`GET /profile`

Header: `Authorization: Bearer <jwt>`.

Thành công `200 OK`:

```json
{
  "user": {
    "User_Id": "generated-user-id",
    "name": "Nguyen Van A",
    "email": "a@example.com",
    "role": "user",
    "status": "active",
    "trust_score": 0,
    "createdAt": "2026-10-04T00:00:00.000Z",
    "updatedAt": "2026-10-04T00:00:00.000Z"
  }
}
```

Thông tin password và token nội bộ không được trả về.

### Cập nhật hồ sơ

`PATCH /profile`

Header: `Authorization: Bearer <jwt>`.

Hiện tại API chỉ cho phép cập nhật `name`:

```json
{
  "name": "Nguyen Van A updated"
}
```

Thành công `200 OK`: `{ "user": {...} }`, với cấu trúc user như API xem hồ sơ.
Trả `400` nếu `name` thiếu hoặc chỉ chứa khoảng trắng.

## Cấu trúc lỗi

Các lỗi API thường trả JSON:

```json
{
  "message": "Mô tả lỗi"
}
```

Mã lỗi thường gặp:

| HTTP status | Ý nghĩa |
| --- | --- |
| `400` | JSON/body hoặc dữ liệu đầu vào không hợp lệ |
| `401` | Thiếu JWT, JWT sai/hết hạn, thông tin đăng nhập hoặc Google token không hợp lệ |
| `403` | Tài khoản không active |
| `409` | Email/mã tài khoản trùng hoặc xung đột liên kết Google |
| `413` | Request body quá lớn |
| `429` | Vượt giới hạn auth chung (20/15 phút), gửi OTP (5/15 phút), xác minh OTP (15/15 phút), hoặc thời gian chờ gửi lại OTP (60 giây) |
| `503` | MongoDB Atlas không kết nối được hoặc không khả dụng |
| `500` | Lỗi server hoặc dịch vụ email chưa được cấu hình/gặp lỗi |

## Ví dụ gọi API bằng `fetch`

```js
const API_BASE_URL = "http://localhost:3000/api/auth";

const response = await fetch(`${API_BASE_URL}/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "a@example.com",
    password: "password123",
  }),
});

const data = await response.json();

if (!response.ok) {
  throw new Error(data.message || "Request failed");
}

// Lưu data.token theo cơ chế quản lý phiên của ứng dụng.
console.log(data.user);
```
