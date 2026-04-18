import { describe, it, expect } from "vitest";
import { isAuthenticatedDataverseProxyPathAllowed } from "../auth/dataverseEntityAllowlist";

describe("dataverseEntityAllowlist", () => {
  it("allows known entity sets and $metadata", () => {
    expect(
      isAuthenticatedDataverseProxyPathAllowed("/_api/prmtk_applications"),
    ).toBe(true);
    expect(
      isAuthenticatedDataverseProxyPathAllowed(
        "/_api/contacts(guid)?$select=*",
      ),
    ).toBe(true);
    expect(isAuthenticatedDataverseProxyPathAllowed("/_api/$metadata")).toBe(
      true,
    );
  });

  it("rejects unknown entity sets", () => {
    expect(isAuthenticatedDataverseProxyPathAllowed("/_api/systemusers")).toBe(
      false,
    );
    expect(isAuthenticatedDataverseProxyPathAllowed("/_api/whoami")).toBe(
      false,
    );
  });

  it("allows only tokenhtml under _layout", () => {
    expect(isAuthenticatedDataverseProxyPathAllowed("/_layout/tokenhtml")).toBe(
      true,
    );
    expect(isAuthenticatedDataverseProxyPathAllowed("/_layout/other")).toBe(
      false,
    );
  });
});
