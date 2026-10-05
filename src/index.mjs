import { createRequire } from "node:module";

// 1. Cloudflare Workers 전역에 require를 주입하여 server.mjs 내부의 path 에러를 방지
globalThis.require = createRequire(import.meta.url);

import { env } from "cloudflare:workers";

// 2. 기본 포트 및 환경 변수 세팅
process.env.PORT = "3000";
try {
  if (env?.HYPERDRIVE?.connectionString) {
    process.env.DATABASE_URL = env.HYPERDRIVE.connectionString;
  }
  if (env?.COUNTER_PIN) {
    process.env.COUNTER_PIN = env.COUNTER_PIN;
  }
} catch (e) {
  // 빌드 타임 예외 무시
}

// 3. 전역 require가 준비된 후 대용량 server.mjs를 안전하게 로드
const server = await import("../server.mjs");

// 4. Cloudflare Workers 핸들러 연결
export default {
  async fetch(request, env, ctx) {
    if (env?.HYPERDRIVE?.connectionString) {
      process.env.DATABASE_URL = env.HYPERDRIVE.connectionString;
    }
    if (env?.COUNTER_PIN) {
      process.env.COUNTER_PIN = env.COUNTER_PIN;
    }

    const handler = server.default?.fetch
      ? server.default.fetch.bind(server.default)
      : (typeof server.default === "function"
          ? server.default
          : (server.fetch ? server.fetch.bind(server) : null));

    if (handler) {
      return handler(request, env, ctx);
    }

    return new Response("Server handler not found", { status: 500 });
  }
};
