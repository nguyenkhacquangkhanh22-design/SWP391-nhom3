import type { Rental } from "../types/smartequip";
import { getDeliveryOption, getReturnOption } from "../constants/deliveryMethods";

export interface BuildContractOptions {
  signatureUrl?: string | null;
  signerName?: string;
  isSigned?: boolean;
  isOfficial?: boolean;
  hidePrintBar?: boolean;
  ownerSignature?: string | null;
  ownerSignerName?: string;
  isOwnerSigned?: boolean;
}

/**
 * Con dấu đỏ điện tử SmartEquip chính thức (khi đã xác nhận thanh toán thành công)
 */
export function getOfficialSealSvg(): string {
  return `
    <svg width="125" height="125" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style="display:inline-block; vertical-align:middle; filter:drop-shadow(0 1px 2px rgba(220,38,38,0.2));">
      <circle cx="100" cy="100" r="92" stroke="#b91c1c" stroke-width="3.5" fill="none" opacity="0.9" />
      <circle cx="100" cy="100" r="85" stroke="#b91c1c" stroke-width="1.5" fill="none" opacity="0.9" stroke-dasharray="4,2" />
      <path id="curveTopOfficial" d="M 28,100 A 72,72 0 0,1 172,100" fill="none" />
      <text font-family="'Times New Roman', serif" font-size="13" font-weight="bold" fill="#b91c1c" letter-spacing="1">
        <textPath href="#curveTopOfficial" startOffset="50%" text-anchor="middle">
          SMARTEQUIP OFFICIAL HUB
        </textPath>
      </text>
      <path id="curveBottomOfficial" d="M 172,100 A 72,72 0 0,1 28,100" fill="none" />
      <text font-family="'Times New Roman', serif" font-size="11" font-weight="bold" fill="#b91c1c" letter-spacing="1.2">
        <textPath href="#curveBottomOfficial" startOffset="50%" text-anchor="middle">
          ★ CHỨNG THỰC ĐIỆN TỬ ★
        </textPath>
      </text>
      <circle cx="100" cy="100" r="42" stroke="#b91c1c" stroke-width="1.5" fill="#fef2f2" fill-opacity="0.3" />
      <text x="100" y="93" font-family="'Times New Roman', serif" font-size="12" font-weight="bold" fill="#b91c1c" text-anchor="middle">
        ĐÃ PHÊ DUYỆT
      </text>
      <text x="100" y="108" font-family="'Times New Roman', serif" font-size="9.5" font-weight="bold" fill="#b91c1c" text-anchor="middle">
        HỢP ĐỒNG HỢP LỆ
      </text>
    </svg>
  `;
}

/**
 * Con dấu dự thảo màu cam (khi chưa xác nhận thanh toán - HỢP ĐỒNG MẪU)
 */
export function getDraftSealSvg(): string {
  return `
    <svg width="125" height="125" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style="display:inline-block; vertical-align:middle; filter:drop-shadow(0 1px 2px rgba(217,119,6,0.2));">
      <circle cx="100" cy="100" r="92" stroke="#d97706" stroke-width="3" fill="none" opacity="0.85" stroke-dasharray="6,3" />
      <circle cx="100" cy="100" r="85" stroke="#d97706" stroke-width="1.5" fill="none" opacity="0.85" />
      <path id="curveTopDraft" d="M 28,100 A 72,72 0 0,1 172,100" fill="none" />
      <text font-family="'Times New Roman', serif" font-size="13" font-weight="bold" fill="#d97706" letter-spacing="1">
        <textPath href="#curveTopDraft" startOffset="50%" text-anchor="middle">
          SMARTEQUIP PLATFORM
        </textPath>
      </text>
      <path id="curveBottomDraft" d="M 172,100 A 72,72 0 0,1 28,100" fill="none" />
      <text font-family="'Times New Roman', serif" font-size="11" font-weight="bold" fill="#d97706" letter-spacing="1.2">
        <textPath href="#curveBottomDraft" startOffset="50%" text-anchor="middle">
          ★ BẢN MẪU DỰ THẢO ★
        </textPath>
      </text>
      <circle cx="100" cy="100" r="42" stroke="#d97706" stroke-width="1.5" fill="#fffbeb" fill-opacity="0.4" />
      <text x="100" y="93" font-family="'Times New Roman', serif" font-size="11" font-weight="bold" fill="#d97706" text-anchor="middle">
        CHỜ DUYỆT
      </text>
      <text x="100" y="108" font-family="'Times New Roman', serif" font-size="9" font-weight="bold" fill="#d97706" text-anchor="middle">
        CHƯA THANH TOÁN
      </text>
    </svg>
  `;
}

/**
 * Sinh chuỗi HTML tài liệu Hợp đồng chuẩn khổ A4 Việt Nam
 * Tự động phân định: HỢP ĐỒNG MẪU (khi chưa CK/chưa duyệt) vs HỢP ĐỒNG CHÍNH THỨC (sau khi Moderator duyệt)
 */
export function buildContractHtml(rental: Rental, options: BuildContractOptions = {}): string {
  const contractCode = rental.contract?.contractNumber || `HD-${rental.rentalCode}`;
  const rentalCode = rental.rentalCode;

  const effectiveSignature =
    options.signatureUrl ||
    (rental as any).renter_signature?.signature_image ||
    (rental.contract as any)?.renter_signature?.signature_image ||
    (rental.contract?.digitalSignature && rental.contract.digitalSignature.startsWith("data:image")
      ? rental.contract.digitalSignature
      : null) ||
    ((rental as any).renter_signature?.signature_data &&
    String((rental as any).renter_signature.signature_data).startsWith("data:image")
      ? (rental as any).renter_signature.signature_data
      : null) ||
    (rental.contract?.renterSignature && rental.contract.renterSignature.startsWith("data:image")
      ? rental.contract.renterSignature
      : null) ||
    null;

  // Chỉ xác định Người thuê (Bên B) đã ký khi thực sự có xác nhận ký hợp đồng hoặc ảnh chữ ký điện tử
  const hasSignature = Boolean(
    options.isSigned ||
      rental.contract?.termsAccepted ||
      Boolean(rental.contract?.signedAt) ||
      Boolean((rental as any).renter_signature?.signed) ||
      Boolean(effectiveSignature && effectiveSignature.startsWith("data:image")) ||
      String(rental.status).toUpperCase() === "CONTRACT_SIGNED"
  );

  // Hợp đồng chính thức khi Người thuê đã ký hoặc đã thanh toán
  const isConfirmedPaid = Boolean(
    hasSignature ||
      rental.payment?.isPaid === true ||
      rental.payment?.paymentStatus === "paid" ||
      String(rental.status).toUpperCase() === "PAID" ||
      String(rental.status).toUpperCase() === "ACTIVE" ||
      String(rental.status).toUpperCase() === "COMPLETED" ||
      options.isOfficial === true
  );

  const renterName =
    options.signerName ||
    (typeof rental.renter === "object" && rental.renter !== null
      ? rental.renter.name
      : (rental.contract?.renterSignature && !rental.contract.renterSignature.startsWith("data:image")
          ? rental.contract.renterSignature
          : "Người thuê SmartEquip"));

  const renterEmail =
    typeof rental.renter === "object" && rental.renter !== null
      ? rental.renter.email
      : "khachthue@smartequip.vn";

  const renterPhone =
    typeof rental.renter === "object" && rental.renter !== null && rental.renter.phone
      ? rental.renter.phone
      : "Chưa cập nhật";

  const ownerName =
    typeof rental.owner === "object" && rental.owner !== null
      ? rental.owner.name
      : "SmartEquip Official Hub";

  const ownerEmail =
    typeof rental.owner === "object" && rental.owner !== null
      ? rental.owner.email
      : "owner@smartequip.vn";

  const ownerPhone =
    typeof rental.owner === "object" && rental.owner !== null && rental.owner.phone
      ? rental.owner.phone
      : "1900-888-999";

  const deliveryAddress = rental.deliveryAddress || "Theo thỏa thuận hai bên";

  const deliveryTime = rental.deliveryTime || "09:00";
  const returnTime = rental.returnTime || "17:00";

  const deliveryOpt = getDeliveryOption(rental.deliveryMethod || "motorcycle");
  const returnOpt = getReturnOption(rental.returnMethod || "motorcycle");

  const dailyRateVal = Number(
    rental.dailyRate ??
    (rental as any).daily_rate ??
    rental.equipment?.dailyRate ??
    (rental.equipment as any)?.daily_rate ??
    0
  );

  const totalDaysVal = Number(
    rental.totalDays ??
    (rental as any).total_days ??
    (rental.startDate && rental.endDate
      ? Math.max(1, Math.ceil((new Date(rental.endDate).getTime() - new Date(rental.startDate).getTime()) / (1000 * 60 * 60 * 24)))
      : 1)
  );

  const rentalFeeVal = Number(
    rental.rentalFee ??
    (rental as any).rental_fee ??
    (dailyRateVal * totalDaysVal)
  );

  const shippingFeeVal = Number(
    rental.shippingFee !== undefined
      ? rental.shippingFee
      : ((rental as any).shipping_fee !== undefined
        ? (rental as any).shipping_fee
        : (deliveryOpt.fee + returnOpt.fee))
  );

  const totalAmountToPayVal = Number(
    rental.totalAmount ??
    (rental as any).total_amount ??
    (rentalFeeVal + shippingFeeVal)
  );

  const parseSafeDate = (d?: string | Date) => {
    if (!d) return "Chưa xác định";
    const dateObj = new Date(d);
    return isNaN(dateObj.getTime()) ? "Chưa xác định" : dateObj.toLocaleDateString("vi-VN");
  };

  const startDateFormatted = parseSafeDate(rental.startDate || (rental as any).start_date);
  const endDateFormatted = parseSafeDate(rental.endDate || (rental as any).end_date);

  const isSigned = Boolean(hasSignature || isConfirmedPaid);

  const signedDateStr = rental.contract?.signedAt
    ? new Date(rental.contract.signedAt).toLocaleDateString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : new Date().toLocaleDateString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

  const paidDateStr = rental.payment?.paidAt
    ? new Date(rental.payment.paidAt).toLocaleDateString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : signedDateStr;

  const isOwnerSigned = Boolean(
    options.isOwnerSigned ||
      options.ownerSignature ||
      rental.contract?.ownerSigned ||
      (rental as any).contract?.owner_signature?.signed ||
      (rental as any).owner_signature?.signed ||
      (rental.contract as any)?.ownerSignature ||
      rental.contract?.contractNumber || // Hợp đồng đã có mã có nghĩa là Bên A đã khởi tạo/ký
      rental.contract?.moderatorApproved ||
      ["APPROVED", "CONTRACT_SIGNED", "PAID", "ACTIVE", "COMPLETED"].includes(String(rental.status).toUpperCase())
  );

  const ownerSignatureImg =
    options.ownerSignature ||
    (rental.contract as any)?.ownerSignature ||
    (rental as any).owner_signature?.signature_image ||
    (rental as any).contract?.owner_signature?.signature_image ||
    "";

  const ownerSignerName =
    options.ownerSignerName ||
    (rental.contract as any)?.ownerSignerName ||
    (rental as any).owner_signature?.signer_name ||
    ownerName;

  const ownerSignedDateStr = (rental.contract as any)?.ownerSignedAt
    ? new Date((rental.contract as any).ownerSignedAt).toLocaleDateString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : (rental as any).owner_signature?.signed_at
    ? new Date((rental as any).owner_signature.signed_at).toLocaleDateString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : signedDateStr;

  const ownerBankInfo = (rental.owner as any)?.bankInfo;
  const bankNameDisplay = ownerBankInfo?.bankName || "MB Bank";
  const accNumDisplay = ownerBankInfo?.accountNumber || "111105056666";
  const accHolderDisplay = ownerBankInfo?.accountHolder || ownerName;

  const customTermsHtml = rental.contract?.contractTerms
    ? `<li style="color:#0369a1; background:#f0f9ff; padding:6px 10px; border-radius:6px; border-left:3px solid #0284c7; margin-bottom:6px;">
        <strong>Điều khoản cam kết bổ sung do Chủ máy & Khách thuê thỏa thuận:</strong> ${rental.contract.contractTerms}
      </li>`
    : "";

  const titleText = isConfirmedPaid
    ? "HỢP ĐỒNG THUÊ THIẾT BỊ ĐIỆN TỬ (BẢN CHÍNH THỨC)"
    : "HỢP ĐỒNG THUÊ THIẾT BỊ ĐIỆN TỬ (BẢN MẪU DỰ THẢO)";

  const subtitleText = isConfirmedPaid
    ? "★ BẢN CHÍNH THỨC - ĐÃ XÁC THỰC THANH TOÁN & CÓ ĐẦY ĐỦ HIỆU LỰC PHÁP LÝ ★"
    : "★ BẢN MẪU DỰ THẢO THAM KHẢO & KÝ NHÁP - CHƯA CÓ HIỆU LỰC CHÍNH THỨC ★";

  const badgeHtml = isConfirmedPaid
    ? `<span style="background:#065f46; color:#34d399; border:1px solid #059669; padding:2px 10px; border-radius:999px; font-weight:bold; font-size:8.5pt; white-space:nowrap !important; display:inline-flex !important; align-items:center; word-break:keep-all !important; vertical-align:middle;">✓ BẢN CHÍNH THỨC (ĐÃ KÝ)</span>`
    : `<span style="background:#78350f; color:#fbbf24; border:1px solid #d97706; padding:2px 10px; border-radius:999px; font-weight:bold; font-size:8.5pt; white-space:nowrap !important; display:inline-flex !important; align-items:center; word-break:keep-all !important; vertical-align:middle;">📋 BẢN MẪU DỰ THẢO</span>`;

  const bannerNoticeHtml = isConfirmedPaid
    ? `<div style="background:#ecfdf5; border:1px solid #6ee7b7; border-left:4px solid #059669; padding:10px 14px; border-radius:6px; font-size:11pt; color:#065f46; margin-bottom:16px; line-height:1.45;">
        <strong>✓ HỢP ĐỒNG CHÍNH THỨC ĐÃ CÓ HIỆU LỰC:</strong> Hợp đồng đã hoàn tất thủ tục ký điện tử hai bên và đã được Quản lý Hệ thống SmartEquip xác nhận thanh toán chuyển khoản thành công vào lúc <strong>${paidDateStr}</strong>. Hai bên có nghĩa vụ thực hiện đúng các cam kết trong hợp đồng.
      </div>`
    : `<div style="background:#fffbeb; border:1px solid #fde68a; border-left:4px solid #d97706; padding:10px 14px; border-radius:6px; font-size:11pt; color:#92400e; margin-bottom:16px; line-height:1.45;">
        <strong>⚠️ LƯU Ý PHÁP LÝ (BẢN MẪU DỰ THẢO):</strong> Văn bản này là <strong>HỢP ĐỒNG MẪU</strong> dùng để các bên xem trước điều khoản, thời gian và biểu phí giao dịch. Hợp đồng <strong>CHỈ CHÍNH THỨC PHÁT SINH HIỆU LỰC PHÁP LÝ</strong> sau khi Khách thuê hoàn tất chuyển khoản và được Quản lý Hệ thống SmartEquip phê duyệt xác nhận giao dịch thành công.
      </div>`;

  const watermarkText = isConfirmedPaid
    ? "HỢP ĐỒNG CHÍNH THỨC - SMARTEQUIP"
    : "HỢP ĐỒNG MẪU - CHƯA THANH TOÁN";

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${titleText} - ${contractCode}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 18mm 15mm 18mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12.5pt;
      line-height: 1.42;
      color: #111827;
      background-color: #f3f4f6;
      padding: 24px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-bar {
      position: sticky;
      top: 0;
      z-index: 999;
      background: #1e293b;
      color: #ffffff;
      padding: 12px 24px;
      margin: -24px -24px 24px -24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
    }
    .print-bar-btn {
      background: #ea580c;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .print-bar-btn:hover { background: #c2410c; }
    .print-bar-btn-secondary { background: #334155; color: #f8fafc; margin-left: 8px; }
    .print-bar-btn-secondary:hover { background: #475569; }
    .a4-page {
      background: #ffffff;
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 18mm 18mm 18mm 18mm;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      position: relative;
      overflow: hidden;
    }
    .watermark-layer {
      position: absolute;
      top: 45%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-32deg);
      font-size: 42pt;
      font-weight: bold;
      color: ${isConfirmedPaid ? "rgba(5, 150, 105, 0.06)" : "rgba(220, 38, 38, 0.07)"};
      white-space: nowrap;
      pointer-events: none;
      user-select: none;
      z-index: 0;
      font-family: Arial, sans-serif;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .national-header { text-align: center; margin-bottom: 16px; position: relative; z-index: 1; }
    .national-header h3 { font-size: 12.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
    .national-header h4 { font-size: 12.5pt; font-weight: bold; margin-top: 2px; }
    .national-header .divider { width: 130px; height: 1px; background: #000; margin: 5px auto 0 auto; }
    .contract-title { text-align: center; margin: 18px 0 14px 0; position: relative; z-index: 1; }
    .contract-title h1 { font-size: 16pt; font-weight: bold; text-transform: uppercase; color: #0f172a; }
    .contract-title .sub { font-size: 10.5pt; font-style: italic; color: ${isConfirmedPaid ? "#059669" : "#d97706"}; font-weight: bold; margin-top: 3px; }
    .contract-title .meta {
      font-size: 9.5pt;
      color: #475569;
      margin-top: 6px;
      white-space: nowrap;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      flex-wrap: nowrap;
    }
    .legal-basis {
      font-size: 10.5pt; font-style: italic; margin-bottom: 14px; color: #334155; line-height: 1.38;
      padding-left: 12px; border-left: 2px solid #cbd5e1; position: relative; z-index: 1;
    }
    .section-title { font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 14px; margin-bottom: 6px; color: #0f172a; position: relative; z-index: 1; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11.5pt; position: relative; z-index: 1; }
    .info-table td { padding: 4px 6px; vertical-align: top; }
    .info-table td.label { width: 26%; font-weight: bold; color: #1e293b; }
    .details-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11pt; position: relative; z-index: 1; }
    .details-table th, .details-table td { border: 1px solid #94a3b8; padding: 6px 8px; text-align: left; }
    .details-table th { background: #f1f5f9; font-weight: bold; color: #0f172a; text-align: center; }
    .details-table td.num { text-align: right; }
    .highlight-badge { background: #dcfce7; color: #15803d; padding: 1px 6px; border-radius: 4px; font-weight: bold; font-size: 10pt; display: inline-block; border: 1px solid #86efac; }
    .terms-list { padding-left: 18px; margin-bottom: 14px; font-size: 11.5pt; position: relative; z-index: 1; }
    .terms-list li { margin-bottom: 5px; text-align: justify; }
    .signatures-block { margin-top: 22px; page-break-inside: avoid; position: relative; z-index: 1; }
    .signatures-grid { display: table; width: 100%; margin-top: 8px; }
    .sign-col { display: table-cell; width: 50%; text-align: center; vertical-align: top; padding: 0 10px; }
    .sign-col .title { font-size: 12pt; font-weight: bold; text-transform: uppercase; color: #0f172a; }
    .sign-col .note { font-size: 10pt; font-style: italic; color: #64748b; margin-top: 2px; }
    .sign-area { height: 105px; display: flex; align-items: center; justify-content: center; margin: 6px 0; }
    .signature-img {
      max-height: 80px;
      max-width: 180px;
      object-fit: contain;
      background-color: transparent;
      mix-blend-mode: multiply;
      display: block;
      margin: 0 auto;
    }
    .sign-name { font-weight: bold; font-size: 11.5pt; margin-top: 2px; color: #0f172a; }
    .sign-date { font-size: 9pt; color: #64748b; font-style: italic; }
    .footer-watermark {
      margin-top: 20px; padding-top: 8px; border-top: 1px dashed #cbd5e1;
      display: flex; justify-content: space-between; align-items: center;
      font-size: 8.5pt; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      position: relative; z-index: 1;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .print-bar { display: none !important; }
      .a4-page { box-shadow: none; margin: 0; width: 100%; min-height: auto; padding: 0; }
    }
  </style>
</head>
<body>
  ${options.hidePrintBar ? "" : `<!-- Print & Download Floating Bar -->
  <div class="print-bar">
    <div style="display:flex; align-items:center; gap:8px;">
      <strong>SmartEquip</strong>: <span>${contractCode}</span>
      ${badgeHtml}
    </div>
    <div>
      <button type="button" class="print-bar-btn" onclick="window.print()">
        <span>🖨️</span>
        <span>Lưu dưới dạng PDF / In</span>
      </button>
      <button type="button" class="print-bar-btn print-bar-btn-secondary" onclick="window.close()">
        <span>✕</span>
        <span>Đóng</span>
      </button>
    </div>
  </div>`}

  <div class="a4-page">
    <!-- Watermark layer -->
    <div class="watermark-layer">${watermarkText}</div>

    <!-- National Header -->
    <div class="national-header">
      <h3>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
      <h4>Độc lập - Tự do - Hạnh phúc</h4>
      <div class="divider"></div>
    </div>

    <!-- Contract Title -->
    <div class="contract-title">
      <h1>${titleText}</h1>
      <div class="sub">${subtitleText}</div>
      <div class="meta">
        <span>Số HĐ: <strong>${contractCode}</strong></span>
        <span>•</span>
        <span>Mã đơn thuê: <strong>#${rentalCode}</strong></span>
        <span>•</span>
        ${badgeHtml}
      </div>
    </div>

    <!-- Legal Banner Notice (Bản mẫu vs Bản chính thức) -->
    ${bannerNoticeHtml}

    <!-- Legal Basis -->
    <div class="legal-basis">
      - Căn cứ Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015;<br>
      - Căn cứ Luật Thương mại số 36/2005/QH11 ngày 14/06/2005;<br>
      - Căn cứ Luật Giao dịch điện tử số 20/2023/QH15 về giá trị pháp lý của chữ ký điện tử;<br>
      - Căn cứ vào thỏa thuận tự nguyện giữa Bên Cho Thuê và Bên Thuê trên Nền tảng SmartEquip.
    </div>

    <!-- Section 1: Parties Information -->
    <div class="section-title">I. THÔNG TIN CÁC BÊN THAM GIA HỢP ĐỒNG</div>

    <table class="info-table">
      <tr><td colspan="2" style="background:#f8fafc; font-weight:bold; color:#0369a1; border-bottom:1px solid #e2e8f0;">BÊN CHO THUÊ (BÊN A)</td></tr>
      <tr><td class="label">Đơn vị / Chủ sở hữu:</td><td><strong>${ownerName}</strong></td></tr>
      <tr><td class="label">Email:</td><td>${ownerEmail}</td></tr>
      <tr><td class="label">Điện thoại:</td><td>${ownerPhone}</td></tr>
      <tr><td class="label">Đại diện nền tảng:</td><td>SmartEquip Platform - Verified Equipment Provider</td></tr>
    </table>

    <table class="info-table">
      <tr><td colspan="2" style="background:#f8fafc; font-weight:bold; color:#c2410c; border-bottom:1px solid #e2e8f0;">BÊN THUÊ (BÊN B)</td></tr>
      <tr><td class="label">Họ và tên:</td><td><strong>${renterName}</strong></td></tr>
      <tr><td class="label">Số điện thoại:</td><td>${renterPhone}</td></tr>
      <tr><td class="label">Email:</td><td>${renterEmail}</td></tr>
      <tr><td class="label">Địa chỉ nhận máy:</td><td>${deliveryAddress}</td></tr>
      <tr><td class="label">Tình trạng KYC:</td><td><strong style="color:#059669;">✓ Đã xác thực danh tính (KYC Verified)</strong></td></tr>
    </table>

    <!-- Section 2: Equipment & Pricing Table -->
    <div class="section-title">II. ĐỐI TƯỢNG HỢP ĐỒNG & CHI PHÍ THUÊ THIẾT BỊ</div>

    <table class="details-table">
      <thead>
        <tr>
          <th>Tên thiết bị thuê</th>
          <th>Thời gian thuê</th>
          <th>Đơn giá / ngày</th>
          <th>Tiền thuê</th>
          <th>Tiền cọc</th>
          <th>Tổng tiền thuê</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>${rental.equipment?.title || "Thiết bị điện tử"}</strong><br>
            <span style="font-size:9.5pt; color:#64748b;">
              Hãng: ${rental.equipment?.brand || "Chính hãng"} ${rental.equipment?.modelNumber ? `| Model: ${rental.equipment.modelNumber}` : ""}
            </span>
          </td>
          <td style="text-align:center;">
            ${startDateFormatted} - ${endDateFormatted}<br>
            <strong>(${totalDaysVal} ngày)</strong>
          </td>
          <td class="num">${dailyRateVal.toLocaleString("vi-VN")} đ</td>
          <td class="num"><strong>${rentalFeeVal.toLocaleString("vi-VN")} đ</strong></td>
          <td style="text-align:center;">
            <span class="highlight-badge">0 đ (Miễn cọc)</span>
          </td>
          <td class="num" style="color:#ea580c; font-weight:bold;">
            ${rentalFeeVal.toLocaleString("vi-VN")} đ
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Section 3: Delivery & Return Details (Yêu cầu 3) -->
    <div class="section-title">III. PHƯƠNG THỨC & THỜI GIAN GIAO NHẬN THIẾT BỊ</div>

    <table class="details-table">
      <thead>
        <tr>
          <th>Hạng mục giao nhận</th>
          <th>Thời gian hẹn</th>
          <th>Cách thức & Phương thức vận chuyển</th>
          <th>Cước phí</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>1. Giao nhận máy (Bắt đầu thuê)</strong></td>
          <td><strong>${deliveryTime}</strong>, ngày ${startDateFormatted}</td>
          <td>${deliveryOpt.icon} ${deliveryOpt.label}</td>
          <td class="num">${deliveryOpt.fee.toLocaleString("vi-VN")} đ</td>
        </tr>
        <tr>
          <td><strong>2. Hoàn trả máy (Kết thúc thuê)</strong></td>
          <td><strong>${returnTime}</strong>, ngày ${endDateFormatted}</td>
          <td>${returnOpt.icon} ${returnOpt.label}</td>
          <td class="num">${returnOpt.fee.toLocaleString("vi-VN")} đ</td>
        </tr>
        <tr style="background:#f8fafc; font-weight:bold;">
          <td colspan="3" style="text-align:right;">Tổng phí giao nhận 2 chiều:</td>
          <td class="num" style="color:#0284c7;">${shippingFeeVal.toLocaleString("vi-VN")} đ</td>
        </tr>
        <tr style="background:#fff7ed; font-weight:bold; font-size:12pt;">
          <td colspan="3" style="text-align:right; color:#c2410c;">TỔNG GIÁ TRỊ THANH TOÁN (Tiền thuê + Phí giao nhận):</td>
          <td class="num" style="color:#ea580c; font-size:13pt;">${totalAmountToPayVal.toLocaleString("vi-VN")} đ</td>
        </tr>
      </tbody>
    </table>

    <div style="font-size:10.5pt; color:#475569; margin-bottom:12px;">
      * Phương thức thanh toán: <strong>Chuyển khoản VietQR Ngân hàng ${bankNameDisplay} (STK ${accNumDisplay} - ${accHolderDisplay})</strong>.
    </div>

    <!-- Section 4: Terms and Commitments -->
    <div class="section-title">IV. ĐIỀU KHOẢN VÀ CAM KẾT CHÍNH THỨC</div>
    <ol class="terms-list">
      ${customTermsHtml}
      <li><strong>Chính sách Miễn phí cọc SmartEquip:</strong> Nền tảng SmartEquip cùng Bên Cho Thuê áp dụng chính sách <strong>Miễn 100% tiền cọc bảo đảm</strong> cho khách thuê đã xác thực danh tính (KYC).</li>
      <li><strong>Đúng giờ giao nhận:</strong> Hai bên cam kết tuân thủ đúng khung giờ giao nhận (<strong>${deliveryTime}</strong>) và giờ trả máy (<strong>${returnTime}</strong>) theo phương thức vận chuyển đã lựa chọn.</li>
      <li><strong>Trách nhiệm bảo quản:</strong> Bên B cam kết sử dụng cẩn thận, đúng thông số kỹ thuật và hoàn trả đầy đủ linh kiện, phụ kiện kèm theo máy.</li>
      <li><strong>Bàn giao & Nghiệm thu:</strong> Hai bên tiến hành kiểm tra ngoại quan máy và phụ kiện tại thời điểm giao và nhận.</li>
      <li><strong>Giá trị pháp lý chữ ký điện tử:</strong> Hợp đồng có giá trị pháp lý ràng buộc hai bên theo Luật Giao dịch điện tử số 20/2023/QH15.</li>
    </ol>

    <!-- Section 5: Signatures -->
    <div class="signatures-block">
      <div style="text-align:right; font-style:italic; font-size:10.5pt; margin-bottom:6px;">
        Hợp đồng được ký điện tử vào lúc: ${signedDateStr}
      </div>

      <div class="signatures-grid">
        <!-- Bên A -->
        <div class="sign-col">
          <div class="title">ĐẠI DIỆN BÊN CHO THUÊ (BÊN A)</div>
          <div class="note">(${isOwnerSigned ? "Chữ ký điện tử của Bên Cho Thuê" : "Chờ Chủ máy ký số"})</div>
          <div class="sign-area" style="position:relative;">
            ${
              ownerSignatureImg && ownerSignatureImg.startsWith("data:image")
                ? `<div style="text-align:center;">
                     <img src="${ownerSignatureImg}" alt="Chữ ký Chủ máy" class="signature-img" />
                     <div style="font-size:8.5pt; color:#059669; font-weight:bold; margin-top:2px;">✓ Đã ký số điện tử (Bên A)</div>
                   </div>`
                : isOwnerSigned
                ? `<div style="text-align:center;">
                     <div style="font-family:'Brush Script MT', cursive; font-size:24pt; color:#0f766e; line-height:1.2;">${ownerSignerName}</div>
                     <div style="font-size:8.5pt; color:#059669; font-weight:bold; margin-top:2px;">✓ Đã ký số điện tử (Bên A)</div>
                   </div>`
                : `<div style="color:#94a3b8; font-style:italic; font-size:10.5pt;">(Chưa ký tên)</div>`
            }
            ${
              isConfirmedPaid
                ? `<div style="position:absolute; right:5px; top:-10px; opacity:0.85; pointer-events:none; transform:scale(0.85);">${getOfficialSealSvg()}</div>`
                : ""
            }
          </div>
          <div class="sign-name">${ownerSignerName}</div>
          <div class="sign-date">${isOwnerSigned ? `Đã ký điện tử: ${ownerSignedDateStr}` : "Chờ ký"}</div>
        </div>

        <!-- Bên B: Không hiện chữ ký tay, chỉ xác nhận ký số điện tử -->
        <div class="sign-col">
          <div class="title">ĐẠI DIỆN BÊN THUÊ (BÊN B)</div>
          <div class="note">(${isSigned ? "Chữ ký điện tử của Bên Thuê" : "Chờ Người thuê ký số"})</div>
          <div class="sign-area" style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:80px;">
            ${
              isSigned
                ? `<div style="text-align:center; padding:12px 0;">
                     <div style="font-size:10pt; color:#059669; font-weight:bold; margin-bottom:4px; display:inline-flex; align-items:center; gap:5px; background:#ecfdf5; border:1px solid #a7f3d0; padding:4px 14px; border-radius:6px;">
                       ✓ Đã ký số điện tử (Bên B)
                     </div>
                     <div style="font-size:8.5pt; color:#64748b; font-style:italic;">
                       (Xác thực trực tuyến qua tài khoản SmartEquip)
                     </div>
                   </div>`
                : `<div style="color:#94a3b8; font-style:italic; font-size:10.5pt; padding:16px 0;">(Chưa ký tên)</div>`
            }
          </div>
          <div class="sign-name">${renterName}</div>
          <div class="sign-date">${isSigned ? `Đã ký điện tử: ${signedDateStr}` : "Chờ ký"}</div>
        </div>
      </div>
    </div>

    <!-- Footer Watermark -->
    <div class="footer-watermark">
      <span>Mã tra cứu: <strong>${contractCode}</strong></span>
      <span>Hệ thống Quản lý Thuê Thiết bị Thông minh SmartEquip</span>
      <span>${isConfirmedPaid ? "Bản chính thức" : "Bản mẫu"} • Trang 1/1</span>
    </div>
  </div>

  <script>
    if (window.location.search.includes("print=true")) {
      window.addEventListener("load", function() {
        setTimeout(function() { window.print(); }, 400);
      });
    }
  </script>
</body>
</html>`;
}

/**
 * Mở cửa sổ mới hiển thị Hợp đồng chuẩn A4 và tự động bật hộp thoại "Lưu dưới dạng PDF" / In
 */
export function openContractPdfPreview(rental: Rental, options: BuildContractOptions = {}): void {
  const html = buildContractHtml(rental, options);
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    downloadContractHtml(rental, options);
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.addEventListener("load", () => {
    setTimeout(() => {
      printWindow.print();
    }, 400);
  });
}

/**
 * Tải trực tiếp file hợp đồng độc lập (.html) về máy
 */
export function downloadContractHtml(rental: Rental, options: BuildContractOptions = {}): void {
  const html = buildContractHtml(rental, options);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const contractCode = rental.contract?.contractNumber || `HD-${rental.rentalCode}`;
  const isOfficial = Boolean(
    rental.payment?.isPaid === true ||
      rental.payment?.paymentStatus === "paid" ||
      rental.status === "PAID"
  );
  a.download = `${isOfficial ? "HopDongChinhThuc" : "HopDongMau"}_${contractCode}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
