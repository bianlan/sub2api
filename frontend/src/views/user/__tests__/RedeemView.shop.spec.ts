import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import RedeemView from '../RedeemView.vue'

const getHistory = vi.hoisted(() => vi.fn())
const getPublicSettings = vi.hoisted(() => vi.fn())

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
    }),
  }
})

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: { balance: 12.5, concurrency: 2 },
    refreshUser: vi.fn(),
  }),
}))

vi.mock('@/stores/app', () => ({
  useAppStore: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
    showWarning: vi.fn(),
  }),
}))

vi.mock('@/stores/subscriptions', () => ({
  useSubscriptionStore: () => ({
    fetchActiveSubscriptions: vi.fn(),
  }),
}))

vi.mock('@/api', () => ({
  redeemAPI: { getHistory, redeem: vi.fn() },
  authAPI: { getPublicSettings },
}))

// 兑换页按公开设置里的 https 链接决定是否渲染店铺。
function mountRedeem() {
  return shallowMount(RedeemView, {
    global: {
      stubs: {
        AppLayout: { template: '<div><slot /></div>' },
        Icon: true,
      },
    },
  })
}

describe('RedeemView shop embed', () => {
  beforeEach(() => {
    getHistory.mockReset()
    getPublicSettings.mockReset()
    getHistory.mockResolvedValue([])
  })

  it('链接为空时不显示充值区', async () => {
    getPublicSettings.mockResolvedValue({ contact_info: '', payment_page_url: '' })
    const wrapper = mountRedeem()
    await flushPromises()

    expect(wrapper.find('iframe').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('redeem.shopTitle')
  })

  it('https 链接显示说明、新窗口和店铺', async () => {
    getPublicSettings.mockResolvedValue({
      contact_info: '',
      payment_page_url: ' https://wzyp.cn/shop/EBOAT51U ',
    })
    const wrapper = mountRedeem()
    await flushPromises()

    const frame = wrapper.get('iframe')
    expect(frame.attributes('src')).toBe('https://wzyp.cn/shop/EBOAT51U')
    expect(frame.attributes('scrolling')).toBe('no')
    expect(frame.classes()).toContain('shop-frame')
    expect(wrapper.text()).not.toContain('redeem.recentActivity')
    const link = wrapper.get('a')
    expect(link.attributes('href')).toBe('https://wzyp.cn/shop/EBOAT51U')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toContain('noopener')
    expect(wrapper.text()).toContain('redeem.shopStep1')
    expect(wrapper.text()).toContain('redeem.shopRate')
    expect(wrapper.html()).toContain('lg:grid-cols-2')
    expect(link.classes()).toContain('w-full')
    expect(link.classes()).toContain('sm:w-auto')
  })

  it('非 https 链接不嵌入', async () => {
    getPublicSettings.mockResolvedValue({
      contact_info: '',
      payment_page_url: 'http://wzyp.cn/shop/EBOAT51U',
    })
    const wrapper = mountRedeem()
    await flushPromises()

    expect(wrapper.find('iframe').exists()).toBe(false)
  })
})
