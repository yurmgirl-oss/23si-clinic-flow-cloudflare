let apiHandlerPromise;

async function getApiHandler(env) {
  process.env.DATABASE_URL = env.HYPERDRIVE.connectionString;
  process.env.COUNTER_PIN = env.COUNTER_PIN ?? "";
  process.env.NODE_ENV = "production";
  process.env.PORT = "3000";

  if (!apiHandlerPromise) {
    process.browser = true;
    apiHandlerPromise = import("../server.mjs").then((mod) => mod.default);
  }
  return apiHandlerPromise;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      if (!env.HYPERDRIVE) {
        return Response.json(
          { error: "Hyperdrive binding HYPERDRIVE is not configured." },
          { status: 500 },
        );
      }
      const apiHandler = await getApiHandler(env);
      return apiHandler(request);
    }
    return env.ASSETS.fetch(request);
  },
};
