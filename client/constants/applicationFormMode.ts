import { ApplicationFields } from "./application";

/** Statuses where the applicant may edit (Draft, Return for updates) — matches prior URL `formType=edit` behavior. */
const EDITABLE_APPLICATION_STATUSES = new Set<number>([1, 3]);

/**
 * View vs edit for the application form, derived from loaded Dataverse row (not the URL).
 */
export function getApplicationFormTypeFromRecord(
  app: Record<string, unknown>,
): "edit" | "view" {
  const raw = app[ApplicationFields.STATUS];
  const num = typeof raw === "number" ? raw : Number(raw);
  if (Number.isNaN(num)) return "view";
  return EDITABLE_APPLICATION_STATUSES.has(num) ? "edit" : "view";
}
