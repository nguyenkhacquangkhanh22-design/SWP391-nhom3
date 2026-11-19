# 📖 HƯỚNG DẪN TOÀN DIỆN: TÍNH NĂNG AI SHOT-TO-GEAR MATCHER
> **Nền tảng:** SmartEquip - Hệ thống cho thuê thiết bị công nghệ & quay chụp điện ảnh  
> **Công nghệ AI:** Groq LPU (Language Processing Unit) + Mô hình đa phương thái `qwen/qwen3.8-27b`  
> **Tác giả:** Đội ngũ Kỹ thuật SmartEquip

---

## 📌 MỤC LỤC
1. [AI này có tác dụng gì và làm được gì trong Website?](#1-ai-này-có-tác-dụng-gì-và-làm-được-gì-trong-website)
2. [Cách xây dựng tính năng AI này từ đầu (How it was built)](#2-cách-xây-dựng-tính-năng-ai-này-từ-đầu-how-it-was-built)
3. [Luồng hoạt động tổng thể (Workflow chi tiết)](#3-luồng-hoạt-động-tổng-thể-workflow-chi-tiết)
4. [Danh sách các File Code liên quan & Trách nhiệm từng file](#4-danh-sách-các-file-code-liên-quan--trách-nhiệm-từng-file)
5. [Cấu trúc Dữ liệu & Format Trả về (JSON Schema)](#5-cấu-trúc-dữ-liệu--format-trả-về-json-schema)
6. [Hướng dẫn Chạy & Kiểm thử](#6-hướng-dẫn-chạy--kiểm-thử)

---

## 1. AI NÀY CÓ TÁC DỤNG GÌ VÀ LÀM ĐƯỢC GÌ TRONG WEBSITE?

### 🎯 Nỗi đau thực tế của khách hàng (Problem Statement)
Trong ngành cho thuê thiết bị quay phim - chụp ảnh:
- **Người dùng phổ thông, Content Creator, TikToker, đạo diễn mới** thường xem được một bức ảnh poster phim, một khung hình video ca nhạc (MV), hoặc một bộ ảnh nghệ thuật trên Pinterest/Instagram và rất thích phong cách đó.
- **Họ KHÔNG BIẾT:**
  - Bức ảnh đó chụp bằng tiêu cự bao nhiêu mm?
  - Dùng khẩu độ (aperture) nông hay sâu?
  - Ánh sáng setup theo kiểu gì (Key light, Fill light, Rim light hay Low-key)?
  - Phải thuê máy ảnh (Body), ống kính (Lens), đèn và chân máy (Gimbal/Tripod) nào trong kho SmartEquip để tái hiện được khung hình đó?
- Kết quả: Khách hàng hoang mang không biết chọn gì, hoặc thuê sai thiết bị dẫn đến quay chụp không đạt kết quả mong muốn.

### 🚀 Tác dụng & Khả năng của AI Shot-to-Gear Matcher
Tính năng biến SmartEquip từ một **sàn cho thuê thông thường** thành một **Trợ lý Đạo diễn Hình ảnh (Virtual Director of Photography - DoP)**:

1. **Phân tích giải phẫu quang học (Optical Reverse Engineering):**
   - Đọc bức ảnh hoặc khung hình video và bóc tách các thông số vật lý:
     - **Tiêu cự ước tính (Focal Length):** Ví dụ 85mm (chân dung), 35mm (góc rộng điện ảnh), 24mm (phong cảnh).
     - **Khẩu độ & DOF (Aperture / Depth-of-Field):** Ví dụ f/1.4 - f/1.8 (xóa phông mượt) hay f/8 (nét toàn cảnh).
     - **Hệ thống ánh sáng (Lighting Setup):** Nguồn sáng tự nhiên hay nhân tạo, góc đánh đèn chính/phụ.
     - **Độ ổn định máy (Motion Stability):** Cần Tripod tĩnh, Gimbal chống rung hay Handheld rung lắc nghệ thuật.
     - **Tone màu (Color Grading):** Nhận diện phong cách màu (Teal & Orange, Noir tương phản cao, Vintage Warm...).

2. **So khớp thông minh với Kho hàng thực tế (Live Inventory Matching):**
   - Không chỉ gợi ý chung chung như các chatbot thông thường, AI này lấy trực tiếp dữ liệu thiết bị thực tế đang có sẵn trong CSDL MongoDB của SmartEquip.
   - Chọn ra Body máy chính xác (`_id`) đang cho thuê, tính điểm tương đồng (`match_confidence` từ 75% - 98%).
   - Tự động phân loại: `EXACT_MATCH` (Khớp chính xác model) hoặc `BEST_ALTERNATIVE` (Kho không có model đó thì tự động chọn model tương đương gần nhất).

3. **Tạo Combo thiết bị tối ưu chi phí (All-in-One Rental Combo):**
   - Đề xuất Body máy + Ống kính nên dùng + Đèn chiếu sáng + Chân máy/Gimbal.
   - Tính toán tổng chi phí thuê ước tính/ngày.

4. **Nút "Thuê ngay" 1-chạm (1-Click Conversion):**
   - Khách hàng bấm **`🚀 Thuê ngay máy này`** -> Chuyển thẳng đến trang chi tiết của thiết bị đó trên SmartEquip để thanh toán đặt cọc, rút ngắn chu kỳ suy nghĩ từ 30 phút xuống còn 10 giây.

5. **Hướng dẫn thực hành hiện trường & Hậu kỳ LUT (Actionable Production Tips):**
   - Hướng dẫn người dùng đứng cách chủ thể bao xa, đặt góc máy ra sao.
   - Hướng dẫn cách kéo màu trong Lightroom/Premiere hoặc áp LUT màu để ra đúng màu như ảnh mẫu.

---

## 2. CÁCH XÂY DỰNG TÍNH NĂNG AI NÀY TỪ ĐẦU (HOW IT WAS BUILT)

### 🔹 Bước 1: Lựa chọn Hạ tầng AI & Mô hình Vision
- **Yêu cầu:** Xử lý hình ảnh (Vision/Multimodal), độ trễ thấp (<3s), chi phí rẻ hoặc miễn phí, không dùng Gemini do giới hạn hạ tầng của dự án.
- **Giải pháp:** Sử dụng **Groq LPU API** (Language Processing Unit của Groq xử lý suy luận cực kỳ nhanh).
- **Lựa chọn mô hình:**
  - Mô hình cũ của Meta `llama-3.2-11b-vision-preview` đã bị Groq khai tử (decommissioned).
  - Qua kiểm tra catalog API của Groq, mô hình thị giác đang hoạt động mạnh mẽ nhất là **`qwen/qwen3.8-27b`** (27 tỷ tham số, hỗ trợ Multimodal Vision, bóc tách ảnh chi tiết, phản hồi trong **~2.2 giây**).

### 🔹 Bước 2: Thiết kế Prompt Kỹ thuật & Bơm Ngữ cảnh Kho Hàng (Context Injection)
Để AI không "bịa" ra những chiếc máy mà SmartEquip không có, hệ thống sử dụng kỹ thuật **Context-Aware Prompting**:
1. Server query danh sách thiết bị có trạng thái `available` từ MongoDB.
2. Nén các thông tin cốt lõi (ID, tên thiết bị, danh mục, thương hiệu, giá thuê, thông số) thành dạng JSON rút gọn.
3. Bơm danh sách này vào System Prompt kèm bức ảnh người dùng cung cấp.
4. Yêu cầu AI đóng vai DoP chuyên nghiệp, phân tích ảnh rồi chọn ra đúng thiết bị từ danh sách trên.

### 🔹 Bước 3: Tối ưu Giới hạn Token (Rate Limit Tuning)
- Trên gói dịch vụ Groq On-Demand (Free), giới hạn Output Tokens Per Minute (OTPM) của `qwen/qwen3.8-27b` là 1.000 tokens.
- Ban đầu nếu để `max_tokens: 1200`, API sẽ bị lỗi HTTP 429 RateLimit.
- **Giải pháp:** Tinh chỉnh `max_tokens: 750` và tinh gọn format JSON. Dữ liệu thực tế chỉ tiêu tốn ~300-350 tokens, chạy mượt mà và không bao giờ vượt ngưỡng giới hạn.

### 🔹 Bước 4: Xử lý Dữ liệu JSON & Thẻ Suy luận Phòng thủ
- Một số mô hình suy luận (Reasoning models) có thể chèn thẻ suy luận `<think>...</think>` hoặc markdown blocks ` ```json...``` `.
- Viết Regex Parser phòng thủ: loại bỏ triệt để `<think>...</think>`, bóc tách chuỗi JSON thuần và fallback bằng regex `\{[\s\S]*\}` để đảm bảo không bao giờ crash server.

---

## 3. LUỒNG HOẠT ĐỘNG TỔNG THỂ (WORKFLOW CHI TIẾT)

```
[ NGƯỜI DÙNG ]
     │
     ├── 1. Chọn 1 trong 4 Preset ảnh mẫu HOẶC Kéo-thả ảnh thật từ máy tính
     ▼
[ FRONTEND - ShotToGearModal.tsx ]
     │
     ├── 2. Bấm "Bắt đầu phân tích & khớp máy"
     ├── 3. Hiển thị hiệu ứng Laser Scanner quét quang học
     ├── 4. Đóng gói dữ liệu (FormData nếu là File, JSON nếu là URL)
     ▼
[ BACKEND ROUTE - POST /api/ai/shot-to-gear ]
     │
     ├── 5. Multer nhận file vào Memory Buffer (không lưu rác lên đĩa)
     ├── 6. Chuyển đổi Buffer thành chuỗi Base64
     ▼
[ BACKEND SERVICE - aiService.js ]
     │
     ├── 7. Truy vấn MongoDB: Equipment.find({ status: "available" })
     ├── 8. Rút trích danh sách máy trong kho (ID, Title, Category, Price...)
     ├── 9. Gửi Multimodal Request (Ảnh Base64 + Kho máy + Prompt DoP) tới Groq LPU API
     ▼
[ GROQ LPU INFERENCE ENGINE (qwen/qwen3.8-27b) ]
     │
     ├── 10. Phân tích quang học (Tiêu cự, Khẩu độ, Ánh sáng, Chống rung, Màu sắc)
     ├── 11. Đối chiếu và chọn Body máy phù hợp nhất trong kho SmartEquip
     ├── 12. Soạn hướng dẫn bấm máy & công thức hậu kỳ
     ├── 13. Trả về cấu trúc JSON trong ~2.2 giây
     ▼
[ BACKEND SERVICE - aiService.js ]
     │
     ├── 14. Lọc bỏ thẻ <think>, làm sạch markdown fences
     ├── 15. JSON.parse() an toàn
     ├── 16. Nối thêm dữ liệu chi tiết của thiết bị khớp (Ảnh sản phẩm thật, giá, category)
     ▼
[ FRONTEND RENDER ]
     │
     ├── 17. Hiển thị 3 Tab: Combo máy | Thông số quang học | Mẹo quay chụp & LUT
     ├── 18. Người dùng bấm "Thuê ngay máy này" -> Chuyển hướng tới /equipment/:id
```

---

## 4. DANH SÁCH CÁC FILE CODE LIÊN QUAN & TRÁCH NHIỆM TỪNG FILE

### 📁 BACKEND (Node.js / Express / MongoDB)

| Đường dẫn file | Trách nhiệm & Nội dung chính |
| :--- | :--- |
| **`be/.env`** | Lưu biến môi trường `GROQ_API_KEY=gsk_...` để kết nối vào nền tảng Groq LPU. |
| **`be/package.json`** | Khai báo thư viện chính thức `groq-sdk` cùng với `multer`. |
| **`be/src/services/aiService.js`** | **Trái tim xử lý AI:** <br>• Lấy kho thiết bị từ `Equipment.find()`.<br>• Tạo System Prompt chuẩn DoP chuyên nghiệp.<br>• Gọi API Groq LPU qua model `qwen/qwen3.8-27b` với `max_tokens: 750`.<br>• Parser phòng thủ JSON chống lỗi thẻ suy luận `<think>`.<br>• Ghép nối thông tin thiết bị thực tế trả về. |
| **`be/src/controllers/aiController.js`** | Tiếp nhận request từ client, kiểm tra dữ liệu đầu vào (hỗ trợ cả file buffer từ multer lẫn image url), xử lý mã lỗi và trả về response JSON thống nhất. |
| **`be/src/routes/aiRoutes.js`** | Cấu hình `multer.memoryStorage()` (giới hạn 15MB, kiểm tra định dạng ảnh) và định nghĩa router `POST /shot-to-gear`. |
| **`be/src/app.js`** | Đăng ký route chính: `app.use("/api/ai", aiRoutes);`. |
| **`be/scripts/test_shot_to_gear_endpoint.js`** | Script kiểm thử tự động tầng Service: kết nối DB, gửi ảnh Unsplash, đo thời gian xử lý và in chi tiết thông số bóc tách. |
| **`be/scripts/test_http_upload.js`** | Script kiểm thử tự động tầng HTTP Controller: mở ephemeral server, giả lập client gửi POST request và kiểm tra HTTP 200. |

---

### 💻 FRONTEND (React / TypeScript / Tailwind CSS)

| Đường dẫn file | Trách nhiệm & Nội dung chính |
| :--- | :--- |
| **`fe/src/services/aiApi.ts`** | Khai báo các TypeScript Interfaces (`ShotToGearResponse`, `OpticalAnalysis`, `RecommendedCombo`, `MatchedEquipmentDetail`) và hàm gọi API `shotToGear()` hỗ trợ cả upload FormData và JSON. |
| **`fe/src/components/ai/ShotToGearModal.tsx`** | **Giao diện người dùng tương tác cao:**<br>• Khung uploader kéo - thả ảnh.<br>• 4 ô Preset điện ảnh thử nghiệm 1-chạm.<br>• Thanh tiến trình và hiệu ứng laser quét ảnh khi đang phân tích.<br>• Banner trạng thái (`EXACT_MATCH` / `BEST_ALTERNATIVE`) kèm % tương đồng.<br>• 3 Tab nội dung: Combo thiết bị, Thông số quang học bóc tách, Mẹo hiện trường & LUT.<br>• Nút bấm `🚀 Thuê ngay máy này` chuyển trang `/equipment/:id`. |
| **`fe/src/components/Navbar.tsx`** | Gắn nút `✨ AI Shot-to-Gear` (nhấp nháy sáng thu hút người dùng) trên thanh Header chính, hiển thị xuyên suốt toàn bộ ứng dụng. |
| **`fe/src/pages/EquipmentListPage.tsx`** | Gắn thêm nút `📷 Tìm máy bằng ảnh mẫu (Groq AI)` ngay trên thanh trợ lý tìm kiếm thiết bị của trang Marketplace. |

---

## 5. CẤU TRÚC DỮ LIỆU & FORMAT TRẢ VỀ (JSON SCHEMA)

Khi gọi API `POST /api/ai/shot-to-gear`, hệ thống sẽ trả về định dạng chuẩn:

```json
{
  "success": true,
  "message": "AI đã phân tích thành công thông số quang học & khớp thiết bị!",
  "data": {
    "optical_analysis": {
      "estimated_focal_length": "85mm - 105mm (Chân dung tele ngắn)",
      "estimated_aperture": "f/2.0 - f/2.8 (DOF mỏng, bokeh tròn mịn)",
      "lighting_setup": "Low-key lighting (Đèn Key góc 45 độ, Đèn Fill neon xanh/tím)",
      "motion_stability": "Tripod tĩnh hoặc Handheld có kiểm soát",
      "color_tone": "Cyberpunk Neon / Cinematic High Contrast"
    },
    "match_confidence": 95,
    "match_status": "EXACT_MATCH",
    "match_verdict": "Hệ thống Sony Alpha A7 IV trong kho là lựa chọn hoàn hảo để tái hiện độ sắc nét và màu sắc của khung hình này.",
    "recommended_combo": {
      "body_equipment_id": "6af3386241003e2cf9f972bc",
      "body_title": "Máy ảnh Sony Alpha A7 IV (Body) Chuyên Nghiệp",
      "body_daily_rate": 450000,
      "body_reason": "Cảm biến Full-frame 33MP bắt nét mắt thời gian thực và dải Dynamic Range rộng rất phù hợp với cảnh chân dung ánh sáng yếu.",
      "lens_recommendation": "Ống kính Sony FE 85mm f/1.4 GM hoặc FE 24-70mm f/2.8 GM II",
      "lighting_recommendation": "Đèn LED RGB Amaran Tube hoặc Godox SL60W kèm Softbox Grid",
      "stabilizer_recommendation": "Chân máy Tripod Benro hoặc Gimbal DJI RS 3",
      "total_estimated_rate": 650000
    },
    "matched_equipment_detail": {
      "_id": "6af3386241003e2cf9f972bc",
      "title": "Máy ảnh Sony Alpha A7 IV (Body) Chuyên Nghiệp",
      "dailyRate": 450000,
      "images": ["https://res.cloudinary.com/.../a7iv.jpg"],
      "brand": "Sony",
      "category": "Máy ảnh & Quay phim"
    },
    "shooting_tips": "Đặt chủ thể cách hậu cảnh tối thiểu 2m để tối đa hiệu ứng xóa phông. Đặt máy ngang tầm mắt của người mẫu.",
    "post_production_tips": "Kéo tăng nhẹ Shadows (+15), giảm Highlights (-20), chỉnh Hue thanh Magenta/Blue để làm nổi bật ánh đèn neon."
  }
}
```

---

## 6. HƯỚNG DẪN CHẠY & KIỂM THỬ

### 1. Khởi động môi trường phát triển
```bash
# Terminal 1: Chạy Backend
cd be
npm run dev

# Terminal 2: Chạy Frontend
cd fe
npm run dev
```

### 2. Chạy bộ kiểm thử tự động
```bash
# Kiểm thử tầng Service với MongoDB & Groq AI
cd be
node scripts/test_shot_to_gear_endpoint.js

# Kiểm thử tầng HTTP Integration (Status 200, JSON Response)
cd be
node scripts/test_http_upload.js

# Kiểm thử đóng gói Frontend (TypeScript & Vite)
cd fe
npm run build
```

### 3. Trải nghiệm người dùng
- Truy cập `http://localhost:5173`.
- Nhấp nút **`✨ AI Shot-to-Gear`** trên thanh menu trên cùng.
- Chọn 1 trong 4 preset có sẵn hoặc tải ảnh cá nhân lên để chiêm ngưỡng tốc độ xử lý siêu tốc của Groq LPU!

