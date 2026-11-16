<template>
  <div class="artists-page">
    <div class="page-header">
      <div>
        <div class="page-header-top">
          <MobileMenuButton />
          <h2 class="page-title">Мои художники</h2>
        </div>
        <p class="page-subtitle">
          {{ artists.length ? `${artists.length} ${pluralArtists(artists.length)}` : 'Пока нет ни одного художника' }}
        </p>
      </div>
      <div class="header-actions">
        <a-button type="primary" class="add-btn" :disabled="quotaFull" @click="openCreate">
          <template #icon><PlusOutlined /></template>
          Добавить художника
        </a-button>
      </div>
    </div>

    <!-- Лимит галереи -->
    <div v-if="quota" class="quota-panel" :class="{ 'quota-full': quotaFull }">
      <div class="quota-text">
        Художников: <b>{{ quota.used }}</b> из <b>{{ quota.limit }}</b>
        <span v-if="quotaFull" class="quota-hint">— лимит исчерпан, чтобы добавить ещё, обратитесь к администратору</span>
      </div>
      <a-progress
        :percent="quotaPercent"
        :show-info="false"
        :status="quotaFull ? 'exception' : 'normal'"
        size="small"
        class="quota-bar"
      />
    </div>

    <div class="filters-panel">
      <a-input v-model:value="search" placeholder="Поиск по имени или городу" allow-clear class="search-input">
        <template #prefix><SearchOutlined /></template>
      </a-input>
      <a-select v-model:value="sortBy" :options="sortOptions" class="sort-select" />
    </div>

    <!-- Телефон: карточки -->
    <a-spin v-if="isMobile" :spinning="loading">
      <div v-if="!filtered.length && !loading" class="empty">Ничего не найдено</div>
      <div class="m-list">
        <div v-for="a in filtered" :key="a.id" class="m-card" @click="openArtist(a)">
          <div class="m-card-top">
            <ArtistAvatar :artist="a" :size="44" />
            <div class="m-card-name">
              {{ a.name }}
              <div v-if="a.city" class="m-card-sub">{{ a.city }}</div>
            </div>
            <RightOutlined class="m-card-arrow" />
          </div>
          <div class="m-card-stats">
            <span>Работ: <b>{{ a.works_count }}</b></span>
            <span>Продано: <b>{{ a.sold_count }}</b></span>
            <span v-if="a.open_tasks_count">Задач: <b>{{ a.open_tasks_count }}</b></span>
          </div>
          <div v-if="a.sales_total.length" class="m-card-money">Продажи: {{ moneyList(a.sales_total) }}</div>
          <div v-if="a.unpaid_total.length" class="m-card-money unpaid">Не выплачено: {{ moneyList(a.unpaid_total) }}</div>
        </div>
      </div>
    </a-spin>

    <a-table
      v-else
      class="artists-table"
      :columns="columns"
      :data-source="filtered"
      :loading="loading"
      row-key="id"
      :pagination="filtered.length > 50 ? { pageSize: 50, showSizeChanger: false } : false"
      :scroll="{ x: 'max-content' }"
      :custom-row="(record) => ({ onClick: () => openArtist(record), class: 'clickable-row' })"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <div class="name-cell">
            <ArtistAvatar :artist="record" :size="36" />
            <div>
              <div class="name-text">{{ record.name }}</div>
              <div v-if="record.city || record.commission_pct !== null" class="name-sub">
                {{ [record.city, record.commission_pct !== null ? `комиссия ${formatPct(record.commission_pct)}` : null].filter(Boolean).join(' · ') }}
              </div>
            </div>
          </div>
        </template>
        <template v-else-if="column.key === 'works'">
          {{ record.works_count }}
          <span v-if="record.sold_count" class="cell-sub">· продано {{ record.sold_count }}</span>
        </template>
        <template v-else-if="column.key === 'sales'">
          <span v-if="record.sales_total.length">{{ moneyList(record.sales_total) }}</span>
          <span v-else class="cell-empty">—</span>
        </template>
        <template v-else-if="column.key === 'unpaid'">
          <span v-if="record.unpaid_total.length" class="unpaid">{{ moneyList(record.unpaid_total) }}</span>
          <span v-else class="cell-empty">—</span>
        </template>
        <template v-else-if="column.key === 'tasks'">
          <span v-if="record.open_tasks_count">{{ record.open_tasks_count }}</span>
          <span v-else class="cell-empty">—</span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-popconfirm
            v-if="!record.works_count"
            :title="`Удалить художника «${record.name}»?`"
            ok-text="Удалить"
            ok-type="danger"
            cancel-text="Отмена"
            @confirm="remove(record)"
          >
            <a-button type="text" size="small" danger @click.stop><DeleteOutlined /></a-button>
          </a-popconfirm>
          <a-tooltip v-else title="Нельзя удалить: у художника есть работы">
            <a-button type="text" size="small" disabled @click.stop><DeleteOutlined /></a-button>
          </a-tooltip>
        </template>
      </template>
    </a-table>

    <!-- Новый художник -->
    <a-modal
      v-model:open="isCreateOpen"
      title="Новый художник"
      ok-text="Добавить"
      cancel-text="Отмена"
      :confirm-loading="creating"
      @ok="create"
    >
      <a-input
        ref="nameInputRef"
        v-model:value="newName"
        placeholder="Имя художника"
        :maxlength="300"
        @press-enter="create"
      />
      <p class="modal-hint">Фото, контакты и комиссию можно заполнить в карточке художника.</p>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, DeleteOutlined, RightOutlined } from '@ant-design/icons-vue'
import MobileMenuButton from '@/components/MobileMenuButton.vue'
import ArtistAvatar from '@/components/ArtistAvatar.vue'
import { useArtist } from '@/stores/artist.js'
import { useIsMobile } from '@/composables/useIsMobile.js'
import { formatMoney, formatPct } from '@/utils/money.js'

const router = useRouter()
const artistStore = useArtist()
const { isMobile } = useIsMobile()

const loading = ref(false)
const artists = ref([])
const quota = ref(null)
const search = ref('')
const sortBy = ref('name')

const sortOptions = [
  { label: 'По имени', value: 'name' },
  { label: 'Больше работ', value: 'works' },
  { label: 'Больше продаж', value: 'sold' },
  { label: 'Есть невыплаченное', value: 'unpaid' },
  { label: 'Есть открытые задачи', value: 'tasks' },
]

const quotaFull = computed(() => !!quota.value && quota.value.used >= quota.value.limit)
const quotaPercent = computed(() => (quota.value?.limit ? Math.min(100, Math.round((quota.value.used / quota.value.limit) * 100)) : 100))

const pluralArtists = (n) => {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'художник'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'художника'
  return 'художников'
}
const moneyList = (list) => list.map(x => formatMoney(x.amount, x.currency)).join(' + ')

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = artists.value.filter(a => !q || [a.name, a.city].some(v => String(v || '').toLowerCase().includes(q)))
  const byName = (a, b) => String(a.name).localeCompare(String(b.name), 'ru')
  const sorters = {
    name: byName,
    works: (a, b) => b.works_count - a.works_count || byName(a, b),
    sold: (a, b) => b.sold_count - a.sold_count || byName(a, b),
    unpaid: (a, b) => b.unpaid_count - a.unpaid_count || byName(a, b),
    tasks: (a, b) => b.open_tasks_count - a.open_tasks_count || byName(a, b),
  }
  return [...list].sort(sorters[sortBy.value])
})

const columns = [
  { title: 'Художник', key: 'name' },
  { title: 'Работ', key: 'works', width: 150 },
  { title: 'Продажи', key: 'sales', width: 200 },
  { title: 'Не выплачено художнику', key: 'unpaid', width: 210 },
  { title: 'Открытых задач', key: 'tasks', width: 140 },
  { title: '', key: 'actions', width: 60, align: 'right' },
]

async function load() {
  loading.value = true
  try {
    const data = await artistStore.getSummary()
    if (data) {
      artists.value = data.artists
      quota.value = data.quota
    }
  } finally {
    loading.value = false
  }
}

function openArtist(a) {
  router.push({ name: 'artist', params: { id: a.id } })
}

// === Добавление ===
const isCreateOpen = ref(false)
const newName = ref('')
const creating = ref(false)
const nameInputRef = ref(null)

async function openCreate() {
  newName.value = ''
  isCreateOpen.value = true
  await nextTick()
  setTimeout(() => nameInputRef.value?.focus(), 50)
}

async function create() {
  const name = newName.value.trim()
  if (!name) {
    message.warning('Укажите имя художника')
    return
  }
  creating.value = true
  try {
    const created = await artistStore.addArtist({ name })
    if (created) {
      isCreateOpen.value = false
      message.success('Художник добавлен')
      router.push({ name: 'artist', params: { id: created.id } })
    }
  } finally {
    creating.value = false
  }
}

async function remove(a) {
  if (await artistStore.removeArtist(a.id)) {
    message.success('Художник удалён')
    load()
  }
}

onMounted(load)
</script>

<style scoped>
.artists-page {
  --bg: #f7f5f0;
  --bg-elevated: #ffffff;
  --text-title: #211f1a;
  --text-body: #2c2a25;
  --text-muted: #5a564c;
  --text-faint: #7c7669;
  --accent: #8a6d2f;
  --accent-strong: #6f581f;
  --border: rgba(0, 0, 0, 0.08);

  min-height: 100%;
  background: var(--bg);
  color: var(--text-body);
  border-radius: 14px;
  padding: 20px 24px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.page-header-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 26px;
  font-weight: 600;
  color: var(--text-title);
  margin: 0 0 4px;
}

.page-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--text-faint);
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.add-btn {
  background-color: var(--accent) !important;
  border-color: var(--accent) !important;
  border-radius: 20px !important;
  font-weight: 500;
}

.add-btn:hover:not(:disabled) {
  background-color: var(--accent-strong) !important;
  border-color: var(--accent-strong) !important;
}

.add-btn:disabled {
  opacity: 0.5;
  color: #fff !important;
}

.quota-panel {
  max-width: 520px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 14px 6px;
  margin-bottom: 16px;
  font-size: 13px;
}

.quota-full {
  border-color: rgba(180, 60, 60, 0.35);
}

.quota-hint {
  color: #b43c3c;
}

.quota-bar :deep(.ant-progress-bg) {
  background-color: var(--accent);
}

.quota-full .quota-bar :deep(.ant-progress-bg) {
  background-color: #b43c3c;
}

.filters-panel {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.search-input {
  width: 320px;
  max-width: 100%;
}

.sort-select {
  width: 220px;
}

.artists-table :deep(.clickable-row) {
  cursor: pointer;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.name-text {
  font-weight: 500;
  color: var(--text-title);
}

.name-sub,
.cell-sub {
  font-size: 12px;
  color: var(--text-faint);
}

.cell-empty {
  color: var(--text-faint);
}

.unpaid {
  color: #b4441c;
  font-weight: 500;
}

.modal-hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: #7c7669;
}

.empty {
  padding: 24px 0;
  text-align: center;
  color: var(--text-faint);
}

/* Телефон */
.m-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.m-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
}

.m-card-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.m-card-name {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  color: var(--text-title);
}

.m-card-sub {
  font-weight: 400;
  font-size: 12px;
  color: var(--text-faint);
}

.m-card-arrow {
  color: var(--text-faint);
}

.m-card-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-muted);
}

.m-card-money {
  margin-top: 4px;
  font-size: 13px;
}

@media (max-width: 640px) {
  .artists-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
  }

  .sort-select,
  .search-input {
    width: 100%;
  }
}
</style>
