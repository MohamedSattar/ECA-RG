import { dataverseFetch } from "./dataverseClient";
import { isDataverseGuid } from "./auth/guid";

/**
 * Budget access is enforced here by main-applicant = contact for session email.
 * Co-applicants / admins need extra rules if required. Contact lookup uses emailaddress1;
 * ensure unique emails in CRM or map B2C `sub` to contact in Dataverse for stability.
 */
function odataEscapeString(value: string): string {
  return value.replace(/'/g, "''");
}

export async function getContactIdByEmail(
  email: string,
): Promise<string | null> {
  const esc = odataEscapeString(email.trim());
  const path = `/contacts?$filter=emailaddress1 eq '${esc}'&$select=contactid&$top=1`;
  const r = await dataverseFetch("GET", path);
  if (!r.ok) return null;
  const j = (await r.json()) as { value?: { contactid?: string }[] };
  const id = j?.value?.[0]?.contactid;
  return typeof id === "string" ? id : null;
}

export async function getApplicationMainApplicantId(
  applicationId: string,
): Promise<string | null> {
  if (!isDataverseGuid(applicationId)) return null;
  const path = `/prmtk_applications(${applicationId})?$select=_prmtk_mainapplicant_value`;
  const r = await dataverseFetch("GET", path);
  if (!r.ok) return null;
  const j = (await r.json()) as { _prmtk_mainapplicant_value?: string };
  const v = j?._prmtk_mainapplicant_value;
  return typeof v === "string" ? v : null;
}

/** True if the application's main applicant contact matches the signed-in user's email. */
export async function applicationIsOwnedByEmail(
  applicationId: string,
  userEmail: string | undefined,
): Promise<boolean> {
  if (!userEmail || !isDataverseGuid(applicationId)) return false;
  const [contactId, mainApplicantId] = await Promise.all([
    getContactIdByEmail(userEmail),
    getApplicationMainApplicantId(applicationId),
  ]);
  if (!contactId || !mainApplicantId) return false;
  return (
    contactId.replace(/[{}]/g, "").toLowerCase() ===
    mainApplicantId.replace(/[{}]/g, "").toLowerCase()
  );
}

export async function getBudgetHeaderApplicationId(
  budgetHeaderId: string,
): Promise<string | null> {
  if (!isDataverseGuid(budgetHeaderId)) return null;
  const path = `/prmtk_budgetheaders(${budgetHeaderId})?$select=_prmtk_application_value`;
  const r = await dataverseFetch("GET", path);
  if (!r.ok) return null;
  const j = (await r.json()) as { _prmtk_application_value?: string };
  const v = j?._prmtk_application_value;
  return typeof v === "string" ? v : null;
}

export async function getBudgetLineItemHeaderId(
  lineItemId: string,
): Promise<string | null> {
  if (!isDataverseGuid(lineItemId)) return null;
  const path = `/prmtk_budgetlineitems(${lineItemId})?$select=_prmtk_budgetheader_value`;
  const r = await dataverseFetch("GET", path);
  if (!r.ok) return null;
  const j = (await r.json()) as { _prmtk_budgetheader_value?: string };
  const v = j?._prmtk_budgetheader_value;
  return typeof v === "string" ? v : null;
}

export async function budgetHeaderIsOwnedByEmail(
  budgetHeaderId: string,
  userEmail: string | undefined,
): Promise<boolean> {
  const appId = await getBudgetHeaderApplicationId(budgetHeaderId);
  if (!appId) return false;
  return applicationIsOwnedByEmail(appId, userEmail);
}

export async function budgetLineItemIsOwnedByEmail(
  lineItemId: string,
  userEmail: string | undefined,
): Promise<boolean> {
  const headerId = await getBudgetLineItemHeaderId(lineItemId);
  if (!headerId) return false;
  return budgetHeaderIsOwnedByEmail(headerId, userEmail);
}

export { isDataverseGuid };
