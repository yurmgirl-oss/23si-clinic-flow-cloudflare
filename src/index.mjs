import * as path from "node:path";
import * as util from "node:util";
import * as buffer from "node:buffer";
import * as string_decoder from "node:string_decoder";
import * as events from "node:events";
import * as stream from "node:stream";
import { env } from "cloudflare:workers";

// 1. server.mjs 내부에서 require("path") 등을 호출할 때 바로 넘겨줄 모듈 사전 정의
const builtins = {
  path,
  "node:path": path,
  util,
  "node:util": util,
  buffer,
  "node:buffer": buffer,
  string_decoder,
  "node:string_decoder": string_decoder,
  events,
  "node:events": events,
  stream,
  "node:stream": stream,
};

// 2. createRequire 없이 전역 require 함수를 직접 정의하여 에러 원천 차단
globalThis.require = function (moduleName) {
  return builtins[moduleName] || {};
};

// 3. 환경 변수 기본값 주입
process.env.PORT = "3000";
try {
  if (env?.HYPERDRIVE?.connectionString) {
    process.env.DATABASE_URL = env.HYPERDRIVE.connectionString;
  }
  if (env?.COUNTER_PIN) {
    process.env.COUNTER_PIN = env.COUNTER_PIN;
  }
} catch (e) {
  // 빌드 단계 예외 방지
}

// 4. 전역 require가 준비된 상태에서 원본 server.mjs 로드
const serverModule = await import("../server.mjs");
const server = serverModule.default || serverModule;

// 5. Cloudflare Workers 진입점 핸들러 연결
export default {
  async fetch(request, env, ctx) {
    if (env?.HYPERDRIVE?.connectionString) {
      process.env.DATABASE_URL = env.HYPERDRIVE.connectionString;
    }
    if (env?.COUNTER_PIN) {
      process.env.COUNTER_PIN = env.COUNTER_PIN;
    }

    if (typeof server.fetch === "function") {
      return server.fetch(request, env, ctx);
    }
    if (typeof server === "function") {
      return server(request, env, ctx);
    }

    return new Response("Server handler not found", { status: 500 });
  },
};
