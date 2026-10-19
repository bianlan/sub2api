# Sub2API 本地独立部署

PostgreSQL、Redis 独立运行，Sub2API 使用根目录 `Dockerfile` 构建。三个容器通过共享网络 `sub2api-net` 通信；数据库和 Redis 端口同时映射到宿主机，便于远程查看数据。

## 1. 进入项目目录并配置密码

```powershell
$ProjectRoot = "D:\private\opencode_project\sub2api-main"
Set-Location $ProjectRoot
notepad .env
```

先修改 `.env` 中的数据库密码、Redis 密码、管理员密码和密钥。

## 2. 创建共享网络并拉取镜像

```powershell
docker network create sub2api-net
docker pull postgres:18-alpine
docker pull redis:8-alpine
```

## 3. 启动 PostgreSQL

```powershell
docker volume create sub2api-postgres-data
docker run -d --name sub2api-postgres --restart unless-stopped --network sub2api-net -p 5432:5432 --env-file .env -e PGDATA=/var/lib/postgresql/data -v sub2api-postgres-data:/var/lib/postgresql/data postgres:18-alpine
```

## 4. 启动 Redis

```powershell
docker volume create sub2api-redis-data
docker run -d --name sub2api-redis --restart unless-stopped --network sub2api-net -p 6379:6379 --env-file .env -v sub2api-redis-data:/data redis:8-alpine sh -c 'exec redis-server --appendonly yes --requirepass "$REDIS_PASSWORD"'
```

`--requirepass` 只给 Redis 内置的 default 用户设置密码，不会创建新用户，所以 `.env` 里的 `REDIS_USERNAME` 必须留空。

## 5. 构建并启动 Sub2API

```powershell
# 检查编排文件是否合法
docker compose --env-file .env -f docker-compose.standalone.yml config --quiet

docker compose --env-file .env -f docker-compose.standalone.yml up -d --build
# 删除容器
docker compose --env-file .env -f docker-compose.standalone.yml down

docker compose --env-file .env -f docker-compose.standalone.yml up -d
docker compose --env-file .env -f docker-compose.standalone.yml logs -f sub2api
```

访问：`http://127.0.0.1`（宿主机端口由 `.env` 的 `SERVER_PORT` 决定，容器内固定跑 8080）

## 常用命令

```powershell
# 查看状态
docker ps

# 查看 Sub2API 日志
docker compose --env-file .env -f docker-compose.standalone.yml logs -f sub2api

# 重启 Sub2API
docker compose --env-file .env -f docker-compose.standalone.yml restart

# 停止全部容器
docker compose --env-file .env -f docker-compose.standalone.yml down
docker stop sub2api-postgres sub2api-redis
```

不要执行 `docker compose down -v` 或删除数据卷，否则会丢失数据。

## 本地开发（前后端联调）

开发模式下 Sub2API 不放在 Docker 里运行，直接在本地启动前后端进程；PostgreSQL 和 Redis 使用本地已有的 Docker 容器：

| 服务 | 容器 | 地址 | 凭据 |
|------|------|------|------|
| PostgreSQL（pgvector 镜像） | `pgvector` | 127.0.0.1:54333 | 用户 `pgvector`，密码 `bianlan1989`，库名 `sub2api` |
| Redis | `redis` | 127.0.0.1:6379 | 无密码 |

没有 `backend/config.yaml` 时，后端启动会读取项目根目录 `.env` 里的数据库和 Redis。`.env` 的 `SERVER_PORT` 只用于 Docker 宿主机端口映射，本地 `go run` 仍监听 8080。数据库已完成初始化，后端每次启动会自动执行增量迁移，无需手动操作。

### 前后端启动命令

```powershell
# 后端：监听 0.0.0.0:8080，没有 config.yaml 时读取项目根目录 .env
cd backend
go run ./cmd/server/

# 前端：vite 开发服务器，监听 http://localhost:3000
cd frontend
pnpm dev
```

开发时统一从 `http://localhost:3000` 访问系统。vite 会把页面里的 `/api`、`/v1`、`/setup` 请求自动代理到后端 8080 端口，不需要额外配置。

注意：`go run` 方式启动的后端不内嵌前端页面，直接访问 8080 只有 API 接口，页面必须从 3000 端口打开。

### 注意事项

- 前端依赖必须用 pnpm 安装（`cd frontend; pnpm install`），不要用 npm
- Go 模块代理已全局配置为国内镜像：`go env -w GOPROXY=https://goproxy.cn,direct`
- 后端日志出现 `Server started on 0.0.0.0:8080` 即启动成功
- 数据库和 Redis 使用项目根目录 `.env` 中的地址，不需要再准备 `backend/config.yaml`
