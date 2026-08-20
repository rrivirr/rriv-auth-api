import axios from "axios";
import { HttpException } from "../../utils/http-exception.js";
import config from "../get-config.js";

export const getPublicKey = async () => {
  try {
    const response = await axios.get(
      `${config.KEYCLOAK_URL}/realms/${config.KEYCLOAK_REALM}`,
    );
    return response.data.public_key;
  } catch (error: any) {
    throw new HttpException(500, JSON.stringify(error?.response) || error);
  }
};
