import { dataverseFetch } from "../dataverseClient";
import { buildMergedScopeFilter } from "./dataverseScopeMergeRules";

function normalizeGuid(g: string): string {
  return g.replace(/[{}]/g, "").toLowerCase();
}

/**
 * prmtk_budgetspend has no stable single-valued nav name for spend→line item→header in $filter
 * (prmtk_BudgetLineItem / prmtk_lineitem both fail). Scope spends by resolving allowed
 * prmtk_budgetlineitemid values using the same rule as prmtk_budgetlineitems, then ANDing
 * `_prmtk_lineitem_value eq …` (matches server/routes/budget.ts and FormResearch.tsx).
 */
export function buildSpendFilterFromLineItemIds(ids: string[]): string {
  if (ids.length === 0) return "(1 eq 0)";
  if (ids.length === 1) return `_prmtk_lineitem_value eq ${ids[0]}`;
  const clauses = ids.map((id) => `_prmtk_lineitem_value eq ${id}`);
  return `(${clauses.join(" or ")})`;
}

async function fetchAllBudgetLineItemIdsForFilter(lineItemsFilter: string): Promise<string[]> {
  const ids = new Set<string>();
  const filterEnc = encodeURIComponent(lineItemsFilter);
  let path: string | null = `/prmtk_budgetlineitems?$select=prmtk_budgetlineitemid&$filter=${filterEnc}`;

  while (path) {
    const r = await dataverseFetch("GET", path);
    if (!r.ok) {
      return [];
    }
    const j = (await r.json()) as {
      value?: { prmtk_budgetlineitemid?: string }[];
      "@odata.nextLink"?: string;
      "odata.nextLink"?: string;
    };
    for (const row of j.value ?? []) {
      const id = row.prmtk_budgetlineitemid;
      if (typeof id === "string") ids.add(normalizeGuid(id));
    }
    const next = j["@odata.nextLink"] ?? j["odata.nextLink"];
    path = typeof next === "string" && next.length > 0 ? next : null;
  }
  return [...ids];
}

export async function buildMergedScopeFilterForBudgetSpends(
  contactId: string,
): Promise<string> {
  const lineFilter = buildMergedScopeFilter("prmtk_budgetlineitems", contactId);
  if (!lineFilter) {
    return "(1 eq 0)";
  }
  const ids = await fetchAllBudgetLineItemIdsForFilter(lineFilter);
  return buildSpendFilterFromLineItemIds(ids);
}
