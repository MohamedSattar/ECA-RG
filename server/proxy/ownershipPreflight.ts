import { dataverseFetch } from "../dataverseClient";
import { TableName } from "../../client/constants/tables";
import type { SessionClaims } from "../auth/sessionJwt";
import { normalizeGuidLoose, privateRecordAllowed } from "./dataversePolicy";

const SELECT_BY_ENTITY: Record<string, string> = {
  [TableName.CONTACTS.toLowerCase()]: "contactid,emailaddress1",
  [TableName.NOTIFICATIONS.toLowerCase()]: "_prmtk_applicant_value",
  [TableName.APPLICATIONS.toLowerCase()]: "_prmtk_mainapplicant_value,prmtk_applicationid",
  [TableName.RESEARCHES.toLowerCase()]: "_prmtk_principalinvestigator_value,prmtk_researchid",
};

async function researchOwnedBySession(researchId: string, session: SessionClaims): Promise<boolean> {
  const cid = session.contactId;
  if (!cid) return false;
  const id = normalizeGuidLoose(researchId);
  const path = `/prmtk_researchs(${id})?$select=_prmtk_principalinvestigator_value`;
  const r = await dataverseFetch("GET", path);
  if (!r.ok) return false;
  const j = (await r.json()) as Record<string, unknown>;
  const pi = j["_prmtk_principalinvestigator_value"];
  return typeof pi === "string" && normalizeGuidLoose(pi) === normalizeGuidLoose(cid);
}

async function applicationOwnedBySession(applicationId: string, session: SessionClaims): Promise<boolean> {
  const cid = session.contactId;
  if (!cid) return false;
  const id = normalizeGuidLoose(applicationId);
  const path = `/prmtk_applications(${id})?$select=_prmtk_mainapplicant_value`;
  const r = await dataverseFetch("GET", path);
  if (!r.ok) return false;
  const j = (await r.json()) as Record<string, unknown>;
  const ma = j["_prmtk_mainapplicant_value"];
  return typeof ma === "string" && normalizeGuidLoose(ma) === normalizeGuidLoose(cid);
}

async function budgetHeaderOwnedBySession(headerId: string, session: SessionClaims): Promise<boolean> {
  const path = `/prmtk_budgetheaders(${normalizeGuidLoose(headerId)})?$select=_prmtk_research_value,_prmtk_application_value`;
  const r = await dataverseFetch("GET", path);
  if (!r.ok) return false;
  const j = (await r.json()) as Record<string, unknown>;
  const rid = j["_prmtk_research_value"];
  const aid = j["_prmtk_application_value"];
  if (typeof rid === "string" && rid) {
    return researchOwnedBySession(rid, session);
  }
  if (typeof aid === "string" && aid) {
    return applicationOwnedBySession(aid, session);
  }
  return false;
}

/** Logical collection name must match Dataverse (e.g. contacts, prmtk_applications) */
export async function loadRecordForOwnershipCheck(
  entitySet: string,
  entitySetLc: string,
  recordId: string,
): Promise<Record<string, unknown> | null> {
  const select = SELECT_BY_ENTITY[entitySetLc];
  if (!select) return null;
  const path = `/${entitySet}(${normalizeGuidLoose(recordId)})?$select=${select}`;
  const r = await dataverseFetch("GET", path);
  if (!r.ok) return null;
  return (await r.json()) as Record<string, unknown>;
}

async function assertCanAccessComplexRecord(
  entitySet: string,
  entitySetLc: string,
  recordId: string,
  session: SessionClaims,
): Promise<boolean> {
  const id = normalizeGuidLoose(recordId);

  if (entitySetLc === TableName.BUDGETHEADERS.toLowerCase()) {
    return budgetHeaderOwnedBySession(id, session);
  }
  if (entitySetLc === TableName.BUDGETLINEITEMS.toLowerCase()) {
    const path = `/prmtk_budgetlineitems(${id})?$select=_prmtk_budgetheader_value`;
    const r = await dataverseFetch("GET", path);
    if (!r.ok) return false;
    const j = (await r.json()) as Record<string, unknown>;
    const hid = j["_prmtk_budgetheader_value"];
    return typeof hid === "string" && hid ? budgetHeaderOwnedBySession(hid, session) : false;
  }
  if (entitySetLc === "prmtk_budgetspends") {
    const path = `/prmtk_budgetspends(${id})?$select=_prmtk_lineitem_value,_prmtk_budgetlineitem_value`;
    const r = await dataverseFetch("GET", path);
    if (!r.ok) return false;
    const j = (await r.json()) as Record<string, unknown>;
    const lidRaw = j["_prmtk_lineitem_value"] ?? j["_prmtk_budgetlineitem_value"];
    const lid = typeof lidRaw === "string" ? lidRaw : "";
    if (!lid) return false;
    const path2 = `/prmtk_budgetlineitems(${normalizeGuidLoose(lid)})?$select=_prmtk_budgetheader_value`;
    const r2 = await dataverseFetch("GET", path2);
    if (!r2.ok) return false;
    const j2 = (await r2.json()) as Record<string, unknown>;
    const hid = j2["_prmtk_budgetheader_value"];
    return typeof hid === "string" && hid ? budgetHeaderOwnedBySession(hid, session) : false;
  }
  if (entitySetLc === TableName.APPLICATIONTEAMMEMBER.toLowerCase()) {
    const path = `/prmtk_applicationteammembers(${id})?$select=_prmtk_application_value`;
    const r = await dataverseFetch("GET", path);
    if (!r.ok) return false;
    const j = (await r.json()) as Record<string, unknown>;
    const aid = j["_prmtk_application_value"];
    return typeof aid === "string" && aid ? applicationOwnedBySession(aid, session) : false;
  }
  if (entitySetLc === TableName.RESEARCHTEAMMEMBER.toLowerCase()) {
    const path = `/prmtk_researchteammembers(${id})?$select=_prmtk_research_value`;
    const r = await dataverseFetch("GET", path);
    if (!r.ok) return false;
    const j = (await r.json()) as Record<string, unknown>;
    const rid = j["_prmtk_research_value"];
    return typeof rid === "string" && rid ? researchOwnedBySession(rid, session) : false;
  }
  if (entitySetLc === TableName.STATUSREPORT.toLowerCase()) {
    const path = `/prmtk_statusreports(${id})?$select=_prmtk_research_value`;
    const r = await dataverseFetch("GET", path);
    if (!r.ok) return false;
    const j = (await r.json()) as Record<string, unknown>;
    const rid = j["_prmtk_research_value"];
    return typeof rid === "string" && rid ? researchOwnedBySession(rid, session) : false;
  }
  if (entitySetLc === TableName.DISSEMINATIONAPPLICANTS.toLowerCase()) {
    const path = `/prmtk_disseminationapplicants(${id})?$select=_prmtk_research_value`;
    const r = await dataverseFetch("GET", path);
    if (!r.ok) return false;
    const j = (await r.json()) as Record<string, unknown>;
    const rid = j["_prmtk_research_value"];
    return typeof rid === "string" && rid ? researchOwnedBySession(rid, session) : false;
  }
  if (entitySetLc === TableName.DISSEMINATIONACTIVITIES.toLowerCase()) {
    const path = `/prmkt_disseminationactivities(${id})?$select=_prmkt_research_value`;
    const r = await dataverseFetch("GET", path);
    if (!r.ok) return false;
    const j = (await r.json()) as Record<string, unknown>;
    const rid = j["_prmkt_research_value"];
    return typeof rid === "string" && rid ? researchOwnedBySession(rid, session) : false;
  }
  if (entitySetLc === TableName.DELIVERABLES.toLowerCase()) {
    const path = `/prmtk_deliverables(${id})?$select=_prmtk_research_value`;
    const r = await dataverseFetch("GET", path);
    if (!r.ok) return false;
    const j = (await r.json()) as Record<string, unknown>;
    const rid = j["_prmtk_research_value"];
    return typeof rid === "string" && rid ? researchOwnedBySession(rid, session) : false;
  }
  if (entitySetLc === TableName.CASESHISTORY.toLowerCase()) {
    const path = `/prmtk_applicationcasehistories(${id})?$select=_prmtk_application_value`;
    const r = await dataverseFetch("GET", path);
    if (!r.ok) return false;
    const j = (await r.json()) as Record<string, unknown>;
    const aid = j["_prmtk_application_value"];
    return typeof aid === "string" && aid ? applicationOwnedBySession(aid, session) : false;
  }
  if (entitySetLc === TableName.WORKFORCEDEVELOPMENTS.toLowerCase()) {
    const path = `/prmkt_workforcedevelopments(${id})?$select=_prmkt_research_value`;
    const r = await dataverseFetch("GET", path);
    if (!r.ok) return false;
    const j = (await r.json()) as Record<string, unknown>;
    const rid = j["_prmkt_research_value"];
    return typeof rid === "string" && rid ? researchOwnedBySession(rid, session) : false;
  }
  if (entitySetLc === TableName.RESEARCHMANUSCRIPTSANDPUBLICATIONS.toLowerCase()) {
    const path = `/prmkt_researchmanuscriptsandpublications(${id})?$select=_prmkt_research_value`;
    const r = await dataverseFetch("GET", path);
    if (!r.ok) return false;
    const j = (await r.json()) as Record<string, unknown>;
    const rid = j["_prmkt_research_value"];
    return typeof rid === "string" && rid ? researchOwnedBySession(rid, session) : false;
  }
  if (entitySetLc === TableName.RESEARCHACTIVITIES.toLowerCase()) {
    const path = `/prmkt_researchactivities(${id})?$select=_prmkt_research_value`;
    const r = await dataverseFetch("GET", path);
    if (!r.ok) return false;
    const j = (await r.json()) as Record<string, unknown>;
    const rid = j["_prmkt_research_value"];
    return typeof rid === "string" && rid ? researchOwnedBySession(rid, session) : false;
  }

  void entitySet;
  return false;
}

export async function assertCanAccessPrivateRecord(
  entitySet: string,
  entitySetLc: string,
  recordId: string,
  session: SessionClaims,
): Promise<boolean> {
  if (SELECT_BY_ENTITY[entitySetLc]) {
    const rec = await loadRecordForOwnershipCheck(entitySet, entitySetLc, recordId);
    if (!rec) return false;
    return privateRecordAllowed(entitySetLc, session, rec);
  }
  return assertCanAccessComplexRecord(entitySet, entitySetLc, recordId, session);
}
