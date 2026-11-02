import { useState, useRef } from "react";
import type { Equipment } from "../../types/owner";
import { ownerApi } from "../../services/ownerApi";

interface Props {
  equipments: Equipment[];
  token: string;
  onRefresh: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export default function OwnerEquipmentsTab({
  equipments,
  token,
  onRefresh,
  onError,
  onSuccess,
}: Props) {
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [scheduleEquipment, setScheduleEquipment] = useState<Equipment | null>(null);
  const [statusRequestEquipment, setStatusRequestEquipment] = useState<Equipment | null>(null);

  // Form states for Create/Edit
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Máy ảnh & Ống kính");
  const [brand, setBrand] = useState("");
  const [modelName, setModelName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagesList, setImagesList] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState("");
  const [externalUrlInput, setExternalUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const proofFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  const [accessoriesInput, setAccessoriesInput] = useState("");
  const [condition, setCondition] = useState("Tốt (95%)");
  const [pricePerDay, setPricePerDay] = useState(500000);
  const [pricePerHour, setPricePerHour] = useState(50000);
  const [depositAmount, setDepositAmount] = useState(0);
  const [rentalTerms, setRentalTerms] = useState(
    "Người thuê chịu trách nhiệm bảo quản nguyên vẹn thiết bị và hoàn trả đúng hẹn."
  );
  const [cancellationPolicy, setCancellationPolicy] = useState("Miễn phí hủy trước 24 giờ.");
  const [visibility, setVisibility] = useState<"published" | "hidden" | "draft">("published");

  // Form states for Schedule (UC_O05)
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");
  const [scheduleStatus, setScheduleStatus] = useState<"available" | "blocked">("blocked");
  const [scheduleNote, setScheduleNote] = useState("");

  // Form states for Status Update Request (UC_O16)
  const [targetStatus, setTargetStatus] = useState("maintenance");
  const [statusReason, setStatusReason] = useState("");
  const [statusProofUrl, setStatusProofUrl] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPhotoUploadError("");
    setIsUploadingPhoto(true);

    try {
      const fileArray = Array.from(files);
      const res = await ownerApi.uploadPhotos(token, fileArray);
      setImagesList((prev) => [...prev, ...res.urls]);
    } catch (err) {
      setPhotoUploadError(err instanceof Error ? err.message : "Tải ảnh lên thất bại.");
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleAddExternalUrl() {
    const trimmed = externalUrlInput.trim();
    if (!trimmed) return;
    if (!imagesList.includes(trimmed)) {
      setImagesList((prev) => [...prev, trimmed]);
    }
    setExternalUrlInput("");
  }

  function handleRemovePhoto(index: number) {
    setImagesList((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSetPrimaryPhoto(index: number) {
    if (index === 0) return;
    setImagesList((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      return [item, ...copy];
    });
  }

  async function handleProofFileUpload(file: File | null) {
    if (!file) return;
    setIsUploadingProof(true);
    try {
      const res = await ownerApi.uploadPhoto(token, file);
      setStatusProofUrl(res.url);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Tải ảnh minh chứng thất bại.");
    } finally {
      setIsUploadingProof(false);
      if (proofFileInputRef.current) proofFileInputRef.current.value = "";
    }
  }

  function resetForm() {
    setTitle("");
    setCategory("Máy ảnh & Ống kính");
    setBrand("");
    setModelName("");
    setSerialNumber("");
    setDescription("");
    setImageUrl("");
    setImagesList([]);
    setPhotoUploadError("");
    setExternalUrlInput("");
    setAccessoriesInput("");
    setCondition("Tốt (95%)");
    setPricePerDay(500000);
    setPricePerHour(50000);
    setDepositAmount(0);
    setRentalTerms("Người thuê chịu trách nhiệm bảo quản nguyên vẹn thiết bị và hoàn trả đúng hẹn.");
    setCancellationPolicy("Miễn phí hủy trước 24 giờ.");
    setVisibility("published");
  }

  function openEditModal(eq: Equipment) {
    setEditingEquipment(eq);
    setTitle(eq.title);
    setCategory(eq.category);
    setBrand(eq.brand || "");
    setModelName(eq.model_name || "");
    setSerialNumber(eq.serial_number || "");
    setDescription(eq.description || "");
    setImageUrl(eq.images?.[0] || "");
    setImagesList(Array.isArray(eq.images) && eq.images.length > 0 ? eq.images : []);
    setPhotoUploadError("");
    setExternalUrlInput("");
    setAccessoriesInput(eq.accessories?.join(", ") || "");
    setCondition(eq.condition || "Tốt (95%)");
    setPricePerDay(eq.pricing.price_per_day);
    setPricePerHour(eq.pricing.price_per_hour || 0);
    setDepositAmount(eq.pricing.deposit_amount);
    setRentalTerms(eq.rental_terms || "");
    setCancellationPolicy(eq.cancellation_policy || "");
    setVisibility(eq.visibility);
  }

  async function handleSaveEquipment(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    onError("");
    onSuccess("");

    const accessoriesList = accessoriesInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const finalImages = imagesList.length > 0 ? imagesList : (imageUrl ? [imageUrl] : undefined);

    const payload = {
      title,
      category,
      brand,
      model_name: modelName,
      serial_number: serialNumber,
      description,
      images: finalImages,
      accessories: accessoriesList,
      condition,
      pricing: {
        price_per_day: Number(pricePerDay),
        price_per_hour: Number(pricePerHour),
        deposit_amount: Number(depositAmount),
      },
      rental_terms: rentalTerms,
      cancellation_policy: cancellationPolicy,
      visibility,
    };

    try {
      if (editingEquipment) {
        // UC_O04 & UC_O06: Update Equipment
        await ownerApi.updateEquipment(token, editingEquipment._id, payload);
        onSuccess(`Đã cập nhật thông tin thiết bị "${title}" thành công.`);
        setEditingEquipment(null);
      } else {
        // UC_O03: Create Equipment Listing
        await ownerApi.createEquipment(token, payload);
        onSuccess(`Đã tạo bài đăng thiết bị "${title}" thành công.`);
        setShowCreateModal(false);
      }
      resetForm();
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Thao tác thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleVisibility(eq: Equipment) {
    const nextVisibility = eq.visibility === "published" ? "hidden" : "published";
    try {
      await ownerApi.toggleVisibility(token, eq._id, nextVisibility);
      onSuccess(`Đã đổi trạng thái bài đăng sang: ${nextVisibility === "published" ? "Hiện (Công khai)" : "Ẩn"}.`);
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Đổi trạng thái hiển thị thất bại.");
    }
  }

  // UC_O05: Schedule Availability
  async function handleScheduleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduleEquipment) return;
    setIsSubmitting(true);
    onError("");
    onSuccess("");

    try {
      await ownerApi.scheduleAvailability(token, scheduleEquipment._id, {
        start_date: scheduleStart,
        end_date: scheduleEnd,
        status: scheduleStatus,
        note: scheduleNote,
      });
      onSuccess("Đã thiết lập lịch thiết bị khả dụng / khóa lịch thành công.");
      setScheduleEquipment(null);
      setScheduleStart("");
      setScheduleEnd("");
      setScheduleNote("");
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Thiết lập lịch thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // UC_O16: Submit Status Change Request
  async function handleStatusRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!statusRequestEquipment) return;
    setIsSubmitting(true);
    onError("");
    onSuccess("");

    try {
      await ownerApi.submitStatusRequest(token, statusRequestEquipment._id, {
        target_status: targetStatus,
        reason: statusReason,
        evidence_photos: statusProofUrl ? [statusProofUrl] : [],
      });
      onSuccess("Đã gửi yêu cầu cập nhật trạng thái thiết bị đến Moderator phê duyệt.");
      setStatusRequestEquipment(null);
      setStatusReason("");
      setStatusProofUrl("");
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Gửi yêu cầu cập nhật trạng thái thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="owner-tab-content">
      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.4rem", color: "#fff" }}>
            📦 Danh sách Thiết bị cho thuê của bạn
          </h2>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
            Quản lý bài đăng (UC_O03, UC_O04), cấu hình giá & điều khoản (UC_O06), lịch khả dụng (UC_O05).
          </p>
        </div>
        <button
          className="button button-primary"
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
        >
          + Tạo bài đăng thiết bị mới (UC_O03)
        </button>
      </div>

      {equipments.length === 0 ? (
        <div className="owner-section-card owner-empty-state">
          <span style={{ fontSize: "3rem" }}>📷</span>
          <h3>Chưa có thiết bị nào được đăng</h3>
          <p>Bắt đầu đăng thiết bị máy ảnh, flycam, lens hoặc phụ kiện để tiếp cận khách thuê ngay hôm nay.</p>
          <button
            className="button button-primary"
            style={{ marginTop: "12px" }}
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
          >
            Đăng thiết bị đầu tiên 🚀
          </button>
        </div>
      ) : (
        <div className="owner-equipment-grid">
          {equipments.map((eq) => (
            <div key={eq._id} className="owner-equipment-card">
              <div className="owner-card-img-wrap">
                <img
                  src={
                    eq.images?.[0] ||
                    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80"
                  }
                  alt={eq.title}
                />
                {eq.images && eq.images.length > 1 && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: "10px",
                      left: "10px",
                      background: "rgba(0, 0, 0, 0.75)",
                      color: "#fff",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      backdropFilter: "blur(4px)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                    }}
                  >
                    📷 {eq.images.length} ảnh
                  </span>
                )}
                <span className={`owner-vis-badge vis-${eq.visibility}`}>
                  {eq.visibility === "published"
                    ? "Đang hiển thị"
                    : eq.visibility === "hidden"
                      ? "Đang ẩn"
                      : "Bản nháp"}
                </span>
                <span className={`owner-status-badge status-${eq.status}`}>
                  {eq.status === "available"
                    ? "Sẵn sàng"
                    : eq.status === "rented"
                      ? "Đang thuê"
                      : "Bảo trì"}
                </span>
              </div>

              <div className="owner-card-body">
                <span className="owner-card-category">{eq.category}</span>
                <h3 className="owner-card-title">{eq.title}</h3>
                <div className="owner-card-brand">
                  {eq.brand && <span>{eq.brand}</span>}
                  {eq.model_name && <span> • {eq.model_name}</span>}
                  {eq.condition && <span> • {eq.condition}</span>}
                </div>

                <div className="owner-card-pricing">
                  <div>
                    <span className="price-label">Giá thuê ngày:</span>
                    <strong className="price-num">
                      {eq.pricing.price_per_day.toLocaleString("vi-VN")} đ
                    </strong>
                  </div>
                  <div>
                    <span className="price-label">Tiền cọc:</span>
                    <span className="deposit-num" style={{ color: "#10b981" }}>
                      Không cần cọc (0 đ)
                    </span>
                  </div>
                </div>

                {/* Availability schedule preview */}
                {eq.availability_schedule && eq.availability_schedule.length > 0 && (
                  <div className="schedule-pills">
                    <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Lịch riêng:</span>
                    {eq.availability_schedule.slice(-2).map((s, idx) => (
                      <span key={idx} className={`schedule-pill pill-${s.status}`}>
                        {s.status === "blocked" ? "⛔ Khóa" : "✅ Mở"}:{" "}
                        {new Date(s.start_date).toLocaleDateString("vi-VN")} -{" "}
                        {new Date(s.end_date).toLocaleDateString("vi-VN")}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="owner-card-actions">
                  <button
                    className="button button-secondary action-btn"
                    onClick={() => openEditModal(eq)}
                    title="Chỉnh sửa thông tin, giá thuê & điều khoản"
                  >
                    ✏️ Sửa (UC_O04)
                  </button>
                  <button
                    className="button button-quiet action-btn"
                    onClick={() => handleToggleVisibility(eq)}
                    title="Ẩn hoặc hiện bài đăng trên chợ"
                  >
                    {eq.visibility === "published" ? "👁️ Ẩn" : "✨ Hiện"}
                  </button>
                  <button
                    className="button button-secondary action-btn"
                    onClick={() => setScheduleEquipment(eq)}
                    title="Thiết lập lịch khả dụng"
                  >
                    📅 Lịch (UC_O05)
                  </button>
                  <button
                    className="button button-quiet action-btn"
                    onClick={() => setStatusRequestEquipment(eq)}
                    title="Gửi yêu cầu cập nhật trạng thái kiểm duyệt"
                  >
                    ⚙️ Trạng thái (UC_O16)
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Create or Edit Equipment Listing (UC_O03, UC_O04, UC_O06) */}
      {(showCreateModal || editingEquipment) && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card">
            <div className="owner-modal-header">
              <h3>
                {editingEquipment
                  ? "✏️ Chỉnh sửa thông tin, giá & điều khoản (UC_O04, UC_O06)"
                  : "➕ Tạo bài đăng thiết bị mới (UC_O03)"}
              </h3>
              <button
                className="close-modal-btn"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingEquipment(null);
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEquipment} className="owner-modal-form">
              <div className="form-grid-2">
                <div className="form-col-span-2">
                  <label className="field-label">Tên thiết bị bài đăng *</label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="Ví dụ: Sony Alpha A7 IV Body kèm Lens FE 24-70mm GM II"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="field-label">Danh mục thiết bị *</label>
                  <select
                    className="input-field"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="Máy ảnh & Ống kính">Máy ảnh & Ống kính</option>
                    <option value="Flycam & Drone">Flycam & Drone</option>
                    <option value="Âm thanh & Micro">Âm thanh & Micro</option>
                    <option value="Ánh sáng & Studio">Ánh sáng & Studio</option>
                    <option value="Gimbal & Chân máy">Gimbal & Chân máy</option>
                    <option value="Laptop & Thiết bị dựng">Laptop & Thiết bị dựng</option>
                    <option value="Phụ kiện khác">Phụ kiện khác</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">Thương hiệu / Hãng</label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="Sony, Canon, DJI, Rode..."
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">Model thiết bị</label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="A7M4, Mavic 3 Pro, Wireless GO II..."
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">Số Serial thiết bị</label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="SN-XXXXX..."
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">Tình trạng máy</label>
                  <select
                    className="input-field"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                  >
                    <option value="Mới 100%">Mới 100% (Nguyên seal)</option>
                    <option value="Như mới (99%)">Như mới (99%)</option>
                    <option value="Tốt (95%)">Tốt (95%)</option>
                    <option value="Khá (85-90%)">Khá (85-90%)</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">Trạng thái hiển thị (UC_O04)</label>
                  <select
                    className="input-field"
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as any)}
                  >
                    <option value="published">Công khai (Published)</option>
                    <option value="hidden">Ẩn tạm thời (Hidden)</option>
                    <option value="draft">Bản nháp (Draft)</option>
                  </select>
                </div>

                <div className="form-col-span-2">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label className="field-label" style={{ margin: 0, fontWeight: 600, fontSize: "0.92rem", color: "#fff" }}>
                      📸 Hình ảnh thực tế thiết bị (Upload Photos - UC_O03)
                    </label>
                    <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                      {imagesList.length} ảnh đã chọn {imagesList.length > 0 && "(Ảnh đầu tiên là ảnh bìa)"}
                    </span>
                  </div>

                  {/* Drop zone / Upload area */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.dataTransfer.files) {
                        void handleFileUpload(e.dataTransfer.files);
                      }
                    }}
                    style={{
                      border: "2px dashed rgba(249, 115, 22, 0.4)",
                      borderRadius: "12px",
                      padding: "22px 16px",
                      textAlign: "center",
                      cursor: isUploadingPhoto ? "not-allowed" : "pointer",
                      background: "rgba(249, 115, 22, 0.03)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/jpg"
                      multiple
                      style={{ display: "none" }}
                      onChange={(e) => void handleFileUpload(e.target.files)}
                      disabled={isUploadingPhoto}
                    />

                    {isUploadingPhoto ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            border: "3px solid rgba(249,115,22,0.2)",
                            borderTopColor: "var(--orange)",
                            borderRadius: "50%",
                            animation: "spin 0.8s linear infinite",
                          }}
                        />
                        <span style={{ color: "var(--orange)", fontWeight: 500, fontSize: "0.9rem" }}>
                          Đang tải ảnh lên máy chủ...
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "2rem" }}>📤</span>
                        <div style={{ color: "#fff", fontWeight: 600, fontSize: "0.95rem" }}>
                          Bấm để chọn ảnh từ máy tính hoặc kéo thả ảnh vào đây
                        </div>
                        <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                          Hỗ trợ JPG, PNG, WEBP, GIF (Tối đa 10MB / file. Có thể chọn cùng lúc nhiều ảnh)
                        </div>
                      </div>
                    )}
                  </div>

                  {photoUploadError && (
                    <div style={{ color: "#ef4444", fontSize: "0.82rem", marginTop: "8px" }}>
                      ⚠️ {photoUploadError}
                    </div>
                  )}

                  {/* Add by link fallback */}
                  <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                    <input
                      className="input-field"
                      type="url"
                      placeholder="Hoặc dán URL ảnh trực tuyến (https://images.unsplash.com/...)"
                      value={externalUrlInput}
                      onChange={(e) => setExternalUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddExternalUrl();
                        }
                      }}
                      style={{ margin: 0 }}
                    />
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={handleAddExternalUrl}
                      style={{ whiteSpace: "nowrap", padding: "0 16px" }}
                    >
                      + Thêm URL
                    </button>
                  </div>

                  {/* Image thumbnails list */}
                  {imagesList.length > 0 && (
                    <div style={{ marginTop: "14px" }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                          gap: "12px",
                        }}
                      >
                        {imagesList.map((imgUrl, idx) => (
                          <div
                            key={idx}
                            style={{
                              position: "relative",
                              borderRadius: "10px",
                              overflow: "hidden",
                              border: idx === 0 ? "2px solid var(--orange)" : "1px solid var(--border)",
                              background: "#0b0f19",
                              height: "110px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <img
                              src={imgUrl}
                              alt={`Ảnh ${idx + 1}`}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80";
                              }}
                            />

                            {/* Badge cover photo */}
                            {idx === 0 ? (
                              <span
                                style={{
                                  position: "absolute",
                                  top: "6px",
                                  left: "6px",
                                  background: "var(--orange)",
                                  color: "#000",
                                  fontSize: "0.65rem",
                                  fontWeight: 700,
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
                                }}
                              >
                                ★ ẢNH BÌA
                              </span>
                            ) : (
                              <button
                                type="button"
                                title="Đặt làm ảnh bìa"
                                onClick={() => handleSetPrimaryPhoto(idx)}
                                style={{
                                  position: "absolute",
                                  top: "6px",
                                  left: "6px",
                                  background: "rgba(0,0,0,0.75)",
                                  color: "#fff",
                                  border: "1px solid rgba(255,255,255,0.2)",
                                  borderRadius: "4px",
                                  fontSize: "0.65rem",
                                  padding: "2px 6px",
                                  cursor: "pointer",
                                }}
                              >
                                Đặt bìa
                              </button>
                            )}

                            {/* Delete button */}
                            <button
                              type="button"
                              title="Xóa ảnh"
                              onClick={() => handleRemovePhoto(idx)}
                              style={{
                                position: "absolute",
                                top: "6px",
                                right: "6px",
                                background: "rgba(239, 68, 68, 0.9)",
                                color: "#fff",
                                border: "none",
                                borderRadius: "50%",
                                width: "22px",
                                height: "22px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                fontSize: "0.75rem",
                                fontWeight: "bold",
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-col-span-2">
                  <label className="field-label">Phụ kiện đi kèm (phân cách bằng dấu phẩy)</label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="2 Pin, Sạc kép, Thẻ nhớ 128GB, Dây đeo, Túi chống sốc..."
                    value={accessoriesInput}
                    onChange={(e) => setAccessoriesInput(e.target.value)}
                  />
                </div>

                <div className="form-col-span-2">
                  <label className="field-label">Mô tả chi tiết tính năng & lưu ý sử dụng</label>
                  <textarea
                    className="input-field"
                    rows={3}
                    placeholder="Mô tả chất lượng quang học, số shot chụp, phụ kiện đi kèm..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              {/* Pricing & Rental Terms (UC_O06) */}
              <div style={{ marginTop: "20px", padding: "16px", background: "#111827", borderRadius: "10px", border: "1px solid var(--border)" }}>
                <h4 style={{ margin: "0 0 12px", color: "var(--orange)", fontSize: "0.95rem" }}>
                  💰 Cấu hình giá thuê & Điều khoản (UC_O06)
                </h4>
                <div className="form-grid-3">
                  <div>
                    <label className="field-label">Giá thuê theo ngày (VND) *</label>
                    <input
                      className="input-field"
                      type="number"
                      step={10000}
                      value={pricePerDay}
                      onChange={(e) => setPricePerDay(Number(e.target.value))}
                      required
                    />
                  </div>
                  <div>
                    <label className="field-label">Giá thuê theo giờ (VND)</label>
                    <input
                      className="input-field"
                      type="number"
                      step={5000}
                      value={pricePerHour}
                      onChange={(e) => setPricePerHour(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="field-label">Tiền đặt cọc (VND - Không cần cọc: 0 đ)</label>
                    <input
                      className="input-field"
                      type="number"
                      step={50000}
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(Number(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div style={{ marginTop: "12px" }}>
                  <label className="field-label">Điều khoản thuê của Owner</label>
                  <textarea
                    className="input-field"
                    rows={2}
                    value={rentalTerms}
                    onChange={(e) => setRentalTerms(e.target.value)}
                  />
                </div>

                <div style={{ marginTop: "12px" }}>
                  <label className="field-label">Chính sách hủy đơn</label>
                  <input
                    className="input-field"
                    type="text"
                    value={cancellationPolicy}
                    onChange={(e) => setCancellationPolicy(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingEquipment(null);
                  }}
                >
                  Hủy
                </button>
                <button type="submit" className="button button-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Đang lưu..." : editingEquipment ? "Cập nhật thiết bị" : "Tạo bài đăng ngay"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Schedule Availability (UC_O05) */}
      {scheduleEquipment && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card" style={{ maxWidth: "520px" }}>
            <div className="owner-modal-header">
              <h3>📅 Thiết lập lịch khả dụng (UC_O05)</h3>
              <button className="close-modal-btn" onClick={() => setScheduleEquipment(null)}>
                ✕
              </button>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginTop: 0 }}>
              Thiết bị: <strong style={{ color: "#fff" }}>{scheduleEquipment.title}</strong>.
              <br />
              <span style={{ color: "#f59e0b" }}>
                Lưu ý nghiệp vụ: Hệ thống cam kết không cho phép thay đổi các lịch đã có hợp đồng thuê!
              </span>
            </p>

            <form onSubmit={handleScheduleSubmit}>
              <div style={{ display: "grid", gap: "14px" }}>
                <div>
                  <label className="field-label">Trạng thái lịch</label>
                  <select
                    className="input-field"
                    value={scheduleStatus}
                    onChange={(e) => setScheduleStatus(e.target.value as any)}
                  >
                    <option value="blocked">⛔ Khóa lịch / Không khả dụng (Bảo trì, chủ dùng)</option>
                    <option value="available">✅ Khả dụng / Sẵn sàng cho thuê</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Từ ngày</label>
                  <input
                    className="input-field"
                    type="datetime-local"
                    value={scheduleStart}
                    onChange={(e) => setScheduleStart(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="field-label">Đến ngày</label>
                  <input
                    className="input-field"
                    type="datetime-local"
                    value={scheduleEnd}
                    onChange={(e) => setScheduleEnd(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="field-label">Ghi chú lịch</label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="Bảo dưỡng định kỳ sensor, vệ sinh ống kính..."
                    value={scheduleNote}
                    onChange={(e) => setScheduleNote(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setScheduleEquipment(null)}
                >
                  Hủy
                </button>
                <button type="submit" className="button button-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Đang lưu lịch..." : "Lưu thiết lập lịch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Submit Equipment Status Update Request (UC_O16) */}
      {statusRequestEquipment && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card" style={{ maxWidth: "520px" }}>
            <div className="owner-modal-header">
              <h3>⚙️ Yêu cầu cập nhật trạng thái kiểm duyệt (UC_O16)</h3>
              <button className="close-modal-btn" onClick={() => setStatusRequestEquipment(null)}>
                ✕
              </button>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginTop: 0 }}>
              Gửi yêu cầu chuyển trạng thái thiết bị cần qua Rental Moderator xét duyệt (Bảo trì dài hạn, hư hại, thu hồi).
            </p>

            <form onSubmit={handleStatusRequestSubmit}>
              <div style={{ display: "grid", gap: "14px" }}>
                <div>
                  <label className="field-label">Trạng thái mong muốn</label>
                  <select
                    className="input-field"
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value)}
                  >
                    <option value="maintenance">Bảo trì kỹ thuật (Maintenance)</option>
                    <option value="damaged">Hư hỏng cần thẩm định (Damaged)</option>
                    <option value="retired">Ngừng khai thác / Thu hồi (Retired)</option>
                    <option value="available">Khôi phục sẵn sàng hoạt động (Available)</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Lý do chi tiết *</label>
                  <textarea
                    className="input-field"
                    rows={3}
                    placeholder="Nêu rõ lý do bàn giao, hoàn trả hoặc bảo trì linh kiện..."
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label className="field-label" style={{ margin: 0 }}>Ảnh minh chứng hư hại / bảo trì (nếu có)</label>
                    <button
                      type="button"
                      className="button button-quiet"
                      style={{ fontSize: "0.78rem", padding: "2px 8px" }}
                      onClick={() => proofFileInputRef.current?.click()}
                      disabled={isUploadingProof}
                    >
                      {isUploadingProof ? "Đang tải ảnh..." : "📁 Tải ảnh từ máy"}
                    </button>
                    <input
                      ref={proofFileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => void handleProofFileUpload(e.target.files?.[0] || null)}
                    />
                  </div>
                  <input
                    className="input-field"
                    type="url"
                    placeholder="https://... hoặc tải ảnh từ máy tính ở trên"
                    value={statusProofUrl}
                    onChange={(e) => setStatusProofUrl(e.target.value)}
                  />
                  {statusProofUrl && (
                    <div style={{ marginTop: "6px" }}>
                      <img
                        src={statusProofUrl}
                        alt="Ảnh minh chứng"
                        style={{ height: "60px", borderRadius: "6px", objectFit: "cover" }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setStatusRequestEquipment(null)}
                >
                  Hủy
                </button>
                <button type="submit" className="button button-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Đang gửi..." : "Gửi yêu cầu tới Moderator"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
