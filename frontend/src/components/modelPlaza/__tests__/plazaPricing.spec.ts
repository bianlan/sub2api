import { describe, expect, it } from 'vitest'
import type { ModelPlazaGroup, PlazaModel } from '@/api/modelPlaza'
import { buildPlazaApiSnippet } from '../plazaApiSnippet'
import {
  billingRate,
  buildPriceLines,
  buildTimePriceGroups,
  groupPriceTiers,
  cardPrices,
  collectModelCards,
  formatRate,
  longContextDisabled,
  type PlazaModelCard
} from '../plazaPricing'

function tokenModel(overrides: Partial<PlazaModel> = {}): PlazaModel {
  return {
    name: 'claude-sonnet',
    platform: 'anthropic',
    pricing: {
      billing_mode: 'token',
      input_price: 3e-6,
      output_price: 1.5e-5,
      cache_write_price: 3.75e-6,
      cache_read_price: 3e-7,
      image_input_price: null,
      image_output_price: null,
      per_request_price: null,
      intervals: []
    },
    official_pricing: {
      input_price: 3e-6,
      output_price: 1.5e-5,
      cache_write_price: 3.75e-6,
      cache_write_1h_price: 6e-6,
      cache_read_price: 3e-7
    },
    ...overrides
  }
}

function amounts(model: PlazaModel, rate: number): string[] {
  return buildPriceLines(model, rate).map((line) => `${line.prefix}${line.kind}:${line.amount}`)
}

describe('plazaPricing 实付价', () => {
  it('倍率为 1 时按 $/1M 展示，保底 2 位小数', () => {
    expect(amounts(tokenModel(), 1)).toEqual([
      'input:$3.00',
      'output:$15.00',
      'cacheWrite:$3.75',
      'cacheRead:$0.30'
    ])
  })

  it('倍率不为 1 时按折后实付价计算', () => {
    expect(amounts(tokenModel(), 0.5)).toContain('input:$1.50')
    expect(amounts(tokenModel(), 0.5)).toContain('output:$7.50')
  })

  it('用户专属倍率覆盖分组倍率', () => {
    const model = tokenModel()
    const rate = billingRate(model, {
      rate_multiplier: 1,
      user_rate_multiplier: 0.8,
      image_rate_independent: false,
      image_rate_multiplier: 1
    })
    expect(formatRate(rate)).toBe('0.8x')
    expect(amounts(model, rate)).toContain('input:$2.40')
    expect(amounts(model, rate)).toContain('output:$12.00')
  })

  it('分别展示 5m 与 1h 缓存写入价', () => {
    const model = tokenModel()
    model.pricing!.cache_write_1h_price = 7e-6
    expect(amounts(model, 1)).toContain('cacheWrite1h:$7.00')
  })

  it('按次计费用单次价乘倍率，不换算 1M', () => {
    const model = tokenModel({
      pricing: {
        billing_mode: 'per_request',
        input_price: null,
        output_price: null,
        cache_write_price: null,
        cache_read_price: null,
        image_input_price: null,
        image_output_price: null,
        per_request_price: 0.04,
        intervals: []
      }
    })
    expect(buildPriceLines(model, 0.5)).toEqual([
      { prefix: '', kind: 'call', amount: '$0.02', unit: 'request' }
    ])
  })

  it('按档位前缀分组，空前缀单独成一组', () => {
    const flat = groupPriceTiers(buildPriceLines(tokenModel(), 1))
    expect(flat).toHaveLength(1)
    expect(flat[0].prefix).toBe('')
    expect(flat[0].lines.map((line) => line.kind)).toEqual(['input', 'output', 'cacheWrite', 'cacheRead'])

    const model = tokenModel({
      pricing: {
        billing_mode: 'token',
        input_price: 3e-6,
        output_price: 1.5e-5,
        cache_write_price: null,
        cache_read_price: null,
        image_input_price: null,
        image_output_price: null,
        per_request_price: null,
        intervals: [
          {
            min_tokens: 0,
            max_tokens: 272000,
            tier_label: '',
            input_price: 2e-6,
            output_price: 1e-5,
            cache_write_price: 2.5e-6,
            cache_read_price: 2e-7,
            per_request_price: null
          },
          {
            min_tokens: 272000,
            max_tokens: null,
            tier_label: '',
            input_price: 4e-6,
            output_price: 1.5e-5,
            cache_write_price: 5e-6,
            cache_read_price: 4e-7,
            per_request_price: null
          }
        ]
      }
    })
    const tiers = groupPriceTiers(buildPriceLines(model, 1))
    expect(tiers.map((tier) => tier.prefix)).toEqual(['≤272K', '>272K'])
    expect(tiers[0].lines.map((line) => `${line.kind}:${line.amount}`)).toEqual([
      'input:$2.00',
      'output:$10.00',
      'cacheWrite:$2.50',
      'cacheRead:$0.20'
    ])
    expect(tiers[1].lines.map((line) => line.kind)).toEqual(['input', 'output', 'cacheWrite', 'cacheRead'])
  })

  it('按量阶梯按档折算，并生成区间标签', () => {
    const model = tokenModel({
      pricing: {
        billing_mode: 'token',
        input_price: 3e-6,
        output_price: 1.5e-5,
        cache_write_price: null,
        cache_read_price: null,
        image_input_price: null,
        image_output_price: null,
        per_request_price: null,
        intervals: [
          {
            min_tokens: 0,
            max_tokens: 200000,
            tier_label: '',
            input_price: 3e-6,
            output_price: 1.5e-5,
            cache_write_price: null,
            cache_read_price: null,
            per_request_price: null
          },
          {
            min_tokens: 200000,
            max_tokens: null,
            tier_label: '',
            input_price: 6e-6,
            output_price: 3e-5,
            cache_write_price: null,
            cache_read_price: null,
            per_request_price: null
          }
        ]
      }
    })
    const text = amounts(model, 0.5).join(' ')
    expect(text).toContain('≤200Kinput:$1.50')
    expect(text).toContain('>200Kinput:$3.00')
    expect(text).toContain('≤200Koutput:$7.50')
    expect(text).toContain('>200Koutput:$15.00')
  })

  it('无标签的多档按下限升序，形态为 ≤上限 / >下限', () => {
    const model = tokenModel({
      pricing: {
        billing_mode: 'token',
        input_price: 1,
        output_price: 1,
        cache_write_price: null,
        cache_read_price: null,
        image_input_price: null,
        image_output_price: null,
        per_request_price: null,
        intervals: [
          {
            min_tokens: 1000000,
            max_tokens: null,
            tier_label: '',
            input_price: 1e-6,
            output_price: 1e-6,
            cache_write_price: null,
            cache_read_price: null,
            per_request_price: null
          },
          {
            min_tokens: 100000,
            max_tokens: 200000,
            tier_label: '',
            input_price: 1e-6,
            output_price: 1e-6,
            cache_write_price: null,
            cache_read_price: null,
            per_request_price: null
          },
          {
            min_tokens: 0,
            max_tokens: 100000,
            tier_label: '',
            input_price: 1e-6,
            output_price: 1e-6,
            cache_write_price: null,
            cache_read_price: null,
            per_request_price: null
          },
          {
            min_tokens: 200000,
            max_tokens: 1000000,
            tier_label: '',
            input_price: 1e-6,
            output_price: 1e-6,
            cache_write_price: null,
            cache_read_price: null,
            per_request_price: null
          }
        ]
      }
    })
    const labels = buildPriceLines(model, 1)
      .filter((line) => line.kind === 'input')
      .map((line) => line.prefix)
    expect(labels).toEqual(['≤100K', '≤200K', '≤1M', '>1M'])
  })

  it('生图独立倍率开启时按独立倍率计价', () => {
    const model = tokenModel({
      pricing: {
        billing_mode: 'image',
        input_price: null,
        output_price: null,
        cache_write_price: null,
        cache_read_price: null,
        image_input_price: null,
        image_output_price: null,
        per_request_price: null,
        intervals: [
          {
            min_tokens: 0,
            max_tokens: null,
            tier_label: '1K',
            input_price: null,
            output_price: null,
            cache_write_price: null,
            cache_read_price: null,
            per_request_price: 0.02
          }
        ]
      }
    })
    const rate = billingRate(model, {
      rate_multiplier: 0.1,
      image_rate_independent: true,
      image_rate_multiplier: 1
    })
    expect(formatRate(rate)).toBe('1x')
    expect(buildPriceLines(model, rate)[0].amount).toBe('$0.02')
  })

  it('生图独立倍率关闭时仍乘分组倍率', () => {
    const model = tokenModel({
      pricing: {
        billing_mode: 'image',
        input_price: null,
        output_price: null,
        cache_write_price: null,
        cache_read_price: null,
        image_input_price: null,
        image_output_price: null,
        per_request_price: 0.2,
        intervals: []
      }
    })
    const rate = billingRate(model, {
      rate_multiplier: 0.1,
      image_rate_independent: false,
      image_rate_multiplier: 1
    })
    expect(formatRate(rate)).toBe('0.1x')
    expect(buildPriceLines(model, rate)[0].amount).toBe('$0.02')
  })

  it('按图阶梯只用 per_request_price，不用 image_output_price', () => {
    const model = tokenModel({
      pricing: {
        billing_mode: 'image',
        input_price: null,
        output_price: null,
        cache_write_price: null,
        cache_read_price: null,
        image_input_price: null,
        image_output_price: 3e-5,
        per_request_price: null,
        intervals: [
          {
            min_tokens: 0,
            max_tokens: null,
            tier_label: '1K',
            input_price: null,
            output_price: null,
            cache_write_price: null,
            cache_read_price: null,
            per_request_price: 0.01
          },
          {
            min_tokens: 0,
            max_tokens: null,
            tier_label: '2K',
            input_price: null,
            output_price: null,
            cache_write_price: null,
            cache_read_price: null,
            per_request_price: 0.02
          }
        ]
      }
    })
    const lines = buildPriceLines(model, 0.1)
    expect(lines.map((line) => `${line.prefix}:${line.amount}`)).toEqual(['1K:$0.001', '2K:$0.002'])
    expect(lines.map((line) => line.amount).join(' ')).not.toContain('$0.000003')
  })
})

describe('plazaPricing 阶梯缓存与分时', () => {
  it('阶梯缓存按档乘倍率', () => {
    const model = tokenModel({
      pricing: {
        billing_mode: 'token',
        input_price: 5e-6,
        output_price: 3e-5,
        cache_write_price: 6.25e-6,
        cache_read_price: 5e-7,
        image_input_price: null,
        image_output_price: null,
        per_request_price: null,
        intervals: [
          {
            min_tokens: 0,
            max_tokens: 272000,
            tier_label: '≤272K',
            input_price: 5e-6,
            output_price: 3e-5,
            cache_write_price: 6.25e-6,
            cache_read_price: 5e-7,
            per_request_price: null
          },
          {
            min_tokens: 272000,
            max_tokens: null,
            tier_label: '>272K',
            input_price: 1e-5,
            output_price: 4.5e-5,
            cache_write_price: 1.25e-5,
            cache_read_price: 1e-6,
            per_request_price: null
          }
        ]
      }
    })
    const text = amounts(model, 0.5).join(' ')
    expect(text).toContain('≤272KcacheWrite:$3.125')
    expect(text).toContain('≤272KcacheRead:$0.25')
    expect(text).toContain('>272KcacheWrite:$6.25')
    expect(text).toContain('>272KcacheRead:$0.50')
  })

  it('分时时段按生效倍率再乘时段倍率，不含高峰因子', () => {
    const model = tokenModel({
      time_pricing: {
        timezone: 'Asia/Shanghai',
        periods: [
          { start_time: '00:30', end_time: '08:30:00', multiplier: 0.5 },
          { start_time: '18:00', end_time: '22:00', multiplier: 1.2 }
        ]
      }
    })
    const groups = buildTimePriceGroups(model, 0.8)
    expect(groups[0].window).toBe('00:30–08:30')
    expect(groups[0].periodRate).toBe(0.4)
    expect(groups[0].lines.find((line) => line.kind === 'input')?.amount).toBe('$1.20')
    expect(groups[0].lines.find((line) => line.kind === 'output')?.amount).toBe('$6.00')
    expect(groups[1].window).toBe('18:00–22:00')
    expect(groups[1].periodRate).toBe(0.96)
    expect(groups[1].lines.find((line) => line.kind === 'input')?.amount).toBe('$2.88')
    expect(groups[0].weekdays).toBe(false)
  })

  it('仅工作日生效时打上 weekdays 标记', () => {
    const model = tokenModel({
      time_pricing: {
        timezone: 'Asia/Shanghai',
        weekdays_only: true,
        periods: [{ start_time: '00:30', end_time: '08:30', multiplier: 0.5 }]
      }
    })
    expect(buildTimePriceGroups(model, 1)[0].weekdays).toBe(true)
  })

  it('分组关闭阶梯且官方仍有阶梯时提示；缺字段或已开启时不提示', () => {
    const model = tokenModel({
      official_pricing: {
        input_price: 1,
        output_price: 1,
        cache_write_price: null,
        cache_read_price: null,
        intervals: [
          {
            min_tokens: 0,
            max_tokens: 1,
            input_price: 1,
            output_price: 1,
            cache_write_price: null,
            cache_read_price: null,
            per_request_price: null
          },
          {
            min_tokens: 1,
            max_tokens: null,
            input_price: 2,
            output_price: 2,
            cache_write_price: null,
            cache_read_price: null,
            per_request_price: null
          }
        ]
      }
    })
    expect(longContextDisabled({ long_context_pricing_enabled: false }, model)).toBe(true)
    expect(longContextDisabled({ long_context_pricing_enabled: true }, model)).toBe(false)
    expect(longContextDisabled({}, model)).toBe(false)
    expect(longContextDisabled({ long_context_pricing_enabled: false }, tokenModel())).toBe(false)
  })
})

describe('plazaPricing 卡片聚合', () => {
  function group(overrides: Partial<ModelPlazaGroup> = {}): ModelPlazaGroup {
    return {
      id: 1,
      name: 'claude',
      description: '',
      platform: 'anthropic',
      subscription_type: 'standard',
      rate_multiplier: 1,
      peak_rate_enabled: false,
      peak_start: '',
      peak_end: '',
      peak_rate_multiplier: 1,
      is_exclusive: false,
      image_rate_independent: false,
      image_rate_multiplier: 1,
      long_context_pricing_enabled: true,
      models: [tokenModel()],
      ...overrides
    }
  }

  it('同一平台同名模型只出一张卡，报价按倍率从低到高', () => {
    const cards = collectModelCards([
      group({ id: 2, name: 'full', rate_multiplier: 1 }),
      group({ id: 1, name: 'cheap', rate_multiplier: 0.1 })
    ])
    expect(cards).toHaveLength(1)
    expect(cards[0].offers.map((offer) => offer.group.name)).toEqual(['cheap', 'full'])
    expect(cardPrices(cards[0].offers[0].model, cards[0].offers[0].rate).map((item) => item.amount)).toContain(
      '$0.30'
    )
  })

  it('不同平台的同名模型分成两张卡', () => {
    const cards = collectModelCards([
      group({
        id: 1,
        platform: 'anthropic',
        models: [tokenModel({ name: 'shared', platform: 'anthropic' })]
      }),
      group({
        id: 2,
        name: 'openai',
        platform: 'openai',
        models: [tokenModel({ name: 'shared', platform: 'openai' })]
      })
    ])
    expect(cards.map((card: PlazaModelCard) => card.platform).sort()).toEqual(['anthropic', 'openai'])
  })

  it('卡片缓存只保留读取价一行', () => {
    const prices = cardPrices(tokenModel(), 1)
    expect(prices.map((item) => item.kind)).toEqual(['input', 'output', 'cache'])
    expect(prices[2].amount).toBe('$0.30')
  })
})

describe('plazaApiSnippet', () => {
  it('四种语言都使用 $YOUR_API_KEY 和 /v1/chat/completions', () => {
    for (const lang of ['curl', 'python', 'typescript', 'javascript'] as const) {
      const text = buildPlazaApiSnippet('claude-opus-5', 'https://example.com', lang)
      expect(text).toContain('$YOUR_API_KEY')
      expect(text).not.toContain('$NEW_API_KEY')
      expect(text).not.toContain('Bearer YOUR_API_KEY')
      expect(text).toContain('https://example.com/v1/chat/completions')
      expect(text).toContain('claude-opus-5')
    }
  })
})
