import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listSchedule, type ScheduleRow } from "@/lib/schedule.functions";
import { useRef, useState } from "react";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";
import { thaiToIso } from "@/lib/thai-date";

const THAI_MONTHS_FULL = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
const THAI_WEEKDAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

function formatFullThaiDate(raw: string): string {
  if (!raw) return "";
  let y = 0, mo = 0, d = 0;
  const iso = thaiToIso(raw);
  if (iso) {
    [y, mo, d] = iso.split("-").map(Number);
  } else {
    const cleaned = raw.replace(/\s+/g, " ").trim();
    const m = /^(\d{1,2})\s*([\u0E00-\u0E7F.]+?)\s*(\d{2,4})$/.exec(cleaned);
    if (!m) return raw;
    d = parseInt(m[1], 10);
    const monText = m[2].replace(/\s/g, "");
    let idx = THAI_MONTHS_FULL.findIndex((x) => x === monText);
    if (idx < 0) idx = THAI_MONTHS_SHORT.findIndex((x) => x === monText || x.replace(/\./g, "") === monText.replace(/\./g, ""));
    if (idx < 0) return raw;
    mo = idx + 1;
    y = parseInt(m[3], 10);
    if (y < 100) y = 2500 + y;
  }
  const ce = y > 2400 ? y - 543 : y;
  const be = y > 2400 ? y : y + 543;
  const dt = new Date(Date.UTC(ce, mo - 1, d));
  const weekday = THAI_WEEKDAYS[dt.getUTCDay()];
  return `วัน${weekday}ที่ ${d} ${THAI_MONTHS_FULL[mo - 1]} ${be}`;
}

const scheduleQO = queryOptions({
  queryKey: ["schedule"],
  queryFn: () => listSchedule(),
});

export const Route = createFileRoute("/poster/$week")({
  head: ({ params }) => ({
    meta: [{ title: `ตารางสัปดาห์ที่ ${params.week}` }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(scheduleQO),
  component: Poster,
});

function groupByDate(rows: ScheduleRow[]) {
  const map = new Map<string, ScheduleRow[]>();
  for (const r of rows) {
    const key = r.teachDate || "—";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return [...map.entries()];
}

function Poster() {
  const { week } = Route.useParams();
  const { data } = useSuspenseQuery(scheduleQO);
  const rows = data.rows.filter((r) => r.week === week);
  const grouped = groupByDate(rows);
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  // Start time = earliest time string, fallback "9:00"
  const startTime = rows.map(r => r.time).find(Boolean)?.split("-")[0]?.trim() || "9:00 น.";
  // Merit lists from any row (typically same per week)
  const sat = rows.find(r => r.saturdayMerit)?.saturdayMerit || "";
  const sun = rows.find(r => r.sundayMerit)?.sundayMerit || "";

  const download = async () => {
    if (!ref.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(ref.current, { pixelRatio: 2, cacheBust: true, backgroundColor: "#f5e8c8" });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `ตารางสอน-สัปดาห์-${week}.png`;
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
            ภาพประกาศ สัปดาห์ที่ {week}
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
              width: 420,
              maxWidth: "100%",
              fontFamily: "var(--font-thai)",
              background:
                "radial-gradient(circle at 20% 0%, oklch(0.96 0.05 80) 0%, oklch(0.92 0.05 75) 60%, oklch(0.88 0.06 70) 100%)",
              color: "oklch(0.25 0.04 35)",
              padding: 0,
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: "0 12px 40px -10px rgba(80,30,10,0.25)",
            }}
          >
            {/* Header bar */}
            <div
              style={{
                background: "linear-gradient(90deg, oklch(0.35 0.12 30), oklch(0.45 0.16 40))",
                color: "oklch(0.98 0.02 80)",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: "radial-gradient(circle, oklch(0.85 0.18 80), oklch(0.6 0.18 55))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, boxShadow: "0 0 0 3px oklch(0.78 0.15 80 / 0.4)"
                }}
              >
                ☸
              </div>
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: 17, fontWeight: 700 }}>สถาบันพลังจิตตานุภาพ</div>
                <div style={{ fontSize: 12, opacity: 0.9, marginTop: 3 }}>
                  หลักสูตรครูสมาธิ — สัปดาห์ที่ {week}
                </div>
              </div>
            </div>

            {/* Sub header */}
            <div
              style={{
                background: "oklch(0.35 0.12 30)",
                color: "oklch(0.98 0.02 80)",
                padding: "9px 16px",
                fontSize: 14,
                fontWeight: 600,
                textAlign: "center",
                borderBottom: "3px solid oklch(0.78 0.15 80)",
              }}
            >
              หัวข้อบรรยายสัปดาห์นี้ &nbsp; เริ่มเรียน {startTime}
            </div>

            {callDate && (
              <div
                style={{
                  background: "oklch(0.96 0.04 80)",
                  color: "oklch(0.35 0.12 30)",
                  padding: "6px 16px",
                  fontSize: 12,
                  textAlign: "center",
                  borderBottom: "1px solid oklch(0.85 0.08 75)",
                  fontWeight: 600,
                }}
              >
                ฝ่ายทะเบียนโทรยืนยันการสอน วันที่ {callDate}
              </div>
            )}

            {/* Content */}
            <div style={{ padding: "16px 16px 10px" }}>
              {grouped.map(([date, items]) => (
                <div key={date} style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "oklch(0.45 0.2 30)",
                      borderBottom: "2px dashed oklch(0.78 0.15 80)",
                      paddingBottom: 4,
                      marginBottom: 8,
                    }}
                  >
                    {formatFullThaiDate(date) || date}
                  </div>
                  {items.map((r) => {
                    // split topic into code + title (e.g. "1.1.05 อากาศ-หนาว-ร้อน")
                    const m = r.topic.match(/^([\d.]+)\s+(.+)$/);
                    const code = m?.[1] || "";
                    const title = m?.[2] || r.topic;
                    return (
                      <div key={r.rowIndex} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
                        {code && (
                          <div
                            style={{
                              minWidth: 52,
                              fontWeight: 700,
                              color: "oklch(0.35 0.12 30)",
                              fontSize: 13,
                              paddingTop: 2,
                            }}
                          >
                            {code}
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "oklch(0.25 0.04 35)" }}>
                            {title}
                          </div>
                          {r.teacher && (
                            <div style={{ fontSize: 12, color: "oklch(0.4 0.12 250)", marginTop: 2 }}>
                              ผู้บรรยาย {r.teacher}
                            </div>
                          )}
                          {r.time && (
                            <div style={{ fontSize: 11, color: "oklch(0.45 0.04 50)", marginTop: 2 }}>
                              {r.period} · {r.time}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Merit footer */}
            {(sat || sun) && (
              <>
                <div
                  style={{
                    background: "oklch(0.35 0.12 30)",
                    color: "oklch(0.98 0.02 80)",
                    padding: "8px 16px",
                    textAlign: "center",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  อาจารย์บุญสัปดาห์นี้
                </div>
                <div style={{ padding: "10px 16px 16px", fontSize: 12, lineHeight: 1.6 }}>
                  {sat && (
                    <div style={{ marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: "oklch(0.35 0.12 30)" }}>เสาร์: </span>
                      {sat}
                    </div>
                  )}
                  {sun && (
                    <div>
                      <span style={{ fontWeight: 700, color: "oklch(0.35 0.12 30)" }}>อาทิตย์: </span>
                      {sun}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          กด "บันทึกรูป" เพื่อดาวน์โหลด PNG สำหรับส่งในกลุ่ม LINE
        </p>
      </main>
    </div>
  );
}
