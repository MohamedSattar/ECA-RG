import { dataverseFetch } from "./dataverseClient";

const BUDGETHEADERS = "prmtk_budgetheaders";
const APPLICATIONS = "prmtk_applications";

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
  return (
    typeof owner === "string" &&
    owner.replace(/[{}]/g, "").toLowerCase() === contactId.replace(/[{}]/g, "").toLowerCase()
  );
}

export async function budgetHeaderOwnedByContact(
  budgetHeaderId: string,
  contactId: string,
): Promise<boolean> {
  const path = `/${BUDGETHEADERS}(${budgetHeaderId})?$select=_prmtk_application_value`;
  const r = await dataverseFetch("GET", path);
  if (!r.ok) return false;
  const row = (await r.json()) as { _prmtk_application_value?: string };
  const appId = row._prmtk_application_value;
  if (!appId) return false;
  return applicationOwnedByContact(appId, contactId);
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
