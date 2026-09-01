import { API_PATH, hostname, port, PUBLIC_BASE_URL } from "./config.ts";
import {
  handleBroadcast,
  handleClick,
  handleList,
  handleOpen,
  handleStats,
  handleSubscribe,
  handleUnsubscribe,
} from "./handlers.ts";
import { json, routeName } from "./http.ts";
import { log } from "./log.ts";

async function dispatch(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const route = routeName(url.pathname);

  if (route === "unsubscribe") {
    if (req.method !== "GET" && req.method !== "POST") {
      return json({ error: "请使用 GET 打开退订链接" }, 405);
    }
    return handleUnsubscribe(req);
  }

  if (route === "broadcast") {
    if (req.method !== "POST") {
      return json({ error: "请使用 POST 群发" }, 405);
    }
    return handleBroadcast(req);
  }

  if (route === "open") {
    if (req.method !== "GET") return json({ error: "请使用 GET" }, 405);
    return handleOpen(req);
  }

  if (route === "click") {
    if (req.method !== "GET") return json({ error: "请使用 GET" }, 405);
    return handleClick(req);
  }

  if (route === "stats") {
    if (req.method !== "GET") return json({ error: "请使用 GET" }, 405);
    return handleStats(req);
  }

  if (route !== "subscribe") {
    return json({ error: "未找到接口" }, 404);
  }

  if (req.method === "GET") return handleList(req);
  if (req.method === "POST") return handleSubscribe(req);
  return json({ error: "请使用 POST 提交订阅" }, 405);
}

Deno.serve({ port, hostname }, async (req) => {
  const started = Date.now();
  const url = new URL(req.url);
  try {
    const res = await dispatch(req);
    log(`${req.method} ${url.pathname} ${res.status} ${Date.now() - started}ms`);
    return res;
  } catch (err) {
    log(`${req.method} ${url.pathname} 500 ${Date.now() - started}ms`);
    throw err;
  }
});

log(`listening http://${hostname}:${port}${API_PATH}`);
if (PUBLIC_BASE_URL) {
  log(`public base ${PUBLIC_BASE_URL}${API_PATH}`);
} else {
  log("PUBLIC_BASE_URL unset; broadcast will fail until configured");
}
