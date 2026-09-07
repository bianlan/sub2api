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
docker compose --env-file .env -f docker-compose.standalone.yml config --quiet
docker compose --env-file .env -f docker-compose.standalone.yml up -d --build

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
