import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import logger from "../winston.js";
import { HttpException } from "./http-exception.js";

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
  } else {
    errorLogger.error(err);

    res.status(500).send({
      code: 500,
      message: `Internal Server Error`,
    });
  }
};
