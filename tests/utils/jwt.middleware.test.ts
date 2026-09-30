import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { jwtMiddleware } from "../../src/utils/jwt.middleware.js";
import {
  startFakeKeycloak,
  type FakeKeycloak,
} from "../helpers/fake-keycloak.js";

let keycloak: FakeKeycloak;

beforeAll(async () => {
  keycloak = await startFakeKeycloak(
    Number(new URL(process.env.KEYCLOAK_URL!).port),
  );
});

afterAll(async () => {
  await keycloak.stop();
});

const run = async (authorization?: string) => {
  const req = { headers: authorization ? { authorization } : {} };
  const next = vi.fn();
  await jwtMiddleware(req as never, {} as never, next);
  return next;
};

describe("jwtMiddleware", () => {
  it("accepts every allowed azp", async () => {
    for (const azp of ["auth-api", "rrivctl", "rriv-web"]) {
      const token = await keycloak.issueToken({ azp, sub: "u1" });
      const next = await run(`Bearer ${token}`);
      expect(next).toHaveBeenCalledOnce();
    }
  });

  it("rejects a disallowed azp with 401", async () => {
    const token = await keycloak.issueToken({ azp: "other-client", sub: "u1" });
    await expect(run(`Bearer ${token}`)).rejects.toMatchObject({ code: 401 });
  });

  it("rejects a missing token with 401", async () => {
    await expect(run()).rejects.toMatchObject({ code: 401 });
  });

  it("rejects a malformed token", async () => {
    await expect(run("Bearer not-a-jwt")).rejects.toThrow();
  });
});
