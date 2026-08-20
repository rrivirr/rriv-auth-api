import dotenv from "dotenv";
import { z } from "zod";
import fs, { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

const readSchema = z.strictObject({
  NODE_PORT: z.coerce.number().optional(),
  LOG_LEVEL: z
    .enum(["error", "warn", "info", "http", "verbose", "debug", "silly"])
    .optional(),
  KEYCLOAK_URL: z.url(),
  KEYCLOAK_REALM: z.string(),
  OPENFGA_URL: z.url(),
  OPENFGA_STORE_ID: z.string(),
  OPENFGA_MODEL_ID: z.string(),
});

const getConfigValues = () => {
  const KEYCLOAK_URL = process.env.KEYCLOAK_URL;
  const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM;
  const NODE_PORT = process.env.NODE_PORT;
  const LOG_LEVEL = process.env.LOG_LEVEL;
  const OPENFGA_URL = process.env.OPENFGA_URL;
  const OPENFGA_STORE_ID = process.env.OPENFGA_STORE_ID;
  const OPENFGA_MODEL_ID = process.env.OPENFGA_MODEL_ID;

  const envConfig = {
    ...(KEYCLOAK_REALM && { KEYCLOAK_REALM }),
    ...(KEYCLOAK_URL && { KEYCLOAK_URL }),
    ...(NODE_PORT && { NODE_PORT }),
    ...(LOG_LEVEL && { LOG_LEVEL }),
    ...(OPENFGA_MODEL_ID && { OPENFGA_MODEL_ID }),
    ...(OPENFGA_STORE_ID && { OPENFGA_STORE_ID }),
    ...(OPENFGA_URL && { OPENFGA_URL }),
  };

  const dirPath = path.join(homedir(), ".auth-api");
  const localDirPath = `${path.join("./config")}`;

  if (!existsSync(dirPath)) {
    mkdirSync(dirPath);
  }
  if (!existsSync(localDirPath)) {
    mkdirSync(localDirPath);
  }

  const filePath = `${path.join(dirPath, "config")}`;
  const localFilePath = `${path.join(localDirPath, "config")}`;

  if (!existsSync(filePath)) {
    writeFileSync(filePath, "");
  }
  if (!existsSync(localFilePath)) {
    writeFileSync(localFilePath, "");
  }

  const fileBuffer = fs.readFileSync(filePath, "utf8");
  const localFileBuffer = fs.readFileSync(localFilePath, "utf8");
  const fileConfig = {
    ...dotenv.parse(fileBuffer),
    ...dotenv.parse(localFileBuffer),
  };

  const config = readSchema.parse({ ...fileConfig, ...envConfig });

  return config;
};

const config = getConfigValues();
export default config;
