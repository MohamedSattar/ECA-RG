import { BudgetLineItemFields } from "./budgetLineItem";

/**
 * Dataverse table names
 */
export const TableName = {
  GRANTCYCLES: "prmtk_grantcycles",
  APPLICATIONS: "prmtk_applications",
  RESEARCHAREAS: "prmtk_researchareas",
  CONTACTS: "contacts",
  ACCOUNTS: "accounts",
  APPLICATIONTEAMMEMBER: "prmtk_applicationteammembers",
  RESEARCHTEAMMEMBER: "prmtk_researchteammembers",
  RESEARCHES: "prmtk_researchs",
  BUDGETHEADERS: "prmtk_budgetheaders",
  BUDGETLINEITEMS: "prmtk_budgetlineitems",
  STATUSREPORT: "prmtk_statusreports",
  DISSEMINATIONAPPLICANTS: "prmtk_disseminationapplicants",
  DISSEMINATIONACTIVITIES: "prmkt_disseminationactivities",
  DELIVERABLES: "prmtk_deliverables",
  CASESHISTORY: "prmtk_applicationcasehistories",
  NOTIFICATIONS: "prmtk_notifications",
} as const;

/**
 * Column names
 */
export const ColumnName = {
  ROLE: "prmtk_role",
} as const;

/**
 * Expand navigation properties
 */
export const ExpandRelations = {
  APPLICATIONS: "prmtk_Application_prmtk_GrantCycle_prmtk_GrantCycle",
  RESEARCH_AREAS: "prmtk_ResearchArea_prmtk_GrantCycle_prmtk_GrantCycle",
  APPLICATION_TEAM_MEMBER:
    "prmtk_ApplicationTeamMember_prmtk_Application_prmtk_Application",
  RESEARCH_TEAM_MEMBER: "prmtk_TeamMember_prmtk_Research_prmtk_Research",
  BUDGET_LINE_ITEMS: "prmtk_BudgetLineItem_prmtk_BudgetHeader()",
} as const;
