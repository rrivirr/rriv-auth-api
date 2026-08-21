import winston from "winston";
import config from "./infra/get-config.js";

const logLevel = config.LOG_LEVEL ?? "info";
console.log(`log level set to ${logLevel}`);

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple(),
  ),
  level: logLevel,
  transports: [
    new winston.transports.Console({
      format: winston.format.logstash(),
    }),
  ],
});

export default logger;
