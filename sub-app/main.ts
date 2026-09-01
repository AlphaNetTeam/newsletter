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

Deno.serve({ port, hostname }, (req) => {
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
});

console.log(`邮件订阅服务: http://${hostname}:${port}${API_PATH}`);
if (PUBLIC_BASE_URL) {
  console.log(`退订链接基准: ${PUBLIC_BASE_URL}${API_PATH}/unsubscribe`);
} else {
  console.log("未设置 PUBLIC_BASE_URL，群发前请配置公网前缀");
}
