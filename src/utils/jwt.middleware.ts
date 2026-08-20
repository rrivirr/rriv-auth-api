import type { NextFunction, Request, Response } from "express";
import { HttpException } from "./http-exception.js";
import { verifyJwtToken } from "../infra/jwt.js";

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

  if (!["auth-api", "account"].includes(decoded.azp)) {
    throw new HttpException(401, "invalid access token");
  }

  next();
};
