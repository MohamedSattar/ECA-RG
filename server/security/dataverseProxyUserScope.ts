import type { Request } from "express";
import { getContactIdByEmail } from "../budgetOwnership";
import { buildMergedScopeFilterForBudgetSpends } from "./budgetSpendScopeFilter";
import {
  buildMergedScopeFilter,
  isProxyScopeMergedEntity,
  rowMatchFieldForEntity,
} from "./dataverseScopeMergeRules";

/**
 * Entity sets where the proxy must AND the user's Contact GUID into $filter (GET/HEAD collection),
 * and validate single-record GET responses. Prevents broad OData (e.g. `ne`) from returning other users' rows
 * when Dataverse is called with the integration account.
 *
 * Disable with PROXY_ENFORCE_USER_ROW_SCOPE=false (emergency only — opens unscoped integration access).
 */

export function isUserRowScopeEnforced(): boolean {
  return process.env.PROXY_ENFORCE_USER_ROW_SCOPE !== "false";
}

function normalizeGuid(g: string): string {
  return g.replace(/[{}]/g, "").toLowerCase();
}

/** Parse /api/data/v9.2/entityset or /api/data/v9.2/entityset(guid) */
export function parseDataverseCollectionPath(pathname: string): {
  entitySet: string;
  recordId: string | null;
} | null {
  const m = pathname.match(/^\/api\/data\/v9\.2\/([^/?(]+)(?:\(([^)]+)\))?$/i);
  if (!m) return null;
  const entitySet = m[1].toLowerCase();
  const rawId = m[2]?.trim();
  const recordId = rawId ? normalizeGuid(rawId) : null;
  return { entitySet, recordId };
}

export interface ProxyScopeContext {
  contactId: string;
  entitySet: string;
  singleRecord: boolean;
  recordKey: string | null;
  /** When set, collection `value` rows are filtered to this lookup / id field. */
  rowMatchField?: string;
}

export async function prepareProxyUserScope(
  req: Request,
  fullUrl: URL,
): Promise<
  | { ok: true; scopeContext: ProxyScopeContext | null }
  | { ok: false; status: number; body: Record<string, unknown> }
> {
  const method = (req.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return { ok: true, scopeContext: null };
  }

  if (!isUserRowScopeEnforced()) {
    return { ok: true, scopeContext: null };
  }

  const parsed = parseDataverseCollectionPath(fullUrl.pathname);
  if (!parsed) {
    return { ok: true, scopeContext: null };
  }

  if (!isProxyScopeMergedEntity(parsed.entitySet)) {
    return { ok: true, scopeContext: null };
  }

  const email = req.user?.email?.trim();
  if (!email) {
    return {
      ok: false,
      status: 403,
      body: {
        error: "Forbidden",
        message:
          "Row-level access requires a verified email on the session. Sign in with an account that provides email, then POST /api/auth/session with the id_token. Public anonymous access is not allowed for this entity.",
      },
    };
  }

  const contactRow = await getContactIdByEmail(email);
  if (!contactRow) {
    return {
      ok: false,
      status: 403,
      body: {
        error: "Forbidden",
        message: "No Dataverse contact matches this account email.",
      },
    };
  }

  const contactId = normalizeGuid(contactRow);
  const scopeEq =
    parsed.entitySet === "prmtk_budgetspends"
      ? await buildMergedScopeFilterForBudgetSpends(contactId)
      : buildMergedScopeFilter(parsed.entitySet, contactId);
  if (!scopeEq) {
    return { ok: true, scopeContext: null };
  }

  const rowMatchField = rowMatchFieldForEntity(parsed.entitySet);

  const scopeBase: Omit<ProxyScopeContext, "singleRecord"> = {
    contactId,
    entitySet: parsed.entitySet,
    recordKey: parsed.recordId,
    ...(rowMatchField ? { rowMatchField } : {}),
  };

  if (!parsed.recordId) {
    const params = fullUrl.searchParams;
    const existing = params.get("$filter")?.trim() ?? "";
    const merged = existing ? `(${existing}) and (${scopeEq})` : scopeEq;
    params.set("$filter", merged);
    return {
      ok: true,
      scopeContext: { ...scopeBase, singleRecord: false },
    };
  }

  return {
    ok: true,
    scopeContext: { ...scopeBase, singleRecord: true },
  };
}

function rowMatchesScope(
  row: Record<string, unknown>,
  ctx: ProxyScopeContext,
): boolean {
  if (!ctx.rowMatchField) return true;
  const v = row[ctx.rowMatchField];
  if (typeof v !== "string") return false;
  return normalizeGuid(v) === ctx.contactId;
}

export function filterScopedCollectionJson(
  data: unknown,
  ctx: ProxyScopeContext,
): unknown {
  if (!ctx.rowMatchField) {
    return data;
  }
  if (
    !data ||
    typeof data !== "object" ||
    !Array.isArray((data as { value?: unknown }).value)
  ) {
    return data;
  }
  const d = data as { value: Record<string, unknown>[] };
  const filtered = d.value.filter((row) => rowMatchesScope(row, ctx));
  return { ...d, value: filtered };
}
