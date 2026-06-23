import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSchedule, updateRow, type ScheduleRow } from "@/lib/schedule.functions";
import { useState, useEffect } from "react";
import { ArrowLeft, Save, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

const scheduleQO = queryOptions({
  queryKey: ["schedule"],
  queryFn: () => listSchedule(),
});

export const Route = createFileRoute("/week/$week")({
  head: ({ params }) => ({
    meta: [{ title: `แก้ไขสัปดาห์ที่ ${params.week} — ตารางสอนครูสมาธิ` }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(scheduleQO),
  component: WeekEdit,
});

const FIELDS: { key: keyof ScheduleRow; label: string; full?: boolean }[] = [
  { key: "teachDate", label: "วันที่สอน" },
  { key: "period", label: "คาบ" },
  { key: "time", label: "ช่วงเวลา" },
  { key: "teacher", label: "อาจารย์ผู้บรรยาย" },
  { key: "topic", label: "หัวข้อ", full: true },
  { key: "carPlate", label: "ทะเบียนรถ" },
  { key: "follower", label: "ผู้ติดตาม" },
  { key: "food", label: "อาหาร" },
  { key: "parking", label: "ที่จอดรถ" },
];

function pickMerit(rows: ScheduleRow[], key: "saturdayMerit" | "sundayMerit"): string {
  return rows.find((r) => r[key])?.[key] ?? "";
}

function WeekEdit() {
  const { week } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(scheduleQO);
  const weekRows = data.rows.filter((r) => r.week === week);

  const [drafts, setDrafts] = useState<ScheduleRow[]>(weekRows);
  const [satMerit, setSatMerit] = useState<string>(pickMerit(weekRows, "saturdayMerit"));
  const [sunMerit, setSunMerit] = useState<string>(pickMerit(weekRows, "sundayMerit"));
  useEffect(() => {
    setDrafts(weekRows);
    setSatMerit(pickMerit(weekRows, "saturdayMerit"));
    setSunMerit(pickMerit(weekRows, "sundayMerit"));
  }, [data]); // eslint-disable-line

  const updateFn = useServerFn(updateRow);
  const mutation = useMutation({
    mutationFn: async (rows: ScheduleRow[]) => {
      // Apply the shared merit values to every row of the week before saving
      const merged = rows.map((r) => ({
        ...r,
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
              {FIELDS.map((f) => (
                <div key={f.key} className={f.full ? "sm:col-span-2" : ""}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{f.label}</label>
                  <input
                    value={(row[f.key] as string) ?? ""}
                    onChange={(e) => setField(idx, f.key, e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
