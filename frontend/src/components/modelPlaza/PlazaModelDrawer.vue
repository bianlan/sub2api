<template>
  <Teleport to="body">
    <div v-if="card" class="fixed inset-0 z-[70]">
      <button
        type="button"
        class="absolute inset-0 bg-gray-900/40"
        :aria-label="t('modelPlaza.drawer.close')"
        @click="$emit('close')"
      ></button>
      <aside
        class="absolute inset-y-0 right-0 flex w-full max-w-[640px] flex-col bg-white shadow-2xl dark:bg-dark-900"
        role="dialog"
        aria-modal="true"
      >
        <header class="border-b border-gray-100 px-5 py-4 dark:border-dark-700/60">
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 items-center gap-3">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                :style="{ color: accent, backgroundColor: 'color-mix(in srgb, ' + accent + ' 14%, transparent)' }"
              >
                <PlatformIcon :platform="card.platform as GroupPlatform" size="md" />
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <h2 class="truncate text-lg font-semibold text-gray-900 dark:text-white">{{ card.name }}</h2>
                  <button
                    type="button"
                    class="inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-dark-400 dark:hover:bg-dark-800 dark:hover:text-white"
                    :title="t('modelPlaza.card.copyName')"
                    :aria-label="t('modelPlaza.card.copyName')"
                    @click="copyName"
                  >
                    <Icon name="copy" size="xs" class="h-3.5 w-3.5" />
                  </button>
                </div>
                <p class="mt-0.5 text-xs text-gray-500 dark:text-dark-400">
                  {{ platformLabel(card.platform) }}
                  <span class="mx-1">·</span>
                  <span class="text-violet-600 dark:text-violet-300">{{ t(billingLabelKey(card.offers[0].model)) }}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-dark-400 dark:hover:bg-dark-800 dark:hover:text-white"
              :aria-label="t('modelPlaza.drawer.close')"
              @click="$emit('close')"
            >
              <Icon name="x" size="sm" />
            </button>
          </div>

          <div class="mt-4 grid grid-cols-2 rounded-xl bg-gray-100 p-1 dark:bg-dark-800">
            <button
              type="button"
              class="rounded-lg px-3 py-2 text-sm font-medium"
              :class="tab === 'overview' ? 'bg-white text-gray-900 shadow-sm dark:bg-dark-700 dark:text-white' : 'text-gray-500 dark:text-dark-400'"
              @click="tab = 'overview'"
            >
              {{ t('modelPlaza.drawer.overview') }}
            </button>
            <button
              type="button"
              class="rounded-lg px-3 py-2 text-sm font-medium"
              :class="tab === 'api' ? 'bg-white text-gray-900 shadow-sm dark:bg-dark-700 dark:text-white' : 'text-gray-500 dark:text-dark-400'"
              @click="tab = 'api'"
            >
              {{ t('modelPlaza.drawer.api') }}
            </button>
          </div>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div v-if="tab === 'overview'" class="space-y-6">
            <section>
              <div class="flex items-start gap-3">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                  <Icon name="infoCircle" size="sm" />
                </span>
                <div>
                  <h3 class="text-sm font-semibold text-gray-900 dark:text-white">{{ t('modelPlaza.drawer.basicTitle') }}</h3>
                  <p class="text-xs text-gray-400 dark:text-dark-500">{{ t('modelPlaza.drawer.basicSubtitle') }}</p>
                </div>
              </div>
              <p class="mt-3 text-sm text-gray-500 dark:text-dark-400">{{ t('modelPlaza.drawer.noDescription') }}</p>
            </section>

            <section>
              <div class="flex items-start gap-3">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
                  <Icon name="link" size="sm" />
                </span>
                <div>
                  <h3 class="text-sm font-semibold text-gray-900 dark:text-white">{{ t('modelPlaza.drawer.endpointTitle') }}</h3>
                  <p class="text-xs text-gray-400 dark:text-dark-500">{{ t('modelPlaza.drawer.endpointSubtitle') }}</p>
                </div>
              </div>
              <div class="mt-3 flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2.5 text-sm dark:border-dark-700">
                <span class="flex items-center gap-2 text-gray-700 dark:text-dark-200">
                  <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
                  {{ t('modelPlaza.drawer.endpoint') }}
                </span>
                <span class="font-mono text-xs text-gray-400">POST</span>
              </div>
            </section>

            <section>
              <div class="flex items-start gap-3">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                  <Icon name="dollar" size="sm" />
                </span>
                <div>
                  <h3 class="text-sm font-semibold text-gray-900 dark:text-white">{{ t('modelPlaza.drawer.priceTitle') }}</h3>
                  <p class="text-xs text-gray-400 dark:text-dark-500">{{ t('modelPlaza.drawer.priceSubtitle') }}</p>
                </div>
              </div>
              <div class="mt-3 space-y-3">
                <article
                  v-for="offer in card.offers"
                  :key="offer.group.id"
                  class="rounded-xl border border-gray-100 px-3 py-2.5 dark:border-dark-700"
                >
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ offer.group.name }}</span>
                      <span
                        v-if="hasCustomRate(offer.group)"
                        class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-400 line-through dark:bg-dark-700 dark:text-dark-500"
                      >
                        {{ formatRate(offer.group.rate_multiplier) }}
                      </span>
                      <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-dark-700 dark:text-gray-200">
                        {{ t('modelPlaza.drawer.rateBadge', { rate: formatRate(offer.rate) }) }}
                      </span>
                      <span
                        v-if="offer.group.is_exclusive"
                        class="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] text-purple-600 dark:bg-purple-900/20 dark:text-purple-300"
                      >
                        {{ t('modelPlaza.badges.exclusive') }}
                      </span>
                      <span
                        v-if="offer.group.subscription_type === 'subscription'"
                        class="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] text-violet-600 dark:bg-violet-900/20 dark:text-violet-300"
                      >
                        {{ t('modelPlaza.badges.subscription') }}
                      </span>
                      <span class="rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-600 dark:bg-violet-900/20 dark:text-violet-300">
                        {{ t(billingLabelKey(offer.model)) }}
                      </span>
                    </div>
                    <span v-if="offerUnit(offer)" class="shrink-0 text-xs text-gray-400 dark:text-dark-500">
                      {{ offerUnit(offer) }}
                    </span>
                  </div>

                  <p v-if="!priceTiers(offer).length" class="mt-2 text-sm text-gray-400 dark:text-dark-500">
                    {{ t('modelPlaza.detail.noPricing') }}
                  </p>
                  <div
                    v-else
                    class="mt-2 grid items-baseline gap-x-4 gap-y-1 overflow-x-auto border-t border-gray-100 pt-2 dark:border-dark-700"
                    :style="{ gridTemplateColumns: priceGridColumns(priceTiers(offer)) }"
                  >
                    <template v-for="(tier, index) in priceTiers(offer)" :key="(tier.prefix || 'base') + index">
                      <span
                        v-if="hasTierPrefix(priceTiers(offer))"
                        class="text-xs text-gray-400 dark:text-dark-500"
                      >
                        {{ tier.prefix }}
                      </span>
                      <span
                        v-for="kind in tierKinds(priceTiers(offer))"
                        :key="(tier.prefix || 'base') + kind"
                        class="whitespace-nowrap text-sm"
                      >
                        <template v-if="tierLine(tier, kind)">
                          <span class="mr-1 text-xs text-gray-400 dark:text-dark-500">{{ shortLabel(kind) }}</span>
                          <span class="font-medium tabular-nums text-gray-900 dark:text-white">{{ tierLine(tier, kind)?.amount }}</span>
                        </template>
                      </span>
                    </template>
                  </div>

                  <div
                    v-for="period in timeGroups(offer)"
                    :key="period.window"
                    class="mt-2 rounded-lg bg-gray-50 px-2 py-1.5 text-xs text-gray-600 dark:bg-dark-800 dark:text-dark-300"
                  >
                    <p class="font-medium">
                      <span v-if="period.weekdays">{{ t('modelPlaza.table.timePricingWeekdays') }} </span>
                      {{ period.window }} · {{ formatRate(period.periodRate) }}
                    </p>
                    <div
                      class="mt-1 grid items-baseline gap-x-3 gap-y-1"
                      :style="{ gridTemplateColumns: priceGridColumns(groupPriceTiers(period.lines)) }"
                    >
                      <template v-for="(tier, index) in groupPriceTiers(period.lines)" :key="(tier.prefix || 'base') + index">
                        <span v-if="hasTierPrefix(groupPriceTiers(period.lines))" class="font-medium text-gray-500 dark:text-dark-400">
                          {{ tier.prefix }}
                        </span>
                        <span v-for="kind in tierKinds(groupPriceTiers(period.lines))" :key="(tier.prefix || 'base') + kind" class="whitespace-nowrap">
                          <template v-if="tierLine(tier, kind)">
                            <span class="mr-1 text-gray-400 dark:text-dark-500">{{ shortLabel(kind) }}</span>
                            <span class="font-mono font-semibold">{{ tierLine(tier, kind)?.amount }}</span>
                          </template>
                        </span>
                      </template>
                    </div>
                  </div>
                  <p v-if="peakText(offer.group)" class="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                    {{ peakText(offer.group) }}
                  </p>
                  <p v-if="longContextDisabled(offer.group, offer.model)" class="mt-1.5 text-xs text-gray-500 dark:text-dark-400">
                    {{ t('modelPlaza.drawer.longContextDisabled') }}
                  </p>
                  <p
                    v-else-if="hasTokenLadder(offer.model)"
                    class="mt-1.5 text-xs text-gray-500 dark:text-dark-400"
                  >
                    {{ offer.model.long_context_basis === 'marginal' ? t('modelPlaza.table.tierHintMarginal') : t('modelPlaza.drawer.longContext') }}
                  </p>
                </article>
              </div>
            </section>
          </div>

          <div v-else class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <Icon name="document" size="sm" class="text-gray-400" />
                {{ t('modelPlaza.drawer.exampleTitle') }}
              </h3>
              <div class="flex rounded-full bg-gray-100 p-1 text-xs dark:bg-dark-800">
                <button
                  v-for="item in langs"
                  :key="item.id"
                  type="button"
                  class="rounded-full px-2.5 py-1 font-medium"
                  :class="lang === item.id ? 'bg-white text-gray-900 shadow-sm dark:bg-dark-700 dark:text-white' : 'text-gray-500 dark:text-dark-400'"
                  @click="lang = item.id"
                >
                  {{ item.label }}
                </button>
              </div>
            </div>
            <div class="relative rounded-xl border border-slate-200 bg-slate-50 dark:border-dark-700 dark:bg-dark-800/60">
              <button
                type="button"
                class="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-white hover:text-gray-700 dark:hover:bg-dark-700 dark:hover:text-white"
                :title="t('modelPlaza.drawer.copyCode')"
                :aria-label="t('modelPlaza.drawer.copyCode')"
                @click="copyCode"
              >
                <Icon name="copy" size="sm" />
              </button>
              <pre class="overflow-x-auto p-4 pr-12 font-mono text-xs leading-5 text-gray-800 dark:text-dark-100">{{ snippet }}</pre>
            </div>
            <p class="text-sm text-gray-500 dark:text-dark-400">
              {{ t('modelPlaza.drawer.replaceHintBefore') }}
              <code class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-dark-800">&lt;YOUR_API_KEY&gt;</code>
              {{ t('modelPlaza.drawer.replaceHintAfter') }}
            </p>
            <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <Icon name="key" size="sm" class="text-gray-400" />
              {{ t('modelPlaza.drawer.authTitle') }}
            </h3>
            <div class="space-y-2 rounded-xl border border-gray-100 px-4 py-3 text-sm text-gray-600 dark:border-dark-700 dark:text-dark-300">
              <p>
                &gt; {{ t('modelPlaza.drawer.authLead') }}
                <code class="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs dark:bg-dark-800">Authorization: Bearer &lt;TOKEN&gt;</code>
                {{ t('modelPlaza.drawer.authMid') }}
                <code class="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs dark:bg-dark-800">x-api-key</code>
                {{ t('modelPlaza.drawer.authEnd') }}
              </p>
              <p>{{ t('modelPlaza.drawer.authKey') }}</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import PlatformIcon from '@/components/common/PlatformIcon.vue'
import { useClipboard } from '@/composables/useClipboard'
import { useAppStore } from '@/stores/app'
import { platformAccentColor, platformLabel } from '@/utils/platformColors'
import { formatPeakRateWindow, hasPeakRate, serverTimezoneLabel } from '@/utils/peak-rate'
import type { GroupPlatform } from '@/types'
import type { ModelPlazaGroup } from '@/api/modelPlaza'
import { buildPlazaApiSnippet, plazaApiOrigin, type PlazaApiLang } from './plazaApiSnippet'
import {
  billingLabelKey,
  buildPriceLines,
  buildTimePriceGroups,
  formatRate,
  groupPriceTiers,
  longContextDisabled,
  type PlazaModelCard,
  type PlazaModelOffer,
  type PriceKind,
  type PriceTier,
  type PriceUnit
} from './plazaPricing'

const props = defineProps<{
  card: PlazaModelCard | null
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const appStore = useAppStore()
const { copyToClipboard } = useClipboard()

const tab = ref<'overview' | 'api'>('overview')
const lang = ref<PlazaApiLang>('curl')

const langs: Array<{ id: PlazaApiLang; label: string }> = [
  { id: 'curl', label: 'cURL' },
  { id: 'python', label: 'Python' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'javascript', label: 'JavaScript' }
]

const accent = computed(() => platformAccentColor(props.card?.platform ?? ''))
const snippet = computed(() =>
  props.card ? buildPlazaApiSnippet(props.card.name, plazaApiOrigin(), lang.value) : ''
)

watch(
  () => props.card?.key,
  () => {
    tab.value = 'overview'
  }
)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

watch(
  () => props.card,
  (card) => {
    document.body.style.overflow = card ? 'hidden' : ''
    if (card) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  }
)

onUnmounted(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})

/** 横排时列的固定顺序，两档的金额才能上下对齐。 */
const PRICE_KIND_ORDER: PriceKind[] = ['input', 'output', 'cacheWrite', 'cacheWrite1h', 'cacheRead', 'call']

function priceTiers(offer: PlazaModelOffer): PriceTier[] {
  return groupPriceTiers(buildPriceLines(offer.model, offer.rate))
}

/** 这一组档位里实际出现的价格列。 */
function tierKinds(tiers: PriceTier[]): PriceKind[] {
  const present = new Set(tiers.flatMap((tier) => tier.lines.map((line) => line.kind)))
  return PRICE_KIND_ORDER.filter((kind) => present.has(kind))
}

function tierLine(tier: PriceTier, kind: PriceKind) {
  return tier.lines.find((line) => line.kind === kind)
}

function hasTierPrefix(tiers: PriceTier[]): boolean {
  return tiers.some((tier) => tier.prefix !== '')
}

/** 有档位时第一列留给档位名，其余列按价格种类排开。 */
function priceGridColumns(tiers: PriceTier[]): string {
  const count = tierKinds(tiers).length
  if (count === 0) return 'auto'
  const prices = `repeat(${count}, max-content)`
  return hasTierPrefix(tiers) ? `max-content ${prices}` : prices
}

function offerUnit(offer: PlazaModelOffer): string {
  const line = buildPriceLines(offer.model, offer.rate)[0]
  return line ? unitLabel(line.unit) : ''
}

function timeGroups(offer: PlazaModelOffer) {
  return buildTimePriceGroups(offer.model, offer.rate)
}

function hasTokenLadder(offerModel: PlazaModelOffer['model']): boolean {
  return (offerModel.pricing?.intervals?.length ?? 0) > 1 && offerModel.pricing?.billing_mode === 'token'
}

function hasCustomRate(group: ModelPlazaGroup): boolean {
  return group.user_rate_multiplier != null && group.user_rate_multiplier !== group.rate_multiplier
}

function peakText(group: ModelPlazaGroup): string {
  if (!hasPeakRate(group)) return ''
  const windowText = formatPeakRateWindow(
    group,
    serverTimezoneLabel(appStore.cachedPublicSettings?.server_utc_offset)
  )
  return t('modelPlaza.detail.peakNote', { window: windowText, multiplier: group.peak_rate_multiplier })
}

function shortLabel(kind: PriceKind): string {
  if (kind === 'input') return t('modelPlaza.table.input')
  if (kind === 'output') return t('modelPlaza.drawer.outputShort')
  if (kind === 'cacheWrite') return t('modelPlaza.table.cacheWrite')
  if (kind === 'cacheWrite1h') return t('modelPlaza.drawer.cacheWrite1hShort')
  if (kind === 'cacheRead') return t('modelPlaza.table.cacheRead')
  return t('modelPlaza.drawer.callPrice')
}

function unitLabel(unit: PriceUnit): string {
  if (unit === 'image') return t('modelPlaza.table.perUnitImage')
  if (unit === 'request') return t('modelPlaza.table.perUnitRequest')
  return t('modelPlaza.drawer.perMillion')
}

function copyName() {
  if (!props.card) return
  void copyToClipboard(props.card.name, t('modelPlaza.card.copied'))
}

function copyCode() {
  void copyToClipboard(snippet.value, t('modelPlaza.card.copied'))
}
</script>
