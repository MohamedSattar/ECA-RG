/**
 * OData $filter fragments ANDed with the client $filter so integration-token calls cannot
 * broaden results (e.g. `ne`) to other users' rows.
 *
 * Reference / catalog entities: exempt (see EXEMPT_ENTITY_SETS).
 */

export const EXEMPT_ENTITY_SETS = new Set([
  "prmtk_granttemplates",
  "prmtk_grantcycles",
  "prmtk_researchareas",
  "accounts",
  "$metadata",
]);

function normalizeContactToken(contactId: string): string {
  return contactId.replace(/[{}]/g, "").toLowerCase();
}

const MERGE_RULES: Record<string, (id: string) => string> = {
  prmtk_applications: (id) => `_prmtk_mainapplicant_value eq ${id}`,
  prmtk_researchs: (id) => `_prmtk_principalinvestigator_value eq ${id}`,
  prmtk_notifications: (id) => `_prmtk_applicant_value eq ${id}`,
  contacts: (id) => `contactid eq ${id}`,

  prmtk_statusreports: (id) =>
    `prmtk_Research/_prmtk_principalinvestigator_value eq ${id}`,
  prmtk_disseminationapplicants: (id) =>
    `prmtk_Research/_prmtk_principalinvestigator_value eq ${id}`,
  /** prmkt_* tables bind via prmkt_Research@odata.bind (not prmtk_Research). */
  prmkt_disseminationactivities: (id) =>
    `prmkt_Research/_prmtk_principalinvestigator_value eq ${id}`,
  prmtk_deliverables: (id) =>
    `prmtk_Research/_prmtk_principalinvestigator_value eq ${id}`,
  prmkt_workforcedevelopments: (id) =>
    `prmkt_Research/_prmtk_principalinvestigator_value eq ${id}`,
  prmkt_researchmanuscriptsandpublications: (id) =>
    `prmkt_Research/_prmtk_principalinvestigator_value eq ${id}`,
  prmkt_researchactivities: (id) =>
    `prmkt_Research/_prmtk_principalinvestigator_value eq ${id}`,

  prmtk_applicationcasehistories: (id) =>
    `prmtk_Application/_prmtk_mainapplicant_value eq ${id}`,
  prmtk_applicationteammembers: (id) =>
    `prmtk_Application/_prmtk_mainapplicant_value eq ${id}`,
  prmtk_researchteammembers: (id) =>
    `prmtk_Research/_prmtk_principalinvestigator_value eq ${id}`,

  prmtk_budgetheaders: (id) =>
    `(prmtk_Application/_prmtk_mainapplicant_value eq ${id} or prmtk_Research/_prmtk_principalinvestigator_value eq ${id})`,
  prmtk_budgetlineitems: (id) =>
    `(prmtk_BudgetHeader/prmtk_Application/_prmtk_mainapplicant_value eq ${id} or prmtk_BudgetHeader/prmtk_Research/_prmtk_principalinvestigator_value eq ${id})`,
};

/** Merged via server/security/budgetSpendScopeFilter.ts (no OData nav on spend→line item). */
export const BUDGET_SPENDS_ENTITY_SET = "prmtk_budgetspends";

/** True when this entity set gets a merged $filter (not exempt and has a rule). */
export function isProxyScopeMergedEntity(entitySet: string): boolean {
  if (EXEMPT_ENTITY_SETS.has(entitySet)) return false;
  if (entitySet === BUDGET_SPENDS_ENTITY_SET) return true;
  return Object.prototype.hasOwnProperty.call(MERGE_RULES, entitySet);
}

export function buildMergedScopeFilter(
  entitySet: string,
  contactId: string,
): string | null {
  if (EXEMPT_ENTITY_SETS.has(entitySet)) return null;
  const fn = MERGE_RULES[entitySet];
  if (!fn) return null;
  return fn(normalizeContactToken(contactId));
}

/** Optional: JSON row field for defense-in-depth filtering of `value` arrays. */
export function rowMatchFieldForEntity(entitySet: string): string | undefined {
  const m: Record<string, string> = {
    prmtk_applications: "_prmtk_mainapplicant_value",
    prmtk_researchs: "_prmtk_principalinvestigator_value",
    prmtk_notifications: "_prmtk_applicant_value",
    contacts: "contactid",
  };
  return m[entitySet];
}

/** Research lookup attribute on child rows (prmkt_* vs prmtk_* entities). */
export function researchLookupAttributeForEntity(entitySet: string): string {
  switch (entitySet) {
    case "prmkt_workforcedevelopments":
    case "prmkt_disseminationactivities":
    case "prmkt_researchmanuscriptsandpublications":
    case "prmkt_researchactivities":
      return "_prmkt_research_value";
    default:
      return "_prmtk_research_value";
  }
}
