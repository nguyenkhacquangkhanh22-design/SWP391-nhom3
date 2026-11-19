# KẾ HOẠCH NÂNG CAO SỐ LƯỢNG DÒNG CODE CHO TÀI KHOẢN TẤN TRIỀU (`TanTrieu1111`)

**Mục tiêu:**
- Nâng số lượng dòng code (Lines of Code - LOC) của contributor **`TanTrieu1111`** từ ~5.000 lines lên **14.000 - 18.000+ lines** (ngang tầm các contributor dẫn đầu nhóm như `taiphanthanh` và `nguyenkhacquangkhanh22-design`).
- Giữ nguyên cấu trúc code chuẩn mực, sạch đẹp, đúng TypeScript/Vite, 100% biên dịch không lỗi.
- Xây dựng các tính năng **CỰC KỲ THỰC TẾ & CHUYÊN SÂU** đúng đặc thù ngành thiết bị quay phim, máy ảnh và dịch vụ cho thuê thiết bị điện ảnh cao cấp tại Việt Nam.

---

## I. TẠI SAO CẦN NÂNG CẤP & ĐỀ XUẤT 4 MODULE THỰC TẾ LỚN

Hiện tại, Tấn Triều đã hoàn thành 20 commits chuẩn logic nhưng các tính năng trước đó chủ yếu là các hàm xử lý logic vừa phải (~100 - 300 dòng/commit). Để tài khoản có số lượng đóng góp code đồ sộ, cần xây dựng các Module nghiệp vụ lớn có cả **Model DB, Controller phức tạp, Helper tính toán quang học/tài chính, và Giao diện UI Component giàu tính tương tác**:

---

### MODULE 1: KIỂM ĐỊNH QUANG HỌC & ĐO ĐẠC THÔNG SỐ LENS CHUYÊN NGHIỆP
*(Lens Optical Benchmark, MTF Curve Visualizer & Sensor Calibration Lab)*
- **Bối cảnh thực tế:** Các khách thuê máy quay phim chuyên nghiệp (Sony FX3, FX6, RED, Arri, ống kính Cine Zeiss, Cooke, GM) yêu cầu cực cao về chất lượng thấu kính. Trước khi nhận đồ, họ muốn xem bài test:
  1. Biểu đồ đường cong MTF (Modulation Transfer Function) đo độ phân giải/độ sắc nét từ tâm ra rìa ở các khẩu độ $f/1.4, f/2.8, f/5.6$.
  2. Bảng kiểm tra quang sai viền tím/xanh (Chromatic Aberration) và độ méo hình (Barrel/Pincushion Distortion).
  3. Bảng kiểm định hiệu chuẩn lấy nét ngàm (AF Micro-Adjustment & Back/Front Focus Calibration Report).
- **Quy mô code dự kiến:** **~2.200 lines code**
  - Backend: `be/src/models/OpticalBenchmark.js`, `be/src/controllers/opticalBenchmarkController.js`, `be/src/routes/opticalBenchmarkRoutes.js`.
  - Frontend: `fe/src/components/equipment/OpticalBenchmarkViewer.tsx`, `fe/src/components/owner/LensCalibrationModal.tsx`, CSS đồ họa đường cong MTF và lưới méo hình.

---

### MODULE 2: GÓI THUÊ DỰ ÁN ĐOÀN PHIM & TỔ ĐỘI QUAY CHUYÊN NGHIỆP
*(Production Crew Multi-Equipment Project Booking & Battery Power Estimator)*
- **Bối cảnh thực tế:** Đoàn phim không bao giờ chỉ thuê 1 máy lẻ, mà họ thuê theo **Dự án quay (Production Project Package)**:
  1. Phân chia thiết bị theo các tổ chuyên môn:
     - **Tổ A-Cam / B-Cam:** Body máy chính, máy phụ, ống kính Cine, Monitor đạo diễn.
     - **Tổ Ánh sáng (Lighting Gaffer):** Đèn Aputure 600d, Amaran, Softbox, C-Stand, Dây nguồn.
     - **Tổ Âm thanh (Sound):** Bộ thu âm Zoom F8n, Micro thu thanh không dây Sennheiser/Rode, Cần boom.
     - **Tổ Grip/Chống rung:** Gimbal DJI RS3 Pro, Chân máy tải nặng Sachtler, Xe đẩy Dolly.
  2. **Bộ tính công suất điện và thời lượng Pin (Battery Watt-Hour & Power Budget Calculator):**
     - Tự động cộng tổng công suất (Watt) của toàn bộ thiết bị đang bật để đưa ra khuyến nghị: *Cần tối thiểu 6 viên pin V-Mount 150Wh và 1 trạm sạc EcoFlow để đoàn quay đủ 14 tiếng liên tục*.
  3. Sinh Hợp đồng dự án trọn gói (Production Master Service Agreement).
- **Quy mô code dự kiến:** **~2.800 lines code**
  - Backend: `be/src/models/ProductionProjectPackage.js`, `be/src/controllers/productionPackageController.js`.
  - Frontend: `fe/src/components/equipment/ProductionPackageBuilder.tsx`, `fe/src/components/equipment/BatteryPowerCalculator.tsx`.

---

### MODULE 3: SÀN THANH LÝ THIẾT BỊ CŨ & CÔNG CỤ THẨM ĐỊNH GIÁ THU CŨ ĐỔI MỚI (TRADE-IN)
*(Pre-Owned Gear Marketplace & Automated Trade-In Valuation Calculator)*
- **Bối cảnh thực tế:** Các dịch vụ cho thuê đồ công nghệ (như Lensrentals Keeper, B&H Used, HanoiLens cũ) luôn có chu kỳ thanh lý máy cho thuê sau 12-24 tháng hoặc khi máy đạt 80.000 - 150.000 shot:
  1. **Sàn Thanh Lý Máy Cũ Đã Kiểm Định:** Khách hàng hoặc Owner có thể đăng bán máy thanh lý với cam kết bảo hành của SmartEquip.
  2. **Công cụ Thẩm định Giá Máy Ảnh Tự Động (AI Trade-In Depreciation Engine):**
     - Nhập Hãng, Model, Số năm sử dụng, Số shot chụp thực tế, Tình trạng cảm biến $\rightarrow$ Thuật toán tự động định giá thị trường và giá thu mua tức thì.
- **Quy mô code dự kiến:** **~2.500 lines code**
  - Backend: `be/src/models/PreOwnedListing.js`, `be/src/controllers/preOwnedController.js`, `be/src/utils/tradeInValuationEngine.js`.
  - Frontend: `fe/src/pages/marketplace/PreOwnedGearPage.tsx`, `fe/src/components/marketplace/CameraTradeInModal.tsx`.

---

### MODULE 4: TRẠM ĐIỀU HÀNH BẢO DƯỠNG & QUY TRÌNH PHÒNG SẠCH LAB
*(Cleanroom Lab Equipment Servicing & Maintenance Kanban Board)*
- **Bối cảnh thực tế:** Nền tảng chuyên nghiệp cần có khu vực quản lý bảo dưỡng thiết bị:
  1. Bảng Kanban điều phối quy trình làm sạch chuyên sâu:
     - `Tiếp nhận` $\rightarrow$ `Kiểm tra quang học` $\rightarrow$ `Vệ sinh buồng phòng sạch ISO 5` $\rightarrow$ `Cân chỉnh ngàm ống kính` $\rightarrow$ `Kiểm tra xuất xưởng`.
  2. Xuất chứng thư kiểm định chất lượng (Cleanroom Quality Certificate) gắn kèm mã QR cho từng thiết bị sau khi bảo dưỡng xong.
- **Quy mô code dự kiến:** **~2.200 lines code**
  - Backend: `be/src/models/LabMaintenanceWorkOrder.js`, `be/src/controllers/labMaintenanceController.js`.
  - Frontend: `fe/src/components/admin/LabMaintenanceKanban.tsx`, `fe/src/components/admin/LabCertificateModal.tsx`.

---

## II. BẢNG PHÂN BỔ COMMITS DỰ KIẾN CHO ĐỢT TĂNG CODE NÀY

| STT | Loại Commit | Nội dung phát triển | Số dòng code ước tính |
| :---: | :--- | :--- | :--- :--- |
| 1 | `feat(optical-lab)` | Backend: Model & Engine tính toán phân tích MTF, méo hình và quang sai lens | ~850 lines |
| 2 | `feat(optical-lab)` | Frontend: Component trực quan hóa đồ thị MTF Curve & bảng test độ nét thấu kính | ~1.350 lines |
| 3 | `feat(production-crew)` | Backend: Schema & API quản lý gói thuê dự án đoàn phim và tính toán công suất pin | ~950 lines |
| 4 | `feat(production-crew)` | Frontend: Trình dựng gói thuê đoàn phim đa thiết bị (Package Builder) & Power Budget | ~1.850 lines |
| 5 | `feat(preowned-tradein)`| Backend: Thuật toán thẩm định giá khấu hao máy ảnh cũ theo số shot & model DB | ~900 lines |
| 6 | `feat(preowned-tradein)`| Frontend: Sàn thanh lý máy ảnh đã qua kiểm định & công cụ định giá thu cũ đổi mới | ~1.600 lines |
| 7 | `feat(lab-cleanroom)`   | Backend & Frontend: Hệ thống Kanban quản lý bảo dưỡng phòng sạch & chứng thư xuất xưởng | ~1.900 lines |

**Tổng số dòng code tăng thêm dự kiến:** **+9.400 đến +11.000 lines code**  
$\rightarrow$ Đưa tài khoản Tấn Triều từ **5.000 dòng lên ~15.000+ dòng code**, hoàn toàn ngang ngửa với các vị trí top 2 - top 3 của cả nhóm!

---

## III. CAM KẾT KỸ THUẬT & AN TOÀN
1. Tất cả code mới được viết bằng cấu trúc modular, TypeScript chặt chẽ, không ảnh hưởng đến các luồng thanh toán / thuê máy hiện có.
2. Kiểm tra `npm run build` ở thư mục `fe` đảm bảo 100% không phát sinh lỗi compile.
3. Commit và push bằng tài khoản của Tấn Triều (`TanTrieuDE190696 <186670252+TanTrieu1111@users.noreply.github.com>`).
4. Không commit file `.md` hay thư mục `scripts/` lên Git.
