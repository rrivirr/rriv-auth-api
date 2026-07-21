import type { RequestHandler } from "express";
import {
  WriteRequestWritesOnDuplicate,
  WriteRequestDeletesOnMissing,
} from "@openfga/sdk";
import openFga from "./infra/openfga/openfga.ts";
import {
  tupleSchema,
  writeRelationshipsSchema,
  listObjectsSchema,
  listUsersSchema,
  readSchema,
} from "./schemas.ts";

export const check: RequestHandler = async (req, res) => {
  const payload = tupleSchema.parse(req.body);
  const result = await openFga.check(payload);
  res.json({ allowed: result.allowed });
};

export const writeRelationships: RequestHandler = async (req, res) => {
  const payload = writeRelationshipsSchema.parse(req.body);
  await openFga.write(
    { ...payload },
    {
      conflict: {
        onDuplicateWrites: WriteRequestWritesOnDuplicate.Ignore,
        onMissingDeletes: WriteRequestDeletesOnMissing.Ignore,
      },
    },
  );
  res.json({ message: "successful" });
};

export const listObjects: RequestHandler = async (req, res) => {
  const payload = listObjectsSchema.parse(req.body);
  const result = await openFga.listObjects({ ...payload });
  res.json({ objects: result.objects });
};

export const listUsers: RequestHandler = async (req, res) => {
  const payload = listUsersSchema.parse(req.body);
  const { userType, id, objectType, relation } = payload;
  const result = await openFga.listUsers({
    object: { type: objectType, id },
    relation,
    user_filters: [{ type: userType }],
  });
  res.json({ users: result.users });
};

export const read: RequestHandler = async (req, res) => {
  const payload = readSchema.parse(req.body);
  const result = await openFga.read({ ...payload });
  res.json({ tuples: result.tuples });
};
