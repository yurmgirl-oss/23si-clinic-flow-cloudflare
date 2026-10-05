import * as path from "node:path";
import * as util from "node:util";
import * as buffer from "node:buffer";
import * as string_decoder from "node:string_decoder";
import * as events from "node:events";
import * as stream from "node:stream";
import { env } from "cloudflare:workers";

// 1. safer-buffer가 찾는 hasOwnProperty 함수를 강제로 주입하는 래퍼
function wrapModule(mod) {
  const wrapped = Object.assign(Object.create(Object.prototype), mod);
  wrapped.hasOwnProperty = function (key) {
    return Object.prototype.hasOwnProperty.call(this, key) || key in this;
  };
  return wrapped;
}

// 2. 모듈에 hasOwnProperty를 장착하여 사전 생성
const builtins = {
  path: wrapModule(path),
  util: wrapModule(util),
  buffer: wrapModule(buffer),
  string_decoder: wrapModule(string_decoder),
  events: wrapModule(events),
  stream: wrapModule(stream),
};

// 3. server.mjs 내부의 require() 요청을 래핑된 모듈로 응답
globalThis.require = function (name) {
  const cleanName = String(name).replace(/^node:/, "");
  return builtins[cleanName] || wrapModule({});
};
globalThis.require.resolve = (name) => name;

// 4. 환경 변수 주입
process.env.PORT = "3000";
try {
  if (env?.HYPERDRIVE?.connectionString) {
    process.env.DATABASE_URL = env.HYPERDRIVE.connectionString;
  }
  if (env?.COUNTER_PIN) {
    process.env.COUNTER_PIN = env.COUNTER_PIN;
  }
} catch (e) {}

// 5. server.mjs 실행 및 핸들러 연결
const serverModule = await import("../server.mjs");
const server = serverModule.default || serverModule;

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
