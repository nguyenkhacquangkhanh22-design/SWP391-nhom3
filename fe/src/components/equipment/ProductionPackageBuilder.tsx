import React, { useState, useEffect } from "react";
import type {
  DepartmentEquipmentItem,
  ProductionDepartments,
  ProductionPackageTemplate,
  ProductionProjectPackage,
} from "../../types/productionPackage";
import { productionPackageApi } from "../../services/productionPackageApi";
import BatteryPowerCalculator from "./BatteryPowerCalculator";

export const ProductionPackageBuilder: React.FC = () => {
  const [projectTitle, setProjectTitle] = useState<string>("Dự án Quay Phim Thương Mại TVC");
  const [productionType, setProductionType] = useState<ProductionProjectPackage["production_type"]>("commercial_tvc");
  const [clientName, setClientName] = useState<string>("Production House Sài Gòn");
  const [dop, setDop] = useState<string>("");
  const [shootingDays, setShootingDays] = useState<number>(3);
  const [dailyHours, setDailyHours] = useState<number>(12);
  const [activeTab, setActiveTab] = useState<keyof ProductionDepartments>("camera_a");

  const [departments, setDepartments] = useState<ProductionDepartments>({
    camera_a: [
      { item_name: "Sony FX6 Cinema Line Full-Frame", quantity: 1, daily_price: 1800000, power_draw_watts: 20 },
      { item_name: "Sony FE 24-70mm f/2.8 GM II", quantity: 1, daily_price: 500000, power_draw_watts: 0 },
      { item_name: "SmallHD Cine 7 Touchscreen Monitor", quantity: 1, daily_price: 450000, power_draw_watts: 15 },
    ],
    camera_b: [
      { item_name: "Sony FX3 Cinema Line Body", quantity: 1, daily_price: 1200000, power_draw_watts: 10 },
      { item_name: "Sony FE 50mm f/1.2 GM", quantity: 1, daily_price: 450000, power_draw_watts: 0 },
    ],
    lighting: [
      { item_name: "Aputure LS 600d Pro LED Light Storm", quantity: 1, daily_price: 900000, power_draw_watts: 720 },
      { item_name: "Aputure 300c RGB Color LED", quantity: 1, daily_price: 600000, power_draw_watts: 360 },
      { item_name: "Chân đèn C-Stand Kupo Master High", quantity: 3, daily_price: 80000, power_draw_watts: 0 },
    ],
    sound: [
      { item_name: "Sound Devices 833 8-Channel Recorder", quantity: 1, daily_price: 900000, power_draw_watts: 18 },
      { item_name: "Sennheiser MKH 416 Shotgun & Cần Boom", quantity: 1, daily_price: 350000, power_draw_watts: 0 },
    ],
    grip_stabilizer: [
      { item_name: "DJI RS 3 Pro Gimbal Combo", quantity: 1, daily_price: 450000, power_draw_watts: 15 },
      { item_name: "Chân máy tải nặng Sachtler Flowtech 75", quantity: 1, daily_price: 400000, power_draw_watts: 0 },
    ],
  });

  const [templates, setTemplates] = useState<ProductionPackageTemplate[]>([]);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New item input modal / form
  const [newItemName, setNewItemName] = useState<string>("");
  const [newItemPrice, setNewItemPrice] = useState<number>(300000);
  const [newItemWatts, setNewItemWatts] = useState<number>(25);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await productionPackageApi.getTemplates();
      setTemplates(data);
    } catch (e) {
      console.error(e);
    }
  };

  const applyTemplate = (tpl: ProductionPackageTemplate) => {
    setDepartments(tpl.departments);
    setProjectTitle(tpl.title);
    setSuccessMsg(`Đã áp dụng mẫu: ${tpl.title}`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleAddItem = (deptKey: keyof ProductionDepartments) => {
    if (!newItemName.trim()) return;
    const newItem: DepartmentEquipmentItem = {
      item_name: newItemName.trim(),
      quantity: 1,
      daily_price: newItemPrice,
      power_draw_watts: newItemWatts,
    };
    setDepartments((prev) => ({
      ...prev,
      [deptKey]: [...prev[deptKey], newItem],
    }));
    setNewItemName("");
  };

  const handleRemoveItem = (deptKey: keyof ProductionDepartments, index: number) => {
    setDepartments((prev) => ({
      ...prev,
      [deptKey]: prev[deptKey].filter((_, i) => i !== index),
    }));
  };

  const handleUpdateQuantity = (deptKey: keyof ProductionDepartments, index: number, delta: number) => {
    setDepartments((prev) => {
      const updated = [...prev[deptKey]];
      const nextQ = Math.max(1, (updated[index].quantity || 1) + delta);
      updated[index] = { ...updated[index], quantity: nextQ };
      return { ...prev, [deptKey]: updated };
    });
  };

  // Calculations
  const calculateDeptTotal = (items: DepartmentEquipmentItem[]) => {
    return items.reduce((sum, item) => sum + (item.daily_price || 0) * (item.quantity || 1), 0);
  };

  const dailyTotal =
    calculateDeptTotal(departments.camera_a) +
    calculateDeptTotal(departments.camera_b) +
    calculateDeptTotal(departments.lighting) +
    calculateDeptTotal(departments.sound) +
    calculateDeptTotal(departments.grip_stabilizer);

  let discountPct = 0;
  if (shootingDays >= 7) discountPct = 25;
  else if (shootingDays >= 5) discountPct = 20;
  else if (shootingDays >= 3) discountPct = 15;
  else if (shootingDays >= 2) discountPct = 10;

  const totalBeforeDiscount = dailyTotal * shootingDays;
  const discountAmount = Math.round((totalBeforeDiscount * discountPct) / 100);
  const finalTotal = totalBeforeDiscount - discountAmount;
  const deposit = Math.round(finalTotal * 0.3);

  const handleSavePackage = async () => {
    try {
      setSaving(true);
      await productionPackageApi.createPackage({
        project_title: projectTitle,
        production_type: productionType,
        client_name: clientName,
        director_of_photography: dop,
        shooting_days: shootingDays,
        daily_shooting_hours: dailyHours,
        departments,
      });
      setSuccessMsg("Tạo và lưu gói dự án đoàn phim thành công!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || "Lỗi lưu gói dự án");
    } finally {
      setSaving(false);
    }
  };

  const deptTabs: { key: keyof ProductionDepartments; label: string; icon: string }[] = [
    { key: "camera_a", label: "Tổ Máy A (A-Cam)", icon: "🎥" },
    { key: "camera_b", label: "Tổ Máy B (B-Cam)", icon: "📹" },
    { key: "lighting", label: "Tổ Ánh Sáng (Gaffer)", icon: "💡" },
    { key: "sound", label: "Tổ Âm Thanh (Sound)", icon: "🎙️" },
    { key: "grip_stabilizer", label: "Tổ Grip & Dolly", icon: "🏗️" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4 sm:p-6 text-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-xs font-bold uppercase tracking-wider">
              🎬 Cinema Production Suite
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-2">
              Dựng Gói Thiết Bị Đoàn Phim & Dự Án Quay Chuyên Nghiệp
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Tự do cấu hình thiết bị theo các tổ chuyên môn, tự động tính toán chiết khấu ngày quay và dự toán phụ tải nguồn điện trường quay.
            </p>
          </div>

          <button
            onClick={handleSavePackage}
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 font-bold text-sm rounded-xl text-white shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
          >
            {saving ? "Đang lưu..." : "💾 Lưu Gói Dự Án"}
          </button>
        </div>

        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold rounded-xl">
            ✓ {successMsg}
          </div>
        )}

        {/* Project Info Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80 text-xs">
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Tên Dự Án:</label>
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Loại Hình Sản Xuất:</label>
            <select
              value={productionType}
              onChange={(e) => setProductionType(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="commercial_tvc">Quảng cáo TVC / Viral Clip</option>
              <option value="music_video">Music Video (MV)</option>
              <option value="feature_film">Phim Điện Ảnh / Phim Chiếu Rạp</option>
              <option value="short_film">Phim Ngắn / Web Drama</option>
              <option value="documentary">Phim Tài Liệu</option>
              <option value="event_livestream">Sự Kiện Trực Tiếp / Livestream</option>
            </select>
          </div>
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Đơn Vị Sản Xuất / Khách Hàng:</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Đạo Diễn Hình Ảnh (DoP):</label>
            <input
              type="text"
              placeholder="VD: Nguyễn Văn A, DoP"
              value={dop}
              onChange={(e) => setDop(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Templates Selector */}
      {templates.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Gợi ý cấu hình dựng sẵn:
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templates.map((tpl) => (
              <div
                key={tpl.template_id}
                onClick={() => applyTemplate(tpl)}
                className="p-3 bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 rounded-xl cursor-pointer transition flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{tpl.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{tpl.description}</p>
                </div>
                <span className="text-xs font-bold text-indigo-400 whitespace-nowrap ml-3">
                  {tpl.estimated_daily_price.toLocaleString("vi-VN")} đ/ngày
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Builder & Departments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Department Tabs & Items (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Department Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
            {deptTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === tab.key
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span className="ml-1 text-[10px] px-1.5 py-0.2 bg-slate-950/50 rounded-full">
                  {departments[tab.key].length}
                </span>
              </button>
            ))}
          </div>

          {/* Department Items List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
              <span className="font-bold text-slate-300">
                Danh sách thiết bị ({departments[activeTab].length} món)
              </span>
              <span className="text-slate-400 font-mono">
                Tổng tổ: <strong className="text-indigo-400">{calculateDeptTotal(departments[activeTab]).toLocaleString("vi-VN")} đ/ngày</strong>
              </span>
            </div>

            {departments[activeTab].length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                Chưa có thiết bị nào trong tổ này. Hãy thêm thiết bị bên dưới.
              </div>
            ) : (
              <div className="space-y-2">
                {departments[activeTab].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl hover:border-slate-700 transition"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-100">{item.item_name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-3">
                        <span>Đơn giá: {item.daily_price.toLocaleString("vi-VN")} đ/ngày</span>
                        <span>•</span>
                        <span className="text-amber-400">⚡ {item.power_draw_watts} W</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Quantity Buttons */}
                      <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                        <button
                          onClick={() => handleUpdateQuantity(activeTab, idx, -1)}
                          className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(activeTab, idx, 1)}
                          className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-xs font-bold text-emerald-400 w-24 text-right">
                        {((item.daily_price || 0) * (item.quantity || 1)).toLocaleString("vi-VN")} đ
                      </div>

                      <button
                        onClick={() => handleRemoveItem(activeTab, idx)}
                        className="text-slate-500 hover:text-red-400 text-xs p-1"
                        title="Xóa món này"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Add Custom Item */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col sm:flex-row gap-2 text-xs">
              <input
                type="text"
                placeholder="Tên thiết bị thêm vào tổ..."
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <input
                type="number"
                placeholder="Giá thuê/ngày (đ)"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(parseInt(e.target.value, 10) || 0)}
                className="w-32 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <input
                type="number"
                placeholder="Watts"
                value={newItemWatts}
                onChange={(e) => setNewItemWatts(parseInt(e.target.value, 10) || 0)}
                className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => handleAddItem(activeTab)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition whitespace-nowrap"
              >
                + Thêm Thiết Bị
              </button>
            </div>
          </div>
        </div>

        {/* Right: Pricing & Schedule Summary (1 Col) */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-3 border-b border-slate-800">
              Dự Toán Chi Phí Đoàn Phim
            </h3>

            {/* Shooting Days Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Số Ngày Quay Thực Tế:</span>
                <strong className="text-indigo-400">{shootingDays} Ngày</strong>
              </div>
              <input
                type="range"
                min="1"
                max="14"
                value={shootingDays}
                onChange={(e) => setShootingDays(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Daily Hours Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Số Giờ Quay / Ngày:</span>
                <strong className="text-cyan-400">{dailyHours} Giờ</strong>
              </div>
              <input
                type="range"
                min="6"
                max="18"
                value={dailyHours}
                onChange={(e) => setDailyHours(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            {/* Discount Badge */}
            {discountPct > 0 && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center justify-between">
                <span>Ưu đãi quay nhiều ngày:</span>
                <strong>Giảm {discountPct}%</strong>
              </div>
            )}

            {/* Price Breakdown */}
            <div className="space-y-2 text-xs pt-2 border-t border-slate-800 text-slate-300">
              <div className="flex justify-between">
                <span>Đơn giá toàn bộ tổ/ngày:</span>
                <span className="font-mono">{dailyTotal.toLocaleString("vi-VN")} đ</span>
              </div>
              <div className="flex justify-between">
                <span>Tổng trước chiết khấu ({shootingDays} ngày):</span>
                <span className="font-mono">{totalBeforeDiscount.toLocaleString("vi-VN")} đ</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Mức giảm chiết khấu:</span>
                  <span className="font-mono">-{discountAmount.toLocaleString("vi-VN")} đ</span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t border-slate-800 text-base font-black text-white">
                <span>Tổng Chi Phí Gói:</span>
                <span className="text-indigo-400">{finalTotal.toLocaleString("vi-VN")} đ</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                <span>Tiền cọc thiết bị đoàn (30%):</span>
                <span className="font-mono">{deposit.toLocaleString("vi-VN")} đ</span>
              </div>
            </div>

            <button
              onClick={handleSavePackage}
              disabled={saving}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition"
            >
              Yêu Cầu Báo Giá & Hợp Đồng Dự Án
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Battery Simulator */}
      <BatteryPowerCalculator />
    </div>
  );
};

export default ProductionPackageBuilder;
