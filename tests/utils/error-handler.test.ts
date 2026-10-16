import { describe, expect, it } from "vitest";
import { z } from "zod";
import errorHandler from "../../src/utils/error-handler.js";
import { HttpException } from "../../src/utils/http-exception.js";

interface FakeResponse {
  statusCode: number;
  body: unknown;
  status: (code: number) => FakeResponse;
  send: (payload: unknown) => FakeResponse;
}

const makeRes = (): FakeResponse => ({
  statusCode: 0,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  send(payload) {
    this.body = payload;
    return this;
  },
});

const invoke = (error: unknown): FakeResponse => {
  const res = makeRes();
  errorHandler(error, {} as never, res as never, (() => {}) as never);
  return res;
};

describe("errorHandler", () => {
  it("maps HttpException(400) to its message", () => {
    const res = invoke(new HttpException(400, "bad request"));
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ code: 400, message: "bad request" });
  });

  it("hides HttpException(500) messages", () => {
    const res = invoke(new HttpException(500, "secret detail"));
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ code: 500, message: "Internal Server Error" });
  });

  it("maps ZodError to 422 with field messages", () => {
    const error = z.object({ name: z.string() }).safeParse({}).error!;
    const res = invoke(error);
    expect(res.statusCode).toBe(422);
    expect(res.body).toMatchObject({ code: 422 });
    expect(String((res.body as { message: unknown }).message)).toContain(
      "field:",
    );
  });

  it("passes token errors from the verifier through as 401 / 503", () => {
    const invalid = invoke(new HttpException(401, "invalid access token"));
    expect(invalid.statusCode).toBe(401);
    expect(invalid.body).toEqual({ code: 401, message: "invalid access token" });

    const unavailable = invoke(
      new HttpException(503, "authentication service unavailable"),
    );
    expect(unavailable.statusCode).toBe(503);
    expect(unavailable.body).toEqual({
      code: 503,
      message: "authentication service unavailable",
    });
  });

  it("maps unknown errors to 500", () => {
    const res = invoke(new Error("boom"));
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ code: 500, message: "Internal Server Error" });
  });
});
