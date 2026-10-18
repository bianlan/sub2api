/**
 * 模型广场的实付价展示。
 * 口径与原价目表一致：实付 = 渠道单价 × 生效倍率；生图独立倍率只作用于按图片计费。
 */
import { formatScaled } from '@/utils/pricing'
import {
  BILLING_MODE_IMAGE,
  BILLING_MODE_TOKEN,
  type BillingMode
} from '@/constants/channel'
import type { ModelPlazaGroup, PlazaModel, PlazaTimePricingPeriod } from '@/api/modelPlaza'
import type { UserPricingInterval } from '@/api/channels'

const PER_MILLION = 1_000_000
const MIN_DECIMALS = 2

export type PriceKind = 'input' | 'output' | 'cacheWrite' | 'cacheWrite1h' | 'cacheRead' | 'call'
export type PriceUnit = 'million' | 'request' | 'image'

/** 抽屉价格摘要里的一行。prefix 为档位或空。 */
export interface PriceLine {
  prefix: string
  kind: PriceKind
  amount: string
  unit: PriceUnit
}

/** 卡片上的紧凑价格。缓存只保留一行。 */
export interface CardPrice {
  kind: 'input' | 'output' | 'cache' | 'call'
  unit: PriceUnit
  amount: string
}

/** 一个分时时段的折后价。价格不含高峰倍率。 */
export interface TimePriceGroup {
  window: string
  weekdays: boolean
  periodRate: number
  lines: PriceLine[]
}

export interface PlazaModelOffer {
  group: ModelPlazaGroup
  model: PlazaModel
  rate: number
}

/** 同一平台下的同名模型合成一张卡，offers 按生效倍率从低到高。 */
export interface PlazaModelCard {
  key: string
  name: string
  platform: string
  offers: PlazaModelOffer[]
}

/** 生效倍率 = 用户专属倍率，否则分组默认倍率。 */
export function groupEffectiveRate(group: {
  rate_multiplier: number
  user_rate_multiplier?: number
}): number {
  return group.user_rate_multiplier ?? group.rate_multiplier
}

export function billingModeOf(model: PlazaModel): BillingMode {
  return (model.pricing?.billing_mode || BILLING_MODE_TOKEN) as BillingMode
}

/** 按图片且分组开了生图独立倍率时，实付不走分组/专属倍率。 */
export function usesIndependentImageRate(
  model: PlazaModel,
  group: { image_rate_independent: boolean }
): boolean {
  return billingModeOf(model) === BILLING_MODE_IMAGE && group.image_rate_independent === true
}

/** 这一条报价真正参与计价的倍率。 */
export function billingRate(
  model: PlazaModel,
  group: {
    rate_multiplier: number
    user_rate_multiplier?: number
    image_rate_independent: boolean
    image_rate_multiplier: number
  }
): number {
  if (usesIndependentImageRate(model, group)) return group.image_rate_multiplier ?? 1
  return groupEffectiveRate(group)
}

/** 去掉浮点噪声后展示，如 0.8 × 1.2 → 0.96x。 */
export function formatRate(value: number): string {
  return `${Math.round(value * 1000) / 1000}x`
}

/** 时段行倍率 = 生效倍率 × 时段倍率。 */
export function periodRate(baseRate: number, multiplier: number): number {
  return Math.round(baseRate * multiplier * 1000) / 1000
}

export function paidPerMillion(value: number | null | undefined, rate: number): string {
  if (value == null) return '-'
  return formatScaled(value * rate, PER_MILLION, MIN_DECIMALS)
}

export function paidUnitPrice(value: number | null | undefined, rate: number): string {
  if (value == null) return '-'
  return formatScaled(value * rate, 1, MIN_DECIMALS)
}

/** 按量计费用「按量计费」，其余沿用价目表文案 key。 */
export function billingLabelKey(model: PlazaModel): string {
  const mode = billingModeOf(model)
  if (mode === BILLING_MODE_IMAGE) return 'modelPlaza.table.perImage'
  if (mode === BILLING_MODE_TOKEN) return 'modelPlaza.card.tokenBilling'
  return 'modelPlaza.table.perRequest'
}

/**
 * 分组关了长上下文、但官方目录仍有阶梯时，提示实付按基础档。
 * 字段缺失（旧后端）不提示。
 */
export function longContextDisabled(
  group: { long_context_pricing_enabled?: boolean },
  model: PlazaModel
): boolean {
  if (group.long_context_pricing_enabled !== false) return false
  return (model.official_pricing?.intervals?.length ?? 0) > 1
}

export function modelKey(platform: string, name: string): string {
  return `${platform}\n${name}`
}

/** 把当前筛选后的分组收成模型卡片。 */
export function collectModelCards(groups: ModelPlazaGroup[]): PlazaModelCard[] {
  const map = new Map<string, PlazaModelCard>()
  for (const group of groups) {
    for (const model of group.models) {
      const platform = model.platform || group.platform
      const key = modelKey(platform, model.name)
      let card = map.get(key)
      if (!card) {
        card = { key, name: model.name, platform, offers: [] }
        map.set(key, card)
      }
      card.offers.push({ group, model, rate: billingRate(model, group) })
    }
  }
  for (const card of map.values()) {
    card.offers.sort((a, b) => a.rate - b.rate || a.group.name.localeCompare(b.group.name))
  }
  return [...map.values()].sort(
    (a, b) => a.name.localeCompare(b.name) || a.platform.localeCompare(b.platform)
  )
}

/** 标准时段的价格行。有阶梯时按档列出，不使用 image_output_price 充当按次价。 */
export function buildPriceLines(model: PlazaModel, rate: number): PriceLine[] {
  if (!model.pricing) return []
  if (billingModeOf(model) !== BILLING_MODE_TOKEN) return buildCallLines(model, rate)
  return buildTokenLines(model, rate)
}

/** 卡片只展示基础档的输入、输出，以及一行缓存或一次调用价。 */
export function cardPrices(model: PlazaModel, rate: number): CardPrice[] {
  const lines = buildPriceLines(model, rate)
  if (billingModeOf(model) !== BILLING_MODE_TOKEN) {
    const call = lines.find((line) => line.kind === 'call')
    return call ? [{ kind: 'call', unit: call.unit, amount: call.amount }] : []
  }
  const prefix = lines.find((line) => line.kind === 'input')?.prefix ?? ''
  const base = lines.filter((line) => line.prefix === prefix)
  const input = base.find((line) => line.kind === 'input')
  const output = base.find((line) => line.kind === 'output')
  const cache = base.find((line) => line.kind === 'cacheRead') || base.find((line) => line.kind === 'cacheWrite')
  const result: CardPrice[] = []
  if (input) result.push({ kind: 'input', unit: 'million', amount: input.amount })
  if (output) result.push({ kind: 'output', unit: 'million', amount: output.amount })
  if (cache) result.push({ kind: 'cache', unit: 'million', amount: cache.amount })
  return result
}

/** 分时时段各自折算。高峰倍率不乘进这些数字。 */
export function buildTimePriceGroups(model: PlazaModel, baseRate: number): TimePriceGroup[] {
  const weekdays = model.time_pricing?.weekdays_only === true
  return (model.time_pricing?.periods ?? []).map((period) => {
    const rate = periodRate(baseRate, period.multiplier)
    return {
      window: formatTimeWindow(period),
      weekdays,
      periodRate: rate,
      lines: buildPriceLines(model, rate)
    }
  })
}

function buildTokenLines(model: PlazaModel, rate: number): PriceLine[] {
  const intervals = tokenIntervals(model)
  if (intervals.length) {
    const lines = intervals.flatMap((interval) => tokenTierLines(tierLabel(interval), interval, rate))
    if (!hasTierCache(intervals)) lines.push(...flatCacheLines(model, rate, ''))
    return lines
  }
  const pricing = model.pricing
  return [
    { prefix: '', kind: 'input', amount: paidPerMillion(pricing?.input_price, rate), unit: 'million' },
    { prefix: '', kind: 'output', amount: paidPerMillion(pricing?.output_price, rate), unit: 'million' },
    ...flatCacheLines(model, rate, '')
  ]
}

function tokenTierLines(prefix: string, interval: UserPricingInterval, rate: number): PriceLine[] {
  const lines: PriceLine[] = [
    { prefix, kind: 'input', amount: paidPerMillion(interval.input_price, rate), unit: 'million' },
    { prefix, kind: 'output', amount: paidPerMillion(interval.output_price, rate), unit: 'million' }
  ]
  if (interval.cache_write_price != null) {
    lines.push({
      prefix,
      kind: 'cacheWrite',
      amount: paidPerMillion(interval.cache_write_price, rate),
      unit: 'million'
    })
  }
  if (interval.cache_write_1h_price != null) {
    lines.push({
      prefix,
      kind: 'cacheWrite1h',
      amount: paidPerMillion(interval.cache_write_1h_price, rate),
      unit: 'million'
    })
  }
  if (interval.cache_read_price != null) {
    lines.push({
      prefix,
      kind: 'cacheRead',
      amount: paidPerMillion(interval.cache_read_price, rate),
      unit: 'million'
    })
  }
  return lines
}

function flatCacheLines(model: PlazaModel, rate: number, prefix: string): PriceLine[] {
  const pricing = model.pricing
  if (!pricing) return []
  const lines: PriceLine[] = []
  if (pricing.cache_write_price != null) {
    lines.push({
      prefix,
      kind: 'cacheWrite',
      amount: paidPerMillion(pricing.cache_write_price, rate),
      unit: 'million'
    })
  }
  if (pricing.cache_write_1h_price != null) {
    lines.push({
      prefix,
      kind: 'cacheWrite1h',
      amount: paidPerMillion(pricing.cache_write_1h_price, rate),
      unit: 'million'
    })
  }
  if (pricing.cache_read_price != null) {
    lines.push({
      prefix,
      kind: 'cacheRead',
      amount: paidPerMillion(pricing.cache_read_price, rate),
      unit: 'million'
    })
  }
  return lines
}

function buildCallLines(model: PlazaModel, rate: number): PriceLine[] {
  const unit: PriceUnit = billingModeOf(model) === BILLING_MODE_IMAGE ? 'image' : 'request'
  const intervals = requestIntervals(model)
  if (intervals.length) {
    return intervals.map((interval) => ({
      prefix: tierLabel(interval),
      kind: 'call' as const,
      amount: paidUnitPrice(interval.per_request_price, rate),
      unit
    }))
  }
  if (model.pricing?.per_request_price == null) return []
  return [{ prefix: '', kind: 'call', amount: paidUnitPrice(model.pricing.per_request_price, rate), unit }]
}

function tokenIntervals(model: PlazaModel): UserPricingInterval[] {
  return sortByContext(model.pricing?.intervals ?? [])
}

function requestIntervals(model: PlazaModel): UserPricingInterval[] {
  return (model.pricing?.intervals ?? []).filter((interval) => interval.per_request_price != null)
}

function hasTierCache(intervals: UserPricingInterval[]): boolean {
  return intervals.some(
    (interval) =>
      interval.cache_write_price != null ||
      interval.cache_write_1h_price != null ||
      interval.cache_read_price != null
  )
}

function sortByContext(intervals: UserPricingInterval[]): UserPricingInterval[] {
  return [...intervals].sort((a, b) => a.min_tokens - b.min_tokens)
}

/** 有标签用标签；否则「≤上限」或「>下限」。 */
export function tierLabel(interval: UserPricingInterval): string {
  if (interval.tier_label) return interval.tier_label
  const { min_tokens: min, max_tokens: max } = interval
  return max == null ? `>${formatTokenCount(min)}` : `≤${formatTokenCount(max)}`
}

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${trimZero(n / 1_000_000)}M`
  if (n >= 1_000) return `${trimZero(n / 1_000)}K`
  return String(n)
}

function trimZero(n: number): string {
  return String(Math.round(n * 100) / 100)
}

/** “00:30–08:30”；整分钟的 HH:mm:ss 省略秒。 */
function formatTimeWindow(period: PlazaTimePricingPeriod): string {
  const clock = (value: string) => value.replace(/^(\d{2}:\d{2}):00$/, '$1')
  return `${clock(period.start_time)}–${clock(period.end_time)}`
}
