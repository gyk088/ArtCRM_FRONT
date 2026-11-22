<template>
  <div class="hj-page">
    <div class="hj-head">
      <MobileMenuButton />
      <div>
        <h2 class="page-title">История изменений</h2>
        <div class="hj-sub">Кто и когда создавал, менял и удалял работы, ссылки, выставки, отчёты, продажи и другие записи галереи</div>
      </div>
    </div>

    <div class="hj-filters">
      <a-select v-model:value="fType" :options="typeOptions" placeholder="Все разделы" allow-clear class="hj-select" />
      <a-select
        v-model:value="fActor"
        :options="actorOptions"
        placeholder="Все сотрудники"
        allow-clear
        show-search
        option-filter-prop="label"
        class="hj-select"
      />
      <a-range-picker v-model:value="fPeriod" format="DD.MM.YYYY" :placeholder="['С', 'По']" class="hj-range" />
      <a-button v-if="fType || fActor || fPeriod" type="link" @click="resetFilters">Сбросить</a-button>
    </div>

    <a-spin :spinning="loading && !items.length">
      <div v-if="!loading && !items.length" class="hj-empty">
        Записей нет.
        <div class="hj-empty-hint">История ведётся с момента обновления системы — более ранние правки в неё не попали.</div>
      </div>

      <div v-else class="hj-list">
        <template v-for="(group, gi) in grouped" :key="gi">
          <div class="hj-day">{{ group.day }}</div>
          <div v-for="item in group.items" :key="item.id" class="hj-row">
            <span class="hj-time">{{ timeOf(item.ctime) }}</span>
            <span class="hj-dot" :style="{ background: ACTION_COLORS[item.action] || '#c9b88a' }" />
            <div class="hj-main">
              <div class="hj-line">
                <b>{{ actorName(item.actor) }}</b> {{ actionText(item.action) }}
                <span class="hj-type">{{ (ENTITY_LABELS[item.entity_type] || item.entity_type).toLowerCase() }}</span>
                <router-link v-if="entityLink(item)" :to="entityLink(item)" class="hj-name">{{ item.entity_name || 'Без названия' }}</router-link>
                <span v-else class="hj-name hj-name-plain">{{ item.entity_name || 'Без названия' }}</span>
                <span v-if="item.entity_deleted && item.action !== 'delete'" class="hj-deleted">удалено</span>
              </div>
              <HistoryChanges :changes="item.meta?.changes" />
            </div>
          </div>
        </template>

        <div v-if="hasMore" class="hj-more">
          <a-button :loading="loading" @click="load(true)">Показать ещё</a-button>
        </div>
      </div>
    </a-spin>
  </div>
</template>

<script setup>
// Журнал изменений галереи: все действия галереи и её менеджеров (см. ChangeLogService)
import { computed, onMounted, ref, watch } from 'vue'
import MobileMenuButton from '@/components/MobileMenuButton.vue'
import HistoryChanges from '@/components/HistoryChanges.vue'
import { useHistory } from '@/stores/history.js'
import { ENTITY_LABELS, ACTION_COLORS, actionText, actorName, entityLink } from '@/utils/history.js'

const store = useHistory()
const items = ref([])
const actors = ref([])
const hasMore = ref(false)
const loading = ref(false)

const fType = ref(undefined)
const fActor = ref(undefined)
const fPeriod = ref(null)

const typeOptions = Object.entries(ENTITY_LABELS).map(([value, label]) => ({ value, label }))
const ROLE_LABELS = { gallery: 'галерея', manager: 'менеджер', artist: 'художник', super_admin: 'админ' }
const actorOptions = computed(() => actors.value.map(a => ({
  value: a.id,
  label: `${actorName(a)}${ROLE_LABELS[a.role] ? ` (${ROLE_LABELS[a.role]})` : ''}`,
})))

const params = (more) => ({
  type: fType.value || undefined,
  actor: fActor.value || undefined,
  from: fPeriod.value?.[0]?.format('YYYY-MM-DD'),
  to: fPeriod.value?.[1]?.format('YYYY-MM-DD'),
  before: more && items.value.length ? items.value[items.value.length - 1].ctime : undefined,
  limit: 50,
})

async function load(more = false) {
  loading.value = true
  try {
    const data = await store.getJournal(params(more))
    if (!data) return
    items.value = more ? [...items.value, ...data.items] : data.items
    hasMore.value = data.has_more
    if (data.actors?.length) actors.value = data.actors
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  fType.value = undefined
  fActor.value = undefined
  fPeriod.value = null
}

watch([fType, fActor, fPeriod], () => load(false))
onMounted(() => load(false))

const timeOf = (v) => new Date(v).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
const dayOf = (v) => {
  const d = new Date(v)
  const today = new Date()
  const y = new Date(today)
  y.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Сегодня'
  if (d.toDateString() === y.toDateString()) return 'Вчера'
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}
const grouped = computed(() => {
  const groups = []
  for (const item of items.value) {
    const day = dayOf(item.ctime)
    if (!groups.length || groups[groups.length - 1].day !== day) groups.push({ day, items: [] })
    groups[groups.length - 1].items.push(item)
  }
  return groups
})
</script>

<style scoped>
.hj-page {
  --accent: #8a6d2f;
  --text-title: #211f1a;
  --text-body: #2c2a25;
  --text-faint: #7c7669;
  --border: rgba(0, 0, 0, 0.08);

  background: #f7f5f0;
  color: var(--text-body);
  border-radius: 14px;
  padding: 20px 20px 32px;
  margin: 0 -16px;
}

.hj-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 16px;
}

.page-title {
  margin: 0;
  font-family: 'Cormorant Garamond', serif;
  font-size: 30px;
  font-weight: 600;
  color: var(--text-title);
}

.hj-sub {
  font-size: 13px;
  color: var(--text-faint);
}

.hj-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.hj-select {
  width: 220px;
}

.hj-range {
  width: 260px;
}

.hj-empty {
  padding: 48px 0;
  text-align: center;
  color: var(--text-faint);
}

.hj-empty-hint {
  margin-top: 8px;
  font-size: 12px;
}

.hj-list {
  padding: 4px 16px 12px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
}

.hj-day {
  padding: 14px 0 6px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
  border-bottom: 1px solid var(--border);
}

.hj-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.hj-time {
  flex: 0 0 44px;
  font-size: 13px;
  color: var(--text-faint);
  font-variant-numeric: tabular-nums;
}

.hj-dot {
  flex: 0 0 8px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transform: translateY(-1px);
}

.hj-main {
  flex: 1;
  min-width: 0;
}

.hj-line {
  font-size: 14px;
  line-height: 1.45;
}

.hj-line b {
  font-weight: 600;
  color: var(--text-title);
}

.hj-type {
  color: var(--text-faint);
}

.hj-name {
  margin-left: 4px;
  font-weight: 500;
  color: var(--accent);
}

.hj-name-plain {
  color: var(--text-body);
}

.hj-deleted {
  margin-left: 6px;
  padding: 0 6px;
  font-size: 11px;
  color: #b43c3c;
  background: rgba(180, 60, 60, 0.08);
  border-radius: 999px;
}

.hj-more {
  display: flex;
  justify-content: center;
  padding: 14px 0 4px;
}

@media (max-width: 768px) {
  .hj-page {
    padding: 14px 12px 24px;
  }

  .hj-select,
  .hj-range {
    width: 100%;
  }

  .hj-list {
    padding: 4px 12px 10px;
  }
}
</style>
