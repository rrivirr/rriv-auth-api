import { describe, expect, it } from "vitest";
import {
  listObjectsSchema,
  listUsersSchema,
  readResourceSchema,
  readSchema,
  tupleSchema,
  writeRelationshipsSchema,
} from "../src/schemas.js";

const tuple = { user: "user:u1", relation: "owner", object: "context:c1" };

describe("schemas", () => {
  it("tupleSchema requires user/relation/object and rejects extras", () => {
    expect(tupleSchema.safeParse(tuple).success).toBe(true);
    expect(tupleSchema.safeParse({ ...tuple, extra: 1 }).success).toBe(false);
    expect(tupleSchema.safeParse({ user: "u", relation: "r" }).success).toBe(
      false,
    );
  });

  it("writeRelationshipsSchema requires both arrays", () => {
    expect(
      writeRelationshipsSchema.safeParse({ writes: [], deletes: [] }).success,
    ).toBe(true);
    expect(
      writeRelationshipsSchema.safeParse({ writes: [tuple], deletes: [] })
        .success,
    ).toBe(true);
    expect(writeRelationshipsSchema.safeParse({ writes: [] }).success).toBe(
      false,
    );
  });

  it("listObjectsSchema validates its shape", () => {
    expect(
      listObjectsSchema.safeParse({
        user: "user:u1",
        relation: "can_edit",
        type: "context",
      }).success,
    ).toBe(true);
    expect(listObjectsSchema.safeParse({ user: "u" }).success).toBe(false);
  });

  it("listUsersSchema requires a UUID id", () => {
    const base = {
      objectType: "context",
      relation: "editor",
      userType: "user",
    };
    expect(
      listUsersSchema.safeParse({ ...base, id: crypto.randomUUID() }).success,
    ).toBe(true);
    expect(listUsersSchema.safeParse({ ...base, id: "not-a-uuid" }).success).toBe(
      false,
    );
  });

  it("readSchema allows omitted filters but not explicit undefined", () => {
    expect(readSchema.safeParse({}).success).toBe(true);
    expect(readSchema.safeParse({ object: "context:c1" }).success).toBe(true);
    expect(readSchema.safeParse({ user: undefined }).success).toBe(false);
  });

  it("readResourceSchema accepts non-UUID resource ids", () => {
    expect(
      readResourceSchema.safeParse({ type: "system", id: "rriv" }).success,
    ).toBe(true);
  });
});
