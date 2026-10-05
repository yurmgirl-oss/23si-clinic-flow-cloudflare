import * as path from "node:path";
import * as util from "node:util";
import * as buffer from "node:buffer";
import * as string_decoder from "node:string_decoder";
import * as events from "node:events";
import * as stream from "node:stream";
import * as crypto from "node:crypto";
import * as http from "node:http";
import * as url from "node:url";
import * as zlib from "node:zlib";
import * as os from "node:os";
import * as fs from "node:fs";
import { env } from "cloudflare:workers";

// ESM 모듈을 Object.prototype(hasOwnProperty 포함)을 갖춘 일반 객체 형태로 변환
function toCJS(mod) {
  return Object.assign(Object.create(Object.prototype), mod);
}

// 1. server.mjs 내부에서 require("buffer") 등을 호출할 때 전달할 사전
const builtins = {
  path: toCJS(path),
  util: toCJS(util),
  buffer: toCJS(buffer),
  string_decoder: toCJS(string_decoder),
  events: toCJS(events),
  stream: toCJS(stream),
  crypto: toCJS(crypto),
  http: toCJS(http),
  url: toCJS(url),
  zlib: toCJS(zlib),
  os: toCJS(os),
  fs: toCJS(fs),
};

// 2. require() 호출 시 hasOwnProperty가 보장된 모듈 반환
globalThis.require = function (moduleName) {
  const name = moduleName.replace(/^node:/, "");
  if (builtins[name]) {
    return builtins[name];
  }
  return Object.create(Object.prototype);
};

// 3. 환경 변수 세팅
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

// 4. 원본 server.mjs 로드 및 Workers 연결
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
