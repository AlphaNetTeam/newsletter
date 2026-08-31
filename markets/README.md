### 启动开发模式
```
mise use node@16
cd markets
npm run dev
```
浏览器打开：http://localhost:3000/markets/BTC

### 服务器部署
```bash
SITE_URL=https://alphanet.global/markets & npm run build
sudo systemctl restart alphanet-markets
```
