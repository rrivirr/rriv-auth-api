export const keycloakUrl = process.env.KEYCLOAK_URL;
export const keycloakRealm = process.env.KEYCLOAK_REALM;
export const keycloakIssuer = `${keycloakUrl}/realms/${keycloakRealm}`;
