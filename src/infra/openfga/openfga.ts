import { OpenFgaClient } from "@openfga/sdk";
import config from "../get-config.ts";

const openFga = new OpenFgaClient({
  apiUrl: config.OPENFGA_URL,
  storeId: config.OPENFGA_STORE_ID,
  authorizationModelId: config.OPENFGA_MODEL_ID,
});

export default openFga;
