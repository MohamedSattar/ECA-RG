import { describe, it, expect } from "vitest";
import { isDataverseGuid } from "../auth/guid";

describe("isDataverseGuid", () => {
  it("accepts standard and braced guids", () => {
    expect(isDataverseGuid("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")).toBe(true);
    expect(isDataverseGuid("{a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11}")).toBe(
      true,
    );
  });

  it("rejects injection-like strings", () => {
    expect(isDataverseGuid("x or 1 eq 1")).toBe(false);
    expect(isDataverseGuid("'; drop table--")).toBe(false);
  });
});
