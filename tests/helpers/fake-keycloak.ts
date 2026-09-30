/**
 * In-process fake Keycloak: serves the realm public key and signs real RS256
 * tokens, so `jsonwebtoken.verify` in `src/infra/jwt.ts` accepts them.
 */
import express from "express";

const toBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");
const toBase64Url = (bytes: Uint8Array) =>
  Buffer.from(bytes).toString("base64url");

export interface FakeKeycloak {
  issueToken: (claims: Record<string, unknown>) => Promise<string>;
  publicKeyB64: string;
  stop: () => Promise<void>;
}

export const startFakeKeycloak = async (
  port: number,
): Promise<FakeKeycloak> => {
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

  const publicKeyB64 = toBase64(
    new Uint8Array(await crypto.subtle.exportKey("spki", keyPair.publicKey)),
  );

  const keycloakUrl = process.env.KEYCLOAK_URL!;
  const realm = process.env.KEYCLOAK_REALM!;
  const issuer = `${keycloakUrl}/realms/${realm}`;

  const issueToken = async (
    claims: Record<string, unknown>,
  ): Promise<string> => {
    const now = Math.floor(Date.now() / 1000);
    const header = toBase64Url(
      new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })),
    );
    const payload = toBase64Url(
      new TextEncoder().encode(
        JSON.stringify({ iat: now, exp: now + 3600, iss: issuer, ...claims }),
      ),
    );
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      keyPair.privateKey,
      new TextEncoder().encode(`${header}.${payload}`),
    );
    return `${header}.${payload}.${toBase64Url(new Uint8Array(signature))}`;
  };

  const app = express();
  app.get(`/realms/${realm}`, (_req, res) => {
    res.json({ realm, public_key: publicKeyB64 });
  });

  const server = app.listen(port);
  await new Promise<void>((resolve) => server.once("listening", resolve));

  return {
    issueToken,
    publicKeyB64,
    stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};
