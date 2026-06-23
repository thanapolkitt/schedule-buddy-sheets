// Helpers to convert between ISO (YYYY-MM-DD) used by <input type="date">
// and the Thai short format "D MMM.YY" (Buddhist year, 2 digits) used in sheets.

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

export function isoToThai(iso: string): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  const beYY = ((y + 543) % 100).toString().padStart(2, "0");
  return `${d} ${THAI_MONTHS_SHORT[mo - 1]}${beYY}`;
}

export function thaiToIso(thai: string): string {
  if (!thai) return "";
  // Already ISO?
  if (/^\d{4}-\d{2}-\d{2}$/.test(thai)) return thai;
  const cleaned = thai.replace(/\s+/g, " ").trim();
  // Examples: "18 ก.พ.68", "18 ก.พ. 68", "18ก.พ.68"
  const re = /^(\d{1,2})\s*([\u0E00-\u0E7F.]+?)\s*(\d{2,4})$/;
  const m = re.exec(cleaned);
  if (!m) return "";
  const d = parseInt(m[1], 10);
  const monText = m[2].replace(/\s/g, "");
  const monIdx = THAI_MONTHS_SHORT.findIndex((x) => x === monText || x.replace(/\./g, "") === monText.replace(/\./g, ""));
  if (monIdx < 0) return "";
  let y = parseInt(m[3], 10);
  if (y < 100) y = 2500 + y; // BE 25xx
  if (y > 2400) y -= 543; // BE -> CE
  return `${y.toString().padStart(4, "0")}-${(monIdx + 1).toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
}
