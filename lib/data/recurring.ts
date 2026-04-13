import dayjs from "dayjs";
import { getIncomeEntries, addIncomeEntry } from "./income";
import { loadObject, saveObject } from "../storage";
import type { IncomeEntry } from "../mock-data";

const LAST_RUN_KEY = "recurring_last_run";

/**
 * Checks all recurring income series and creates the current month's occurrence
 * if one doesn't already exist.
 *
 * Called once per dashboard mount. Deduplicates by checking whether an entry
 * with the same recurringId already exists for today's year+month.
 *
 * Returns newly created entries (empty array when nothing was due).
 *
 * @param existingEntries - Optional pre-fetched entries to avoid double-fetching
 *
 * TODO: Replace with a Supabase scheduled function / cron job when backend is ready.
 */
export async function processRecurringIncome(existingEntries?: IncomeEntry[]): Promise<IncomeEntry[]> {
  // Only run once per calendar day to avoid creating duplicates on re-renders
  const today = dayjs().format("YYYY-MM-DD");
  const lastRun = loadObject<string>(LAST_RUN_KEY, "");
  if (lastRun === today) return [];
  saveObject(LAST_RUN_KEY, today);

  const allEntries = existingEntries ?? await getIncomeEntries();
  const recurring = allEntries.filter((e) => e.isRecurring && e.recurringId);
  if (recurring.length === 0) return [];

  // Find the most recent entry per series
  const latestBySeries = new Map<string, IncomeEntry>();
  for (const entry of recurring) {
    const id = entry.recurringId!;
    const current = latestBySeries.get(id);
    if (!current || entry.date > current.date) {
      latestBySeries.set(id, entry);
    }
  }

  const thisYearMonth = dayjs().format("YYYY-MM");
  const created: IncomeEntry[] = [];

  for (const [recurringId, template] of Array.from(latestBySeries)) {
    // Already have an entry this month
    if (dayjs(template.date).format("YYYY-MM") === thisYearMonth) continue;

    // Template is in the future — not due yet
    if (dayjs(template.date).isAfter(dayjs(), "month")) continue;

    // Extra dedup: scan all entries for this series + this month
    const alreadyExists = allEntries.some(
      (e) =>
        e.recurringId === recurringId &&
        dayjs(e.date).format("YYYY-MM") === thisYearMonth,
    );
    if (alreadyExists) continue;

    // Use same day-of-month as template, capped to end of current month
    const templateDay = dayjs(template.date).date();
    const daysInMonth = dayjs().daysInMonth();
    const targetDay = Math.min(templateDay, daysInMonth);
    const nextDate = dayjs().date(targetDay).format("YYYY-MM-DD");

    const newEntry = await addIncomeEntry({
      amount: template.amount,
      currency: template.currency,
      source: template.source,
      date: nextDate,
      note: template.note || undefined,
      clientName: template.clientName,
      projectName: template.projectName,
      isRecurring: true,
      recurringId,          // preserve the series ID
    });

    created.push(newEntry);
  }

  return created;
}
