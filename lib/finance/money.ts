// Finance's pure helpers (Stage 5b): money, months, budgets and recurring dates. No I/O
// and no floating-point maths — an amount is a whole number of paise from the moment
// it is typed, and dates are plain "YYYY-MM-DD" strings already in the user's timezone.

export type FinanceKind = "expense" | "income";
export type Frequency = "weekly" | "monthly" | "yearly";

// ₹10,00,00,00,000 (100 crore rupees) — far above any real transaction, and well
// inside the range a JavaScript number holds exactly.
export const MAX_PAISE = 100_000_000_000;

// Rupees as typed ("640", "1,24,530.1", "₹ 99.50") to whole paise, or null when it is not
// a plain non-negative amount with at most two decimals. The digits are split and
// joined as text, so 0.1 + 0.2 never happens.
export function toPaise(input: string): number | null {
  const cleaned = input.trim().replace(/^₹\s*/, "").replace(/,/g, "");
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;
  const paise = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(paise) ? paise : null;
}

// Paise back to the rupees a person would type into the form: "640", "640.50".
export function paiseToInput(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const rest = paise % 100;
  return rest === 0 ? String(rupees) : `${rupees}.${String(rest).padStart(2, "0")}`;
}

// Indian digit grouping: the last three digits, then pairs — 1,24,530.
function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const head = digits.slice(0, -3);
  const tail = digits.slice(-3);
  return `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${tail}`;
}

const MINUS = "−";

// "₹1,24,530", "₹640.50" — paise shown only when there are some. With a `kind` the
// amount is signed the way the lists show it: − for an expense, + for income. Without
// one, a negative amount still gets − (a left-to-spend that has gone under), and
// `signed` adds + to a positive one.
export function formatInr(paise: number, options: { signed?: boolean; kind?: FinanceKind } = {}): string {
  const abs = Math.abs(paise);
  const rupees = groupIndian(String(Math.floor(abs / 100)));
  const rest = abs % 100;
  const body = `₹${rupees}${rest === 0 ? "" : `.${String(rest).padStart(2, "0")}`}`;

  let sign = "";
  if (options.kind) sign = options.kind === "expense" ? MINUS : "+";
  else if (paise < 0) sign = MINUS;
  else if (options.signed && paise > 0) sign = "+";
  return `${sign}${body}`;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one; UTC keeps DST out of it.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function parts(date: string): [number, number, number] {
  const [year, month, day] = date.split("-").map(Number);
  return [year, month, day];
}

function isoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${pad2(month)}-${pad2(day)}`;
}

export const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonth(value: unknown): value is string {
  return typeof value === "string" && MONTH_PATTERN.test(value);
}

// "2026-09" → the first and last day of that month.
export function monthRange(month: string): { start: string; end: string } {
  const [year, m] = month.split("-").map(Number);
  return { start: isoDate(year, m, 1), end: isoDate(year, m, daysInMonth(year, m)) };
}

// The "YYYY-MM" a date falls in.
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const index = year * 12 + (m - 1) + delta;
  return `${String(Math.floor(index / 12)).padStart(4, "0")}-${pad2((index % 12) + 1)}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const MONTH_SHORT = MONTH_NAMES.map((name) => name.slice(0, 3));

// "September 2026"
export function formatMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${year}`;
}

// "September"
export function monthName(month: string): string {
  return MONTH_NAMES[Number(month.slice(5, 7)) - 1];
}

// "23 Sep" in lists; "1 Oct 2026" with the year.
export function formatDay(date: string, withYear = false): string {
  const [year, month, day] = parts(date);
  return `${day} ${MONTH_SHORT[month - 1]}${withYear ? ` ${year}` : ""}`;
}

// Spend against a budget. `percent` is rounded down, so 100% means the budget is used
// up and never shows early; `fill` is the bar's width, capped at the track.
export function budgetStatus(
  spentPaise: number,
  budgetPaise: number
): { percent: number; fill: number; overByPaise: number } {
  const percent = budgetPaise > 0 ? Math.floor((spentPaise * 100) / budgetPaise) : 0;
  return {
    percent,
    fill: Math.min(100, percent),
    overByPaise: Math.max(0, spentPaise - budgetPaise),
  };
}

// The next date a recurring item falls on after `from` (its current next_on). Weekly
// adds seven days. Monthly and yearly land on the anchor day — the day of the month the
// item was set up on — clamped to the month's last day, so an item on the 31st is on
// 28/29 Feb and back on the 31st in March, and one on 29 Feb is on the 28th in other years.
export function nextOccurrence(frequency: Frequency, anchorDay: number, from: string): string {
  const [year, month, day] = parts(from);
  if (frequency === "weekly") {
    const next = new Date(Date.UTC(year, month - 1, day + 7));
    return isoDate(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
  }
  const [nextYear, nextMonth] = frequency === "monthly" ? (month === 12 ? [year + 1, 1] : [year, month + 1]) : [year + 1, month];
  return isoDate(nextYear, nextMonth, Math.min(anchorDay, daysInMonth(nextYear, nextMonth)));
}

// The day of the month a recurring item is anchored to: the day of the date it was given.
export function anchorDayOf(date: string): number {
  return parts(date)[2];
}

// A real calendar date in "YYYY-MM-DD" form (not 31 Feb).
export function isRealDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return year >= 1900 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};
