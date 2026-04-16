/**
 * Workforce Development entity field names
 * Entity: prmkt_workforcedevelopments
 * Research lookup uses prmkt_ schema; bind to this entity set when creating records.
 */
export const WorkforceDevelopmentFields = {
  WORKFORCEDEVELOPMENTID: "prmkt_workforcedevelopmentid",
  NAME: "prmkt_name",
  JOININGDATE: "prmkt_joiningdate",
  ENDDATE: "prmkt_enddate",
  ROLE: "prmkt_role",
  EDUCATIONALLEVEL: "prmkt_educationallevel",
  RESEARCH: "_prmkt_research_value",
  RESEARCH_ID: "prmkt_Research@odata.bind",
  /** Entity set name for Research when binding (use prmtk_researchs - prmkt_researchs is not a valid segment in this org). */
  RESEARCH_ENTITY_SET: "prmtk_researchs",
} as const;
