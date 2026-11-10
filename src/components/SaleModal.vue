<template>
  <a-modal
    :open="open"
    :title="modalTitle"
    destroy-on-close
    @cancel="close"
  >
    <a-spin :spinning="loadingSale">
      <a-form v-if="!loadError" layout="vertical" class="sale-form">
        <a-form-item label="Дата продажи" required>
          <a-date-picker
            v-model:value="form.sale_date"
            format="DD.MM.YYYY"
            value-format="YYYY-MM-DD"
            style="width: 100%"
            :allow-clear="false"
          />
        </a-form-item>

        <!-- У работы есть цена: вводим скидку, цену продажи считаем -->
        <template v-if="useDiscount">
          <div class="sale-price-line">
            <span class="sale-price-label">Цена работы</span>
            <span>{{ formatMoney(basePrice, baseCurrency) }}</span>
          </div>

          <a-form-item label="Скидка">
            <a-input-number
              v-model:value="form.discount_value"
              :min="0"
              :max="form.discount_type === 'pct' ? 100 : basePrice"
              :precision="2"
              style="width: 100%"
              placeholder="Без скидки"
            >
              <template #addonAfter>
                <a-select v-model:value="form.discount_type" :options="discountTypeOptions" style="width: 72px" />
              </template>
            </a-input-number>
            <div v-if="discountHint" class="sale-hint">{{ discountHint }}</div>
          </a-form-item>

          <div class="sale-price-line sale-price-total">
            <span class="sale-price-label">Цена продажи</span>
            <b>{{ formatMoney(finalPrice, baseCurrency) }}</b>
          </div>
        </template>

        <!-- Цены у работы нет: вводим цену продажи вручную -->
        <div v-else class="sale-row">
          <a-form-item label="Цена продажи" required class="sale-col">
            <a-input-number v-model:value="form.sale_price" :min="0" style="width: 100%" placeholder="0" />
            <div class="sale-hint">У работы не указана цена — скидку посчитать не от чего</div>
          </a-form-item>
          <a-form-item label="Валюта" class="sale-col-narrow">
            <a-select v-model:value="form.currency" :options="currencyOptions" />
          </a-form-item>
        </div>

        <a-form-item label="Покупатель">
          <a-select
            v-model:value="form.contact_id"
            show-search
            allow-clear
            placeholder="Выберите из контактов"
            :options="contactOptions"
            :filter-option="filterContact"
            :loading="contactStore.loading"
          />
        </a-form-item>

        <a-form-item label="Комментарий">
          <a-textarea v-model:value="form.comment" :maxlength="2000" :rows="2" placeholder="Например, причина скидки" />
        </a-form-item>
      </a-form>
      <div v-else class="sale-load-error">Не удалось загрузить данные о продаже. Закройте окно и попробуйте снова.</div>
    </a-spin>

    <template #footer>
      <div class="sale-footer">
        <a-popconfirm
          v-if="sale"
          title="Отменить продажу? Работа снова станет «в наличии»."
          ok-text="Да"
          cancel-text="Нет"
          @confirm="cancelSale"
        >
          <a-button danger :loading="cancelling">Отменить продажу</a-button>
        </a-popconfirm>
        <span v-else />
        <div class="sale-footer-right">
          <a-button @click="close">Закрыть</a-button>
          <a-button type="primary" :loading="saving" :disabled="loadingSale || loadError" @click="submit">
            Сохранить
          </a-button>
        </div>
      </div>
    </template>
  </a-modal>
</template>

<script setup>
// Окно оформления/изменения/отмены продажи работы. Используется в
// карточке работы (WorkSaleCard) и в колонке «Действия» таблицы работ.
// Само загружает текущую продажу работы при открытии.
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { useSale } from '@/stores/sale.js'
import { useContact } from '@/stores/contact.js'
import { CURRENCY_SIGNS, formatMoney, formatPct } from '@/utils/money.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  artId: { type: String, default: null },
  workName: { type: String, default: '' },
  // Цена и валюта работы — подставляются в новую продажу
  price: { type: [Number, String], default: null },
  currency: { type: String, default: 'RUB' },
})

// saved(sale) — продажа создана/изменена; cancelled() — продажа отменена
const emit = defineEmits(['update:open', 'saved', 'cancelled'])

const saleStore = useSale()
const contactStore = useContact()

const currencyOptions = [
  { label: '₽ RUB', value: 'RUB' },
  { label: 'Br BYN', value: 'BYN' },
  { label: '$ USD', value: 'USD' },
  { label: '€ EUR', value: 'EUR' },
]

const sale = ref(null)
const loadingSale = ref(false)
const loadError = ref(false)
const saving = ref(false)
const cancelling = ref(false)

const form = reactive({
  sale_date: null,
  discount_type: 'pct',
  discount_value: null,
  sale_price: null,
  currency: 'RUB',
  contact_id: undefined,
  comment: '',
})

const toNumber = (v) => (v === null || v === undefined || v === '' ? null : Number(v))
const round2 = (n) => Math.round(n * 100) / 100

// Цена, от которой считается скидка: зафиксированная в продаже, иначе
// текущая цена работы
const basePrice = computed(() => {
  const fromSale = toNumber(sale.value?.list_price)
  return fromSale !== null ? fromSale : toNumber(props.price)
})
const baseCurrency = computed(() =>
  (sale.value?.list_price != null ? sale.value.currency : props.currency) || 'RUB'
)
// Продажа «с наценкой» (цена выше цены работы) скидкой не выразить —
// такую оставляем в ручном режиме
const manualMode = ref(false)
const useDiscount = computed(() => !manualMode.value && basePrice.value !== null && basePrice.value > 0)

const discountTypeOptions = computed(() => [
  { label: '%', value: 'pct' },
  { label: CURRENCY_SIGNS[baseCurrency.value] || baseCurrency.value, value: 'amount' },
])

function priceAfterDiscount(type, value) {
  const base = basePrice.value || 0
  const v = toNumber(value) || 0
  return type === 'pct' ? round2(base * (100 - v) / 100) : round2(base - v)
}

const finalPrice = computed(() => Math.max(0, priceAfterDiscount(form.discount_type, form.discount_value)))

const discountHint = computed(() => {
  const v = toNumber(form.discount_value)
  if (!v) return null
  const amount = round2(basePrice.value - finalPrice.value)
  const pct = round2((amount / basePrice.value) * 100)
  return form.discount_type === 'pct'
    ? `Скидка ${formatMoney(amount, baseCurrency.value)}`
    : `Скидка ${formatPct(pct)}`
})

// При смене %/суммы пересчитываем значение, чтобы цена продажи не менялась
watch(() => form.discount_type, (type, prev) => {
  const v = toNumber(form.discount_value)
  if (!prev || !v || !basePrice.value) return
  const amount = basePrice.value - priceAfterDiscount(prev, v)
  form.discount_value = type === 'pct' ? round2((amount / basePrice.value) * 100) : round2(amount)
}, { flush: 'sync' }) // sync: fillForm сразу после смены типа выставит своё значение

const modalTitle = computed(() => {
  const base = sale.value ? 'Изменить продажу' : 'Продажа работы'
  return props.workName ? `${base}: ${props.workName}` : base
})

function fillForm() {
  manualMode.value = false
  if (sale.value) {
    const s = sale.value
    let discountType = s.discount_type || 'amount'
    let discountValue = s.discount_value
    if (!s.discount_type) {
      // продажа без сохранённой скидки: выражаем её суммой от цены работы
      const diff = s.list_price != null ? round2(s.list_price - s.sale_price) : null
      if (s.list_price != null && diff < 0) manualMode.value = true
      discountValue = diff ? diff : null
    }
    // тип ставим первым: watch пересчитает старое значение, а ниже его перезапишем
    form.discount_type = discountType
    Object.assign(form, {
      sale_date: s.sale_date,
      discount_value: discountValue,
      sale_price: s.sale_price,
      currency: s.currency,
      contact_id: s.contact?.id || undefined,
      comment: s.comment || '',
    })
  } else {
    form.discount_type = 'pct'
    Object.assign(form, {
      sale_date: dayjs().format('YYYY-MM-DD'),
      discount_value: null,
      sale_price: toNumber(props.price),
      currency: props.currency || 'RUB',
      contact_id: undefined,
      comment: '',
    })
  }
}

async function load() {
  sale.value = null
  loadError.value = false
  fillForm()
  if (!contactStore.listContacts.length) contactStore.getListContacts()

  loadingSale.value = true
  try {
    sale.value = await saleStore.getSaleByArtId(props.artId)
    fillForm()
  } catch {
    // ошибка уже показана в сторе; сохранять нельзя, пока неизвестно,
    // продана ли работа (иначе можно было бы оформить вторую продажу)
    loadError.value = true
  } finally {
    loadingSale.value = false
  }
}

watch(() => props.open, (isOpen) => {
  if (isOpen && props.artId) load()
})

const contactOptions = computed(() =>
  contactStore.listContacts.map(c => ({
    value: c.id,
    label: [c.name, c.company].filter(Boolean).join(' · ') || 'Без имени',
  }))
)

const filterContact = (input, option) => option.label.toLowerCase().includes(input.toLowerCase())

function close() {
  emit('update:open', false)
}

async function submit() {
  if (!form.sale_date) {
    message.warning('Укажите дату продажи')
    return
  }
  const common = {
    sale_date: form.sale_date,
    contact_id: form.contact_id || null,
    comment: form.comment?.trim() || null,
  }
  let payload
  if (useDiscount.value) {
    const value = toNumber(form.discount_value) || 0
    if (form.discount_type === 'pct' ? value > 100 : value > basePrice.value) {
      message.warning('Скидка больше цены работы')
      return
    }
    // цену продажи посчитает сервер
    payload = { ...common, discount_type: form.discount_type, discount_value: value }
  } else {
    if (toNumber(form.sale_price) === null) {
      message.warning('Укажите цену продажи')
      return
    }
    payload = { ...common, discount_type: null, sale_price: toNumber(form.sale_price), currency: form.currency }
  }

  saving.value = true
  try {
    const isUpdate = !!sale.value
    const result = isUpdate
      ? await saleStore.updateSale(sale.value.id, payload)
      : await saleStore.createSale({ ...payload, art_id: props.artId })
    if (!result) return
    message.success(isUpdate ? 'Продажа обновлена' : 'Работа отмечена как проданная')
    emit('saved', result)
    close()
  } finally {
    saving.value = false
  }
}

async function cancelSale() {
  cancelling.value = true
  try {
    if (await saleStore.cancelSale(sale.value)) {
      message.success('Продажа отменена')
      emit('cancelled')
      close()
    }
  } finally {
    cancelling.value = false
  }
}

</script>

<style scoped>
.sale-row {
  display: flex;
  gap: 12px;
}

.sale-col {
  flex: 1;
  min-width: 0;
}

.sale-col-narrow {
  width: 120px;
}

.sale-price-line {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 16px;
}

.sale-price-label {
  color: #5a564c;
}

.sale-price-total {
  font-size: 16px;
  padding-top: 4px;
  border-top: 1px dashed rgba(0, 0, 0, 0.1);
}

.sale-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #7c7669;
}

.sale-load-error {
  padding: 16px 0;
  color: #8f2c2c;
}

.sale-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sale-footer-right {
  display: flex;
  gap: 8px;
}
</style>
