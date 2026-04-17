import { dataverseFetch } from "../dataverseClient";

/** OData-escape single quotes in string literals */
export function odataEscapeString(s: string): string {
  return s.replace(/'/g, "''");
}

export async function lookupContactIdByEmail(email: string): Promise<string | null> {
  const norm = email.trim().toLowerCase();
  const esc = odataEscapeString(norm);
  const path = `/contacts?$filter=emailaddress1 eq '${esc}'&$select=contactid`;
  const r = await dataverseFetch("GET", path);
  if (!r.ok) return null;
  const j = (await r.json()) as { value?: { contactid?: string }[] };
  const id = j.value?.[0]?.contactid;
  return id ?? null;
}
