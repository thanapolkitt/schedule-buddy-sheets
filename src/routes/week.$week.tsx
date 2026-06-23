import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSchedule, listMasters, updateRow, type ScheduleRow } from "@/lib/schedule.functions";
import { isoToThai, thaiToIso } from "@/lib/thai-date";
import { useState, useEffect } from "react";
import { ArrowLeft, Save, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

const scheduleQO = queryOptions({
  queryKey: ["schedule"],
  queryFn: () => listSchedule(),
});

const mastersQO = queryOptions({
  queryKey: ["masters"],
  queryFn: () => listMasters(),
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute("/week/$week")({
  head: ({ params }) => ({
    meta: [{ title: `แก้ไขสัปดาห์ที่ ${params.week} — ตารางสอนครูสมาธิ` }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(scheduleQO),
  component: WeekEdit,
});

type FieldDef = {
  key: keyof ScheduleRow;
  label: string;
  full?: boolean;
  options?: "teachers" | "food";
};

const FIELDS: FieldDef[] = [
  { key: "teachDate", label: "วันที่สอน" },
  { key: "period", label: "คาบ" },
  { key: "time", label: "ช่วงเวลา" },
  { key: "teacher", label: "อาจารย์ผู้บรรยาย", options: "teachers" },
  { key: "topic", label: "หัวข้อ", full: true },
  { key: "carPlate", label: "ทะเบียนรถ" },
  { key: "follower", label: "ผู้ติดตาม" },
  { key: "food", label: "อาหาร", options: "food" },
  { key: "parking", label: "ที่จอดรถ" },
];

function pickShared(rows: ScheduleRow[], key: "saturdayMerit" | "sundayMerit" | "callDate"): string {
  return rows.find((r) => r[key])?.[key] ?? "";
}

function WeekEdit() {
  const { week } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(scheduleQO);
  const mastersQuery = useQuery(mastersQO);
  const teacherOptions = mastersQuery.data?.teachers ?? [];
  const foodOptions = mastersQuery.data?.foods ?? [];
  const weekRows = data.rows.filter((r) => r.week === week);

  const [drafts, setDrafts] = useState<ScheduleRow[]>(weekRows);
  const [satMerit, setSatMerit] = useState<string>(pickShared(weekRows, "saturdayMerit"));
  const [sunMerit, setSunMerit] = useState<string>(pickShared(weekRows, "sundayMerit"));
  const [callDate, setCallDate] = useState<string>(pickShared(weekRows, "callDate"));
  useEffect(() => {
    setDrafts(weekRows);
    setSatMerit(pickShared(weekRows, "saturdayMerit"));
    setSunMerit(pickShared(weekRows, "sundayMerit"));
    setCallDate(pickShared(weekRows, "callDate"));
  }, [data]); // eslint-disable-line

  const updateFn = useServerFn(updateRow);
  const mutation = useMutation({
    mutationFn: async (rows: ScheduleRow[]) => {
      // Apply the shared merit values to every row of the week before saving
      const merged = rows.map((r) => ({
        ...r,
        callDate,
        saturdayMerit: satMerit,
        sundayMerit: sunMerit,
      }));
      for (const r of merged) {
        await updateFn({ data: r });
      }
    },
    onSuccess: () => {
      toast.success("บันทึกสำเร็จ");
      qc.invalidateQueries({ queryKey: ["schedule"] });
    },
    onError: (e) => toast.error(`บันทึกไม่สำเร็จ: ${(e as Error).message}`),
  });

  const setField = (idx: number, key: keyof ScheduleRow, value: string) => {
    setDrafts((d) => d.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> กลับ
          </Link>
          <h1 className="font-semibold text-base sm:text-lg truncate" style={{ fontFamily: "var(--font-thai)" }}>
            แก้ไขสัปดาห์ที่ {week}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => navigate({ to: "/poster/$week", params: { week } })}
              className="inline-flex items-center gap-1 rounded-lg border border-primary/30 text-primary px-3 py-2 text-sm hover:bg-primary/5"
            >
              <ImageIcon className="w-4 h-4" /> <span className="hidden sm:inline">ดูภาพ</span>
            </button>
            <button
              onClick={() => mutation.mutate(drafts)}
              disabled={mutation.isPending}
              className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
            >
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              บันทึก
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {drafts.length === 0 && (
          <p className="text-center text-muted-foreground py-12">ไม่พบรายการสำหรับสัปดาห์นี้</p>
        )}

        {drafts.length > 0 && (
          <div className="bg-card border rounded-2xl p-5 shadow-sm border-[color:var(--maroon)]/20">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center rounded-full bg-[color:var(--maroon)] text-white text-xs font-semibold w-7 h-7">
                ☎
              </span>
              <h3 className="font-medium text-[color:var(--maroon)]" style={{ fontFamily: "var(--font-thai)" }}>
                ฝ่ายทะเบียนโทรยืนยันการสอน
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3 ml-9">
              วันที่โทรยืนยันการสอน — ใช้ร่วมกันทั้งสัปดาห์
            </p>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">โทรวันที่</label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={thaiToIso(callDate)}
                  onChange={(e) => setCallDate(isoToThai(e.target.value))}
                  className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {callDate && (
                  <span className="text-sm text-[color:var(--maroon)] font-medium">
                    {callDate}
                  </span>
                )}
                {callDate && (
                  <button
                    type="button"
                    onClick={() => setCallDate("")}
                    className="text-xs text-muted-foreground underline hover:text-foreground"
                  >
                    ล้าง
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {drafts.length > 0 && (
          <div className="bg-card border rounded-2xl p-5 shadow-sm border-[color:var(--maroon)]/20">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center rounded-full bg-[color:var(--maroon)] text-white text-xs font-semibold w-7 h-7">
                ☸
              </span>
              <h3 className="font-medium text-[color:var(--maroon)]" style={{ fontFamily: "var(--font-thai)" }}>
                อาจารย์บุญประจำสัปดาห์
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3 ml-9">
              ใช้ร่วมกันทั้ง 3 คาบของวันเสาร์และวันอาทิตย์ — ป้อนครั้งเดียวพอ
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  อ.บุญ วันเสาร์
                </label>
                <textarea
                  rows={2}
                  value={satMerit}
                  onChange={(e) => setSatMerit(e.target.value)}
                  placeholder="เช่น อ.ลัดดาวัลย์(อ.ตุ๋ย), อ.ประภากร(อ.ฮิม), ..."
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  อ.บุญ วันอาทิตย์
                </label>
                <textarea
                  rows={2}
                  value={sunMerit}
                  onChange={(e) => setSunMerit(e.target.value)}
                  placeholder="เช่น อ.อรพิน(อ.น้อย), อ.ประภากร(อ.ฮิม), ..."
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>
        )}
        {drafts.map((row, idx) => (
          <div key={row.rowIndex} className="bg-card border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center justify-center rounded-full bg-[color:var(--accent)]/40 text-[color:var(--maroon)] text-xs font-semibold w-7 h-7">
                {idx + 1}
              </span>
              <h3 className="font-medium text-[color:var(--maroon)]" style={{ fontFamily: "var(--font-thai)" }}>
                {row.teachDate || "—"} · {row.period || "—"}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FIELDS.map((f) => {
                const value = (row[f.key] as string) ?? "";
                const opts =
                  f.options === "teachers" ? teacherOptions : f.options === "food" ? foodOptions : null;
                return (
                  <div key={f.key} className={f.full ? "sm:col-span-2" : ""}>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">{f.label}</label>
                    {opts ? (
                      <>
                        <select
                          value={opts.includes(value) ? value : ""}
                          onChange={(e) => setField(idx, f.key, e.target.value)}
                          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">— เลือก —</option>
                          {!opts.includes(value) && value && (
                            <option value={value}>{value} (ค่าเดิม)</option>
                          )}
                          {opts.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                        {mastersQuery.isLoading && (
                          <p className="text-[10px] text-muted-foreground mt-1">กำลังโหลดรายชื่อ…</p>
                        )}
                      </>
                    ) : (
                      <input
                        value={value}
                        onChange={(e) => setField(idx, f.key, e.target.value)}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
