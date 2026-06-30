import { createServerFn } from "@tanstack/react-start";

const SPREADSHEET_ID = "1llWLaCOrU4_a9qfFe0ZEMcdpx_UQeyJk";
const SHEET_NAME = "Data";
const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

export const COLUMNS = [
  "สัปดาห์ที่",
  "โทรวันที่",
  "วันที่สอน",
  "คาบ",
  "ช่วงเวลา",
  "อาจารย์",
  "หัวข้อ",
  "ทะเบียนรถ",
  "ผู้ติดตาม",
  "อาหาร",
  "ที่จอดรถ",
  "อาจารย์บุญวันเสาร์",
  "อาจารย์บุญวันอาทิตย์",
] as const;

export type ScheduleRow = {
  rowIndex: number; // 1-indexed sheet row
  week: string;
  callDate: string;
  teachDate: string;
  period: string;
  time: string;
  teacher: string;
  topic: string;
  carPlate: string;
  follower: string;
  food: string;
  parking: string;
  saturdayMerit: string;
  sundayMerit: string;
};

function authHeaders(): HeadersInit {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const sheetsKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!lovableKey || !sheetsKey) {
    throw new Error("Missing LOVABLE_API_KEY or GOOGLE_SHEETS_API_KEY");
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": sheetsKey,
    "Content-Type": "application/json",
  };
}

function rowFromValues(rowIndex: number, v: string[]): ScheduleRow {
  const get = (i: number) => (v[i] ?? "").toString();
  return {
    rowIndex,
    week: get(0),
    callDate: get(1),
    teachDate: get(2),
    period: get(3),
    time: get(4),
    teacher: get(5),
    topic: get(6),
    carPlate: get(7),
    follower: get(8),
    food: get(9),
    parking: get(10),
    saturdayMerit: get(11),
    sundayMerit: get(12),
  };
}

function valuesFromRow(r: ScheduleRow): string[] {
  return [
    r.week,
    r.callDate,
    r.teachDate,
    r.period,
    r.time,
    r.teacher,
    r.topic,
    r.carPlate,
    r.follower,
    r.food,
    r.parking,
    r.saturdayMerit,
    r.sundayMerit,
  ];
}

export const listSchedule = createServerFn({ method: "GET" }).handler(async () => {
  const url = `${GATEWAY}/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A1:M1000`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheets read failed ${res.status}: ${text}`);
  }
  const json = (await res.json()) as { values?: string[][] };
  const values = json.values ?? [];
  // skip header (row 1)
  const rows: ScheduleRow[] = [];
  for (let i = 1; i < values.length; i++) {
    const v = values[i];
    if (!v || v.every((c) => !c)) continue;
    rows.push(rowFromValues(i + 1, v));
  }
  return { rows };
});

export const listMasters = createServerFn({ method: "GET" }).handler(async () => {
  const url = `${GATEWAY}/spreadsheets/${SPREADSHEET_ID}/values:batchGet?ranges=Master_Teachers!A2:B500&ranges=Master_Food!A2:A500`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheets read failed ${res.status}: ${text}`);
  }
  const json = (await res.json()) as { valueRanges?: { values?: string[][] }[] };
  const [tRange, fRange] = json.valueRanges ?? [];
  const teachers = (tRange?.values ?? [])
    .map((row) => {
      const name = (row[0] ?? "").trim();
      const nick = (row[1] ?? "").trim();
      if (!name) return "";
      return nick ? `${name} (${nick})` : name;
    })
    .filter(Boolean);
  const foods = (fRange?.values ?? [])
    .map((row) => (row[0] ?? "").trim())
    .filter(Boolean);
  return { teachers, foods };
});

export const updateRow = createServerFn({ method: "POST" })
  .inputValidator((d: ScheduleRow) => d)
  .handler(async ({ data }) => {
    const range = `${SHEET_NAME}!A${data.rowIndex}:M${data.rowIndex}`;
    const url = `${GATEWAY}/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({
        range,
        majorDimension: "ROWS",
        values: [valuesFromRow(data)],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Sheets update failed ${res.status}: ${text}`);
    }
    return { ok: true };
  });
