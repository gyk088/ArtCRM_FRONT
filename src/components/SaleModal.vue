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

        <div class="sale-row">
          <a-form-item label="Цена продажи" required class="sale-col">
            <a-input-number v-model:value="form.sale_price" :min="0" style="width: 100%" placeholder="0" />
          </a-form-item>
          <a-form-item label="Валюта" class="sale-col-narrow">
            <a-select v-model:value="form.currency" :options="currencyOptions" />
          </a-form-item>
        </div>

        <a-form-item label="Цена по прайсу">
          <a-input-number v-model:value="form.list_price" :min="0" style="width: 100%" placeholder="Не указана" />
          <div v-if="discountPreview !== null" class="sale-hint">
            {{ discountPreview > 0 ? `Скидка ${formatPct(discountPreview)}` : discountPreview < 0 ? `Наценка ${formatPct(-discountPreview)}` : 'Без скидки' }}
          </div>
        </a-form-item>

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

        <a-form-item label="Комиссия галереи, %">
          <a-input-number v-model:value="form.commission_pct" :min="0" :max="100" style="width: 100%" placeholder="Не указана" />
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
  sale_price: null,
  list_price: null,
  currency: 'RUB',
  contact_id: undefined,
  commission_pct: null,
  comment: '',
})

const toNumber = (v) => (v === null || v === undefined || v === '' ? null : Number(v))

const modalTitle = computed(() => {
  const base = sale.value ? 'Изменить продажу' : 'Продажа работы'
  return props.workName ? `${base}: ${props.workName}` : base
})

function fillForm() {
  if (sale.value) {
    Object.assign(form, {
      sale_date: sale.value.sale_date,
      sale_price: sale.value.sale_price,
      list_price: sale.value.list_price,
      currency: sale.value.currency,
      contact_id: sale.value.contact?.id || undefined,
      commission_pct: sale.value.commission_pct,
      comment: sale.value.comment || '',
    })
  } else {
    const price = toNumber(props.price)
    Object.assign(form, {
      sale_date: dayjs().format('YYYY-MM-DD'),
      sale_price: price,
      list_price: price,
      currency: props.currency || 'RUB',
      contact_id: undefined,
      commission_pct: null,
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

const discountPreview = computed(() => {
  const list = toNumber(form.list_price)
  const salePrice = toNumber(form.sale_price)
  if (!list || salePrice === null) return null
  return Math.round(((list - salePrice) / list) * 10000) / 100
})

function close() {
  emit('update:open', false)
}

async function submit() {
  if (!form.sale_date) {
    message.warning('Укажите дату продажи')
    return
  }
  if (toNumber(form.sale_price) === null) {
    message.warning('Укажите цену продажи')
    return
  }

  const payload = {
    sale_date: form.sale_date,
    sale_price: toNumber(form.sale_price),
    list_price: toNumber(form.list_price),
    currency: form.currency,
    contact_id: form.contact_id || null,
    commission_pct: toNumber(form.commission_pct),
    comment: form.comment?.trim() || null,
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

function formatPct(value) {
  return `${Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 })}%`
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
