import { OpenFgaClient } from "@openfga/sdk";

const openFga = new OpenFgaClient({
  apiUrl: process.env.OPENFGA_URL!,
  storeId: process.env.OPENFGA_STORE_ID!,
  authorizationModelId: process.env.OPENFGA_MODEL_ID!,
});

export default openFga;
