<template>
  <article
    class="flex cursor-pointer flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-md dark:border-dark-700/60 dark:bg-dark-800/50"
    role="button"
    tabindex="0"
    @click="$emit('open')"
    @keydown.enter="$emit('open')"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 items-start gap-3">
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          :style="{ color: accent, backgroundColor: 'color-mix(in srgb, ' + accent + ' 14%, transparent)' }"
        >
          <PlatformIcon :platform="card.platform as GroupPlatform" size="md" />
        </div>
        <div class="min-w-0">
          <h3 class="truncate text-[15px] font-semibold text-gray-900 dark:text-white" :title="card.name">
            {{ card.name }}
          </h3>
          <div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span
              v-for="price in prices"
              :key="price.kind"
              class="text-sm text-gray-500 dark:text-dark-400"
            >
              {{ priceLabel(price) }}
              <b class="font-mono font-semibold text-gray-900 dark:text-gray-50">{{ price.amount }}</b>
            </span>
            <span v-if="prices.length === 0" class="text-sm text-gray-400 dark:text-dark-500">
              {{ t('modelPlaza.detail.noPricing') }}
            </span>
          </div>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-1.5">
        <span class="inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-dark-700/70 dark:text-dark-200">
          {{ t('modelPlaza.card.detail') }}
          <Icon name="chevronRight" size="xs" class="h-3 w-3" />
        </span>
        <button
          type="button"
          class="inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:text-dark-400 dark:hover:bg-dark-700 dark:hover:text-white"
          :title="t('modelPlaza.card.copyName')"
          :aria-label="t('modelPlaza.card.copyName')"
          @click.stop="copyName"
          @keydown.stop
        >
          <Icon name="copy" size="xs" class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <div class="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-2.5 text-xs dark:border-dark-700/60">
      <div class="flex min-w-0 items-center gap-1.5">
        <span class="truncate font-medium text-gray-700 dark:text-dark-200">{{ best.group.name }}</span>
        <span class="shrink-0 rounded-md bg-violet-50 px-1.5 py-0.5 font-medium text-violet-600 dark:bg-violet-900/20 dark:text-violet-300">
          {{ t(billingLabelKey(best.model)) }}
        </span>
      </div>
      <div class="flex shrink-0 items-center gap-1.5 text-gray-400 dark:text-dark-500">
        <span>{{ card.platform }}</span>
        <span class="font-mono">{{ formatRate(best.rate) }}</span>
        <span
          v-if="card.offers.length > 1"
          class="rounded-md bg-gray-100 px-1 py-0.5 font-medium text-gray-500 dark:bg-dark-700/70 dark:text-dark-300"
        >
          +{{ card.offers.length - 1 }}
        </span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import PlatformIcon from '@/components/common/PlatformIcon.vue'
import { useClipboard } from '@/composables/useClipboard'
import { platformAccentColor } from '@/utils/platformColors'
import type { GroupPlatform } from '@/types'
import {
  billingLabelKey,
  cardPrices,
  formatRate,
  type CardPrice,
  type PlazaModelCard
} from './plazaPricing'

const props = defineProps<{
  card: PlazaModelCard
}>()

defineEmits<{
  open: []
}>()

const { t } = useI18n()
const { copyToClipboard } = useClipboard()

const best = computed(() => props.card.offers[0])
const accent = computed(() => platformAccentColor(props.card.platform))
const prices = computed(() => cardPrices(best.value.model, best.value.rate))

function priceLabel(price: CardPrice): string {
  if (price.kind === 'input') return t('modelPlaza.card.input')
  if (price.kind === 'output') return t('modelPlaza.card.output')
  if (price.kind === 'cache') return t('modelPlaza.card.cache')
  return price.unit === 'image' ? t('modelPlaza.card.perImagePrice') : t('modelPlaza.card.perRequestPrice')
}

function copyName() {
  void copyToClipboard(props.card.name, t('modelPlaza.card.copied'))
}
</script>
