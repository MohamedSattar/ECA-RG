/**
 * Unauthenticated GET access to specific Dataverse entity sets (read-only, via proxy).
 * Configure extra sets with PUBLIC_DATAVERSE_ENTITY_SETS (comma-separated logical names).
 *
 * User-scoped entity sets (see dataverseScopeMergeRules) are never public, even if listed in env.
 */

import { isProxyScopeMergedEntity } from "../security/dataverseScopeMergeRules";

const DEFAULT_PUBLIC_ENTITY_SETS = ["prmtk_granttemplates", "prmtk_grantcycles"];

export function getPublicDataverseEntitySets(): Set<string> {
  const fromEnv =
    process.env.PUBLIC_DATAVERSE_ENTITY_SETS?.split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean) ?? [];
  const merged = [...DEFAULT_PUBLIC_ENTITY_SETS.map((s) => s.toLowerCase()), ...fromEnv];
  return new Set(merged);
}

/** First path segment after /_api/ — e.g. prmtk_granttemplates from /_api/prmtk_granttemplates(...) */
export function getDataverseEntitySetFromPath(path: string): string | null {
  if (!path.startsWith("/_api/")) return null;
  const rest = path.slice("/_api/".length);
  const segment = rest.split(/[/?(]/)[0];
  return segment ? segment.toLowerCase() : null;
}

/** Allow anonymous GET/HEAD for public entity sets only (not /_layout). */
export function isPublicDataverseApiRead(req: { method?: string; path?: string }): boolean {
  const m = (req.method || "GET").toUpperCase();
  if (m !== "GET" && m !== "HEAD") return false;
  const entity = getDataverseEntitySetFromPath(req.path || "");
  if (!entity) return false;
  if (isProxyScopeMergedEntity(entity)) return false;
  return getPublicDataverseEntitySets().has(entity);
}
