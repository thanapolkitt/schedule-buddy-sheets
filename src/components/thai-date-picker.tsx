import { useMemo } from "react";
import { isoToThai, thaiToIso } from "@/lib/thai-date";

const THAI_MONTHS_FULL = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

type Props = {
  /** Value in Thai short format e.g. "18 ก.พ.68". */
  value: string;
  onChange: (v: string) => void;
  className?: string;
};

export function ThaiDatePicker({ value, onChange, className }: Props) {
  const iso = thaiToIso(value);
  const [y, m, d] = useMemo(() => {
    if (!iso) return ["", "", ""];
    const [yy, mm, dd] = iso.split("-");
    return [yy, mm, dd];
  }, [iso]);

  const nowBE = new Date().getFullYear() + 543;
  const years: number[] = [];
  for (let i = nowBE + 1; i >= nowBE - 5; i--) years.push(i);

  const emit = (nd: string, nm: string, ny: string) => {
    if (!nd || !nm || !ny) return;
    const ce = parseInt(ny, 10) - 543;
    const newIso = `${ce.toString().padStart(4, "0")}-${nm.padStart(2, "0")}-${nd.padStart(2, "0")}`;
    onChange(isoToThai(newIso));
  };

  const beY = y ? String(parseInt(y, 10) + 543) : "";
  const sel = "rounded-lg border bg-background px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className={`flex gap-2 ${className ?? ""}`}>
      <select
        className={sel}
        value={d}
        onChange={(e) => emit(e.target.value, m, y ? y : String(nowBE))}
        aria-label="วัน"
      >
        <option value="">วัน</option>
        {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => (
          <option key={n} value={String(n).padStart(2, "0")}>{n}</option>
        ))}
      </select>
      <select
        className={sel}
        value={m}
        onChange={(e) => emit(d, e.target.value, y ? y : String(nowBE))}
        aria-label="เดือน"
      >
        <option value="">เดือน</option>
        {THAI_MONTHS_FULL.map((name, i) => (
          <option key={name} value={String(i + 1).padStart(2, "0")}>{name}</option>
        ))}
      </select>
      <select
        className={sel}
        value={y ? String(parseInt(y, 10) + 543) : ""}
        onChange={(e) => emit(d, m, e.target.value)}
        aria-label="ปี พ.ศ."
      >
        <option value="">ปี พ.ศ.</option>
        {years.map((yr) => (
          <option key={yr} value={yr}>{yr}</option>
        ))}
      </select>
    </div>
  );
}
