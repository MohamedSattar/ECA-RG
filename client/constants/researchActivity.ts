/**
 * Research Activity entity field names
 * Entity: prmkt_researchactivities
 */
export const ResearchActivityFields = {
  ACTIVITYID: "prmkt_researchactivityid",
  TITLE: "prmkt_name",
  DATE: "prmkt_date",
  DELIVERY_FORMAT: "prmkt_delivery_format",
  /** API uses prmkt_audience_ (trailing underscore) */
  AUDIENCE: "prmkt_audience_",
  STATUS: "prmkt_status",
  OBJECTIVE: "prmkt_objective",
  KEY_OUTPUTS: "prmkt_output",
  RESEARCH: "_prmkt_research_value",
  RESEARCH_ID: "prmkt_Research@odata.bind",
  RESEARCH_ENTITY_SET: "prmtk_researchs",
} as const;

/** Status dropdown options for Research Activity. Dataverse prmkt_status accepts only 1, 2. */
export const ResearchActivityStatusOptions = [
  { key: 1, text: "Pending" },
  { key: 2, text: "Delivered" },
] as const;

export function getResearchActivityStatusText(value: number): string {
  const opt = ResearchActivityStatusOptions.find((o) => o.key === value);
  return opt?.text ?? String(value);
}
