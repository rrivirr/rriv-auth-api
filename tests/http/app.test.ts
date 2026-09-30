import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  check: vi.fn(),
  write: vi.fn(),
  listObjects: vi.fn(),
  listUsers: vi.fn(),
  read: vi.fn(),
}));

vi.mock("../../src/infra/openfga/openfga.js", () => ({ default: mocks }));

import app from "../../src/app.js";
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

const listen = () =>
  new Promise<{ url: string; close: () => Promise<void> }>((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise<void>((done) => server.close(() => done())),
      });
    });
  });

const checkBody = {
  user: "user:u1",
  relation: "admin",
  object: "system:rriv",
};

describe("app", () => {
  it("serves /version without auth", async () => {
    const server = await listen();
    try {
      const response = await fetch(`${server.url}/version`);
      expect(response.status).toBe(200);
    } finally {
      await server.close();
    }
  });

  it("rejects an unauthenticated request with 401", async () => {
    const server = await listen();
    try {
      const response = await fetch(`${server.url}/check`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(checkBody),
      });
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ code: 401 });
    } finally {
      await server.close();
    }
  });

  it("serves an authorized request", async () => {
    mocks.check.mockResolvedValue({ allowed: true });
    const token = await keycloak.issueToken({ azp: "rriv-web", sub: "u1" });
    const server = await listen();
    try {
      const response = await fetch(`${server.url}/check`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(checkBody),
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ allowed: true });
    } finally {
      await server.close();
    }
  });

  it("read-resource reads OpenFGA with an object type on every query", async () => {
    mocks.read.mockClear();
    mocks.read.mockResolvedValue({ tuples: [] });
    const token = await keycloak.issueToken({ azp: "auth-api", sub: "s1" });
    const server = await listen();
    try {
      const response = await fetch(`${server.url}/read-resource`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: "context", id: "c1" }),
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ tuples: [] });

      expect(mocks.read).toHaveBeenCalledWith({
        user: "context:c1",
        object: "device:",
      });
      for (const call of mocks.read.mock.calls) {
        expect(call[0]).toHaveProperty("object");
      }
    } finally {
      await server.close();
    }
  });
});
