import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { redactPersistedWorkflowSecrets } from "./storage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
const port = Number(process.env.PORT || 8787);
const basePath = (process.env.APP_BASE_PATH || "").trim() || "/";

async function bootstrap() {
  const rewritten = await redactPersistedWorkflowSecrets(projectRoot);
  if (rewritten > 0) {
    console.log(`Sanitized ${rewritten} stored workflow record(s).`);
  }

  const app = createApp({
    projectRoot,
    enableStaticClient: true
  });

  app.listen(port, "0.0.0.0", () => {
    console.log(
      `Marketing workflow server running on port ${port} with base path ${basePath}`
    );
  });
}

void bootstrap();
