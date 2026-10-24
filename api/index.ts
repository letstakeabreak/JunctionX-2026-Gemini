import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * The old serverless adapter kept cases and background operations in memory
 * across unrelated Function invocations. It cannot serve this API safely.
 * Production clients must use the verified standalone API origin instead.
 */
export default function handler(_request: IncomingMessage, response: ServerResponse) {
  response.statusCode = 503;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(JSON.stringify({
    error: {
      code: "STANDALONE_BACKEND_REQUIRED",
      message: "The standalone backend has not been configured for this frontend.",
      retryable: false,
    },
  }));
}
