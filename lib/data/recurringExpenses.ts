import dayjs from "dayjs";
import { getExpenses, createExpense } from "./expenses";
import { loadObject, saveObject } from "../storage";
import type { Expense } from "../mock-data";

const LAST_RUN_KEY = "recurring_expenses_last_run";

/**
 * Checks all recurring expense series and creates the current month's occurrence
 * if one doesn't already exist.
 *
 * Called once per expenses page mount. Deduplicates by checking whether an entry
 * with the same recurringId already exists for today's year+month.
 *
 * Returns newly created entries (empty array when nothing was due).
 */
export async function processRecurringExpenses(): Promise<Expense[]> {
  // Only run once per calendar day to avoid duplicates on re-renders
  const today = dayjs().format("YYYY-MM-DD");
  const lastRun = loadObject<string>(LAST_RUN_KEY, "");
  if (lastRun === today) return [];
  saveObject(LAST_RUN_KEY, today);

  const allExpenses = await getExpenses();
  const recurring = allExpenses.filter((e) => e.isRecurring && e.recurringId);
  if (recurring.length === 0) return [];

  // Find the most recent entry per series
  const latestBySeries = new Map<string, Expense>();
  for (const expense of recurring) {
    const id = expense.recurringId!;
    const current = latestBySeries.get(id);
    if (!current || expense.date > current.date) {
      latestBySeries.set(id, expense);
    }
  }

  const thisYearMonth = dayjs().format("YYYY-MM");
  const created: Expense[] = [];

  for (const [recurringId, template] of Array.from(latestBySeries)) {
    // Already have an entry this month
    if (dayjs(template.date).format("YYYY-MM") === thisYearMonth) continue;

    // Template is in the future — not due yet
    if (dayjs(template.date).isAfter(dayjs(), "month")) continue;

    // Extra dedup: scan all entries for this series + this month
    const alreadyExists = allExpenses.some(
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

    const newExpense = await createExpense({
      userId: template.userId,
      amount: template.amount,
      currency: template.currency,
      category: template.category,
      description: template.description,
      date: nextDate,
      vendor: template.vendor,
      isTaxDeductible: template.isTaxDeductible,
      isRecurring: true,
      recurringId,
    });

    created.push(newExpense);
  }

  return created;
}
