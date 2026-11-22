<template>
  <section class="sale-card">
    <div class="sale-heading">Продажа</div>

    <a-spin :spinning="loadingSale">
      <template v-if="loadedSale">
        <!-- Тираж: экземпляры -->
        <div v-if="multi" class="sale-copies">
          <span v-if="summary.edition" class="sale-edition">{{ summary.edition }}</span>
          Экземпляров: <b>{{ summary.total }}</b> · продано <b>{{ summary.sold }}</b> · осталось <b>{{ summary.available }}</b>
        </div>

        <!-- Продажи (у тиража их может быть несколько) — свежие сверху -->
        <div v-for="s in sales" :key="s.id" class="sale-info">
          <div class="sale-badge">{{ multi ? `Продано ${s.quantity || 1} экз.` : 'Продана' }}</div>
          <div class="sale-main">
            {{ formatDate(s.sale_date) }} · <b>{{ formatMoney(s.sale_price, s.currency) }}</b>
            <span v-if="s.discount_pct > 0" class="sale-discount">−{{ formatPct(s.discount_pct) }}</span>
          </div>
          <div class="sale-meta">
            <div v-if="(s.quantity || 1) > 1 && s.unit_price != null">
              {{ formatMoney(s.unit_price, s.currency) }} × {{ s.quantity }} экз.
            </div>
            <div v-if="s.discount_amount > 0">
              Цена работы {{ formatMoney(s.list_price, s.currency) }}, скидка
              {{ s.discount_type === 'pct' ? formatPct(s.discount_value) : formatMoney(s.discount_amount, s.currency) }}
            </div>
            <div v-if="s.contact">Покупатель: {{ s.contact.name || 'без имени' }}</div>
            <div v-if="s.sold_by">Продал(а): {{ personName(s.sold_by) }}</div>
            <div v-if="s.comment" class="sale-comment">{{ s.comment }}</div>
          </div>
          <div class="sale-actions">
            <a-button size="small" @click="openModal(s.id)">Изменить</a-button>
            <a-popconfirm
              :title="multi ? `Отменить эту продажу? ${s.quantity || 1} экз. вернутся в наличие.` : 'Отменить продажу? Работа снова станет «в наличии».'"
              ok-text="Да"
              cancel-text="Нет"
              @confirm="cancel(s)"
            >
              <a-button size="small" danger :loading="cancellingId === s.id">Отменить продажу</a-button>
            </a-popconfirm>
          </div>
        </div>

        <!-- Есть что продавать -->
        <div v-if="summary.available > 0" class="sale-empty">
          <span class="sale-empty-text">
            <template v-if="!multi">Работа в наличии</template>
            <template v-else-if="sales.length">Осталось {{ summary.available }} экз.</template>
            <template v-else>В наличии {{ summary.available }} экз.</template>
          </span>
          <a-button type="primary" ghost @click="openModal(null)">
            {{ multi && sales.length ? 'Продать ещё' : 'Отметить как проданную' }}
          </a-button>
        </div>
      </template>
    </a-spin>

    <SaleModal
      v-model:open="modalOpen"
      :art-id="artId"
      :price="price"
      :currency="currency"
      :notice="notice"
      :sale-id="editSaleId"
      :new-sale="!editSaleId"
      @saved="onSaved"
      @cancelled="onCancelled"
    />
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { useSale } from '@/stores/sale.js'
import SaleModal from '@/components/SaleModal.vue'
import { soldStatusNotice } from '@/utils/money.js'

const props = defineProps({
  artId: { type: String, required: true },
  // Текущие цена и валюта из формы работы — подставляются в новую продажу
  price: { type: [Number, String], default: null },
  currency: { type: String, default: 'RUB' },
})

// status-changed — сервер сменил статус работы (поставил «статус продажи»
// или вернул прежний при отмене): форма работы должна это подхватить,
// иначе кнопка «Сохранить» вернёт старый статус
const emit = defineEmits(['status-changed'])

const saleStore = useSale()

// { total, sold, available, edition, sales } — см. GET /sales/art/:id/list
const summary = ref({ total: 1, sold: 0, available: 1, edition: null, sales: [] })
const sales = computed(() => summary.value.sales || [])
// несколько экземпляров (тираж) — показываем количество
const multi = computed(() => summary.value.total > 1 || sales.value.some(s => (s.quantity || 1) > 1))
const loadingSale = ref(false)
const loadedSale = ref(false)
const modalOpen = ref(false)
const editSaleId = ref(null)
const cancellingId = ref(null)

async function loadSale() {
  loadingSale.value = true
  try {
    summary.value = await saleStore.getSalesByArtId(props.artId)
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

// Пояснение в окне продажи (когда оно открылось из-за выбора статуса продажи)
const notice = ref('')
watch(modalOpen, (isOpen) => { if (!isOpen) notice.value = '' })

// saleId — изменить эту продажу; null — новая продажа
function openModal(saleId) {
  editSaleId.value = saleId
  modalOpen.value = true
}

defineExpose({
  // проданы ли все экземпляры (null — ещё не загрузили)
  isSold: () => (loadedSale.value ? summary.value.available <= 0 : null),
  // открыть оформление продажи с пояснением (выбрали статус продажи)
  openForStatus(statusName) {
    notice.value = soldStatusNotice(statusName)
    openModal(null)
  },
  // экземпляры работы поменялись (сохранили карточку) — перечитать
  reload: loadSale,
  // сколько экземпляров уже продано
  soldCount: () => summary.value.sold || 0,
})

// art_status — статус работы после продажи (сервер ставит «статус продажи»,
// когда проданы все экземпляры, и возвращает прежний при отмене)
// Сначала перечитываем экземпляры, потом отдаём статус форме: иначе форма
// (перехват «статуса продажи») решит, что экземпляры ещё есть, и откатит его
async function afterChange(result) {
  await loadSale()
  if (result && result.art_status !== undefined) emit('status-changed', result.art_status)
}
const onSaved = afterChange
const onCancelled = afterChange

async function cancel(s) {
  cancellingId.value = s.id
  try {
    const result = await saleStore.cancelSale(s)
    if (result) {
      message.success('Продажа отменена')
      afterChange(result)
    }
  } finally {
    cancellingId.value = null
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
.sale-copies {
  margin-bottom: 10px;
  font-size: 13px;
  color: var(--text-muted, #5a564c);
}

.sale-edition {
  margin-right: 8px;
  padding: 1px 8px;
  font-size: 12px;
  color: #6f581f;
  background: #f1eadb;
  border-radius: 10px;
}

.sale-info + .sale-info,
.sale-info + .sale-empty {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed rgba(0, 0, 0, 0.08);
}

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
