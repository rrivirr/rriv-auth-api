import jwt from "jsonwebtoken";
import { getPublicKey } from "./keycloak/keycloak.js";
import config from "./get-config.js";

export const verifyJwtToken = async (token: string) => {
  const publicKey = await getPublicKey();
  const formattedPublicKey =
    "-----BEGIN PUBLIC KEY-----\n" +
    publicKey.match(/.{1,64}/g).join("\n") +
    "\n-----END PUBLIC KEY-----";

  const keycloakIssuer = `${config.KEYCLOAK_URL}/realms/${config.KEYCLOAK_REALM}`;

  return jwt.verify(token, formattedPublicKey, {
    algorithms: ["RS256"],
    issuer: keycloakIssuer,
  });
};
