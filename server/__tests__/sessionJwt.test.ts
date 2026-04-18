import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-session-secret-must-be-at-least-32-chars";
});

describe("sessionJwt", () => {
  it("round-trips sign and verify", async () => {
    const { signSessionToken, verifySessionToken } = await import("../auth/sessionJwt");
    const jwt = await signSessionToken({ sub: "user-1", email: "u@example.com" });
    const v = await verifySessionToken(jwt);
    expect(v.sub).toBe("user-1");
    expect(v.email).toBe("u@example.com");
  });

  it("rejects garbage token", async () => {
    const { verifySessionToken } = await import("../auth/sessionJwt");
    await expect(verifySessionToken("not.a.jwt")).rejects.toThrow();
  });
});

describe("requireUser", () => {
  it("sets req.user when Bearer session JWT is valid", async () => {
    process.env.SESSION_SECRET = "test-session-secret-must-be-at-least-32-chars";
    const { signSessionToken } = await import("../auth/sessionJwt");
    const { requireUser } = await import("../middleware/requireUser");

    const jwt = await signSessionToken({ sub: "sub-99", email: "e@x.com" });

    const req = {
      method: "GET",
      headers: { authorization: `Bearer ${jwt}` },
    } as import("express").Request;

    let nextCalled = false;
    const res = {
      status() {
        return this;
      },
      json() {
        return this;
      },
    } as unknown as import("express").Response;

    await requireUser(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(req.user?.sub).toBe("sub-99");
    expect(req.user?.email).toBe("e@x.com");
  });

  it("returns 401 when Authorization missing", async () => {
    const { requireUser } = await import("../middleware/requireUser");
    const req = { method: "GET", headers: {} } as import("express").Request;
    let statusCode = 0;
    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json() {
        return this;
      },
    } as unknown as import("express").Response;

    await requireUser(req, res, () => {});
    expect(statusCode).toBe(401);
  });
});
