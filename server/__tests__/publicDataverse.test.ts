import { describe, it, expect } from "vitest";
import {
  getDataverseEntitySetFromPath,
  isPublicDataverseApiRead,
} from "../auth/publicDataverse";

describe("publicDataverse", () => {
  it("parses entity set from path", () => {
    expect(getDataverseEntitySetFromPath("/_api/prmtk_granttemplates")).toBe(
      "prmtk_granttemplates",
    );
    expect(
      getDataverseEntitySetFromPath("/_api/prmtk_granttemplates(guid-here)"),
    ).toBe("prmtk_granttemplates");
    expect(
      getDataverseEntitySetFromPath("/_api/prmtk_granttemplates?$filter=x eq 1"),
    ).toBe("prmtk_granttemplates");
  });

  it("allows public GET for default allowlisted set", () => {
    expect(
      isPublicDataverseApiRead({ method: "GET", path: "/_api/prmtk_granttemplates" }),
    ).toBe(true);
    expect(
      isPublicDataverseApiRead({ method: "POST", path: "/_api/prmtk_granttemplates" }),
    ).toBe(false);
    expect(
      isPublicDataverseApiRead({ method: "GET", path: "/_api/prmtk_contacts" }),
    ).toBe(false);
    expect(
      isPublicDataverseApiRead({ method: "GET", path: "/_api/prmtk_researchs" }),
    ).toBe(false);
    expect(
      isPublicDataverseApiRead({ method: "GET", path: "/_layout/tokenhtml" }),
    ).toBe(false);
  });
});
