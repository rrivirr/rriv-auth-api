import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  check: vi.fn(),
  write: vi.fn(),
  listObjects: vi.fn(),
  listUsers: vi.fn(),
  read: vi.fn(),
}));

vi.mock("../src/infra/openfga/openfga.js", () => ({ default: mocks }));

import {
  check,
  listObjects,
  listUsers,
  read,
  readResource,
  writeRelationships,
} from "../src/handler.js";

interface FakeRes {
  json: ReturnType<typeof vi.fn>;
}
type Handler = (req: unknown, res: unknown) => Promise<unknown>;

const makeRes = (): FakeRes => ({ json: vi.fn() });
// Express's RequestHandler declares three params; call with two and cast.
const invoke = (handler: unknown, body: unknown, res: FakeRes) =>
  (handler as Handler)({ body }, res);

const contextId = "11111111-1111-4111-8111-111111111111";

describe("handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("check returns the SDK result", async () => {
    mocks.check.mockResolvedValue({ allowed: true });
    const res = makeRes();

    await invoke(
      check,
      { user: "user:u1", relation: "admin", object: "system:rriv" },
      res,
    );

    expect(mocks.check).toHaveBeenCalledWith({
      user: "user:u1",
      relation: "admin",
      object: "system:rriv",
    });
    expect(res.json).toHaveBeenCalledWith({ allowed: true });
  });

  it("writeRelationships ignores duplicate writes / missing deletes", async () => {
    mocks.write.mockResolvedValue(undefined);
    const res = makeRes();

    await invoke(
      writeRelationships,
      {
        writes: [{ user: "user:u1", relation: "owner", object: "context:c1" }],
        deletes: [],
      },
      res,
    );

    expect(mocks.write).toHaveBeenCalledTimes(1);
    const options = mocks.write.mock.calls[0]![1] as {
      conflict?: unknown;
    };
    expect(options.conflict).toBeDefined();
    expect(res.json).toHaveBeenCalledWith({ message: "successful" });
  });

  it("listObjects returns the object list", async () => {
    mocks.listObjects.mockResolvedValue({ objects: ["context:c1"] });
    const res = makeRes();

    await invoke(
      listObjects,
      { user: "user:u1", relation: "can_edit", type: "context" },
      res,
    );

    expect(res.json).toHaveBeenCalledWith({ objects: ["context:c1"] });
  });

  it("listUsers maps to the SDK request shape", async () => {
    mocks.listUsers.mockResolvedValue({
      users: [{ object: { type: "user", id: "u1" } }],
    });
    const res = makeRes();

    await invoke(
      listUsers,
      {
        objectType: "context",
        relation: "editor",
        id: contextId,
        userType: "user",
      },
      res,
    );

    expect(mocks.listUsers).toHaveBeenCalledWith({
      object: { type: "context", id: contextId },
      relation: "editor",
      user_filters: [{ type: "user" }],
    });
    expect(res.json).toHaveBeenCalledWith({
      users: [{ object: { type: "user", id: "u1" } }],
    });
  });

  it("read returns tuples", async () => {
    const tuples = [
      { key: { user: "user:u1", relation: "owner", object: "context:c1" } },
    ];
    mocks.read.mockResolvedValue({ tuples });
    const res = makeRes();

    await invoke(read, { object: "context:c1" }, res);

    expect(res.json).toHaveBeenCalledWith({ tuples });
  });

  it("readResource merges user+object tuples and dedupes", async () => {
    const binding = {
      key: { user: "context:c1", relation: "context", object: "device:d1" },
    };
    const owner = {
      key: { user: "user:u1", relation: "owner", object: "context:c1" },
    };
    mocks.read.mockImplementation(async (query: { user?: string }) =>
      query.user ? { tuples: [binding] } : { tuples: [owner, binding] },
    );
    const res = makeRes();

    await invoke(readResource, { type: "context", id: "c1" }, res);

    expect(mocks.read).toHaveBeenCalledWith({
      user: "context:c1",
      object: "device:",
    });
    expect(mocks.read).toHaveBeenCalledWith({ object: "context:c1" });
    for (const call of mocks.read.mock.calls) {
      expect(call[0]).toHaveProperty("object");
    }

    const payload = res.json.mock.calls[0]![0] as { tuples: unknown[] };
    expect(payload.tuples).toHaveLength(2);
    expect(payload.tuples).toContainEqual({
      user: "user:u1",
      relation: "owner",
      object: "context:c1",
    });
    expect(payload.tuples).toContainEqual({
      user: "context:c1",
      relation: "context",
      object: "device:d1",
    });
  });

  it("readResource references an account as user:<id>", async () => {
    mocks.read.mockResolvedValue({ tuples: [] });
    const res = makeRes();

    await invoke(readResource, { type: "account", id: contextId }, res);

    expect(mocks.read).toHaveBeenCalledWith({
      user: `user:${contextId}`,
      object: "device:",
    });
    expect(mocks.read).toHaveBeenCalledWith({ object: `user:${contextId}` });
    expect(res.json).toHaveBeenCalledWith({ tuples: [] });
  });
});
