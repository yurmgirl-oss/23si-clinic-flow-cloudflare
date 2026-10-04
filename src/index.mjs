import { env } from "cloudflare:workers";
import { httpServerHandler } from "cloudflare:node";
import express from "express";
import cors from "cors";

// Set the runtime configuration BEFORE importing the API routes.
// The database module creates its pg Pool at module import time.
process.env.DATABASE_URL = env.HYPERDRIVE.connectionString;
process.env.COUNTER_PIN = env.COUNTER_PIN ?? "";
process.env.NODE_ENV = "production";
process.env.PORT = "3000";

// Import the original route tree directly from source instead of using the
// pre-bundled Node server.mjs. Wrangler will bundle this Worker for Workers.
const { default: router } = await import("../artifacts/api-server/src/routes/index.ts");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// The original clinic route logs one exceptional PIN configuration case via
// req.log. Keep that small contract without bringing pino/pino-http into the
// Worker bundle.
app.use((req, _res, next) => {
  req.log = {
    error: (...args) => console.error(...args),
  };
  next();
});

app.use("/api", router);

app.listen(3000);

export default httpServerHandler({ port: 3000 });
