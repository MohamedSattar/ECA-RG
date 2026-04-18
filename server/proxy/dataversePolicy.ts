import { TableName } from "../../client/constants/tables";
import type { SessionClaims } from "../auth/sessionJwt";
import { odataEscapeString } from "../auth/contactLookup";

/** Unauthenticated read (GET/HEAD only) — reference data only */
export const PUBLIC_ENTITY_SETS = new Set<string>([
  TableName.GRANTCYCLES.toLowerCase(),
  TableName.RESEARCHAREAS.toLowerCase(),
  "prmtk_granttemplates",
]);

/** Rows must be scoped to the signed-in contact (mandatory $filter merge on collection GET) */
export const PRIVATE_MERGE_ENTITY_SETS = new Set<string>([
  TableName.NOTIFICATIONS.toLowerCase(),
  TableName.CONTACTS.toLowerCase(),
  TableName.APPLICATIONS.toLowerCase(),
  TableName.RESEARCHES.toLowerCase(),
  TableName.APPLICATIONTEAMMEMBER.toLowerCase(),
  TableName.RESEARCHTEAMMEMBER.toLowerCase(),
  TableName.BUDGETHEADERS.toLowerCase(),
  TableName.BUDGETLINEITEMS.toLowerCase(),
  "prmtk_budgetspends",
  TableName.STATUSREPORT.toLowerCase(),
  TableName.DISSEMINATIONAPPLICANTS.toLowerCase(),
  TableName.DISSEMINATIONACTIVITIES.toLowerCase(),
  TableName.DELIVERABLES.toLowerCase(),
  TableName.CASESHISTORY.toLowerCase(),
  TableName.WORKFORCEDEVELOPMENTS.toLowerCase(),
  TableName.RESEARCHMANUSCRIPTSANDPUBLICATIONS.toLowerCase(),
  TableName.RESEARCHACTIVITIES.toLowerCase(),
]);

export type ParsedApiPath = {
  entitySet: string;
  /** Lowercase logical collection name */
  entitySetLc: string;
  recordId?: string;
  /** Path after /_api/ without query */
  resourcePath: string;
};

export function normalizeGuidLoose(g: string): string {
  return g.replace(/[{}]/g, "").toLowerCase();
}

/**
 * Parse `/_api/entityset` or `/_api/entityset(guid)` — ignores extra path segments for bound actions.
 */
export function parseUnderscoreApiPath(path: string): ParsedApiPath | null {
  const noQuery = path.split("?")[0];
  if (!noQuery.startsWith("/_api/")) return null;
  const rest = noQuery.slice("/_api/".length);
  const firstSeg = rest.split("/")[0];
  if (!firstSeg) return null;

  const paren = /^([^/(]+)(?:\(([0-9a-fA-F-]{36})\))?$/i.exec(firstSeg);
  if (!paren) return null;

  const entitySet = paren[1];
  const recordId = paren[2];
  return {
    entitySet,
    entitySetLc: entitySet.toLowerCase(),
    recordId,
    resourcePath: rest,
  };
}

/**
 * Strip lookup filters where `eq` has no value (e.g. client built URL before contactId loaded).
 * Avoids invalid OData like `_prmtk_mainapplicant_value eq ` that breaks merged queries.
 */
export function sanitizeODataFilterBeforeMerge(filter: string | null | undefined): string | undefined {
  if (!filter) return undefined;
  let f = filter.trim();
  if (!f) return undefined;

  const emptyLookupEq = [
    /\b_prmtk_mainapplicant_value\s+eq\s*(?=\s*(?:$|\)|\s+and\b|\s+or\b))/gi,
    /\b_prmtk_principalinvestigator_value\s+eq\s*(?=\s*(?:$|\)|\s+and\b|\s+or\b))/gi,
    /\b_prmtk_applicant_value\s+eq\s*(?=\s*(?:$|\)|\s+and\b|\s+or\b))/gi,
  ];
  for (const re of emptyLookupEq) {
    f = f.replace(re, "").trim();
  }

  f = f
    .replace(/^\s*(and|or)\s+/i, "")
    .replace(/\s+(and|or)\s*$/i, "")
    .replace(/\(\s*(and|or)\s+/gi, "(")
    .replace(/\s+(and|or)\s*\)/gi, ")")
    .trim();

  if (!f || f === "()") return undefined;
  return f;
}

export function mergeMandatoryFilter(
  existingFilter: string | null | undefined,
  mandatory: string,
): string {
  const m = mandatory.trim();
  const e = existingFilter?.trim();
  if (!e) return m;
  return `(${e}) and (${m})`;
}

export function mandatoryFilterForPrivateEntity(
  entitySetLc: string,
  session: SessionClaims,
): string | null {
  const cid = session.contactId;
  const emailEsc = odataEscapeString(session.email.trim().toLowerCase());
  const g = cid ? normalizeGuidLoose(cid) : null;

  if (entitySetLc === TableName.NOTIFICATIONS.toLowerCase()) {
    if (!cid) return null;
    return `_prmtk_applicant_value eq ${cid}`;
  }
  if (entitySetLc === TableName.APPLICATIONS.toLowerCase()) {
    if (!cid) return null;
    return `_prmtk_mainapplicant_value eq ${cid}`;
  }
  if (entitySetLc === TableName.RESEARCHES.toLowerCase()) {
    if (!cid) return null;
    return `_prmtk_principalinvestigator_value eq ${cid}`;
  }
  if (entitySetLc === TableName.CONTACTS.toLowerCase()) {
    if (cid) {
      return `(contactid eq ${cid}) or (emailaddress1 eq '${emailEsc}')`;
    }
    return `emailaddress1 eq '${emailEsc}'`;
  }

  if (!g) return null;

  const researchPi = `prmtk_Research/_prmtk_principalinvestigator_value eq ${g}`;
  const appMain = `prmtk_Application/_prmtk_mainapplicant_value eq ${g}`;
  const researchPiPrmkt = `prmkt_Research/_prmtk_principalinvestigator_value eq ${g}`;

  if (entitySetLc === TableName.APPLICATIONTEAMMEMBER.toLowerCase()) {
    return appMain;
  }
  if (entitySetLc === TableName.RESEARCHTEAMMEMBER.toLowerCase()) {
    return researchPi;
  }
  if (entitySetLc === TableName.BUDGETHEADERS.toLowerCase()) {
    return `((${researchPi}) or (${appMain}))`;
  }
  if (entitySetLc === TableName.BUDGETLINEITEMS.toLowerCase()) {
    return `((${`prmtk_BudgetHeader/${researchPi}`}) or (${`prmtk_BudgetHeader/${appMain}`}))`;
  }
  if (entitySetLc === TableName.STATUSREPORT.toLowerCase()) {
    return researchPi;
  }
  if (entitySetLc === TableName.DISSEMINATIONAPPLICANTS.toLowerCase()) {
    return `prmtk_Research/_prmtk_principalinvestigator_value eq ${g}`;
  }
  if (entitySetLc === TableName.DISSEMINATIONACTIVITIES.toLowerCase()) {
    return researchPiPrmkt;
  }
  if (entitySetLc === TableName.DELIVERABLES.toLowerCase()) {
    return `prmtk_Research/_prmtk_principalinvestigator_value eq ${g}`;
  }
  if (entitySetLc === TableName.CASESHISTORY.toLowerCase()) {
    return appMain;
  }
  if (entitySetLc === TableName.WORKFORCEDEVELOPMENTS.toLowerCase()) {
    return researchPiPrmkt;
  }
  if (entitySetLc === TableName.RESEARCHMANUSCRIPTSANDPUBLICATIONS.toLowerCase()) {
    return researchPiPrmkt;
  }
  if (entitySetLc === TableName.RESEARCHACTIVITIES.toLowerCase()) {
    return researchPiPrmkt;
  }

  return null;
}

export type RowFilterResult =
  | { kind: "merge"; mandatory: string }
  | { kind: "deny" }
  /**
   * `prmtk_budgetspends`: no merged nav filter — `prmtk_BudgetLineItem` is not a valid property on this type,
   * and Dataverse rejects filters with more than one nested lookup. Collection GET must include
   * `_prmtk_lineitem_value eq <guid>`; the proxy checks line-item ownership then forwards the filter as-is.
   */
  | { kind: "budget_spends_scoped" };

const BUDGET_SPEND_LINE_ITEM_FILTER_RES = [
  /\b_prmtk_lineitem_value\s+eq\s+([0-9a-fA-F-]{36})/gi,
  /\b_prmtk_budgetlineitem_value\s+eq\s+([0-9a-fA-F-]{36})/gi,
];

export type BudgetSpendLineItemFilterExtract =
  | { kind: "ok"; guid: string }
  | { kind: "none" }
  | { kind: "ambiguous" };

export function extractBudgetSpendLineItemGuidFromFilter(
  filter: string | null | undefined,
): BudgetSpendLineItemFilterExtract {
  if (!filter?.trim()) return { kind: "none" };
  const guids = new Set<string>();
  for (const re of BUDGET_SPEND_LINE_ITEM_FILTER_RES) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(filter)) !== null) {
      guids.add(normalizeGuidLoose(m[1]));
    }
  }
  if (guids.size === 0) return { kind: "none" };
  if (guids.size > 1) return { kind: "ambiguous" };
  return { kind: "ok", guid: [...guids][0] };
}

/**
 * How to constrain collection queries for this entity set.
 * Unknown / unsupported entity sets → deny (prevents app-only Dataverse token from exposing full tables).
 */
export function rowFilterForEntity(entitySetLc: string, session: SessionClaims): RowFilterResult {
  if (entitySetLc === "prmtk_budgetspends") {
    return { kind: "budget_spends_scoped" };
  }
  const m = mandatoryFilterForPrivateEntity(entitySetLc, session);
  if (m === null) {
    return { kind: "deny" };
  }
  return { kind: "merge", mandatory: m };
}

/** Verify JSON body for single-record GET on private merged entities */
export function privateRecordAllowed(
  entitySetLc: string,
  session: SessionClaims,
  record: Record<string, unknown>,
): boolean {
  const cid = session.contactId;
  const email = session.email.trim().toLowerCase();

  if (entitySetLc === TableName.NOTIFICATIONS.toLowerCase()) {
    const v = record["_prmtk_applicant_value"];
    return typeof v === "string" && cid !== null && v.toLowerCase() === cid.toLowerCase();
  }
  if (entitySetLc === TableName.APPLICATIONS.toLowerCase()) {
    const v = record["_prmtk_mainapplicant_value"];
    return typeof v === "string" && cid !== null && v.toLowerCase() === cid.toLowerCase();
  }
  if (entitySetLc === TableName.RESEARCHES.toLowerCase()) {
    const v = record["_prmtk_principalinvestigator_value"];
    return typeof v === "string" && cid !== null && v.toLowerCase() === cid.toLowerCase();
  }
  if (entitySetLc === TableName.CONTACTS.toLowerCase()) {
    const id = record["contactid"];
    const em = record["emailaddress1"];
    const idOk =
      typeof id === "string" &&
      cid !== null &&
      id.toLowerCase() === cid.toLowerCase();
    const emailOk = typeof em === "string" && em.trim().toLowerCase() === email;
    return idOk || emailOk;
  }
  return false;
}
