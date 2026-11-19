# TÀI LIỆU GIẢI THÍCH CHI TIẾT LUỒNG HOẠT ĐỘNG & VẤN ĐÁP CÁC USE CASE SYSTEM ADMIN CÒN LẠI

## Phân Hệ: System Admin — Dự Án SmartEquip

### (Tập trung: UC_A11, UC_A12, UC_A15, UC_A16, UC_A06, UC_A21, UC_A19)

> **Mục đích tài liệu:** Cung cấp tài liệu chuyên sâu dùng để **thuyết trình** và **trả lời chất vấn (Q&A Defense)** trước Hội đồng / Giảng viên. Trình bày rõ ràng: **Nghiệp vụ cốt lõi ➔ Hàm Frontend & Backend xử lý ➔ Luồng dữ liệu kỹ thuật từng bước ➔ Kịch bản thuyết trình ➔ Câu hỏi bẫy thường gặp & Cách trả lời ăn điểm tuyệt đối**.

---

## 📑 BẢNG TRA CỨU HÀM XỬ LÝ CÁC USE CASE CÒN LẠI

| Mã UC | Tên Nghiệp Vụ | API Route (Backend) | Hàm Controller Backend | Hàm Service Frontend | Component / Tab UI |
| :------------------: | :-------------------------------------------- | :---------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------- | :----------------------------------------------------------------- | :------------------------------------------ |
| **`UC_A11`** | **Duyệt / Từ chối bài đăng mới** | `PATCH /api/admin/equipments/:id/approval` | `adminController.reviewEquipmentApproval` | `adminApi.reviewEquipmentApproval` | `AdminDashboard.tsx` (Tab `equipments`) |
| **`UC_A12`** | **Ẩn / Khôi phục bài vi phạm** | `PATCH /api/admin/equipments/:id/visibility` | `adminController.updateEquipmentVisibility` | `adminApi.updateEquipmentVisibility` | `AdminDashboard.tsx` (Tab `equipments`) |
| **`UC_A15`** | **Phân xử tranh chấp hợp đồng** | `GET /api/admin/disputes/:id<br>``PATCH /api/admin/disputes/:id/resolve` | `adminController.getDisputeDetail<br>``adminController.resolveDispute` | `adminApi.getDisputeDetail<br>``adminApi.resolveDispute` | `AdminDisputesTab.tsx` |
| **`UC_A16`** | **Quyết định đền bù & Trừ cọc** | `PATCH /api/admin/disputes/:id/resolve` (kèm cập nhật `Settlement`) | `adminController.resolveDispute` | `adminApi.resolveDispute` | `AdminDisputesTab.tsx` |
| **`UC_A06`** | **Xét duyệt xác thực KYC Renter** | `GET /api/admin/kyc-submissions<br>``PATCH /api/admin/kyc-submissions/:userId/review` | `adminController.listKycSubmissions<br>``adminController.reviewKycSubmission` | `adminApi.getKycSubmissions<br>``adminApi.reviewKycSubmission` | `AdminKycTab.tsx` |
| **`UC_A21`** | **Tra cứu nhật ký Audit Logs** | `GET /api/admin/audit-logs` | `adminController.listAuditLogs` | `adminApi.getAuditLogs` | `AdminAuditLogsTab.tsx` |
| **`UC_A19`** | **Cấu hình phí sàn & chính sách** | `GET /api/admin/policies<br>``PUT /api/admin/policies` | `adminController.getPolicies<br>``adminController.updatePolicies` | `adminApi.getPolicies<br>``adminApi.updatePolicies` | Tab `policies` (Cấu hình) |

---

## 2. CHI TIẾT TỪNG USE CASE DÙNG ĐỂ THUYẾT TRÌNH & TRẢ LỜI VẤN ĐÁP

---

### 📹 `UC_A11`: Approve / Reject Equipment Listing (Kiểm duyệt bài đăng thiết bị mới)

#### 🗣️ Kịch bản thuyết trình (Presentation Script)

> *"Thưa Thầy/Cô và Hội đồng, `UC_A11` là chốt chặn kiểm duyệt chất lượng đầu vào của sàn giao dịch. Khi một Chủ máy (Owner) đăng tải thiết bị mới thông qua `UC_O03`, bài đăng sẽ không lập tức xuất hiện trên sàn mà được đưa vào trạng thái chờ duyệt (`approval_status = "pending"`). System Admin sẽ kiểm tra tính xác thực của hình ảnh, mức giá thuê, tiền cọc bảo đảm và điều khoản thuê trước khi bấm Duyệt bài (công khai trên Marketplace) hoặc Từ chối kèm lý do cụ thể."*

#### 🔄 Luồng hoạt động chi tiết (Step-by-Step Data Flow)

1. **Frontend:** Admin vào Tab **"Duyệt bài đăng"**, chọn mục con **"Chờ xét duyệt"**. Khi Admin bấm nút **"Duyệt"** hoặc **"Từ chối"**, giao diện gọi hàm `handleApproval(equipmentId, approval_status, reason)`.
2. **API Call:** Hàm `adminApi.reviewEquipmentApproval(token, id, approval_status, rejection_reason)` gửi request:

   - `PATCH /api/admin/equipments/:id/approval`
   - Body: `{ approval_status: "approved" | "rejected", rejection_reason: "..." }`.
3. **Backend Middleware:** Kiểm tra `authenticate` (xác thực token) và `authorize("systemadmin")`.
4. **Backend Controller (`adminController.reviewEquipmentApproval`):**

   - Tìm thiết bị trong DB: `const equipment = await Equipment.findById(id)`.
   - Nếu `approval_status === "approved"`:
     - Gán `equipment.approval_status = "approved"`.
     - Tự động mở hiển thị: `equipment.visibility = "published"`.
   - Nếu `approval_status === "rejected"`:
     - Bắt buộc phải có `rejection_reason.trim()` (Validate nghiệp vụ: không được từ chối trống).
     - Gán `equipment.approval_status = "rejected"` và lưu `equipment.rejection_reason`.
   - Lưu vết người duyệt: `equipment.moderated_by = req.user._id`, `equipment.moderated_at = new Date()`.
   - Lưu vào DB: `await equipment.save()`.
5. **Thông báo & Realtime Broadcast:**

   - **Tạo In-app Notification:** Tạo thông báo trong collection `user_notifications` gửi riêng cho `equipment.owner_id` để chủ máy nhận thông báo biến động bài đăng.
   - **Ghi nhật ký hệ thống:** Gọi `recordAuditLog(req, { action: "EQUIPMENT_APPROVED" | "EQUIPMENT_REJECTED", ... })`.
   - **Phát sóng Realtime qua Socket.IO:**

     ```javascript
     getIO().emit("equipment:moderated", { equipmentId, equipment, action: approval_status });
     ```

6. **Frontend cập nhật:** Cả màn hình Admin và màn hình Owner của chủ máy nhận sự kiện Socket ➔ cập nhật trạng thái thẻ bài đăng ngay lập tức mà không cần F5.

#### ❓ Bộ câu hỏi "Bẫy" của Giảng viên & Cách trả lời

- **Hỏi:** *Tại sao khi Owner sửa bài đăng thì có cần duyệt lại không? Thiết kế DB quản lý thế nào?*
- **Trả lời:** *Dạ thưa Thầy/Cô, trong hàm `updateEquipment` của Owner, nếu Owner sửa các thông tin quan trọng như đơn giá, tiền cọc hoặc hình ảnh thiết bị, hệ thống sẽ tự động chuyển `approval_status` trở lại thành `"pending"`. Nhờ vậy ngăn chặn triệt để hành vi "đăng bài giá chuẩn để được duyệt, sau đó sửa thành giá ảo hoặc hàng cấm".*
- **Hỏi:** *Nếu bài đăng bị từ chối thì Owner có phải tạo lại bài mới từ đầu không?*
- **Trả lời:** *Dạ không. Bài đăng bị từ chối vẫn nằm trong danh sách bài của Owner ở trạng thái `rejected` kèm lý do Admin đã nhập. Owner chỉ cần bấm nút Chỉnh sửa, khắc phục theo lý do của Admin và bấm Gửi lại để đưa bài về hàng đợi duyệt.*

---

### 🚫 `UC_A12`: Hide / Restore Equipment Listing (Ẩn / Khôi phục bài đăng vi phạm)

#### 🗣️ Kịch bản thuyết trình (Presentation Script)

> *"Khác với `UC_A11` là khâu duyệt trước khi đăng, `UC_A12` là biện pháp chế tài hậu kiểm khẩn cấp. Khi một thiết bị đang công khai trên sàn nhận được phản ánh hàng giả, thông số lừa đảo hoặc đang xảy ra tranh chấp pháp lý, Admin có quyền ẩn bài đăng ngay lập tức khỏi Marketplace (`visibility = "hidden"`) kèm lý do xử phạt và khôi phục khi lỗi đã được khắc phục."*

#### 🔄 Luồng hoạt động chi tiết (Step-by-Step Data Flow)

1. **Frontend:** Admin tại Tab bài đăng bấm nút **"Ẩn bài đăng"** ➔ Modal hiện lên yêu cầu nhập lý do vi phạm (ví dụ: *"Nhận phản ánh ống kính có nấm mốc nhưng khai báo mới 99%"*). Bấm Xác nhận gọi `handleToggleVisibility`.
2. **API Call:** Hàm `adminApi.updateEquipmentVisibility(token, id, visibility, reason)` gửi:
   - `PATCH /api/admin/equipments/:id/visibility`
   - Body: `{ visibility: "hidden" | "published", reason: "..." }`.
3. **Backend Controller (`adminController.updateEquipmentVisibility`):**
   - Kiểm tra `visibility` nằm trong enum `["published", "hidden"]`.
   - Cập nhật `equipment.visibility = visibility`.
   - Nếu ẩn (`hidden`): Ghi nhận `equipment.hidden_reason = reason`.
   - Nếu khôi phục (`published`): Xóa trắng `equipment.hidden_reason = ""`.
   - `await equipment.save()`.
4. **Thông báo & Đồng bộ:**
   - Tạo `UserNotification` gửi cho Owner thông báo thiết bị bị ẩn kèm lý do.
   - Ghi nhật ký vào `AuditLog` với action `EQUIPMENT_HIDDEN` hoặc `EQUIPMENT_RESTORED`.
   - Phát sóng Socket: `getIO().emit("equipment:visibility_changed", { equipmentId, visibility })`.
5. **Hiệu ứng tức thì:**
   - Phía Marketplace (Khách thuê): Query Marketplace chỉ tìm `{ visibility: "published", approval_status: "approved" }`, nên bài bị ẩn lập tức biến mất khỏi sàn, khách không thể bấm thuê.

#### ❓ Bộ câu hỏi "Bẫy" của Giảng viên & Cách trả lời

- **Hỏi:** *Phân biệt sự khác nhau giữa trường `status` và trường `visibility` trong bảng Equipment?*
- **Trả lời:** *Dạ thưa Thầy/Cô, đây là 2 trạng thái độc lập phục vụ 2 mục đích hoàn toàn khác nhau:

  - `status` (`available`, `rented`, `maintenance`, `reserved`): Đại diện cho **trạng thái vật lý** của thiết bị (máy đang rảnh, đang được ai đó thuê, hay đang mang đi lau bụi cảm biến).
  - `visibility` (`published`, `hidden`, `draft`): Đại diện cho **quyền hiển thị thương mại** trên sàn giao dịch (được hiển thị cho khách xem, bị admin ẩn vì vi phạm, hay chủ máy đang lưu nháp chưa muốn đăng).*

---

### ⚖️ `UC_A15`: Resolve Rental Dispute (Phân xử khiếu nại tranh chấp hợp đồng)

#### 🗣️ Kịch bản thuyết trình (Presentation Script)

> *"UC_A15 đóng vai trò là 'Tòa trọng tài kỹ thuật số' của sàn SmartEquip. Khi phát sinh mâu thuẫn giữa Renter và Owner sau khi hoàn trả thiết bị (như xước thấu kính, nứt vỏ máy, thiếu sạc pin, trễ hạn giao trả), đơn khiếu nại kèm hình ảnh/video bằng chứng sẽ được gửi lên Admin. Admin sẽ vào thẩm định Hợp đồng điện tử gốc, Biên bản bàn giao lúc nhận - trả máy và đưa ra phán quyết văn bản cuối cùng."*

#### 🔄 Luồng hoạt động chi tiết (Step-by-Step Data Flow)

1. **Frontend:** Admin mở Tab **"Phân xử tranh chấp"** (`AdminDisputesTab.tsx`), danh sách tranh chấp hiển thị các vụ việc ở trạng thái `pending_review` hoặc `investigating`.
2. **Xem hồ sơ chứng cứ liên thông (`GET /api/admin/disputes/:id`):**
   - Hàm `adminController.getDisputeDetail` sử dụng Mongoose Populate liên kết đa tầng:
     - Thông tin Hợp đồng thuê (`RentalContract`): Giá thuê, tiền cọc, ngày bắt đầu - kết thúc.
     - Biên bản bàn giao 2 chiều (`HandoverRecord`): Tình trạng máy lúc giao cho khách vs lúc khách trả về.
     - Quyết toán tài chính (`Settlement`).
     - Danh sách ảnh/video bằng chứng vết hỏng hóc do hai bên tải lên (`evidence_urls`).
3. **Admin tiến hành phân xử (`PATCH /api/admin/disputes/:id/resolve`):**
   - Admin chọn 1 trong 3 trạng thái phán quyết:
     - `investigating`: Đang yêu cầu 2 bên bổ sung thêm video/hóa đơn sửa chữa tại hãng.
     - `resolved`: Chấp thuận khiếu nại, có phát sinh đền bù thiệt hại.
     - `dismissed`: Bác bỏ khiếu nại (ví dụ vết xước đã có sẵn từ trước khi thuê được ghi rõ trong biên bản bàn giao bàn đầu).
   - Nhập ghi chú phán quyết bắt buộc: `resolution_note` (Căn cứ giải trình).
4. **Lưu trữ phán quyết:**
   - Ghi nhận `dispute.resolved_by = req.user._id`, `dispute.resolved_at = new Date()`.
   - Tự động kích hoạt cơ chế liên thông tài chính sang **UC_A16**.

#### ❓ Bộ câu hỏi "Bẫy" của Giảng viên & Cách trả lời

- **Hỏi:** *Cơ sở nào để Admin đưa ra phán quyết mà không bị Owner hoặc Renter kiện là phán quyết thiên vị?*
- **Trả lời:** *Dạ thưa Thầy/Cô, phán quyết của Admin dựa trên **chuỗi bằng chứng bất biến (Chain of Evidence)**:

  1. Biên bản bàn giao lúc nhận máy (`HandoverRecord` bàn giao có chữ ký xác nhận của cả 2 bên lúc nhận máy).
  2. Biên bản kiểm tra lúc trả máy (`Return Inspection Record` ghi nhận vết xước phát sinh mới).
  3. Hình ảnh chụp cận cảnh thiết bị trước và sau khi thuê.
     Mọi căn cứ này đều được lưu trong trường `resolution_note` và thông báo công khai cho cả 2 bên.*

---

### 💰 `UC_A16`: Approve Refund / Deposit Deduction (Phê duyệt bồi thường & Trừ tiền cọc)

#### 🗣️ Kịch bản thuyết trình (Presentation Script)

> *"Nếu UC_A15 là phán quyết tư pháp thì UC_A16 là việc thi hành án tài chính. Khi Admin quyết định một mức bồi thường thiệt hại, hệ thống SmartEquip sẽ tự động tính toán lại dòng tiền trong bảng Quyết toán (`Settlement`), tự động trừ tiền cọc của Renter, bù cho Owner và bảo toàn đúng tỷ lệ phí sàn."*

#### 🔄 Luồng hoạt động chi tiết (Step-by-Step Data Flow)

```text
[Admin nhập số tiền bồi thường: compensation_approved]
    │ (Ví dụ: Thiết bị hỏng ống kính, duyệt đền bù 2.000.000đ)
    ▼
[adminController.js : resolveDispute()]
    │ 1. Tìm bản ghi Settlement tương ứng với contract_id
    │ 2. CẬP NHẬT TÀI CHÍNH TỰ ĐỘNG:
    │    ├── damage_deduction = compensation_approved (2.000.000đ)
    │    ├── deduction_reason = resolution_note
    │    ├── deposit_refund_to_renter = Math.max(0, deposit_paid - overtime_fee - damage_deduction)
    │    └── owner_payout_amount = total_rental_fee - platform_fee + overtime_fee + damage_deduction
    │ 3. await settlement.save()
    ▼
[Gửi thông báo hai chiều đồng thời]
    ├── UserNotification ➔ Gửi cho Owner: "Đã duyệt bồi thường 2.000.000đ vào phiếu quyết toán"
    └── UserNotification ➔ Gửi cho Renter: "Tiền cọc được hoàn lại đã trừ 2.000.000đ do hư hại thiết bị"
    ▼
[Ghi AuditLog] ➔ Action: DISPUTE_RESOLVED kèm diff tài chính
    ▼
[Socket.IO Broadcast] ➔ dispute:resolved
```

#### ❓ Bộ câu hỏi "Bẫy" của Giảng viên & Cách trả lời

- **Hỏi:** *Nếu số tiền đền bù thiệt hại vượt quá số tiền cọc mà khách thuê đã đặt thì hệ thống xử lý thế nào?*
- **Trả lời:** *Dạ thưa Thầy/Cô, tiền cọc đóng vai trò là **hạn mức ký quỹ tối đa (Escrow Deposit Ceiling)** được giữ trực tiếp trên sàn. Hệ thống code:
  `deposit_refund_to_renter = Math.max(0, deposit_paid - damage_deduction)`.
  Nếu thiệt hại lớn hơn tiền cọc, số tiền hoàn cọc sẽ về 0đ và toàn bộ tiền cọc được chuyển cho chủ máy. Với phần thiệt hại vượt mức cọc, Admin sẽ ghi rõ trong `resolution_note` yêu cầu hai bên thỏa thuận dân sự hoặc làm việc với bảo hiểm thiết bị bên ngoài.*

---

### 🆔 `UC_A06`: Approve / Reject KYC Submission (Xét duyệt xác thực danh tính Renter)

#### 🗣️ Kịch bản thuyết trình (Presentation Script)

> *"Để ngăn chặn rủi ro khách thuê mang máy ảnh đắt tiền trị giá hàng chục triệu đi cầm cố hoặc tráo đổi linh kiện, UC_A06 là quy trình định danh điện tử KYC. Khách thuê bắt buộc phải chụp CCCD 2 mặt và ảnh selfie cầm CCCD. Admin sẽ đối chiếu khuôn mặt, số định danh trước khi gắn tích xanh Verified và cộng điểm tín nhiệm."*

#### 🔄 Luồng hoạt động chi tiết (Step-by-Step Data Flow)

1. **Frontend:** Admin mở Tab **"Duyệt KYC"** (`AdminKycTab.tsx`). Bảng hiển thị danh sách hồ sơ có `kycStatus === "pending"`.
2. **Lightbox thẩm định:** Admin click vào ảnh phóng to để kiểm tra:
   - Ảnh mặt trước và mặt sau CCCD: Đọc rõ số định danh 12 số, ngày cấp, không bị lóa sáng hay tẩy xóa.
   - Ảnh selfie chân dung: Khuôn mặt người trong ảnh cầm CCCD trùng khớp với ảnh trên thẻ căn cước.
3. **Phê duyệt (`PATCH /api/admin/kyc-submissions/:userId/review`):**
   - **Nếu DUYỆT (`status === "verified"`):**

     ```javascript
     user.kycStatus = "verified";
     user.kycDocument.verifiedAt = new Date();
     user.kycDocument.verifiedBy = req.user._id;
     user.trust_score = (user.trust_score || 0) + 20; // CỘNG +20 ĐIỂM TÍN NHIỆM
     ```

     Sau khi được duyệt, tài khoản Renter mở khóa quyền thuê các thiết bị có giá trị cao (High-value assets).
   - **Nếu TỪ CHỐI (`status === "rejected"`):**

     - Bắt buộc nhập lý do từ chối: `rejectionReason` (ví dụ: *"Ảnh mặt sau CCCD bị mất góc, vui lòng chụp lại nơi đủ sáng"*).
4. **Thông báo & Đồng bộ:**
   - Tạo thông báo `UserNotification` chúc mừng hoặc báo lỗi gửi vào chuông của Renter.
   - Ghi nhật ký vào `AuditLog` với action `KYC_VERIFIED` hoặc `KYC_REJECTED`.
   - Phát Socket `kyc:reviewed` giúp giao diện Renter tự động đổi sang badge "Đã xác thực ✅".

#### ❓ Bộ câu hỏi "Bẫy" của Giảng viên & Cách trả lời

- **Hỏi:** *Tại sao lại có trường `trust_score`? Điểm này dùng vào việc gì trong hệ thống?*
- **Trả lời:** *Dạ `trust_score` là điểm tín nhiệm của người dùng:

  - Tài khoản mới đăng ký: `trust_score = 0`.
  - Xác thực KYC thành công: cộng `+20` điểm.
  - Mỗi đơn thuê hoàn thành đúng hẹn, không trầy xước: cộng `+5` điểm.
  - Bị khiếu nại tranh chấp hỏng hóc: trừ `-30` điểm.
    Chủ máy (Owner) có thể cài đặt điều kiện: "Chỉ cho khách thuê có `trust_score >= 20` thuê ống kính đắt tiền", giúp sàn giảm thiểu rủi ro mất mát tài sản.*

---

### 🛡️ `UC_A21`: View Audit Logs (Tra cứu nhật ký kiểm toán hệ thống)

#### 🗣️ Kịch bản thuyết trình (Presentation Script)

> *"Một hệ thống quản trị chuyên nghiệp bắt buộc phải có cơ chế chống chối bỏ trách nhiệm (Non-repudiation). UC_A21 tự động ghi lại toàn bộ dấu vết của Admin: Ai đã làm gì? Tác động vào đối tượng nào? Lúc mấy giờ? Từ địa chỉ IP nào? Bảng Audit Log được thiết kế theo nguyên tắc Append-Only (chỉ thêm mới, không ai có quyền sửa hoặc xóa)."*

#### 🔄 Luồng hoạt động chi tiết (Step-by-Step Data Flow)

1. **Cơ chế ghi tự động (`be/src/utils/auditLogger.js`):**
   Mỗi khi có hành động quản trị (Đổi role, Khóa tài khoản, Duyệt bài, Phán quyết cọc, Duyệt KYC), Controller gọi hàm `recordAuditLog(req, data)`. Hàm tự động trích xuất:

   ```javascript
   const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
   const userAgent = req.headers["user-agent"];
   await AuditLog.create({
     actor_id: req.user._id,
     actor_name: req.user.name,
     actor_email: req.user.email,
     actor_role: req.user.role,
     action: "EQUIPMENT_APPROVED",
     target_type: "Equipment",
     target_id: equipment._id,
     target_label: equipment.title,
     details: { ... },
     ip_address: ip,
     user_agent: userAgent,
     createdAt: new Date()
   });
   ```

2. **Admin tra cứu (`AdminAuditLogsTab.tsx`):**

   - Gọi `GET /api/admin/audit-logs` với các tham số lọc:
     - `action`: Lọc theo loại hành động (`EQUIPMENT_MODERATED`, `DISPUTE_RESOLVED`, `KYC_VERIFIED`...).
     - `targetType`: Lọc theo thực thể (`User`, `Equipment`, `Dispute`).
     - `search`: Tìm kiếm từ khóa theo Email Admin, tên đối tượng.
     - `startDate` & `endDate`: Lọc theo khoảng ngày.
     - `page` & `limit`: Phân trang dữ liệu server-side.
3. **Hiển thị giao diện:** Bảng hiển thị Badge màu theo từng loại hành động, có nút mở xem chi tiết Payload JSON diff (giá trị cũ vs giá trị mới).

#### ❓ Bộ câu hỏi "Bẫy" của Giảng viên & Cách trả lời

- **Hỏi:** *Admin có vào bảng Audit Log xóa log để che giấu hành vi sai phạm được không?*
- **Trả lời:** *Dạ thưa Thầy/Cô, KHÔNG THỂ XÓA ĐƯỢC! Trong file `be/src/routes/adminRoutes.js`, endpoint của audit-logs CHỈ CÓ DUY NHẤT một method là `GET /audit-logs`. Hệ thống hoàn toàn không viết bất kỳ API nào có method `DELETE` hoặc `PATCH` cho AuditLog. Cơ sở dữ liệu tuân thủ nguyên tắc Immutable Append-Only, đảm bảo tính toàn vẹn 100% cho kiểm toán bảo mật.*

---

### ⚙️ `UC_A19`: Configure System Policies & Fees (Cấu hình phí sàn & chính sách vận hành)

#### 🗣️ Kịch bản thuyết trình (Presentation Script)

> *"UC_A19 giúp hệ thống thích ứng linh hoạt với thị trường mà không cần sửa code. Admin có thể thay đổi tỷ lệ hoa hồng sàn thu trên mỗi đơn thuê, thời gian cho phép hủy đơn miễn phí, tỷ lệ phạt khi hủy muộn và bật chế độ bảo trì hệ thống chỉ với một thao tác cập nhật cấu hình."*

#### 🔄 Luồng hoạt động chi tiết (Step-by-Step Data Flow)

1. **Frontend:** Admin vào Tab Cấu hình, form hiển thị các tham số hiện hành:
   - Tỷ lệ phí sàn: `platform_fee_percent` (mặc định: `10%`).
   - Thời hạn hủy đơn miễn phí: `free_cancellation_hours` (mặc định: `24 giờ`).
   - Tỷ lệ phạt hủy đơn muộn: `late_cancellation_penalty_percent` (mặc định: `20%`).
   - Bật/tắt chế độ bảo trì: `maintenance_mode` (`true`/`false`).
2. **Lưu cấu hình:** Bấm "Lưu chính sách" ➔ Gọi `PUT /api/admin/policies`.
3. **Ảnh hưởng thực tế trong code nghiệp vụ:**
   - Khi tạo quyết toán hợp đồng (`Settlement`): Công thức tự động lấy `platform_fee = rental_fee * (policy.platform_fee_percent / 100)`.
   - Khi khách bấm hủy đơn thuê (`RentalRequest`): Hệ thống so sánh khoảng cách giữa thời điểm hủy và giờ nhận máy với `policy.free_cancellation_hours` để quyết định hoàn cọc 100% hay áp dụng phạt.
   - Khi `maintenance_mode === true`: Middleware toàn cục chặn tất cả request của Renter/Owner và trả về thông báo bảo trì, chỉ duy nhất `systemadmin` được truy cập.

---

## 3. TỔNG KẾT BẢNG SO SÁNH 14 USE CASE ĐẠT CHUẨN ĐỒ ÁN TỐT NGHIỆP

| Phân Nhóm Nghiệp Vụ | Use Case Triển Khai | Điểm Nhấn Kiến Trúc & Công Nghệ |
| :----------------------------------- | :--------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| **Xác thực & Người dùng** | `UC_A01`, `UC_A03`, `UC_A04`, `UC_A05` | JWT Stateful với `token_version` (Force logout), Self-lock Guard, Last Admin Guard, Projection ẩn mật khẩu. |
| **Đối tác & Định danh** | `UC_A07`, `UC_A06` | Nâng role tự động liên thông (`User.role = "owner"`), Định danh CCCD 2 mặt & Selfie, Điểm uy tín `trust_score`. |
| **Marketplace & Nội dung** | `UC_A11`, `UC_A12` | Hàng đợi kiểm duyệt `pending`, phân định rõ ràng giữa `status` vật lý và `visibility` hiển thị, Socket.IO realtime. |
| **Tài chính & Pháp lý** | `UC_A15`, `UC_A16` | Đối chiếu biên bản bàn giao 2 chiều, phán quyết có văn bản, tự động đồng bộ cọc và phí sang phiếu `Settlement`. |
| **CSKH & Kiểm toán** | `UC_A17`, `UC_A21`, `UC_A19` | Thread Chat 2 chiều thời gian thực với Socket.IO, Audit Log bất biến lưu IP/User-Agent, Tham số hóa phí sàn động. |
