import { getDataverseEntitySetFromPath } from "./publicDataverse";

/**
 * Entity sets the SPA is allowed to reach via the authenticated Dataverse proxy.
 * Extend with env EXTRA_DATAVERSE_PROXY_ENTITY_SETS (comma-separated, lowercase).
 *
 * Row-level access still depends on Dynamics (RLS, ownership, plugins). Confirm with your
 * Dynamics team that data exposed through these sets matches product intent.
 */
const DEFAULT_AUTHENTICATED_ENTITY_SETS = [
  "prmtk_granttemplates",
  "prmtk_grantcycles",
  "prmtk_applications",
  "prmtk_researchareas",
  "contacts",
  "accounts",
  "prmtk_applicationteammembers",
  "prmtk_researchteammembers",
  "prmtk_researchs",
  "prmtk_budgetheaders",
  "prmtk_budgetlineitems",
  "prmtk_budgetspends",
  "prmtk_statusreports",
  "prmtk_disseminationapplicants",
  "prmkt_disseminationactivities",
  "prmtk_deliverables",
  "prmtk_applicationcasehistories",
  "prmtk_notifications",
  "prmkt_workforcedevelopments",
  "prmkt_researchmanuscriptsandpublications",
  "prmkt_researchactivities",
  "$metadata",
];

function extraEntitySetsFromEnv(): string[] {
  const raw = process.env.EXTRA_DATAVERSE_PROXY_ENTITY_SETS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

let cached: Set<string> | null = null;

export function getAuthenticatedProxyEntitySets(): Set<string> {
  if (cached) return cached;
  cached = new Set([
    ...DEFAULT_AUTHENTICATED_ENTITY_SETS.map((s) => s.toLowerCase()),
    ...extraEntitySetsFromEnv(),
  ]);
  return cached;
}

/** Allowed Power Pages layout paths (prefix match after normalizing). */
const LAYOUT_ALLOW_PREFIXES = ["/_layout/tokenhtml"];

export function isAuthenticatedDataverseProxyPathAllowed(
  path: string,
): boolean {
  const pathname = path.split("?")[0] || path;

  if (pathname.startsWith("/_api/")) {
    const entity = getDataverseEntitySetFromPath(pathname);
    if (!entity) return false;
    return getAuthenticatedProxyEntitySets().has(entity.toLowerCase());
  }

  if (pathname.startsWith("/_layout/")) {
    const lower = pathname.toLowerCase();
    return LAYOUT_ALLOW_PREFIXES.some(
      (p) => lower === p || lower.startsWith(`${p}/`),
    );
  }

  return false;
}
