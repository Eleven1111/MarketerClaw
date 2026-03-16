import { createApp } from "../server/src/app.js";

const app = createApp({
  projectRoot: process.cwd(),
  enableStaticClient: false
});

export default function handler(request: unknown, response: unknown): void {
  app(request as never, response as never);
}
