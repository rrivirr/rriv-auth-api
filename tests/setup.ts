import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// `get-config.ts` reads/writes `~/.auth-api/config` and needs the config env at
// import time, so isolate HOME and provide the values before any module loads.
const home = mkdtempSync(path.join(tmpdir(), "auth-api-test-"));
process.env.HOME = home;
process.env.USERPROFILE = home;

process.env.KEYCLOAK_URL = "http://127.0.0.1:4590";
process.env.KEYCLOAK_REALM = "test";
process.env.OPENFGA_URL = "http://127.0.0.1:4591";
process.env.OPENFGA_STORE_ID = "store-test";
process.env.OPENFGA_MODEL_ID = "model-test";
process.env.OPENFGA_TOKEN = "token-test";
process.env.LOG_LEVEL = "error";
