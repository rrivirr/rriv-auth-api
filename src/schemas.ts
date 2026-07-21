import { z } from "zod";

export const tupleSchema = z.strictObject({
  user: z.string(),
  object: z.string(),
  relation: z.string(),
});

export const listObjectsSchema = z.strictObject({
  user: z.string(),
  relation: z.string(),
  type: z.string(),
});

export const listUsersSchema = z.strictObject({
  objectType: z.string(),
  relation: z.string(),
  id: z.uuid(),
  userType: z.string(),
});

export const writeRelationshipsSchema = z.strictObject({
  writes: z.array(tupleSchema),
  deletes: z.array(tupleSchema),
});

export const readSchema = z.strictObject({
  user: z.string().exactOptional(),
  object: z.string().exactOptional(),
  relation: z.string().exactOptional(),
});
