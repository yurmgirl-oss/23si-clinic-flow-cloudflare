import { createRequire } from "node:module";

// 1. undefined가 되지 않도록 고정된 파일 URL을 전달하여 전역 require 주입
globalThis.require = createRequire("file:///index.js");

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

// 3. 전역 require가 준비된 상태에서 server.mjs 로드
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

    const target = server.default || server;
    if (typeof target.fetch === "function") {
      return target.fetch(request, env, ctx);
    }
    if (typeof target === "function") {
      return target(request, env, ctx);
    }

    return new Response("Server handler not found", { status: 500 });
  }
};
