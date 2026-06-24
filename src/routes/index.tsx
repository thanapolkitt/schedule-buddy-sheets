import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listSchedule, type ScheduleRow } from "@/lib/schedule.functions";
import { Calendar, Pencil, Image as ImageIcon, UtensilsCrossed } from "lucide-react";

const scheduleQO = queryOptions({
  queryKey: ["schedule"],
  queryFn: () => listSchedule(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ตารางสอนหลักสูตรครูสมาธิ" },
      { name: "description", content: "จัดการตารางสอนหลักสูตรครูสมาธิรายสัปดาห์" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(scheduleQO),
  component: Index,
});

function groupByWeek(rows: ScheduleRow[]) {
  const map = new Map<string, ScheduleRow[]>();
  for (const r of rows) {
    const key = r.week || "—";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return [...map.entries()].sort((a, b) => {
    const na = parseInt(a[0]); const nb = parseInt(b[0]);
    if (isNaN(na) && isNaN(nb)) return a[0].localeCompare(b[0]);
    if (isNaN(na)) return 1;
    if (isNaN(nb)) return -1;
    return na - nb;
  });
}

function Index() {
  const { data } = useSuspenseQuery(scheduleQO);
  const weeks = groupByWeek(data.rows);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-br from-[color:var(--maroon)] to-[color:var(--primary)] text-[color:var(--maroon-foreground)] py-10 px-6 shadow-lg">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm/6 opacity-80" style={{ fontFamily: "var(--font-thai)" }}>สถาบันพลังจิตตานุภาพ</p>
          <h1 className="text-3xl sm:text-4xl font-bold mt-1" style={{ fontFamily: "var(--font-thai)" }}>
            ตารางสอนหลักสูตรครูสมาธิ
          </h1>
          <p className="mt-2 opacity-90">เลือกสัปดาห์เพื่อตรวจสอบ แก้ไข และสร้างภาพประกาศ</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        {weeks.map(([week, rows]) => {
          const dates = [...new Set(rows.map((r) => r.teachDate).filter(Boolean))];
          return (
            <div key={week} className="bg-card rounded-2xl border shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-[color:var(--accent)]/30 text-[color:var(--maroon)] w-14 h-14 flex flex-col items-center justify-center font-bold">
                  <Calendar className="w-4 h-4 mb-0.5" />
                  <span className="text-sm leading-none">{week}</span>
                </div>
                <div>
                  <h2 className="font-semibold text-lg" style={{ fontFamily: "var(--font-thai)" }}>สัปดาห์ที่ {week}</h2>
                  <p className="text-sm text-muted-foreground">{dates.join(" • ") || "—"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{rows.length} รายการ</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  to="/week/$week"
                  params={{ week }}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition"
                >
                  <Pencil className="w-4 h-4" /> แก้ไข
                </Link>
                <Link
                  to="/poster/$week"
                  params={{ week }}
                  className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-card text-primary px-4 py-2 text-sm font-medium hover:bg-primary/5 transition"
                >
                  <ImageIcon className="w-4 h-4" /> ภาพ
                </Link>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
