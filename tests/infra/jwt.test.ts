import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
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

afterEach(() => {
  vi.useRealTimers();
});

/** `verifyJwtToken` from a fresh copy of the module, so its key cache starts empty. */
const freshVerify = async () => {
  vi.resetModules();
  return (await import("../../src/infra/jwt.js")).verifyJwtToken;
};

describe("verifyJwtToken", () => {
  it("accepts a valid token and returns its claims", async () => {
    const token = await keycloak.issueToken({ azp: "rriv-web", sub: "u1" });
    await expect((await freshVerify())(token)).resolves.toMatchObject({
      azp: "rriv-web",
      sub: "u1",
    });
  });

  it("caches keys: many verifications, one JWKS fetch", async () => {
    const verify = await freshVerify();
    const before = keycloak.jwksRequests();
    const token = await keycloak.issueToken({ sub: "u1" });
    for (let i = 0; i < 5; i++) await verify(token);
    expect(keycloak.jwksRequests() - before).toBe(1);
  });

  it("rejects an expired token with 401", async () => {
    const token = await keycloak.issueToken({ sub: "u1" }, { expiresIn: -60 });
    await expect((await freshVerify())(token)).rejects.toMatchObject({ code: 401 });
  });

  it("rejects a token from another issuer with 401", async () => {
    const token = await keycloak.issueToken(
      { sub: "u1" },
      { issuer: "https://evil.example/realms/test" },
    );
    await expect((await freshVerify())(token)).rejects.toMatchObject({ code: 401 });
  });

  it("rejects a tampered or malformed token with 401", async () => {
    const token = await keycloak.issueToken({ sub: "u1" });
    const [header, , signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ sub: "admin", iss: keycloak.issuer, exp: 9e9 }),
    ).toString("base64url");
    await expect((await freshVerify())(`${header}.${forged}.${signature}`)).rejects.toMatchObject({
      code: 401,
    });
    await expect((await freshVerify())("not-a-jwt")).rejects.toMatchObject({ code: 401 });
  });

  it("follows key rotation: new kid refetched, old key still accepted", async () => {
    const verify = await freshVerify();
    const oldToken = await keycloak.issueToken({ sub: "u1" });
    await verify(oldToken); // caches the current JWKS

    await keycloak.rotate();
    // Past jose's default 30 s cooldown between refetches.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 31_000);
    const newToken = await keycloak.issueToken({ sub: "u1" });
    await expect(verify(newToken)).resolves.toMatchObject({ sub: "u1" });
    await expect(verify(oldToken)).resolves.toMatchObject({ sub: "u1" });
  });

  it("keeps verifying with cached keys while Keycloak is down", async () => {
    const verify = await freshVerify();
    const token = await keycloak.issueToken({ sub: "u1" });
    await verify(token);
    keycloak.setUnavailable(true);
    try {
      await expect(verify(token)).resolves.toMatchObject({ sub: "u1" });
    } finally {
      keycloak.setUnavailable(false);
    }
  });

  it("returns 503 when the keys can't be fetched at all", async () => {
    const token = await keycloak.issueToken({ sub: "u1" });
    keycloak.setUnavailable(true);
    try {
      await expect((await freshVerify())(token)).rejects.toMatchObject({ code: 503 });
    } finally {
      keycloak.setUnavailable(false);
    }
  });
});
