<template>
  <a-modal
    :open="open"
    :title="`Изменить выбранные работы: ${ids.length}`"
    width="560px"
    destroy-on-close
    @cancel="close"
  >
    <p class="bulk-hint">
      Отметьте, что нужно поменять, — остальные поля у работ останутся как есть.
      Пустое значение у отмеченного поля очистит его.
    </p>

    <div class="bulk-fields">
      <!-- Поля-справочники -->
      <div v-for="field in visibleFields" :key="field.key" class="bulk-row">
        <a-checkbox v-model:checked="enabled[field.key]" class="bulk-check">{{ field.label }}</a-checkbox>
        <a-select
          v-model:value="values[field.key]"
          :options="field.options"
          show-search
          option-filter-prop="label"
          allow-clear
          :placeholder="enabled[field.key] ? 'Пусто — очистить поле' : 'Не менять'"
          class="bulk-control"
        />
      </div>

      <!-- Теги -->
      <div class="bulk-row bulk-row-top">
        <a-checkbox v-model:checked="enabled.tags" class="bulk-check">Теги</a-checkbox>
        <div class="bulk-control">
          <a-radio-group v-model:value="tagMode" size="small" button-style="solid" class="bulk-tag-mode">
            <a-radio-button value="add">Добавить</a-radio-button>
            <a-radio-button value="remove">Убрать</a-radio-button>
            <a-radio-button value="set">Заменить все</a-radio-button>
          </a-radio-group>
          <a-select
            v-model:value="tagIds"
            mode="multiple"
            :options="tagOptions"
            option-filter-prop="label"
            :placeholder="tagMode === 'set' ? 'Пусто — снять все теги' : 'Выберите теги'"
            class="bulk-tag-select"
          />
          <div v-if="enabled.tags" class="bulk-sub">{{ tagModeHint }}</div>
        </div>
      </div>

      <!-- Цена -->
      <div class="bulk-row bulk-row-top">
        <a-checkbox v-model:checked="enabled.price" class="bulk-check">Цена</a-checkbox>
        <div class="bulk-control">
          <a-input-number
            v-model:value="pricePct"
            :min="-99"
            :max="1000"
            :precision="2"
            placeholder="например, 10 или −15"
            style="width: 220px"
          >
            <template #addonAfter>%</template>
          </a-input-number>
          <div v-if="enabled.price" class="bulk-sub">{{ priceHint }}</div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="bulk-footer">
        <span class="bulk-summary">{{ summary }}</span>
        <div class="bulk-footer-buttons">
          <a-button @click="close">Отмена</a-button>
          <a-button type="primary" :loading="saving" :disabled="!hasChanges" @click="apply">
            Применить
          </a-button>
        </div>
      </div>
    </template>
  </a-modal>
</template>

<script setup>
// Массовое изменение выбранных работ: поля-справочники, теги, цена в %.
// Бэкенд проверяет всё до первого изменения — меняются либо все работы,
// либо (при ошибке) ни одна (POST /api/v1/art/art-objects/bulk-update).
import { computed, reactive, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useArtWork } from '@/stores/artWork.js'
import { useArtist } from '@/stores/artist.js'
import { useLocations } from '@/stores/locations.js'
import { useSerias } from '@/stores/seria.js'
import { useMedia } from '@/stores/media.js'
import { useStatuses } from '@/stores/statuses.js'
import { useTags } from '@/stores/tags.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  ids: { type: Array, default: () => [] },
  // у художника поле «Художник» всегда он сам — не показываем
  hideArtist: { type: Boolean, default: false },
})
const emit = defineEmits(['update:open', 'done'])

const artWorkStore = useArtWork()
const artistStore = useArtist()
const locationsStore = useLocations()
const seriasStore = useSerias()
const mediaStore = useMedia()
const statusesStore = useStatuses()
const tagsStore = useTags()

const toOptions = (list) => (list || []).map(x => ({ label: x.name, value: x.id }))

const FIELDS = computed(() => [
  { key: 'artist', label: 'Художник', options: toOptions(artistStore.listArtists) },
  { key: 'location', label: 'Локация', options: toOptions(locationsStore.listLocations) },
  { key: 'seria', label: 'Серия', options: toOptions(seriasStore.listSerias) },
  { key: 'media', label: 'Медиа', options: toOptions(mediaStore.listMedia) },
  { key: 'status', label: 'Статус', options: toOptions(statusesStore.listStatuses) },
])
const visibleFields = computed(() => FIELDS.value.filter(f => !(props.hideArtist && f.key === 'artist')))
const tagOptions = computed(() => toOptions(tagsStore.listTags))

const enabled = reactive({})
const values = reactive({})
const tagMode = ref('add')
const tagIds = ref([])
const pricePct = ref(null)
const saving = ref(false)

function reset() {
  for (const f of FIELDS.value) {
    enabled[f.key] = false
    values[f.key] = undefined
  }
  enabled.tags = false
  enabled.price = false
  tagMode.value = 'add'
  tagIds.value = []
  pricePct.value = null
}

watch(() => props.open, (isOpen) => {
  if (isOpen) reset()
})

// Выбор значения сам отмечает поле — меньше лишних кликов
for (const key of ['artist', 'location', 'seria', 'media', 'status']) {
  watch(() => values[key], (v) => { if (v) enabled[key] = true })
}
watch(tagIds, (v) => { if (v.length) enabled.tags = true })
watch(tagMode, () => { enabled.tags = true })
watch(pricePct, (v) => { if (v !== null && v !== undefined) enabled.price = true })

const tagModeHint = computed(() => ({
  add: 'Выбранные теги добавятся к уже стоящим',
  remove: 'Выбранные теги снимутся, остальные останутся',
  set: 'Теги работ заменятся выбранными',
}[tagMode.value]))

const priceHint = computed(() => {
  const v = Number(pricePct.value)
  if (!pricePct.value || !Number.isFinite(v)) return 'Работы без цены не изменятся'
  const example = Math.round(100000 * (100 + v) / 100).toLocaleString('ru-RU')
  return `Например, 100 000 → ${example}. Округление до целого, работы без цены не изменятся`
})

function buildChanges() {
  const changes = {}
  const fields = {}
  for (const f of visibleFields.value) {
    if (enabled[f.key]) fields[f.key] = values[f.key] || null
  }
  if (Object.keys(fields).length) changes.fields = fields
  if (enabled.tags && (tagIds.value.length || tagMode.value === 'set')) {
    changes.tags = { mode: tagMode.value, ids: tagIds.value }
  }
  if (enabled.price && pricePct.value) changes.price_pct = Number(pricePct.value)
  return changes
}

const hasChanges = computed(() => Object.keys(buildChanges()).length > 0)

const summary = computed(() => {
  const c = buildChanges()
  const parts = []
  for (const f of visibleFields.value) {
    if (c.fields && f.key in c.fields) parts.push(c.fields[f.key] ? f.label.toLowerCase() : `${f.label.toLowerCase()} (очистить)`)
  }
  if (c.tags) parts.push('теги')
  if (c.price_pct) parts.push(`цена ${c.price_pct > 0 ? '+' : ''}${c.price_pct}%`)
  return parts.length ? `Изменится: ${parts.join(', ')}` : 'Ничего не выбрано'
})


function close() {
  emit('update:open', false)
}

async function apply() {
  const changes = buildChanges()
  const clearing = Object.entries(changes.fields || {}).filter(([, v]) => v === null).length
  const risky = clearing || changes.price_pct || (changes.tags?.mode === 'set')
  const run = async () => {
    saving.value = true
    try {
      const result = await artWorkStore.bulkUpdateArtWorks(props.ids, changes)
      if (result) {
        message.success(`Обновлено работ: ${result.updated}`)
        emit('done', result)
        close()
      }
    } finally {
      saving.value = false
    }
  }
  if (!risky) return run()
  Modal.confirm({
    title: `Изменить выбранные работы (${props.ids.length})?`,
    content: `${summary.value}. Отменить это действие нельзя.`,
    okText: 'Изменить',
    cancelText: 'Назад',
    onOk: run,
  })
}

</script>

<style scoped>
.bulk-hint {
  margin: 0 0 16px;
  font-size: 13px;
  color: #5a564c;
}

.bulk-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bulk-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bulk-row-top {
  align-items: flex-start;
}

.bulk-row-top .bulk-check {
  padding-top: 4px;
}

.bulk-check {
  width: 120px;
  flex-shrink: 0;
}

.bulk-control {
  flex: 1;
  min-width: 0;
}

/* Неотмеченное поле не меняется — приглушаем, но оставляем кликабельным:
   выбор значения сам отмечает поле */
.bulk-row:has(.bulk-check:not(.ant-checkbox-wrapper-checked)) .bulk-control {
  opacity: 0.6;
}

.bulk-tag-mode {
  margin-bottom: 6px;
}

.bulk-tag-select {
  width: 100%;
}

.bulk-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #7c7669;
}

.bulk-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.bulk-summary {
  font-size: 12px;
  color: #5a564c;
  text-align: left;
}

.bulk-footer-buttons {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

@media (max-width: 600px) {
  .bulk-row {
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
  }

  .bulk-check {
    width: auto;
  }
}
</style>
