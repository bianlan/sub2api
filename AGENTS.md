## 项目打包
本项目打包使用单独部署的方式，参考myreadme.md文件
打包只涉及到项目根目录的：docker-compose.standalone.yml、Dockerfile两个文件

## 项目概览

- 技术栈：Go 后端（Gin + Ent ORM）+ Vue3 前端（Vite + pnpm）+ PostgreSQL + Redis
- 上游仓库：Wei-Shaw/sub2api
- 后端入口：`backend/cmd/server/main.go`；配置文件：`backend/config.yaml`（本地文件，已被 .gitignore 忽略）
- 前端构建产物输出到 `backend/internal/web/dist`，生产镜像通过 `-tags embed` 内嵌进后端二进制
- 数据库迁移：后端启动时自动执行（幂等），SQL 文件在 `backend/migrations/`

## 本地开发环境信息

- 操作系统：中文 Windows
- Go 1.26.3，GOTOOLCHAIN=auto（按 backend/go.mod 自动使用 go1.27.0 工具链）
- Go 代理已全局配置：GOPROXY=https://goproxy.cn,direct，GOSUMDB=sum.golang.google.cn
- Node v24.18.0，pnpm 9.15.9（前端必须用 pnpm，不能用 npm）
- Docker Desktop 运行两个依赖容器：
  - `pgvector`（pgvector/pgvector:0.8.0-pg17）：宿主机端口 54333，账号 pgvector / bianlan1989，开发库名 sub2api
  - `redis`（redis:8-alpine）：端口 6379，无密码
- 管理员账号：admin@sub2api.local（密码见根目录 .env 的 ADMIN_PASSWORD，.env 不入库）

## 前后端启动命令

```powershell
# 后端：监听 0.0.0.0:8080，读取 backend/config.yaml
cd backend
go run ./cmd/server/

# 前端：vite 监听 http://localhost:3000，/api、/v1、/setup 自动代理到 8080
cd frontend
pnpm dev
```

- 开发访问入口：`http://localhost:3000`（go run 不内嵌前端页面，不能直接用 8080 打开页面）
- 依赖容器未运行时先启动：`docker start pgvector redis`

## 常用命令

```powershell
# 后端单元测试
cd backend; go test -tags=unit ./...

# 后端集成测试
cd backend; go test -tags=integration ./...

# 后端 Lint（本地建议与 CI 一致用 v2.13）
cd backend; golangci-lint run ./...

# Ent 代码生成（修改 ent/schema 后必须执行并提交生成代码）
cd backend; go generate ./ent

# 前端类型检查 / 测试
cd frontend; pnpm typecheck
cd frontend; pnpm test:run
```

## 开发注意事项

- 修改 `frontend/package.json` 后执行 `pnpm install` 并同步提交 `pnpm-lock.yaml`（CI 用 --frozen-lockfile）
- `backend/config.yaml`、`backend/.installed` 是本地运行文件，不要提交
- 接口方式限定 GET/POST，严禁 PUT/DELETE（用户要求）
- 新增代码需在函数和复杂逻辑处添加中文注释，保持代码简洁易懂
- 项目配置文件以项目根目录的.env文件为准
- 项目不需要兼容多语言，只需要兼容中文即可。
