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
import * as net from "node:net";
import * as tls from "node:tls";
import * as assert from "node:assert";
import { env } from "cloudflare:workers";

// safer-buffer 등 구형 라이브러리의 hasOwnProperty 호출을 안전하게 통과시키는 Proxy
function createModuleProxy(mod) {
  const fallback = Object.create(Object.prototype);
  return new Proxy(mod || fallback, {
    get(target, prop) {
      if (prop === "hasOwnProperty") {
        return (key) => Object.prototype.hasOwnProperty.call(target, key) || key in target;
      }
      return Reflect.get(target, prop);
    },
    has(target, prop) {
      return prop === "hasOwnProperty" || prop in target;
    },
  });
}

const builtins = {
  path: createModuleProxy(path),
  util: createModuleProxy(util),
  buffer: createModuleProxy(buffer),
  string_decoder: createModuleProxy(string_decoder),
  events: createModuleProxy(events),
  stream: createModuleProxy(stream),
  crypto: createModuleProxy(crypto),
  http: createModuleProxy(http),
  url: createModuleProxy(url),
  zlib: createModuleProxy(zlib),
  os: createModuleProxy(os),
  fs: createModuleProxy(fs),
  net: createModuleProxy(net),
  tls: createModuleProxy(tls),
  assert: createModuleProxy(assert),
};

// 1. require 호출 시 hasOwnProperty가 보장된 프록시 모듈 반환
globalThis.require = function (moduleName) {
  const name = String(moduleName).replace(/^node:/, "");
  if (builtins[name]) {
    return builtins[name];
  }
  return createModuleProxy({});
};
globalThis.require.resolve = (name) => name;

// 2. 환경 변수 세팅
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

// 3. server.mjs 로드 및 Workers fetch 핸들러 연결
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
