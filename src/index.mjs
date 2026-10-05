import { env } from "cloudflare:workers";
import { httpServerHandler } from "cloudflare:node";
import express from "express";
import cors from "cors";

// Make the existing server-side database configuration available before
// loading the route tree. The route modules use @workspace/db, which reads
// DATABASE_URL when it is imported.
process.env.DATABASE_URL = env.HYPERDRIVE.connectionString;
process.env.COUNTER_PIN = env.COUNTER_PIN ?? "";
process.env.PORT = "3000";

// Import the original route tree directly from source. This avoids the
// pre-bundled artifacts/api-server/dist/server.mjs that contains esbuild's
// runtime dynamic-require helper, which is not suitable for Workers.
const { default: router } = await import("../artifacts/api-server/src/routes/index.ts");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Some existing routes expect req.log. Keep that small interface without
// bringing the Node-only pino/pino-http stack into the Worker bundle.
app.use((req, _res, next) => {
  req.log = {
    error: (...args) => console.error(...args),
  };
  next();
});

app.use("/api", router);

app.listen(3000);

export default httpServerHandler({ port: 3000 });
