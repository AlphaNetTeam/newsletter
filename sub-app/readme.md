# 邮件订阅服务

Deno 服务，监听 `127.0.0.1:20001`。订阅数据在工作目录的 `subscribers.db`。

功能：订阅（带来源和时间）、导出名单、群发、退订、打开/点击统计、活动广告点击。

## 本地运行

```bash
cd sub-app
deno task dev    # 开发（watch）
deno task start  # 生产
```

群发需要环境变量（见下方）。可在 shell 里 `export`，或写进 systemd 的 `Environment=`。

## 反代

全部接口在 `/api/subscribe` 下，只反代这一条。必须保留完整 URI（`proxy_pass` 不要末尾 `/`）：

```nginx
location /api/subscribe {
    proxy_pass http://127.0.0.1:20001;
}
```

## 环境变量

| 变量 | 说明 | 默认 |
|---|---|---|
| `LIST_PASSWORD` | 导出名单、群发、统计的密码 | `alphanet-0807` |
| `APP_SECRET` | 退订 / 打开 / 点击链接的 HMAC 密钥 | `alphanet-unsub-0807` |
| `PUBLIC_BASE_URL` | 公网站点 origin。不要末尾 `/`，也不要带 `/api/subscribe` | 空（群发会失败） |
| `SMTP_HOST` | SMTP 主机 | 空 |
| `SMTP_PORT` | SMTP 端口 | `587`（`465` 时用 TLS） |
| `SMTP_USER` | SMTP 用户 | 空 |
| `SMTP_PASS` | SMTP 密码 | 空 |
| `SMTP_FROM` | 发件人 | 默认等于 `SMTP_USER` |
| `MAIL_SUBJECT` | 群发主题 | `AlphaNet` |

`PUBLIC_BASE_URL=https://你的域名` 时，退订链接为 `https://你的域名/api/subscribe/unsubscribe?...`。

更换 `APP_SECRET` 后，已发出的退订、打开、点击链接全部失效。

systemd 示例（`systemd/alphanet-blogs.service` 里有同样的注释）。改完 unit 后：

```bash
sudo systemctl daemon-reload && sudo systemctl restart alphanet-blogs
```

## 接口

管理接口（名单、群发、统计）用 `LIST_PASSWORD`。默认密码见上表。

### 订阅

`POST /api/subscribe`

`source` 可选，任意字符串（最长 200，超出截断）。不传则存空字符串。`created_at` 由服务写入。

```bash
curl -X POST http://127.0.0.1:20001/api/subscribe \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","source":"blog-sidebar"}'
```

成功 `201`；已订阅 `409`。

### 导出名单

`GET /api/subscribe?password=...`

```bash
curl 'http://127.0.0.1:20001/api/subscribe?password=alphanet-0807'
```

```json
[{ "email": "you@example.com", "source": "blog-sidebar", "created_at": "2026-09-01 07:53:00" }]
```

### 群发

`POST /api/subscribe/broadcast`

把真实 `link` 存成一次群发。邮件正文链接走 `/click`（302 到真实 URL），并嵌入 `/open` 像素。每人链接带邮箱和 HMAC。

```bash
curl -X POST http://127.0.0.1:20001/api/subscribe/broadcast \
  -H 'Content-Type: application/json' \
  -d '{"password":"alphanet-0807","link":"https://example.com/new-post"}'
```

```json
{ "ok": true, "id": 1, "sent": 10, "failed": 0, "errors": [] }
```

`id` 用于查统计。未配置 `PUBLIC_BASE_URL` 或 SMTP 时返回 `503`。

### 统计

`GET /api/subscribe/stats?password=...`  
`GET /api/subscribe/stats?password=...&id=1`

```bash
curl 'http://127.0.0.1:20001/api/subscribe/stats?password=alphanet-0807'
curl 'http://127.0.0.1:20001/api/subscribe/stats?password=alphanet-0807&id=1'
```

单次群发示例：

```json
{
  "id": 1,
  "link": "https://example.com/new-post",
  "created_at": "2026-09-01 08:00:00",
  "sent": 10,
  "opens": 4,
  "unique_opens": 3,
  "clicks": 2,
  "unique_clicks": 2
}
```

`opens` / `clicks` 是总次数，`unique_*` 按邮箱去重。不少客户端会拦截邮件图片，打开数会偏低。

### 活动广告点击

用户点开带邮箱的链接后记到库里，页面直接显示 `waitlist added`。只需 `email`。

```
GET /api/subscribe/ad?email=<邮箱>
```

批量生成订阅用户的链接：

```bash
curl 'http://127.0.0.1:20001/api/subscribe/ad/links?password=alphanet-0807'
```

```json
{
  "count": 2,
  "links": [
    { "email": "you@example.com", "url": "https://你的域名/api/subscribe/ad?email=you%40example.com" }
  ]
}
```

查看谁点了：

```bash
curl 'http://127.0.0.1:20001/api/subscribe/ad/stats?password=alphanet-0807'
```

```json
{
  "clicks": 3,
  "unique_clicks": 2,
  "users": [
    { "email": "you@example.com", "clicks": 2, "first_at": "...", "last_at": "..." }
  ]
}
```

### 退订 / 打开 / 点击

由服务生成，一般不用手调：

```
{PUBLIC_BASE_URL}/api/subscribe/unsubscribe?email=<邮箱>&key=<HMAC>
{PUBLIC_BASE_URL}/api/subscribe/open?email=<邮箱>&key=<HMAC>&id=<群发id>
{PUBLIC_BASE_URL}/api/subscribe/click?email=<邮箱>&key=<HMAC>&id=<群发id>
```

`key` = HMAC-SHA256(`APP_SECRET`, 小写邮箱)，不入库。

## 部署

服务端目录：`/home/ubuntu/alphanet-space/blog-sub`。上传整个 `sub-app` 的源码，不要只传 `main.ts`。

```bash
scp ./sub-app/*.ts ./sub-app/deno.json ./sub-app/deno.lock \
  ubuntu@18.136.207.229:/home/ubuntu/alphanet-space/blog-sub/
ssh ubuntu@18.136.207.229 'sudo systemctl restart alphanet-blogs'
```

`subscribers.db` 在服务器上，不要覆盖。
