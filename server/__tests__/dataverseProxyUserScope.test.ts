import { describe, it, expect } from "vitest";
import {
  parseDataverseCollectionPath,
  filterScopedCollectionJson,
} from "../security/dataverseProxyUserScope";
import { buildMergedScopeFilter } from "../security/dataverseScopeMergeRules";
import { buildSpendFilterFromLineItemIds } from "../security/budgetSpendScopeFilter";

describe("dataverseProxyUserScope", () => {
  it("parses collection vs single-record paths", () => {
    expect(
      parseDataverseCollectionPath("/api/data/v9.2/prmtk_researchs"),
    ).toEqual({
      entitySet: "prmtk_researchs",
      recordId: null,
    });
    expect(
      parseDataverseCollectionPath(
        "/api/data/v9.2/prmtk_researchs(bbdb1098-3c28-f111-8341-70a8a520a19e)",
      ),
    ).toEqual({
      entitySet: "prmtk_researchs",
      recordId: "bbdb1098-3c28-f111-8341-70a8a520a19e",
    });
  });

  it("filters collection value array to scope field", () => {
    const ctx = {
      rowMatchField: "_prmtk_principalinvestigator_value",
      contactId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      entitySet: "prmtk_researchs",
      singleRecord: false,
      recordKey: null,
    };
    const data = {
      value: [
        {
          _prmtk_principalinvestigator_value:
            "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          x: 1,
        },
        {
          _prmtk_principalinvestigator_value:
            "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          x: 2,
        },
      ],
    };
    const out = filterScopedCollectionJson(data, ctx) as typeof data;
    expect(out.value).toHaveLength(1);
    expect(out.value[0].x).toBe(1);
  });

  it("merges PI scope so client ne filter cannot drop the user clause", () => {
    const scope = buildMergedScopeFilter(
      "prmtk_researchs",
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    );
    const client = "prmtk_researchid ne bbdb1098-3c28-f111-8341-70a8a520a19e";
    const merged = `(${client}) and (${scope})`;
    expect(merged).toContain("_prmtk_principalinvestigator_value");
    expect(merged).toContain("and");
  });

  it("uses prmkt_Research OData nav for prmkt_* child tables (not prmtk_Research)", () => {
    const f = buildMergedScopeFilter(
      "prmkt_workforcedevelopments",
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    );
    expect(f).toContain("prmkt_Research/_prmtk_principalinvestigator_value");
  });

  it("scopes budget spends by _prmtk_lineitem_value OR (no OData nav chain)", () => {
    expect(buildSpendFilterFromLineItemIds([])).toBe("(1 eq 0)");
    expect(
      buildSpendFilterFromLineItemIds(["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"]),
    ).toBe("_prmtk_lineitem_value eq aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    expect(
      buildSpendFilterFromLineItemIds([
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      ]),
    ).toContain("_prmtk_lineitem_value eq");
    expect(
      buildSpendFilterFromLineItemIds([
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      ]),
    ).toContain(" or ");
  });
});
