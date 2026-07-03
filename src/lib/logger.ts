import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: {
    env: process.env.NODE_ENV,
  },
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
});

export default logger;

export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}
