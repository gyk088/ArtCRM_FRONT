<template>
  <div class="reports-page">
    <div class="page-header">
      <div>
        <div class="page-header-top">
          <MobileMenuButton />
          <h2 class="page-title">Отчёты</h2>
        </div>
        <p class="page-subtitle">Отчёты о продажах: свои фильтры, валюта и курсы у каждого отчёта</p>
      </div>
      <a-button type="primary" @click="openCreate">
        <template #icon><PlusOutlined /></template>
        Создать отчёт
      </a-button>
    </div>

    <a-spin :spinning="reportStore.loading && !reportStore.listReports.length">
      <div v-if="reportStore.listReports.length" class="reports-grid">
        <div
          v-for="report in reportStore.listReports"
          :key="report.id"
          class="report-card"
          @click="openReport(report)"
        >
          <div class="report-card-top">
            <div class="report-icon"><BarChartOutlined /></div>
            <div class="report-card-title">{{ report.name }}</div>
            <span class="report-currency">{{ report.currency }}</span>
          </div>
          <div class="report-card-meta">
            <div>Период: {{ periodText(report.filters) }}</div>
            <div v-if="report.owner && report.user_id !== currentUserId">Автор: {{ ownerName(report.owner) }}</div>
            <div>Изменён: {{ formatDateTime(report.utime) }}</div>
          </div>
          <div class="report-card-actions" @click.stop>
            <a-popconfirm title="Удалить отчёт?" ok-text="Да" cancel-text="Нет" @confirm="remove(report)">
              <button class="icon-btn icon-btn-danger" title="Удалить"><DeleteOutlined /></button>
            </a-popconfirm>
          </div>
        </div>
      </div>

      <div v-else-if="!reportStore.loading" class="empty-state">
        <BarChartOutlined class="empty-icon" />
        <p class="empty-title">Отчётов пока нет</p>
        <p class="empty-subtitle">
          Создайте отчёт о продажах: выберите период, художников и валюту — суммы в разных валютах
          пересчитаются по курсам, которые вы зададите в отчёте.
        </p>
        <a-button type="primary" @click="openCreate">Создать отчёт</a-button>
      </div>
    </a-spin>

    <a-modal
      v-model:open="createOpen"
      title="Новый отчёт о продажах"
      ok-text="Создать"
      cancel-text="Отмена"
      :confirm-loading="creating"
      @ok="create"
    >
      <a-form layout="vertical">
        <a-form-item label="Название" required>
          <a-input v-model:value="createForm.name" :maxlength="200" placeholder="Например, «Продажи 2026»" @press-enter="create" />
        </a-form-item>
        <a-form-item label="Валюта отчёта" required>
          <a-select v-model:value="createForm.currency" :options="CURRENCY_OPTIONS" />
          <div class="hint">Все суммы будут пересчитаны в эту валюту. Курсы зададите в самом отчёте.</div>
        </a-form-item>
        <a-form-item label="Период">
          <a-select v-model:value="createForm.preset" :options="periodPresetOptions" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { PlusOutlined, BarChartOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import MobileMenuButton from '@/components/MobileMenuButton.vue'
import { useReport } from '@/stores/report.js'
import { getUser } from '@/services/auth.js'
import { CURRENCY_OPTIONS, formatDate } from '@/utils/money.js'
import { PERIOD_PRESETS, presetRange } from '@/utils/reportPeriods.js'

const router = useRouter()
const reportStore = useReport()
const currentUserId = getUser()?.id

const periodPresetOptions = PERIOD_PRESETS.map(p => ({ label: p.label, value: p.key }))

onMounted(() => {
  reportStore.getListReports()
})

const createOpen = ref(false)
const creating = ref(false)
const createForm = reactive({ name: '', currency: 'BYN', preset: 'this_year' })

function openCreate() {
  const last = reportStore.listReports[0]
  Object.assign(createForm, {
    name: `Продажи ${dayjs().format('YYYY')}`,
    currency: last?.currency || 'BYN',
    preset: 'this_year',
  })
  createOpen.value = true
}

async function create() {
  if (!createForm.name.trim()) {
    message.warning('Укажите название отчёта')
    return
  }
  creating.value = true
  try {
    const [date_from, date_to] = presetRange(createForm.preset)
    const report = await reportStore.createReport({
      name: createForm.name.trim(),
      currency: createForm.currency,
      filters: { date_from, date_to },
    })
    if (report) {
      createOpen.value = false
      router.push({ name: 'report', params: { id: report.id } })
    }
  } finally {
    creating.value = false
  }
}

function openReport(report) {
  router.push({ name: 'report', params: { id: report.id } })
}

async function remove(report) {
  if (await reportStore.deleteReport(report.id)) message.success('Отчёт удалён')
}

function periodText(filters = {}) {
  if (!filters.date_from && !filters.date_to) return 'всё время'
  return `${filters.date_from ? formatDate(filters.date_from) : '…'} — ${filters.date_to ? formatDate(filters.date_to) : '…'}`
}

function ownerName(owner) {
  return [owner.name, owner.surname].filter(Boolean).join(' ') || '—'
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
}
</script>

<style scoped>
.reports-page {
  --bg: #f7f5f0;
  --bg-elevated: #ffffff;
  --card-bg: #efece4;
  --text-title: #211f1a;
  --text-muted: #5a564c;
  --text-faint: #7c7669;
  --accent: #8a6d2f;
  --border-soft: rgba(0, 0, 0, 0.07);

  min-height: 100vh;
  background: var(--bg);
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.page-header-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-title {
  margin: 0;
  font-size: 22px;
  color: var(--text-title);
}

.page-subtitle {
  margin: 4px 0 0;
  color: var(--text-muted);
}

.reports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.report-card {
  position: relative;
  background: var(--bg-elevated);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: box-shadow 0.15s;
}

.report-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.report-card-top {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-right: 32px;
}

.report-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.report-card-title {
  font-weight: 600;
  color: var(--text-title);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-currency {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
}

.report-card-meta {
  margin-top: 10px;
  font-size: 13px;
  color: var(--text-muted);
  display: grid;
  gap: 2px;
}

.report-card-actions {
  position: absolute;
  top: 10px;
  right: 10px;
}

.icon-btn {
  border: none;
  background: none;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-faint);
}

.icon-btn-danger:hover {
  background: #f8e9e9;
  color: #8f2c2c;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: var(--bg-elevated);
  border-radius: 12px;
  border: 1px solid var(--border-soft);
}

.empty-icon {
  font-size: 40px;
  color: var(--accent);
}

.empty-title {
  font-size: 17px;
  font-weight: 600;
  margin: 12px 0 4px;
}

.empty-subtitle {
  max-width: 460px;
  margin: 0 auto 16px;
  color: var(--text-muted);
}

.hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-faint);
}

@media (max-width: 600px) {
  .reports-page {
    padding: 16px;
  }
}
</style>
