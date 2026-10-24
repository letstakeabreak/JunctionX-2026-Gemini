import { buildApp } from "./app.js";
import { UpstageAgentProvider } from "./providers/upstage-agent-provider.js";
import { readRuntimeConfig } from "./runtime-config.js";
import { InMemoryStore } from "./store/in-memory-store.js";

const runtime = readRuntimeConfig();
const startedAt = new Date().toISOString();
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

const sharedAgentId = process.env.UPSTAGE_AGENT_ID;
const scriptAgentId = process.env.UPSTAGE_AGENT_ID_SCRIPT ?? sharedAgentId;
const masterCueAgentId = process.env.UPSTAGE_AGENT_ID_MASTER_CUE ?? sharedAgentId;
const agentIds = {
  ...(scriptAgentId || upstageAgentDefaults.extraction.script
    ? { SCRIPT: scriptAgentId ?? upstageAgentDefaults.extraction.script }
    : {}),
  ...(masterCueAgentId || upstageAgentDefaults.extraction.masterCue
    ? { MASTER_CUE: masterCueAgentId ?? upstageAgentDefaults.extraction.masterCue }
    : {}),
  ...(process.env.UPSTAGE_AGENT_ID_STAGE_SPEC || upstageAgentDefaults.extraction.stageSpec
    ? { STAGE_SPEC: process.env.UPSTAGE_AGENT_ID_STAGE_SPEC ?? upstageAgentDefaults.extraction.stageSpec }
    : {}),
};
const configIds = {
  ...(process.env.UPSTAGE_CONFIG_ID_SCRIPT || upstageAgentDefaults.extraction.config.script
    ? { SCRIPT: process.env.UPSTAGE_CONFIG_ID_SCRIPT ?? upstageAgentDefaults.extraction.config.script }
    : {}),
  ...(process.env.UPSTAGE_CONFIG_ID_MASTER_CUE || upstageAgentDefaults.extraction.config.masterCue
    ? { MASTER_CUE: process.env.UPSTAGE_CONFIG_ID_MASTER_CUE ?? upstageAgentDefaults.extraction.config.masterCue }
    : {}),
  ...(process.env.UPSTAGE_CONFIG_ID_STAGE_SPEC || upstageAgentDefaults.extraction.config.stageSpec
    ? { STAGE_SPEC: process.env.UPSTAGE_CONFIG_ID_STAGE_SPEC ?? upstageAgentDefaults.extraction.config.stageSpec }
    : {}),
};
const productionAgentIds = {
  ...(process.env.UPSTAGE_AGENT_ID_FACT_NORMALIZER || upstageAgentDefaults.production.factNormalizer
    ? { FACT_NORMALIZER: process.env.UPSTAGE_AGENT_ID_FACT_NORMALIZER ?? upstageAgentDefaults.production.factNormalizer }
    : {}),
  ...(process.env.UPSTAGE_AGENT_ID_STORYBOARD_RECOMPOSER || upstageAgentDefaults.production.storyboardRecomposer
    ? {
      STORYBOARD_RECOMPOSER:
        process.env.UPSTAGE_AGENT_ID_STORYBOARD_RECOMPOSER
        ?? upstageAgentDefaults.production.storyboardRecomposer,
    }
    : {}),
  ...(process.env.UPSTAGE_AGENT_ID_REHEARSAL_BRIEF || upstageAgentDefaults.production.rehearsalBrief
    ? { REHEARSAL_BRIEF: process.env.UPSTAGE_AGENT_ID_REHEARSAL_BRIEF ?? upstageAgentDefaults.production.rehearsalBrief }
    : {}),
};
const productionConfigIds = {
  ...(process.env.UPSTAGE_CONFIG_ID_FACT_NORMALIZER || upstageAgentDefaults.production.config.factNormalizer
    ? { FACT_NORMALIZER: process.env.UPSTAGE_CONFIG_ID_FACT_NORMALIZER ?? upstageAgentDefaults.production.config.factNormalizer }
    : {}),
  ...(process.env.UPSTAGE_CONFIG_ID_STORYBOARD_RECOMPOSER || upstageAgentDefaults.production.config.storyboardRecomposer
    ? {
      STORYBOARD_RECOMPOSER:
        process.env.UPSTAGE_CONFIG_ID_STORYBOARD_RECOMPOSER
        ?? upstageAgentDefaults.production.config.storyboardRecomposer,
    }
    : {}),
  ...(process.env.UPSTAGE_CONFIG_ID_REHEARSAL_BRIEF || upstageAgentDefaults.production.config.rehearsalBrief
    ? { REHEARSAL_BRIEF: process.env.UPSTAGE_CONFIG_ID_REHEARSAL_BRIEF ?? upstageAgentDefaults.production.config.rehearsalBrief }
    : {}),
};

const upstageProvider = process.env.UPSTAGE_API_KEY
  ? new UpstageAgentProvider({
      apiKey: process.env.UPSTAGE_API_KEY,
      agentIds,
      configIds,
      productionAgentIds,
      productionConfigIds,
      pollIntervalMs: runtime.pollIntervalMs,
      timeoutMs: runtime.providerTimeoutMs,
    })
  : undefined;

const store = new InMemoryStore(upstageProvider ?? null, upstageProvider ?? null, upstageProvider ?? null);
let draining = false;
const app = await buildApp({
  allowedOrigins: runtime.allowedOrigins,
  logger: true,
  allowAnonymous: runtime.allowAnonymous,
  trustProxy: runtime.trustProxy,
  isDraining: () => draining,
  jwtIssuer: runtime.jwtIssuer,
  ...(runtime.jwtSecret ? { jwtSecret: runtime.jwtSecret } : {}),
  ...(runtime.jwtAudience ? { jwtAudience: runtime.jwtAudience } : {}),
  deployment: {
    commitSha: process.env.GIT_COMMIT_SHA ?? process.env.RAILWAY_GIT_COMMIT_SHA ?? null,
    deploymentId: process.env.DEPLOYMENT_ID ?? process.env.FLY_MACHINE_ID ?? process.env.RAILWAY_DEPLOYMENT_ID ?? null,
    startedAt,
  },
  ...(runtime.apiToken ? { apiToken: runtime.apiToken } : {}),
  ...(upstageProvider
    ? {
        extractionProvider: upstageProvider,
        productionAgentProvider: upstageProvider,
        scriptProjectionProvider: upstageProvider,
      }
    : {}),
}, store);
await app.listen({ host: "0.0.0.0", port: runtime.port });

let shutdown: Promise<void> | undefined;
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    shutdown ??= (async () => {
      draining = true;
      const forcedExit = setTimeout(() => process.exit(1), runtime.shutdownGraceMs + 1_000);
      forcedExit.unref();
      try {
        const deadline = Date.now() + runtime.shutdownGraceMs;
        // Drain already admitted HTTP requests first: an upload may enqueue a
        // background operation immediately before returning its 202 response.
        await app.close();
        const finished = await store.waitForIdle(Math.max(0, deadline - Date.now()));
        if (!finished) app.log.warn({ pendingOperations: store.pendingOperationCount() }, "Shutdown grace elapsed; unfinished in-memory operations cannot survive restart");
        clearTimeout(forcedExit);
        process.exit(finished ? 0 : 1);
      } catch (error) {
        app.log.error({ err: error }, "Backend shutdown failed");
        process.exit(1);
      }
    })();
  });
}
