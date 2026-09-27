import { CredentialsMethod, OpenFgaClient } from "@openfga/sdk";
import config from "../get-config.js";

const openFga = new OpenFgaClient({
  apiUrl: config.OPENFGA_URL,
  storeId: config.OPENFGA_STORE_ID,
  authorizationModelId: config.OPENFGA_MODEL_ID,
  credentials: {
    method: CredentialsMethod.ApiToken,
    config: {
      token: config.OPENFGA_TOKEN,
    },
  },
});

export default openFga;
