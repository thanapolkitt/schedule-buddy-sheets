import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listSchedule, type ScheduleRow } from "@/lib/schedule.functions";
import { useRef, useState } from "react";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";
import { thaiToIso } from "@/lib/thai-date";

const scheduleQO = queryOptions({
  queryKey: ["schedule"],
  queryFn: () => listSchedule(),
});

export const Route = createFileRoute("/food/$week")({
  head: ({ params }) => ({
    meta: [{ title: `ใบงานอาหาร/สถานที่ สัปดาห์ที่ ${params.week}` }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(scheduleQO),
  component: FoodPoster,
});

const THAI_MONTHS_FULL = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
const THAI_WEEKDAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

function parseDate(raw: string) {
  if (!raw) return null;
  let y = 0, mo = 0, d = 0;
  // Try ISO via thaiToIso (handles short format like "13 มิ.ย.69")
  const iso = thaiToIso(raw);
  if (iso) {
    [y, mo, d] = iso.split("-").map(Number);
  } else {
    // Try full Thai format e.g. "13 มิถุนายน 2569" or "13 มิถุนายน 69"
    const cleaned = raw.replace(/\s+/g, " ").trim();
    const m = /^(\d{1,2})\s*([\u0E00-\u0E7F.]+?)\s*(\d{2,4})$/.exec(cleaned);
    if (!m) return null;
    d = parseInt(m[1], 10);
    const monText = m[2].replace(/\s/g, "");
    let idx = THAI_MONTHS_FULL.findIndex((x) => x === monText);
    if (idx < 0) idx = THAI_MONTHS_SHORT.findIndex((x) => x === monText || x.replace(/\./g, "") === monText.replace(/\./g, ""));
    if (idx < 0) return null;
    mo = idx + 1;
    y = parseInt(m[3], 10);
    if (y < 100) y = 2500 + y;
    if (y < 2400) y += 543; // CE -> BE; keep BE for display
  }
  // y here may be CE (from iso) or BE (from full-format branch). Normalize.
  const ce = y > 2400 ? y - 543 : y;
  const be = y > 2400 ? y : y + 543;
  const dt = new Date(Date.UTC(ce, mo - 1, d));
  return {
    day: d,
    monthName: THAI_MONTHS_FULL[mo - 1],
    beYear: be,
    weekday: THAI_WEEKDAYS[dt.getUTCDay()],
  };
}

function groupByDate(rows: ScheduleRow[]) {
  const map = new Map<string, ScheduleRow[]>();
  for (const r of rows) {
    const key = r.teachDate || "—";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  // sort each by period number
  for (const [, arr] of map) {
    arr.sort((a, b) => (parseInt(a.period) || 0) - (parseInt(b.period) || 0));
  }
  // sort by actual date
  return [...map.entries()].sort((a, b) => {
    const ia = thaiToIso(a[0]); const ib = thaiToIso(b[0]);
    return ia.localeCompare(ib);
  });
}

function DayTable({ rows, date, week, callDate }: { rows: ScheduleRow[]; date: string; week: string; callDate: string }) {
  const parsed = parseDate(date);
  // Pad to 3 columns
  const cols = [...rows];
  while (cols.length < 3) cols.push({} as ScheduleRow);
  const cols3 = cols.slice(0, 3);

  const labelCell: React.CSSProperties = {
    border: "1.5px solid #1f2a44",
    padding: "10px 8px",
    fontWeight: 600,
    background: "#f0f4ff",
    width: 86,
    verticalAlign: "middle",
    fontSize: 14,
    textAlign: "center",
  };
  const dataCell: React.CSSProperties = {
    border: "1.5px solid #1f2a44",
    padding: "10px 8px",
    verticalAlign: "middle",
    fontSize: 14,
    minHeight: 36,
    textAlign: "center",
    wordBreak: "break-word",
  };

  const rowDef: { label: string; key: keyof ScheduleRow }[] = [
    { label: "ชื่ออาจารย์", key: "teacher" },
    { label: "เวลา", key: "time" },
    { label: "เรื่อง", key: "topic" },
    { label: "ทะเบียนรถ", key: "carPlate" },
    { label: "ผู้ติดตาม", key: "follower" },
    { label: "อาหาร", key: "food" },
  ];

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Header row: โทรวันที่ + สัปดาห์ที่ */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "0 2px 4px", fontSize: 13 }}>
        <div style={{ fontWeight: 700, color: "#1f2a44" }}>
          โทรวันที่ <span style={{ borderBottom: "1.5px dotted #1f2a44", padding: "0 10px", minWidth: 50, display: "inline-block", textAlign: "center" }}>{callDate || ""}</span>
        </div>
        <div style={{ fontWeight: 700, color: "#1f2a44" }}>
          สัปดาห์ที่ <span style={{ borderBottom: "1.5px dotted #1f2a44", padding: "0 10px", minWidth: 36, display: "inline-block", textAlign: "center" }}>{week}</span>
        </div>
      </div>
      {/* Date line - full Thai format */}
      <div style={{ padding: "0 2px 8px", fontSize: 15, color: "#1f2a44", fontWeight: 700, textAlign: "center" }}>
        {parsed
          ? `สอน วัน${parsed.weekday}ที่ ${parsed.day} ${parsed.monthName} ${parsed.beYear}`
          : `สอนวันที่ ${date}`}
      </div>


      <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: 86 }} />
          <col />
          <col />
          <col />
        </colgroup>
        </colgroup>
        <tbody>
          {rowDef.map((rd) => (
            <tr key={rd.label}>
              <td style={labelCell}>{rd.label}</td>
              {cols3.map((c, i) => (
                <td key={i} style={dataCell}>
                  {(c[rd.key] as string) || ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FoodPoster() {
  const { week } = Route.useParams();
  const { data } = useSuspenseQuery(scheduleQO);
  const rows = data.rows.filter((r) => r.week === week);
  const grouped = groupByDate(rows);
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const callDates = Array.from(new Set(rows.map((r) => r.callDate).filter(Boolean)));
  const callDate = callDates.join(", ");
  const parking = rows.map((r) => r.parking).find(Boolean) || "";

  const download = async () => {
    if (!ref.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(ref.current, { pixelRatio: 2, cacheBust: true, backgroundColor: "#eef1fb" });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `ใบงานอาหาร-สัปดาห์-${week}.png`;
      a.click();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> กลับ
          </Link>
          <h1 className="font-semibold text-base sm:text-lg" style={{ fontFamily: "var(--font-thai)" }}>
            ใบงานอาหาร/สถานที่ สัปดาห์ที่ {week}
          </h1>
          <button
            onClick={download}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            บันทึกรูป
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <div className="overflow-x-auto">
          <div
            ref={ref}
            className="mx-auto"
            style={{
              width: 820,
              fontFamily: "var(--font-thai)",
              background: "#eef1fb",
              color: "#1f2a44",
              padding: "28px 28px 32px",
              borderRadius: 8,
              boxShadow: "0 12px 40px -10px rgba(30,50,90,0.18)",
            }}
          >
            {grouped.map(([date, items], idx) => (
              <div key={date}>
                <DayTable rows={items} date={date} week={week} callDate={callDate} />
                {/* Parking note between Saturday and Sunday (after first table) */}
                {idx === 0 && parking && (
                  <div style={{ textAlign: "center", color: "#c0202a", fontWeight: 700, fontSize: 18, margin: "10px 0 22px" }}>
                    {parking}
                  </div>
                )}
                {idx === 0 && !parking && <div style={{ height: 18 }} />}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          กด "บันทึกรูป" เพื่อดาวน์โหลด PNG สำหรับส่งกลุ่มอาหารและสถานที่
        </p>
      </main>
    </div>
  );
}
