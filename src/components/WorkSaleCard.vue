<template>
  <section class="sale-card">
    <div class="sale-heading">Продажа</div>

    <a-spin :spinning="loadingSale">
      <!-- Продана -->
      <div v-if="sale" class="sale-info">
        <div class="sale-badge">Продана</div>
        <div class="sale-main">
          {{ formatDate(sale.sale_date) }} · <b>{{ formatMoney(sale.sale_price, sale.currency) }}</b>
          <span v-if="sale.discount_pct > 0" class="sale-discount">−{{ formatPct(sale.discount_pct) }}</span>
        </div>
        <div class="sale-meta">
          <div v-if="sale.discount_amount > 0">
            Цена работы {{ formatMoney(sale.list_price, sale.currency) }}, скидка
            {{ sale.discount_type === 'pct' ? formatPct(sale.discount_value) : formatMoney(sale.discount_amount, sale.currency) }}
          </div>
          <div v-if="sale.contact">Покупатель: {{ sale.contact.name || 'без имени' }}</div>
          <div v-if="sale.sold_by">Оформил(а): {{ personName(sale.sold_by) }}</div>
          <div v-if="sale.comment" class="sale-comment">{{ sale.comment }}</div>
        </div>
        <div class="sale-actions">
          <a-button size="small" @click="openModal">Изменить</a-button>
          <a-popconfirm
            title="Отменить продажу? Работа снова станет «в наличии»."
            ok-text="Да"
            cancel-text="Нет"
            @confirm="cancel"
          >
            <a-button size="small" danger :loading="cancelling">Отменить продажу</a-button>
          </a-popconfirm>
        </div>
      </div>

      <!-- Не продана -->
      <div v-else-if="loadedSale" class="sale-empty">
        <span class="sale-empty-text">Работа в наличии</span>
        <a-button type="primary" ghost @click="openModal">Отметить как проданную</a-button>
      </div>
    </a-spin>

    <SaleModal
      v-model:open="modalOpen"
      :art-id="artId"
      :price="price"
      :currency="currency"
      @saved="(result) => (sale = result)"
      @cancelled="sale = null"
    />
  </section>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { useSale } from '@/stores/sale.js'
import SaleModal from '@/components/SaleModal.vue'

const props = defineProps({
  artId: { type: String, required: true },
  // Текущие цена и валюта из формы работы — подставляются в новую продажу
  price: { type: [Number, String], default: null },
  currency: { type: String, default: 'RUB' },
})

const saleStore = useSale()

const sale = ref(null)
const loadingSale = ref(false)
const loadedSale = ref(false)
const modalOpen = ref(false)
const cancelling = ref(false)

async function loadSale() {
  loadingSale.value = true
  try {
    sale.value = await saleStore.getSaleByArtId(props.artId)
    loadedSale.value = true
  } catch {
    // ошибка уже показана в сторе; кнопку продажи не показываем, пока
    // неизвестно, продана ли работа
  } finally {
    loadingSale.value = false
  }
}

onMounted(loadSale)
watch(() => props.artId, loadSale)

function openModal() {
  modalOpen.value = true
}

async function cancel() {
  cancelling.value = true
  try {
    if (await saleStore.cancelSale(sale.value)) {
      sale.value = null
      message.success('Продажа отменена')
    }
  } finally {
    cancelling.value = false
  }
}

const CURRENCY_SIGNS = { RUB: '₽', BYN: 'Br', USD: '$', EUR: '€' }

function formatMoney(value, currency) {
  if (value === null || value === undefined) return '—'
  const num = Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 })
  return `${num} ${CURRENCY_SIGNS[currency] || currency}`
}

function formatPct(value) {
  return `${Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 })}%`
}

function formatDate(value) {
  return value ? dayjs(value).format('DD.MM.YYYY') : '—'
}

function personName(person) {
  return [person.name, person.surname].filter(Boolean).join(' ') || '—'
}
</script>

<style scoped>
.sale-card {
  background: var(--bg-elevated, #fff);
  border: 1px solid var(--border-soft, rgba(0, 0, 0, 0.07));
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 12px;
}

.sale-heading {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent, #8a6d2f);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 12px;
}

.sale-empty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.sale-empty-text {
  color: var(--text-muted, #5a564c);
}

.sale-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  background: #e8f3ec;
  color: #1f6b3a;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
}

.sale-main {
  font-size: 15px;
  color: var(--text-title, #211f1a);
}

.sale-discount {
  margin-left: 6px;
  color: #b4441c;
  font-weight: 600;
}

.sale-meta {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text-muted, #5a564c);
  display: grid;
  gap: 2px;
}

.sale-comment {
  white-space: pre-wrap;
  font-style: italic;
}

.sale-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

</style>
