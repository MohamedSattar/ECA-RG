import { dataverseFetch } from "./dataverseClient";

const BUDGETHEADERS = "prmtk_budgetheaders";
const APPLICATIONS = "prmtk_applications";
const RESEARCHES = "prmtk_researchs";

function sameGuid(a: string, b: string): boolean {
  return a.replace(/[{}]/g, "").toLowerCase() === b.replace(/[{}]/g, "").toLowerCase();
}

export async function applicationOwnedByContact(
  applicationId: string,
  contactId: string,
): Promise<boolean> {
  const path = `/${APPLICATIONS}?$filter=prmtk_applicationid eq ${applicationId}&$select=_prmtk_mainapplicant_value`;
  const r = await dataverseFetch("GET", path);
  if (!r.ok) return false;
  const j = (await r.json()) as { value?: { _prmtk_mainapplicant_value?: string }[] };
  const row = j.value?.[0];
  const owner = row?._prmtk_mainapplicant_value;
  return typeof owner === "string" && sameGuid(owner, contactId);
}

/** Matches proxy rule: research PI must be the contact. */
export async function researchOwnedByContact(researchId: string, contactId: string): Promise<boolean> {
  const path = `/${RESEARCHES}(${researchId.replace(/[{}]/g, "")})?$select=_prmtk_principalinvestigator_value`;
  const r = await dataverseFetch("GET", path);
  if (!r.ok) return false;
  const row = (await r.json()) as { _prmtk_principalinvestigator_value?: string };
  const pi = row._prmtk_principalinvestigator_value;
  return typeof pi === "string" && sameGuid(pi, contactId);
}

/**
 * Budget header may be tied to a research (PI) and/or an application (main applicant).
 * Must stay aligned with `budgetHeaderOwnedBySession` in server/proxy/ownershipPreflight.ts
 * and mandatoryFilterForPrivateEntity for prmtk_budgetheaders in dataversePolicy.ts.
 */
export async function budgetHeaderOwnedByContact(
  budgetHeaderId: string,
  contactId: string,
): Promise<boolean> {
  const path = `/${BUDGETHEADERS}(${budgetHeaderId.replace(/[{}]/g, "")})?$select=_prmtk_research_value,_prmtk_application_value`;
  const r = await dataverseFetch("GET", path);
  if (!r.ok) return false;
  const row = (await r.json()) as {
    _prmtk_research_value?: string | null;
    _prmtk_application_value?: string | null;
  };
  if (row._prmtk_research_value) {
    return researchOwnedByContact(row._prmtk_research_value, contactId);
  }
  if (row._prmtk_application_value) {
    return applicationOwnedByContact(row._prmtk_application_value, contactId);
  }
  return false;
}

export async function budgetLineItemOwnedByContact(
  lineItemId: string,
  contactId: string,
): Promise<boolean> {
  const path = `/prmtk_budgetlineitems(${lineItemId})?$select=_prmtk_budgetheader_value`;
  const r = await dataverseFetch("GET", path);
  if (!r.ok) return false;
  const row = (await r.json()) as { _prmtk_budgetheader_value?: string };
  const hid = row._prmtk_budgetheader_value;
  if (!hid) return false;
  return budgetHeaderOwnedByContact(hid, contactId);
}
