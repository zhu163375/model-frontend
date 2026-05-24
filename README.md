# 控制台 · 前端

Vue 3 + Vite 单页应用，包含登录页与控制台。

后端为独立项目，见同级目录 [`trading-server`](../trading-server)。

## 开发

```sh
npm install
npm run dev
```

默认地址：`http://localhost:5173`

## 构建

```sh
npm run build
```

## 路由

- `/login` — 登录页
- `/dashboard` — 控制台

## 对接后端

开发环境通过 Vite 代理将 `/api` 转发到 `http://localhost:3000`，需先启动 `trading-server`。

```sh
# 终端 1
cd ../trading-server && npm run dev

# 终端 2
npm run dev
```

生产构建可配置 `VITE_API_BASE_URL`（见 `.env.example`）。

## 测试账号（与后端 seed 一致）

- 普通用户：`user123` / `123456`
- 导师：`leader888` / `123456`
