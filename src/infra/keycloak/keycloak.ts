import axios from "axios";
import { HttpException } from "../../utils/http-exception.ts";
import { keycloakRealm, keycloakUrl } from "./config.ts";

export const getPublicKey = async () => {
  try {
    const response = await axios.get(`${keycloakUrl}/realms/${keycloakRealm}`);
    return response.data.public_key;
  } catch (error: any) {
    throw new HttpException(500, JSON.stringify(error?.response) || error);
  }
};
