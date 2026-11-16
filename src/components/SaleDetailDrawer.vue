<template>
  <a-drawer
    :open="open"
    placement="right"
    :width="isMobile ? '100%' : '520px'"
    title="Продажа"
    root-class-name="sale-detail-drawer"
    destroy-on-close
    @update:open="v => emit('update:open', v)"
  >
    <div v-if="sale" class="sd">
      <!-- Работа -->
      <router-link :to="`/home/edit/${sale.art.id}`" class="sd-work">
        <img v-if="sale.art.avatar" v-thumb="sale.art.avatar" class="sd-work-img" alt="" />
        <span v-else class="sd-work-img sd-work-img-empty"><PictureOutlined /></span>
        <span class="sd-work-info">
          <span class="sd-work-name">{{ sale.art.name || 'Без названия' }}</span>
          <span class="sd-muted">{{ [sale.art_technique, sale.art_size, sale.art_year].filter(Boolean).join(' · ') }}</span>
          <span v-if="sale.seria || sale.media" class="sd-muted">{{ [sale.seria, sale.media].filter(Boolean).join(' · ') }}</span>
        </span>
        <RightOutlined class="sd-work-arrow" />
      </router-link>

      <!-- Сделка -->
      <div class="sd-section">
        <div class="sd-row"><span>Дата продажи</span><b>{{ formatDate(sale.sale_date) }}</b></div>
        <div class="sd-row">
          <span>Покупатель</span>
          <router-link v-if="sale.contact" :to="`/home/contacts/${sale.contact.id}`">{{ sale.contact.name }}</router-link>
          <span v-else class="sd-muted">не указан</span>
        </div>
        <div v-if="sale.sold_by" class="sd-row"><span>Продал(а)</span><b>{{ personName(sale.sold_by) }}</b></div>
        <div v-if="sale.comment" class="sd-comment">{{ sale.comment }}</div>
      </div>

      <!-- Деньги -->
      <div class="sd-section">
        <div v-if="sale.list_price !== null && sale.list_price !== sale.sale_price" class="sd-row">
          <span>Цена работы</span><span>{{ formatMoney(sale.list_price, sale.currency) }}</span>
        </div>
        <div v-if="sale.discount_amount" class="sd-row">
          <span>Скидка</span>
          <span>−{{ formatMoney(sale.discount_amount, sale.currency) }}<template v-if="sale.discount_pct"> ({{ formatPct(sale.discount_pct) }})</template></span>
        </div>
        <div class="sd-row sd-row-strong"><span>Цена продажи</span><b>{{ formatMoney(sale.sale_price, sale.currency) }}</b></div>

        <div class="sd-commission">
          <div class="sd-row">
            <span>
              Комиссия галереи
              <span class="sd-source">{{ sourceText }}</span>
            </span>
            <span v-if="sale.commission_amount !== null">−{{ formatMoney(sale.commission_amount, sale.currency) }}</span>
            <span v-else class="sd-warn">не задана</span>
          </div>
          <div class="sd-commission-edit">
            <a-input-number
              v-model:value="pctDraft"
              :min="0"
              :max="100"
              :precision="2"
              :placeholder="artistCommission !== null ? `как в анкете: ${formatPct(artistCommission)}` : 'например, 30'"
              class="sd-pct"
            >
              <template #addonAfter>%</template>
            </a-input-number>
            <a-button :loading="savingPct" :disabled="!pctChanged" @click="savePct">Сохранить</a-button>
            <a-button v-if="sale.commission_source === 'sale'" type="link" :loading="savingPct" @click="resetPct">
              {{ artistCommission !== null ? 'Как в анкете' : 'Сбросить' }}
            </a-button>
          </div>
          <div class="sd-hint">
            Своя комиссия для этой продажи важнее комиссии из анкеты художника. В отчётах — так же,
            если в отчёте не задана индивидуальная.
          </div>
        </div>

        <div class="sd-row sd-row-total">
          <span>Художнику</span>
          <b>{{ formatMoney(sale.net_amount, sale.currency) }}</b>
        </div>
      </div>

      <!-- Выплата художнику -->
      <div class="sd-paid" :class="{ 'sd-paid-on': sale.artist_paid }">
        <a-checkbox :checked="sale.artist_paid" :disabled="savingPaid" @change="e => togglePaid(e.target.checked)">
          Выплачено художнику
        </a-checkbox>
        <span v-if="sale.artist_paid && sale.artist_paid_at" class="sd-muted">{{ formatDate(sale.artist_paid_at) }}</span>
      </div>

      <div class="sd-actions">
        <a-button size="large" @click="emit('update:open', false)"><CloseOutlined /> Закрыть</a-button>
        <a-button size="large" type="primary" class="sd-edit" @click="saleModalOpen = true"><EditOutlined /> Изменить продажу</a-button>
      </div>
    </div>

    <SaleModal
      v-model:open="saleModalOpen"
      :art-id="sale?.art?.id"
      :work-name="sale?.art?.name"
      :price="sale?.list_price"
      :currency="sale?.currency"
      @saved="emit('changed')"
      @cancelled="onCancelled"
    />
  </a-drawer>
</template>

<script setup>
// Подробности продажи из карточки художника: деньги, комиссия галереи
// (своя для продажи), сколько художнику и отметка о выплате.
import { computed, ref, watch } from 'vue'
import { PictureOutlined, RightOutlined, CloseOutlined, EditOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import SaleModal from '@/components/SaleModal.vue'
import { useSale } from '@/stores/sale.js'
import { useIsMobile } from '@/composables/useIsMobile.js'
import { formatMoney, formatPct, formatDate } from '@/utils/money.js'
import { personName } from '@/utils/tasks.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  sale: { type: Object, default: null },
  // комиссия из анкеты художника (null — не задана)
  artistCommission: { type: Number, default: null },
})
// changed — продажа изменилась, карточке нужно перезагрузить данные
const emit = defineEmits(['update:open', 'changed'])

const saleStore = useSale()
const { isMobile } = useIsMobile()

const sourceText = computed(() => {
  const s = props.sale
  if (!s || s.commission_pct === null) return ''
  if (s.commission_source === 'sale') return `${formatPct(s.commission_pct)} · для этой продажи`
  return `${formatPct(s.commission_pct)} · из анкеты`
})

// === Комиссия этой продажи ===
const pctDraft = ref(null)
const savingPct = ref(false)
watch(() => [props.sale?.id, props.sale?.commission_source, props.sale?.commission_pct], () => {
  pctDraft.value = props.sale?.commission_source === 'sale' ? props.sale.commission_pct : null
}, { immediate: true })
const pctChanged = computed(() => {
  const current = props.sale?.commission_source === 'sale' ? props.sale.commission_pct : null
  return pctDraft.value !== current && pctDraft.value !== undefined
})
async function savePctValue(value) {
  savingPct.value = true
  try {
    const result = await saleStore.updateSale(props.sale.id, { commission_pct: value })
    if (result) {
      message.success('Комиссия сохранена')
      emit('changed')
    }
  } finally {
    savingPct.value = false
  }
}
const savePct = () => savePctValue(pctDraft.value ?? null)
const resetPct = () => {
  pctDraft.value = null
  savePctValue(null)
}

// === Выплата художнику ===
const savingPaid = ref(false)
async function togglePaid(paid) {
  savingPaid.value = true
  try {
    const result = await saleStore.updateSale(props.sale.id, { artist_paid: paid })
    if (result) {
      message.success(paid ? 'Отмечено: выплачено художнику' : 'Отметка о выплате снята')
      emit('changed')
    }
  } finally {
    savingPaid.value = false
  }
}

const saleModalOpen = ref(false)
function onCancelled() {
  // продажу отменили — её больше нет, панель закрываем
  emit('update:open', false)
  emit('changed')
}
</script>

<style>
/* Drawer телепортируется в body — переменные страницы до него не доходят */
.sale-detail-drawer {
  --accent: #8a6d2f;
  --accent-strong: #6f581f;
  --text-title: #211f1a;
  --text-body: #2c2a25;
  --text-faint: #7c7669;
  --border: rgba(0, 0, 0, 0.08);
  --card-bg: #efece4;
}

.sale-detail-drawer .ant-drawer-body {
  display: flex;
  flex-direction: column;
  padding-bottom: 0;
}
</style>

<style scoped>
.sd {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1 0 auto;
  color: var(--text-body);
}

.sd-work {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 12px;
  color: inherit;
}

.sd-work:hover {
  border-color: var(--accent);
}

.sd-work-img {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: 8px;
  object-fit: cover;
  background: var(--card-bg);
}

.sd-work-img-empty {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: var(--text-faint);
}

.sd-work-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.sd-work-name {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 18px;
  color: var(--text-title);
}

.sd-work-arrow {
  color: var(--text-faint);
}

.sd-muted {
  font-size: 12px;
  color: var(--text-faint);
}

.sd-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}

.sd-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  font-size: 14px;
}

.sd-row > span:first-child {
  color: var(--text-faint);
}

.sd-row-strong b {
  font-size: 16px;
}

.sd-row-total {
  padding-top: 8px;
  border-top: 1px dashed var(--border);
}

.sd-row-total > span:first-child {
  color: var(--text-title);
  font-weight: 600;
}

.sd-row-total b {
  font-size: 18px;
  color: var(--accent-strong);
}

.sd-comment {
  padding: 8px 10px;
  font-size: 13px;
  background: var(--card-bg);
  border-radius: 8px;
  white-space: pre-wrap;
}

.sd-commission {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(138, 109, 47, 0.06);
  border-radius: 10px;
}

.sd-source {
  display: block;
  font-size: 12px;
}

.sd-warn {
  color: #b4441c;
  font-weight: 500;
}

.sd-commission-edit {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sd-pct {
  width: 210px;
}

.sd-hint {
  font-size: 12px;
  color: var(--text-faint);
  line-height: 1.4;
}

.sd-paid {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
}

.sd-paid-on {
  background: rgba(58, 150, 62, 0.08);
  border-color: rgba(47, 138, 53, 0.3);
}

.sd-paid :deep(.ant-checkbox-checked .ant-checkbox-inner) {
  background: #2f8a35;
  border-color: #2f8a35;
}

.sd-actions {
  position: sticky;
  bottom: 0;
  margin: auto -24px 0;
  padding: 12px 24px calc(12px + env(safe-area-inset-bottom, 0px));
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 10px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(8px);
  border-top: 1px solid var(--border);
  box-shadow: 0 -6px 18px rgba(0, 0, 0, 0.06);
}

.sd-actions :deep(.ant-btn) {
  height: 46px;
  border-radius: 12px;
}

.sd-edit {
  background: var(--accent);
  border-color: var(--accent);
}

.sd-edit:hover,
.sd-edit:focus {
  background: var(--accent-strong) !important;
  border-color: var(--accent-strong) !important;
}

@media (max-width: 768px) {
  .sd-actions {
    padding-left: 16px;
    padding-right: 16px;
  }

  .sd-pct {
    width: 100%;
  }
}
</style>
