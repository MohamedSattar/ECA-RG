/**
 * Research Manuscripts and Publications entity field names
 * Entity: prmkt_researchmanuscriptsandpublications
 */
export const ManuscriptFields = {
  MANUSCRIPTID: "prmkt_researchmanuscriptsandpublicationid",
  TITLE: "prmkt_name",
  AUTHORS: "prmkt_authors",
  JOURNAL: "prmkt_journal",
  STATUS: "prmkt_status",
  RESEARCH: "_prmkt_research_value",
  RESEARCH_ID: "prmkt_Research@odata.bind",
  /** Entity set name for Research when binding (same org as workforce). */
  RESEARCH_ENTITY_SET: "prmtk_researchs",
} as const;

/** Status dropdown options for Manuscripts (matches prmkt_status optionset) */
export const ManuscriptStatusOptions = [
  { key: 1, text: "Draft" },
  { key: 2, text: "Submitted" },
  { key: 3, text: "Comments Received" },
  { key: 4, text: "Final Draft with ECA" },
  { key: 5, text: "Submitted to Journal" },
] as const;

export function getManuscriptStatusText(value: number): string {
  const opt = ManuscriptStatusOptions.find((o) => o.key === value);
  return opt?.text ?? String(value);
}
