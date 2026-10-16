/**
 * In-process fake Keycloak: publishes a JWKS and signs real RS256 tokens with a
 * `kid`, so the JWKS verifier in `src/infra/jwt.ts` accepts them. Supports key
 * rotation and simulating an outage of the JWKS endpoint.
 */
import express from "express";
import type { JWK } from "jose";

const toBase64Url = (bytes: Uint8Array) =>
  Buffer.from(bytes).toString("base64url");

interface SigningKey {
  kid: string;
  privateKey: CryptoKey;
  jwk: JWK & { kid: string; alg: string; use: string };
}

export interface FakeKeycloak {
  issuer: string;
  /** Sign a token with the current key (or the given one). */
  issueToken: (
    claims: Record<string, unknown>,
    options?: { kid?: string; issuer?: string; expiresIn?: number },
  ) => Promise<string>;
  /** Add a new current signing key; `retireOld` drops the others from the JWKS. */
  rotate: (options?: { retireOld?: boolean }) => Promise<string>;
  /** Make the JWKS endpoint fail (true) or recover (false). */
  setUnavailable: (unavailable: boolean) => void;
  /** Number of JWKS requests served so far. */
  jwksRequests: () => number;
  stop: () => Promise<void>;
}

const generateSigningKey = async (kid: string): Promise<SigningKey> => {
  const keyPair = (await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  )) as { publicKey: CryptoKey; privateKey: CryptoKey };
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  return {
    kid,
    privateKey: keyPair.privateKey,
    jwk: { ...(publicJwk as JWK), kid, alg: "RS256", use: "sig" },
  };
};

export const startFakeKeycloak = async (
  port: number,
): Promise<FakeKeycloak> => {
  const keycloakUrl = process.env.KEYCLOAK_URL!;
  const realm = process.env.KEYCLOAK_REALM!;
  const issuer = `${keycloakUrl}/realms/${realm}`;

  let keyCounter = 0;
  let keys: SigningKey[] = [await generateSigningKey(`key-${++keyCounter}`)];
  let unavailable = false;
  let requests = 0;

  const issueToken: FakeKeycloak["issueToken"] = async (claims, options = {}) => {
    const key = options.kid
      ? keys.find((candidate) => candidate.kid === options.kid)!
      : keys[keys.length - 1]!;
    const now = Math.floor(Date.now() / 1000);
    const header = toBase64Url(
      new TextEncoder().encode(
        JSON.stringify({ alg: "RS256", typ: "JWT", kid: key.kid }),
      ),
    );
    const payload = toBase64Url(
      new TextEncoder().encode(
        JSON.stringify({
          iat: now,
          exp: now + (options.expiresIn ?? 3600),
          iss: options.issuer ?? issuer,
          ...claims,
        }),
      ),
    );
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key.privateKey,
      new TextEncoder().encode(`${header}.${payload}`),
    );
    return `${header}.${payload}.${toBase64Url(new Uint8Array(signature))}`;
  };

  const app = express();
  app.get(`/realms/${realm}/protocol/openid-connect/certs`, (_req, res) => {
    requests++;
    if (unavailable) {
      res.status(503).json({ error: "unavailable" });
      return;
    }
    res.json({ keys: keys.map((key) => key.jwk) });
  });

  const server = app.listen(port);
  await new Promise<void>((resolve) => server.once("listening", resolve));

  return {
    issuer,
    issueToken,
    rotate: async ({ retireOld = false } = {}) => {
      const key = await generateSigningKey(`key-${++keyCounter}`);
      keys = retireOld ? [key] : [...keys, key];
      return key.kid;
    },
    setUnavailable: (value) => {
      unavailable = value;
    },
    jwksRequests: () => requests,
    stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};
