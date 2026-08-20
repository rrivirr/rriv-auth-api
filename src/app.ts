import "dotenv/config";
import express from "express";
import errorHandler from "./utils/error-handler.js";
import routes from "./routes.js";
import { jwtMiddleware } from "./utils/jwt.middleware.js";
import packageJson from "../package.json" with { type: "json" };

const app = express();

app.get("/version", (req, res) => res.send(packageJson.version));
app.use(jwtMiddleware);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(routes);
app.use(errorHandler);

export default app;
