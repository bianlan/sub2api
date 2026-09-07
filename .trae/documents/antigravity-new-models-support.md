# Antigravity 平台新增模型支持计划

> 新增模型：`gemini-3.7-flash`、`gemini-3.8-flash`（各含基础版 + 4 个档位变体）、`claude-sonnet-4-6-thinking`

## 一、问题结论（回答用户疑问）

**是的，必须把这些模型添加到项目的模型清单中，否则无法生效。** 原因链路如下：

1. 添加 antigravity 账号时，界面上的"模型映射列表"来自后端 `DefaultAntigravityModelMapping`（constants.go），且这份默认映射会被**存储进账号**的 `model_mapping`
2. 请求路由时，后端 `IsModelSupported()` 会校验请求的模型名是否在账号的 `model_mapping` 中，**不在则该账号被排除，导致 no available accounts 错误**
3. 已有账号存储的是旧映射，必须靠 `ensureAntigravityDefaultPassthroughs()` 强制注入列表才能用上新模型
4. 计费依赖价卡配置，缺失时会按 $0 记录用量

## 二、现状分析（数据流）

| 环节        | 位置                                                                            | 作用                                                                         |
| --------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 前端-默认映射   | `CreateAccountModal.vue`（L4584-4596）                                          | antigravity 强制"映射模式"，映射列表通过 `fetchAntigravityDefaultMappings()` 从后端 API 加载 |
| 前端-快捷按钮   | `useModelWhitelist.ts` 的 `antigravityPresetMappings`（L331-367，硬编码）            | 映射编辑器的"+ 快捷添加"按钮                                                           |
| 前端-静态模型列表 | `useModelWhitelist.ts` 的 `antigravityModels`（L58-89，硬编码）                      | 平台可选模型清单                                                                   |
| 后端-默认映射   | `domain/constants.go` 的 `DefaultAntigravityModelMapping`（L99-154）             | 新账号默认映射 + 前端映射列表数据源                                                        |
| 后端-已有账号注入 | `service/account.go` 的 `ensureAntigravityDefaultPassthroughs`（L656-665）       | 对存储了自定义/旧映射的账号强制补充默认透传模型                                                   |
| 后端-可用模型列表 | `pkg/antigravity/claude_types.go` 的 `claudeModels`/`geminiModels`（L155-189）   | `GetAvailableModels` API 数据源（账号测试弹窗使用）                                     |
| 后端-计费兜底   | `service/billing_service.go`（fallbackPrices L396-401、模糊匹配 L851-853）           | 远程价卡不可用时的兜底价格                                                              |
| 后端-档位归一化  | `service/pricing_service.go` 的 `normalizeGeminiThinkingTierAlias`（L1118-1126） | 把 `-high/-low/-medium/-tiered` 档位模型归一到基础模型价卡                               |
| 价卡 JSON   | `resources/model-pricing/model_prices_and_context_window.json`                | 本地 LiteLLM 格式价卡（首要计价来源）                                                    |

## 三、修改方案（共 7 处，参照 gemini-3.6-flash 的既有模式）

### 1. `backend/internal/domain/constants.go` — DefaultAntigravityModelMapping

在 Gemini 3.6 块（L142-147）之后追加（全部透传，映射到自身）：

```go
// Gemini 3.7 Flash tiered models（2026-08-13 发布，基础版+档位变体）
"gemini-3.7-flash":        "gemini-3.7-flash",
"gemini-3.7-flash-high":   "gemini-3.7-flash-high",
"gemini-3.7-flash-low":    "gemini-3.7-flash-low",
"gemini-3.7-flash-medium": "gemini-3.7-flash-medium",
"gemini-3.7-flash-tiered": "gemini-3.7-flash-tiered",
// Gemini 3.8 Flash tiered models（2026-09-02 发布，基础版+档位变体）
"gemini-3.8-flash":        "gemini-3.8-flash",
"gemini-3.8-flash-high":   "gemini-3.8-flash-high",
"gemini-3.8-flash-low":    "gemini-3.8-flash-low",
"gemini-3.8-flash-medium": "gemini-3.8-flash-medium",
"gemini-3.8-flash-tiered": "gemini-3.8-flash-tiered",
```

在 Claude 白名单区 `"claude-sonnet-4-6"`（L108）附近追加：

```go
"claude-sonnet-4-6-thinking": "claude-sonnet-4-6-thinking", // 官方模型
```

### 2. `backend/internal/pkg/antigravity/claude_types.go`

`geminiModels` 列表（L169-189）末尾追加 10 条（档位变体 `IsReasoning: true`，基础版不设——与 3.6 模式完全一致）：

```go
{ID: "gemini-3.7-flash", DisplayName: "Gemini 3.7 Flash", CreatedAt: "2026-08-13T00:00:00Z"},
{ID: "gemini-3.7-flash-high", DisplayName: "Gemini 3.7 Flash High", CreatedAt: "2026-08-13T00:00:00Z", IsReasoning: true},
{ID: "gemini-3.7-flash-low", DisplayName: "Gemini 3.7 Flash Low", CreatedAt: "2026-08-13T00:00:00Z", IsReasoning: true},
{ID: "gemini-3.7-flash-medium", DisplayName: "Gemini 3.7 Flash Medium", CreatedAt: "2026-08-13T00:00:00Z", IsReasoning: true},
{ID: "gemini-3.7-flash-tiered", DisplayName: "Gemini 3.7 Flash", CreatedAt: "2026-08-13T00:00:00Z", IsReasoning: true},
{ID: "gemini-3.8-flash", DisplayName: "Gemini 3.8 Flash", CreatedAt: "2026-09-02T00:00:00Z"},
{ID: "gemini-3.8-flash-high", DisplayName: "Gemini 3.8 Flash High", CreatedAt: "2026-09-02T00:00:00Z", IsReasoning: true},
{ID: "gemini-3.8-flash-low", DisplayName: "Gemini 3.8 Flash Low", CreatedAt: "2026-09-02T00:00:00Z", IsReasoning: true},
{ID: "gemini-3.8-flash-medium", DisplayName: "Gemini 3.8 Flash Medium", CreatedAt: "2026-09-02T00:00:00Z", IsReasoning: true},
{ID: "gemini-3.8-flash-tiered", DisplayName: "Gemini 3.8 Flash", CreatedAt: "2026-09-02T00:00:00Z", IsReasoning: true},
```

`claudeModels` 列表（L155-166）中 `claude-sonnet-4-6` 后追加（现有 claude 条目均不设 IsReasoning，保持一致）：

```go
{ID: "claude-sonnet-4-6-thinking", DisplayName: "Claude Sonnet 4.6 Thinking", CreatedAt: "2026-02-17T00:00:00Z"},
```

### 3. `backend/internal/service/account.go` — ensureAntigravityDefaultPassthroughs 注入列表（L656-665）

在现有 `[]string{...}` 中追加 11 个模型（**已有账号生效的关键**）：

```go
"gemini-3.7-flash", "gemini-3.7-flash-high", "gemini-3.7-flash-low", "gemini-3.7-flash-medium", "gemini-3.7-flash-tiered",
"gemini-3.8-flash", "gemini-3.8-flash-high", "gemini-3.8-flash-low", "gemini-3.8-flash-medium", "gemini-3.8-flash-tiered",
"claude-sonnet-4-6-thinking",
```

> 说明：`claude-sonnet-4-6-thinking` 是该列表首个 claude 模型。因为 antigravity 账号创建时会把当时的默认映射整个存进账号，**已有账号必须靠此机制注入新模型才能生效**（与 gemini-3.6 模式一致）。注入逻辑是"仅当现有映射完全未覆盖该模型时才补充透传"，不会破坏用户已配置的通配符映射。

### 4. `backend/internal/service/billing_service.go`

（a）fallbackPrices：在 `gemini-3.6-flash` 条目（L396-401）后追加（官方介绍期价格，2026-12-31 前有效）：

```go
// Gemini 3.7 / 3.8 Flash（Google 官方介绍期价格：$0.75 输入 / $3.75 输出 /
// $0.075 缓存读 per MTok，2026-12-31 前有效；2027-01-01 起翻倍为 $1.5/$7.5）。
// Antigravity 的 -high/-low/-medium/-tiered 档位别名由下方模糊匹配分支统一计价。
s.fallbackPrices["gemini-3.7-flash"] = &ModelPricing{
    InputPricePerToken:     0.75e-6,
    OutputPricePerToken:    3.75e-6,
    CacheReadPricePerToken: 0.075e-6,
    SupportsCacheBreakdown: false,
}
s.fallbackPrices["gemini-3.8-flash"] = &ModelPricing{
    InputPricePerToken:     0.75e-6,
    OutputPricePerToken:    3.75e-6,
    CacheReadPricePerToken: 0.075e-6,
    SupportsCacheBreakdown: false,
}
```

（b）模糊匹配分支：在 3.6 分支（L851-853）后追加（`Contains` 可同时覆盖档位变体）：

```go
if strings.Contains(modelLower, "gemini-3.7-flash") || strings.Contains(modelLower, "gemini-3-7-flash") {
    return s.fallbackPrices["gemini-3.7-flash"]
}
if strings.Contains(modelLower, "gemini-3.8-flash") || strings.Contains(modelLower, "gemini-3-8-flash") {
    return s.fallbackPrices["gemini-3.8-flash"]
}
```

（c）`claude-sonnet-4-6-thinking` **无需改动**：现有 sonnet 模糊分支（L832-837）已按 $3/$15/$3.75/$0.30 兜底，与 sonnet-4-6 官方价一致。

### 5. `backend/internal/service/pricing_service.go` — normalizeGeminiThinkingTierAlias（L1118-1126）

把硬编码的 3.6 泛化为三个基础模型（保持函数签名与语义不变）：

```go
// normalizeGeminiThinkingTierAlias 将 Antigravity 的 Gemini Flash 档位模型 ID
// （-high/-low/-medium/-tiered）归一化到公开的基础模型。档位只控制推理行为，
// 不影响公布的 token 单价，因此档位请求与基础模型使用同一张价卡。
func normalizeGeminiThinkingTierAlias(model string) string {
    baseModels := []string{"gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.8-flash"}
    for _, baseModel := range baseModels {
        for _, tier := range []string{"-high", "-low", "-medium", "-tiered"} {
            if model == baseModel+tier {
                return baseModel
            }
        }
    }
    return model
}
```

### 6. `backend/resources/model-pricing/model_prices_and_context_window.json`

（a）在 `gemini-3.6-flash` 条目（L2355-2371）之后、`gemini-embedding-001`（L2372）之前插入两个价卡（字段值按官方介绍期价格，Priority 档 = 1.8 倍）：

```json
"gemini-3.7-flash": {
    "cache_read_input_token_cost": 7.5e-08,
    "cache_read_input_token_cost_priority": 1.35e-07,
    "input_cost_per_token": 7.5e-07,
    "input_cost_per_token_priority": 1.35e-06,
    "litellm_provider": "vertex_ai-language-models",
    "max_input_tokens": 1048576,
    "max_output_tokens": 65536,
    "max_tokens": 65536,
    "mode": "chat",
    "output_cost_per_token": 3.75e-06,
    "output_cost_per_token_priority": 6.75e-06,
    "source": "https://ai.google.dev/gemini-api/docs/pricing",
    "supports_prompt_caching": true,
    "supports_reasoning": true,
    "supports_service_tier": true
},
```

`gemini-3.8-flash` 同样字段、同样数值（官方公布两者价格完全相同）。

（b）在 `claude-sonnet-4-6` 条目（L680-710）之后插入 `claude-sonnet-4-6-thinking`：**完整复制 claude-sonnet-4-6 的所有字段与数值**（$3 输入 / $15 输出 / 缓存写 $3.75 / 缓存读 $0.30），仅改键名。

### 7. `frontend/src/composables/useModelWhitelist.ts`

（a）`antigravityModels`（L58-89）：Claude 区 `"claude-sonnet-4-6"` 后追加 `'claude-sonnet-4-6-thinking'`；Gemini 3.1 区后追加两个新系列区：

```ts
// Gemini 3.7 系列
'gemini-3.7-flash',
'gemini-3.7-flash-high',
'gemini-3.7-flash-low',
'gemini-3.7-flash-medium',
'gemini-3.7-flash-tiered',
// Gemini 3.8 系列
'gemini-3.8-flash',
'gemini-3.8-flash-high',
'gemini-3.8-flash-low',
'gemini-3.8-flash-medium',
'gemini-3.8-flash-tiered',
```

（b）`antigravityPresetMappings`（L331-367）"精确映射"区追加 3 个透传快捷按钮（档位变体不加按钮，与 3.6 处理一致，用户可手输）：

```ts
{ label: '3.7-Flash透传', from: 'gemini-3.7-flash', to: 'gemini-3.7-flash', color: 'bg-lime-100 text-lime-700 hover:bg-lime-200 dark:bg-lime-900/30 dark:text-lime-400' },
{ label: '3.8-Flash透传', from: 'gemini-3.8-flash', to: 'gemini-3.8-flash', color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400' },
{ label: 'Sonnet 4.6-thinking', from: 'claude-sonnet-4-6-thinking', to: 'claude-sonnet-4-6-thinking', color: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400' },
```

## 四、明确不修改的内容

- **gemini 平台相关**（`geminicli/models.go`、`gemini/models.go`、前端 `geminiModels`）——用户已确认只改 antigravity

- **打包文件**（docker-compose.standalone.yml、Dockerfile）——本改动不涉及打包

- **无新增依赖**——不需要改 requirements.txt / package.json

- 不修改任何既有映射条目，纯增量添加，不影响已有模型的使用

## 五、验证步骤

1. 后端编译：`cd backend && go build ./...`
2. 后端测试：`go test ./internal/service/... ./internal/pkg/antigravity/... ./internal/handler/...`（若有测试断言模型清单内容，按新增模型同步更新断言）
3. 前端构建：`cd frontend && npm run build`
4. 手动验证：

   - 管理后台 → 账号管理 → 添加账号 → Antigravity：默认映射列表出现 gemini-3.7/3.8 系列（共 10 条）与 claude-sonnet-4-6-thinking；快捷按钮出现 3 个新预设

   - 账号测试弹窗的可用模型列表中出现新模型

   - 对**已有** antigravity 账号请求 `gemini-3.8-flash` 等新模型名，能正常路由转发（不再报 no available accounts）

   - 用量记录中新模型单价正确（$0.75 / $3.75）

## 六、假设与说明

- 官方价格依据：Gemini 3.7/3.8 Flash 介绍期 $0.75 输入 / $3.75 输出 / $0.075 缓存读 per MTok（2026-12-31 截止，2027-01-01 起翻倍，届时需更新价卡，已在代码注释中标注）

- `claude-sonnet-4-6-thinking` 价格与 `claude-sonnet-4-6` 完全相同（thinking token 按输出计费，单价不变）

- 档位变体命名（-high/-low/-medium/-tiered）沿用 gemini-3.6-flash 在 Antigravity 上游的既有命名模式（用户已确认按此模式添加）

