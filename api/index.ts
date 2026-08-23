import type { IncomingMessage, ServerResponse } from "node:http";
import { buildApp } from "../server/src/app.js";
import { UpstageAgentProvider } from "../server/src/providers/upstage-agent-provider.js";

let fastifyApp: any = null;

const upstageAgentDefaults = {
  extraction: {
    script: "agt_7yeqpDe7zmwCGVWoMY377j",
    masterCue: "agt_FkyNiySGY4WACFvMNV5DRQ",
    stageSpec: "agt_PxbxmhXXT8iqdzs5WmHfUz",
    config: {
      script: "1",
      masterCue: "3",
      stageSpec: "1",
      factNormalizer: "1",
      storyboardRecomposer: "1",
      rehearsalBrief: "1",
    },
  },
  production: {
    factNormalizer: "agt_6tn639gGApNdV9SdRfAjnE",
    storyboardRecomposer: "agt_go8aoJTVDvEwK8mwXh5gEi",
    rehearsalBrief: "agt_9iLkb7fqwdEtaBv48t9tQA",
    config: {
      factNormalizer: "1",
      storyboardRecomposer: "1",
      rehearsalBrief: "1",
    },
  },
};

async function getFastifyApp() {
  if (!fastifyApp) {
    const upstageKey = process.env.UPSTAGE_API_KEY;
    const upstageProvider = upstageKey
      ? new UpstageAgentProvider({
          apiKey: upstageKey,
          agentIds: {
            SCRIPT: process.env.UPSTAGE_AGENT_ID_SCRIPT ?? upstageAgentDefaults.extraction.script,
            MASTER_CUE: process.env.UPSTAGE_AGENT_ID_MASTER_CUE ?? upstageAgentDefaults.extraction.masterCue,
            STAGE_SPEC: process.env.UPSTAGE_AGENT_ID_STAGE_SPEC ?? upstageAgentDefaults.extraction.stageSpec,
          },
          configIds: {
            SCRIPT: process.env.UPSTAGE_CONFIG_ID_SCRIPT ?? upstageAgentDefaults.extraction.config.script,
            MASTER_CUE: process.env.UPSTAGE_CONFIG_ID_MASTER_CUE ?? upstageAgentDefaults.extraction.config.masterCue,
            STAGE_SPEC: process.env.UPSTAGE_CONFIG_ID_STAGE_SPEC ?? upstageAgentDefaults.extraction.config.stageSpec,
          },
          productionAgentIds: {
            FACT_NORMALIZER: process.env.UPSTAGE_AGENT_ID_FACT_NORMALIZER ?? upstageAgentDefaults.production.factNormalizer,
            STORYBOARD_RECOMPOSER: process.env.UPSTAGE_AGENT_ID_STORYBOARD_RECOMPOSER ?? upstageAgentDefaults.production.storyboardRecomposer,
            REHEARSAL_BRIEF: process.env.UPSTAGE_AGENT_ID_REHEARSAL_BRIEF ?? upstageAgentDefaults.production.rehearsalBrief,
          },
          productionConfigIds: {
            FACT_NORMALIZER: process.env.UPSTAGE_CONFIG_ID_FACT_NORMALIZER ?? upstageAgentDefaults.production.config.factNormalizer,
            STORYBOARD_RECOMPOSER: process.env.UPSTAGE_CONFIG_ID_STORYBOARD_RECOMPOSER ?? upstageAgentDefaults.production.config.storyboardRecomposer,
            REHEARSAL_BRIEF: process.env.UPSTAGE_CONFIG_ID_REHEARSAL_BRIEF ?? upstageAgentDefaults.production.config.rehearsalBrief,
          },
          pollIntervalMs: 2_000,
          timeoutMs: 600_000,
        })
      : undefined;

    fastifyApp = await buildApp({
      allowedOrigins: ["*"],
      allowAnonymous: true,
      jwtSecret: process.env.STANDBY_JWT_SECRET ?? "standby-vercel-serverless-secret-2026",
      ...(upstageProvider
        ? {
            extractionProvider: upstageProvider,
            productionAgentProvider: upstageProvider,
            scriptProjectionProvider: upstageProvider,
          }
        : {}),
    });
    await fastifyApp.ready();
  }
  return fastifyApp;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getFastifyApp();
  app.server.emit("request", req, res);
}
