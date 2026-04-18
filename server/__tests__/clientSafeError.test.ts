import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  clientErrorJson,
  isProductionNodeEnv,
} from "../security/clientSafeError";

describe("clientSafeError", () => {
  const prev = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = prev;
  });

  it("hides details in production", () => {
    process.env.NODE_ENV = "production";
    expect(isProductionNodeEnv()).toBe(true);
    expect(clientErrorJson("Proxy error", new Error("secret"))).toEqual({
      error: "Proxy error",
    });
  });

  it("includes details outside production", () => {
    process.env.NODE_ENV = "development";
    const j = clientErrorJson("Proxy error", new Error("x"), { target: "/t" });
    expect(j.error).toBe("Proxy error");
    expect(j.details).toBe("x");
    expect(j.target).toBe("/t");
  });
});
