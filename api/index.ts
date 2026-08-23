import type { IncomingMessage, ServerResponse } from "node:http";
import { buildApp } from "../server/src/app.js";
import { UpstageAgentProvider } from "../server/src/providers/upstage-agent-provider.js";
import { ProductionAgentProvider } from "../server/src/providers/production-agent-provider.js";
import { ScriptProjectionProvider } from "../server/src/providers/script-projection-provider.js";

let fastifyApp: any = null;

async function getFastifyApp() {
  if (!fastifyApp) {
    const upstageKey = process.env.UPSTAGE_API_KEY;
    const upstageProvider = upstageKey ? new UpstageAgentProvider({ apiKey: upstageKey }) : null;
    const productionAgentProvider = upstageKey ? new ProductionAgentProvider({ apiKey: upstageKey }) : null;
    const scriptProjectionProvider = upstageKey ? new ScriptProjectionProvider({ apiKey: upstageKey }) : null;

    fastifyApp = await buildApp({
      allowedOrigins: ["*"],
      allowAnonymous: true,
      jwtSecret: process.env.STANDBY_JWT_SECRET ?? "standby-vercel-serverless-secret-2026",
      extractionProvider: upstageProvider,
      productionAgentProvider,
      scriptProjectionProvider,
    });
    await fastifyApp.ready();
  }
  return fastifyApp;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getFastifyApp();
  app.server.emit("request", req, res);
}
