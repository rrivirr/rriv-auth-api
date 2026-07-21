import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";
import logger from "../winston.ts";
import { HttpException } from "./http-exception.ts";

export default (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const errorLogger = logger.child({ source: "errorHandler" });
  if (err instanceof HttpException) {
    if (err.code === 500) {
      errorLogger.error(err.message);
      res.status(err.code).send({
        code: err.code,
        message: "Internal Server Error",
      });
    } else {
      res.status(err.code).send({
        code: err.code,
        message: err.message,
      });
    }
  } else if (err instanceof ZodError) {
    res.status(422).send({
      code: 422,
      message: err.issues.map(
        ({ path, message }) => `field: ${path}, error: ${message}`,
      ),
    });
  } else if (
    err instanceof jwt.JsonWebTokenError ||
    err instanceof jwt.NotBeforeError ||
    err instanceof jwt.TokenExpiredError
  ) {
    errorLogger.warn(err);

    res.status(401).send({
      code: 401,
      message: "invalid access token",
    });
  } else {
    errorLogger.error(err);

    res.status(500).send({
      code: 500,
      message: `Internal Server Error`,
    });
  }
};
