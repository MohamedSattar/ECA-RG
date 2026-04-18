import { dataverseFetch } from "../dataverseClient";
import {
  getApplicationMainApplicantId,
  getBudgetLineItemHeaderId,
} from "../budgetOwnership";
import { isDataverseGuid } from "../auth/guid";
import {
  EXEMPT_ENTITY_SETS,
  isProxyScopeMergedEntity,
  researchLookupAttributeForEntity,
} from "./dataverseScopeMergeRules";

function normalizeGuid(g: string): string {
  return g.replace(/[{}]/g, "").toLowerCase();
}

async function fetchJson<T>(path: string): Promise<T | null> {
  const r = await dataverseFetch("GET", path);
  if (!r.ok) return null;
  return (await r.json()) as T;
}

async function getResearchPiContactId(researchId: string): Promise<string | null> {
  if (!isDataverseGuid(researchId)) return null;
  const j = await fetchJson<{ _prmtk_principalinvestigator_value?: string }>(
    `/prmtk_researchs(${normalizeGuid(researchId)})?$select=_prmtk_principalinvestigator_value`,
  );
  const v = j?._prmtk_principalinvestigator_value;
  return typeof v === "string" ? v : null;
}

async function researchOwnedByPi(
  researchLookup: string | undefined | null,
  contactId: string,
): Promise<boolean> {
  if (typeof researchLookup !== "string" || !researchLookup) return false;
  const pi = await getResearchPiContactId(researchLookup);
  return pi !== null && normalizeGuid(pi) === contactId;
}

async function applicationOwnedByMain(
  applicationLookup: string | undefined | null,
  contactId: string,
): Promise<boolean> {
  if (typeof applicationLookup !== "string") return false;
  const main = await getApplicationMainApplicantId(applicationLookup);
  return main !== null && normalizeGuid(main) === contactId;
}

async function loadRowSelect<T extends Record<string, unknown>>(
  entitySet: string,
  recordKey: string,
  select: string,
): Promise<T | null> {
  if (!isDataverseGuid(recordKey)) return null;
  return fetchJson<T>(
    `/${entitySet}(${normalizeGuid(recordKey)})?$select=${select}`,
  );
}

async function budgetHeaderOwnedByContact(
  headerId: string,
  contactId: string,
): Promise<boolean> {
  if (!isDataverseGuid(headerId)) return false;
  const j = await fetchJson<{
    _prmtk_application_value?: string;
    _prmtk_research_value?: string;
  }>(
    `/prmtk_budgetheaders(${normalizeGuid(headerId)})?$select=_prmtk_application_value,_prmtk_research_value`,
  );
  if (!j) return false;
  if (
    typeof j._prmtk_application_value === "string" &&
    (await applicationOwnedByMain(j._prmtk_application_value, contactId))
  )
    return true;
  if (
    typeof j._prmtk_research_value === "string" &&
    (await researchOwnedByPi(j._prmtk_research_value, contactId))
  )
    return true;
  return false;
}

async function directFieldMatches(
  row: Record<string, unknown>,
  field: string,
  contactId: string,
  entitySet: string,
  recordKey: string | null,
): Promise<boolean> {
  const v = row[field];
  if (typeof v === "string" && normalizeGuid(v) === contactId) return true;
  if (recordKey && isDataverseGuid(recordKey)) {
    const j = await loadRowSelect<Record<string, unknown>>(
      entitySet,
      recordKey,
      field,
    );
    const fv = j?.[field];
    return typeof fv === "string" && normalizeGuid(fv) === contactId;
  }
  return false;
}

async function ensureResearchPiScope(
  row: Record<string, unknown>,
  contactId: string,
  entitySet: string,
  recordKey: string | null,
): Promise<boolean> {
  const lookupField = researchLookupAttributeForEntity(entitySet);
  let rid: string | undefined;
  const raw = row[lookupField];
  if (typeof raw === "string") {
    rid = raw;
  } else if (recordKey && isDataverseGuid(recordKey)) {
    const j = await loadRowSelect<Record<string, unknown>>(
      entitySet,
      recordKey,
      lookupField,
    );
    const v = j?.[lookupField];
    rid = typeof v === "string" ? v : undefined;
  }
  return researchOwnedByPi(rid, contactId);
}

async function ensureApplicationMainScope(
  row: Record<string, unknown>,
  contactId: string,
  entitySet: string,
  recordKey: string | null,
): Promise<boolean> {
  let aid: string | undefined;
  const raw = row["_prmtk_application_value"];
  if (typeof raw === "string") {
    aid = raw;
  } else if (recordKey && isDataverseGuid(recordKey)) {
    const j = await loadRowSelect<{ _prmtk_application_value?: string }>(
      entitySet,
      recordKey,
      "_prmtk_application_value",
    );
    aid =
      typeof j?._prmtk_application_value === "string"
        ? j._prmtk_application_value
        : undefined;
  }
  return applicationOwnedByMain(aid, contactId);
}

async function verifyBudgetHeaderRow(
  row: Record<string, unknown>,
  contactId: string,
  entitySet: string,
  recordKey: string | null,
): Promise<boolean> {
  const tryRow = async (r: Record<string, unknown>): Promise<boolean> => {
    const app = r["_prmtk_application_value"];
    const res = r["_prmtk_research_value"];
    if (
      typeof app === "string" &&
      (await applicationOwnedByMain(app, contactId))
    )
      return true;
    if (typeof res === "string" && (await researchOwnedByPi(res, contactId)))
      return true;
    return false;
  };

  if (await tryRow(row)) return true;
  if (recordKey && isDataverseGuid(recordKey)) {
    const j = await loadRowSelect<Record<string, unknown>>(
      entitySet,
      recordKey,
      "_prmtk_application_value,_prmtk_research_value",
    );
    if (j && (await tryRow(j))) return true;
  }
  return false;
}

async function verifyBudgetLineItemRow(
  row: Record<string, unknown>,
  contactId: string,
  entitySet: string,
  recordKey: string | null,
): Promise<boolean> {
  let hid = row["_prmtk_budgetheader_value"];
  if (typeof hid !== "string" && recordKey && isDataverseGuid(recordKey)) {
    const j = await loadRowSelect<{ _prmtk_budgetheader_value?: string }>(
      entitySet,
      recordKey,
      "_prmtk_budgetheader_value",
    );
    hid = j?._prmtk_budgetheader_value;
  }
  if (typeof hid !== "string") return false;
  return budgetHeaderOwnedByContact(hid, contactId);
}

async function verifyBudgetSpendRow(
  row: Record<string, unknown>,
  contactId: string,
  entitySet: string,
  recordKey: string | null,
): Promise<boolean> {
  const lineItemFromRow = (): string | undefined => {
    const a = row["_prmtk_lineitem_value"];
    const b = row["_prmtk_budgetlineitem_value"];
    if (typeof a === "string") return a;
    if (typeof b === "string") return b;
    return undefined;
  };

  let lid = lineItemFromRow();
  if (typeof lid !== "string" && recordKey && isDataverseGuid(recordKey)) {
    const j = await loadRowSelect<Record<string, unknown>>(
      entitySet,
      recordKey,
      "_prmtk_lineitem_value,_prmtk_budgetlineitem_value",
    );
    if (j) {
      const a = j["_prmtk_lineitem_value"];
      const b = j["_prmtk_budgetlineitem_value"];
      lid =
        typeof a === "string"
          ? a
          : typeof b === "string"
            ? b
            : undefined;
    }
  }
  if (typeof lid !== "string") return false;
  const headerId = await getBudgetLineItemHeaderId(normalizeGuid(lid));
  if (!headerId) return false;
  return budgetHeaderOwnedByContact(headerId, contactId);
}

export async function verifyScopedSingleRecordAsync(
  data: unknown,
  entitySet: string,
  contactId: string,
  recordKey: string | null,
): Promise<boolean> {
  if (EXEMPT_ENTITY_SETS.has(entitySet)) return true;
  if (!isProxyScopeMergedEntity(entitySet)) return true;

  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const row = data as Record<string, unknown>;
  const c = normalizeGuid(contactId);

  switch (entitySet) {
    case "prmtk_applications":
      return directFieldMatches(
        row,
        "_prmtk_mainapplicant_value",
        c,
        entitySet,
        recordKey,
      );
    case "prmtk_researchs":
      return directFieldMatches(
        row,
        "_prmtk_principalinvestigator_value",
        c,
        entitySet,
        recordKey,
      );
    case "prmtk_notifications":
      return directFieldMatches(
        row,
        "_prmtk_applicant_value",
        c,
        entitySet,
        recordKey,
      );
    case "contacts":
      return directFieldMatches(row, "contactid", c, entitySet, recordKey);

    case "prmtk_statusreports":
    case "prmtk_disseminationapplicants":
    case "prmkt_disseminationactivities":
    case "prmtk_deliverables":
    case "prmkt_workforcedevelopments":
    case "prmkt_researchmanuscriptsandpublications":
    case "prmkt_researchactivities":
    case "prmtk_researchteammembers":
      return ensureResearchPiScope(row, c, entitySet, recordKey);

    case "prmtk_applicationcasehistories":
    case "prmtk_applicationteammembers":
      return ensureApplicationMainScope(row, c, entitySet, recordKey);

    case "prmtk_budgetheaders":
      return verifyBudgetHeaderRow(row, c, entitySet, recordKey);

    case "prmtk_budgetlineitems":
      return verifyBudgetLineItemRow(row, c, entitySet, recordKey);

    case "prmtk_budgetspends":
      return verifyBudgetSpendRow(row, c, entitySet, recordKey);

    default:
      return false;
  }
}
