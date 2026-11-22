const jakartaOffset = 7 * 60 * 60 * 1000;
const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const dayFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeZone: "UTC" });

export function todayInJakarta(now = Date.now()) {
  return new Date(now + jakartaOffset).toISOString().slice(0, 10);
}

export function startOfMonth(day: string) {
  return `${day.slice(0, 7)}-01`;
}

export function shiftMonth(day: string, offset: number) {
  const date = new Date(startOfMonth(day));
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 10);
}

export function monthLabel(day: string) {
  return monthFormatter.format(new Date(day));
}

export function dayLabel(day: string) {
  return dayFormatter.format(new Date(day));
}

export function dayForMonth(year: string, month: number, today: string) {
  if (!/^\d{4}$/.test(year) || Number(year) < 1 || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  return start > today ? null : start === startOfMonth(today) ? today : start;
}

export function monthWeeks(monthStart: string) {
  const start = new Date(monthStart);
  const leading = (start.getUTCDay() + 6) % 7;
  const end = new Date(shiftMonth(monthStart, 1));
  end.setUTCDate(0);
  const count = end.getUTCDate();
  const cells = Array.from({ length: Math.ceil((leading + count) / 7) * 7 }, (_, index) => {
    const number = index - leading + 1;
    return number < 1 || number > count
      ? null
      : `${monthStart.slice(0, 7)}-${String(number).padStart(2, "0")}`;
  });
  return Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
}
