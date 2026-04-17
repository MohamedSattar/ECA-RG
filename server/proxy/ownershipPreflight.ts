import { dataverseFetch } from "../dataverseClient";
import { TableName } from "../../client/constants/tables";
import type { SessionClaims } from "../auth/sessionJwt";
import { privateRecordAllowed } from "./dataversePolicy";

const SELECT_BY_ENTITY: Record<string, string> = {
  [TableName.CONTACTS.toLowerCase()]: "contactid,emailaddress1",
  [TableName.NOTIFICATIONS.toLowerCase()]: "_prmtk_applicant_value",
  [TableName.APPLICATIONS.toLowerCase()]: "_prmtk_mainapplicant_value,prmtk_applicationid",
  [TableName.RESEARCHES.toLowerCase()]: "_prmtk_principalinvestigator_value,prmtk_researchid",
};

/** Logical collection name must match Dataverse (e.g. contacts, prmtk_applications) */
export async function loadRecordForOwnershipCheck(
  entitySet: string,
  entitySetLc: string,
  recordId: string,
): Promise<Record<string, unknown> | null> {
  const select = SELECT_BY_ENTITY[entitySetLc];
  if (!select) return null;
  const path = `/${entitySet}(${recordId})?$select=${select}`;
  const r = await dataverseFetch("GET", path);
  if (!r.ok) return null;
  return (await r.json()) as Record<string, unknown>;
}

export async function assertCanAccessPrivateRecord(
  entitySet: string,
  entitySetLc: string,
  recordId: string,
  session: SessionClaims,
): Promise<boolean> {
  const rec = await loadRecordForOwnershipCheck(entitySet, entitySetLc, recordId);
  if (!rec) return false;
  return privateRecordAllowed(entitySetLc, session, rec);
}
