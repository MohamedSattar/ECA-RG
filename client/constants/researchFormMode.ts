import { ResearchKeys } from "@/constants";

/**
 * Whether the apply-research form should allow editing for the loaded research row.
 * Uses Dataverse `statuscode` (Active = editable; Inactive = read-only).
 * Adjust here if business rules use `prmtk_researchstatus` instead.
 */
export function getApplyResearchFormTypeFromResearchRecord(
  research: Record<string, unknown>,
): "edit" | "view" {
  const code = research[ResearchKeys.STATUSCODE];
  const num = typeof code === "number" ? code : Number(code);
  // Match Researches list: 1 = Active → edit; 0 = Inactive → view
  if (num === 1) return "edit";
  return "view";
}
