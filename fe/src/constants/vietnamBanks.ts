export interface BankInfo {
  code: string;
  bin: string;
  shortName: string;
  name: string;
}

export const VIETNAM_BANKS: BankInfo[] = [
  { code: "MB", bin: "970422", shortName: "MB Bank", name: "Ngân hàng TMCP Quân đội (MB Bank)" },
  { code: "VCB", bin: "970436", shortName: "Vietcombank", name: "Ngân hàng TMCP Ngoại thương Việt Nam" },
  { code: "TCB", bin: "970407", shortName: "Techcombank", name: "Ngân hàng TMCP Kỹ thương Việt Nam" },
  { code: "CTG", bin: "970415", shortName: "VietinBank", name: "Ngân hàng TMCP Công thương Việt Nam" },
  { code: "BIDV", bin: "970418", shortName: "BIDV", name: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam" },
  { code: "ACB", bin: "970416", shortName: "ACB", name: "Ngân hàng TMCP Á Châu" },
  { code: "VPB", bin: "970432", shortName: "VPBank", name: "Ngân hàng TMCP Việt Nam Thịnh Vượng" },
  { code: "TPB", bin: "970423", shortName: "TPBank", name: "Ngân hàng TMCP Tiên Phong" },
  { code: "STB", bin: "970403", shortName: "Sacombank", name: "Ngân hàng TMCP Sài Gòn Thương Tín" },
  { code: "VIB", bin: "970441", shortName: "VIB", name: "Ngân hàng TMCP Quốc tế Việt Nam" },
  { code: "HDB", bin: "970437", shortName: "HDBank", name: "Ngân hàng TMCP Phát triển TP.HCM" },
  { code: "SHB", bin: "970443", shortName: "SHB", name: "Ngân hàng TMCP Sài Gòn - Hà Nội" },
  { code: "OCB", bin: "970448", shortName: "OCB", name: "Ngân hàng TMCP Phương Đông" },
  { code: "MSB", bin: "970426", shortName: "MSB", name: "Ngân hàng TMCP Hàng Hải Việt Nam" },
  { code: "VBA", bin: "970405", shortName: "Agribank", name: "Ngân hàng Nông nghiệp & Phát triển Nông thôn" },
  { code: "SEAB", bin: "970440", shortName: "SeABank", name: "Ngân hàng TMCP Đông Nam Á" },
  { code: "LPB", bin: "970449", shortName: "LPBank", name: "Ngân hàng TMCP Lộc Phát Việt Nam" },
  { code: "NAB", bin: "970428", shortName: "Nam A Bank", name: "Ngân hàng TMCP Nam Á" },
];

/**
 * Generates standard VietQR direct image URL
 * @param bankCode - short bank code or BIN (e.g. 'MB', 'VCB', 'TCB')
 * @param accountNumber - bank account number
 * @param amount - amount in VND
 * @param memo - transfer memo / message
 * @param accountName - account holder name
 */
export function generateVietQrUrl(
  bankCode: string,
  accountNumber: string,
  amount: number = 0,
  memo: string = "",
  accountName: string = ""
): string {
  if (!bankCode || !accountNumber) return "";
  const cleanAcc = accountNumber.trim().replace(/\s+/g, "");
  const cleanMemo = memo ? encodeURIComponent(memo.trim()) : "";
  const cleanName = accountName ? encodeURIComponent(accountName.trim().toUpperCase()) : "";
  const amtParam = amount > 0 ? `amount=${Math.round(amount)}&` : "";
  return `https://img.vietqr.io/image/${bankCode}-${cleanAcc}-compact2.png?${amtParam}addInfo=${cleanMemo}&accountName=${cleanName}`;
}

