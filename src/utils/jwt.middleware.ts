import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { HttpException } from "./http-exception.ts";
import { verifyJwtToken } from "../infra/jwt.ts";

export const jwtMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const authorization = req.headers["authorization"];
  if (!authorization) {
    throw new HttpException(401, "invalid access token");
  }
  const jwtToken = authorization.replace("Bearer ", "");
  const decoded = await verifyJwtToken(jwtToken);
  if (typeof decoded === "string") {
    throw new HttpException(401, "invalid access token");
  }

  const idSchema = z.object({ id: z.uuid() }).strict();
  const { success, data } = idSchema.safeParse({ id: decoded.sub });

  if (!success) {
    throw new HttpException(401, "invalid access token");
  }

  const accountId = data.id;
  req.accountId = accountId;
  next();
};
