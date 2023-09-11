import { createLogger, transports, format } from "winston";

// Imports the Google Cloud client library for Winston
import { LoggingWinston } from "@google-cloud/logging-winston";

const ENVIRONMENT = process.env["ENVIRONMENT"];

const GCP_ENVIRONMENTS = ["prod", "dev"];

const loggingWinston = new LoggingWinston();

// Create a Winston logger that streams to Cloud Logging
// Logs will be written to: "projects/YOUR_PROJECT_ID/logs/winston_log"
export const logger = createLogger({
  level: "info",
  transports: [
    !GCP_ENVIRONMENTS.includes(ENVIRONMENT)
      ? new transports.Console({
          level: "info",
          format: format.combine(format.colorize(), format.simple()),
        })
      : undefined,
    GCP_ENVIRONMENTS.includes(ENVIRONMENT) ? loggingWinston : undefined,
  ].filter(Boolean),
});
