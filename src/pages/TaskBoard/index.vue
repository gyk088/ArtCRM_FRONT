<template>
  <div class="board-page">
    <a-spin :spinning="loading && !board">
      <template v-if="board">
        <!-- Шапка доски -->
        <div class="board-header">
          <MobileMenuButton />
          <a-button type="text" class="back-btn" title="Все доски" @click="router.push({ name: 'task-boards' })"><ArrowLeftOutlined /></a-button>
          <div class="board-title-wrap">
            <input
              v-model="boardName"
              class="board-title-input"
              maxlength="200"
              @blur="saveBoardName"
              @keydown.enter.prevent="$event.target.blur()"
            />
            <div v-if="board.description" class="board-description">{{ board.description }}</div>
          </div>
          <a-button class="settings-btn" @click="openSettings">
            <template #icon><SettingOutlined /></template>
            <span class="hide-mobile">Колонки доски</span>
          </a-button>
        </div>

        <!-- Фильтры -->
        <div class="board-filters">
          <a-input v-model:value="search" placeholder="Поиск задач" allow-clear class="filter-search">
            <template #prefix><SearchOutlined /></template>
          </a-input>
          <a-select v-model:value="assigneeFilter" :options="assigneeFilterOptions" class="filter-assignee" />
          <a-checkbox v-model:checked="overdueOnly">
            Только просроченные<template v-if="overdueCount"> ({{ overdueCount }})</template>
          </a-checkbox>
        </div>

        <!-- Телефон: колонки листаются вбок — показываем их список, нажатие прокручивает к колонке -->
        <div v-if="isMobile" class="column-tabs">
          <button
            v-for="(status, i) in statuses"
            :key="status.id"
            type="button"
            class="column-tab"
            :class="{ active: activeColumn === i }"
            @click="scrollToColumn(i)"
          >
            <span class="column-dot" :style="{ background: status.color || '#c9c3b6' }" />
            {{ status.name }} <b>{{ columnTasks(status.id).length }}</b>
          </button>
        </div>

        <!-- Колонки = статусы -->
        <div ref="columnsRef" class="columns" @scroll.passive="onColumnsScroll">
          <div v-for="status in statuses" :key="status.id" class="column">
            <div class="column-header">
              <span class="column-dot" :style="{ background: status.color || '#c9c3b6' }" />
              <span class="column-name">{{ status.name }}</span>
              <CheckCircleOutlined v-if="status.is_final" class="column-final" title="Закрывает задачу" />
              <span class="column-count">{{ columnTasks(status.id).length }}</span>
            </div>

            <div
              class="column-body"
              :data-status="status.id"
              @dragover="onDragOver($event, status.id)"
              @dragleave="onDragLeave($event)"
              @drop="onDrop($event, status.id)"
            >
              <div
                v-for="task in visibleColumnTasks(status.id)"
                :key="task.id"
                class="task-card"
                :class="[dueClass(task), `prio-${task.priority}`, { 'task-closed': task.is_closed }]"
                :data-task="task.id"
                draggable="true"
                @dragstart="onDragStart($event, task)"
                @dragend="onDragEnd"
                @click="openTask(task)"
              >
                <div class="task-card-title">{{ task.title }}</div>
                <div class="task-card-footer">
                  <span v-if="task.due_date" class="due-chip" :class="dueClass(task)" :title="dueTitle(task)">
                    <ClockCircleOutlined /> {{ formatDue(task.due_date) }}
                  </span>
                  <span v-if="task.priority === 'high'" class="prio-chip" title="Высокий приоритет"><FlagFilled /></span>
                  <span v-if="task.description" class="desc-mark" title="Есть описание"><AlignLeftOutlined /></span>
                  <span
                    v-if="task.assignee"
                    class="assignee-avatar"
                    :style="{ background: avatarColor(task.assignee.id) }"
                    :title="`Исполнитель: ${personName(task.assignee)}`"
                  >{{ initials(task.assignee) }}</span>
                </div>
              </div>

              <!-- Новая задача — сразу окно со всеми полями -->
              <button type="button" class="add-task-btn" @click="openCreate(status.id)">
                <PlusOutlined /> Добавить задачу
              </button>
            </div>
          </div>
        </div>
      </template>
    </a-spin>

    <TaskModal
      v-model:open="taskModalOpen"
      :task="openedTask"
      :create-defaults="createDefaults"
      :statuses="statuses"
      :assignees="board?.assignees || []"
      @saved="onTaskSaved"
      @created="onTaskCreated"
      @deleted="onTaskDeleted"
    />

    <!-- Настройки доски: название, описание, колонки -->
    <a-modal
      v-model:open="settingsOpen"
      title="Настройки доски"
      ok-text="Сохранить"
      cancel-text="Отмена"
      :confirm-loading="settingsSaving"
      @ok="saveSettings"
    >
      <a-form layout="vertical">
        <a-form-item label="Название" required>
          <a-input v-model:value="settings.name" :maxlength="200" />
        </a-form-item>
        <a-form-item label="Описание">
          <a-textarea v-model:value="settings.description" :maxlength="2000" :auto-size="{ minRows: 2, maxRows: 5 }" />
        </a-form-item>
        <a-form-item label="Колонки (статусы задач) на этой доске">
          <BoardStatusPicker v-model:value="settings.status_ids" :statuses="board?.all_statuses || []" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
// Доска задач: колонки — статусы из справочника, карточки можно
// перетаскивать между колонками (меняется статус) и внутри колонки.
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeftOutlined, SearchOutlined, SettingOutlined, CheckCircleOutlined, ClockCircleOutlined,
  FlagFilled, AlignLeftOutlined, PlusOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import BoardStatusPicker from '@/components/BoardStatusPicker.vue'
import MobileMenuButton from '@/components/MobileMenuButton.vue'
import TaskModal from '@/components/TaskModal.vue'
import { useTasks } from '@/stores/tasks.js'
import { getUser } from '@/services/auth.js'
import { useIsMobile } from '@/composables/useIsMobile.js'
import { dueState, formatDue, personName, initials, avatarColor } from '@/utils/tasks.js'

const route = useRoute()
const router = useRouter()
const tasksStore = useTasks()
const me = getUser()

const board = ref(null)
const tasks = ref([])
const loading = ref(false)
const boardName = ref('')

const statuses = computed(() => board.value?.statuses || [])
const { isMobile } = useIsMobile()

// ---------- телефон: переход между колонками ----------
const columnsRef = ref(null)
const activeColumn = ref(0)

function scrollToColumn(i) {
  const el = columnsRef.value?.children[i]
  if (el) columnsRef.value.scrollTo({ left: el.offsetLeft - columnsRef.value.offsetLeft, behavior: 'smooth' })
}

function onColumnsScroll() {
  const box = columnsRef.value
  if (!box) return
  const cols = [...box.children]
  const i = cols.findIndex(c => c.offsetLeft - box.offsetLeft + c.offsetWidth / 2 > box.scrollLeft)
  activeColumn.value = Math.max(0, i)
}

async function load() {
  loading.value = true
  try {
    const data = await tasksStore.getBoard(route.params.id)
    if (!data) {
      router.replace({ name: 'task-boards' })
      return
    }
    board.value = data
    boardName.value = data.name
    tasks.value = data.tasks
    // переход из уведомления: /home/tasks/:id?task=<id> — сразу открыть задачу
    if (route.query.task) {
      const t = data.tasks.find(x => x.id === route.query.task)
      router.replace({ query: {} })
      if (t) openTask(t)
      else message.info('Задача не найдена — возможно, её удалили')
    }
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function saveBoardName() {
  const name = boardName.value.trim()
  if (!name) {
    boardName.value = board.value.name
    return
  }
  if (name === board.value.name) return
  const updated = await tasksStore.updateBoard(board.value.id, { name })
  if (updated) board.value.name = updated.name
  else boardName.value = board.value.name
}

// ---------- фильтры ----------
const search = ref('')
const assigneeFilter = ref('all')
const overdueOnly = ref(false)

const assigneeFilterOptions = computed(() => [
  { label: 'Все исполнители', value: 'all' },
  { label: 'Мои задачи', value: 'me' },
  { label: 'Без исполнителя', value: 'none' },
  ...(board.value?.assignees || []).map(u => ({ label: personName(u), value: u.id })),
])

const overdueCount = computed(() => tasks.value.filter(t => dueState(t) === 'overdue').length)

function matchesFilters(t) {
  const q = search.value.trim().toLowerCase()
  if (q && !t.title.toLowerCase().includes(q) && !(t.description || '').toLowerCase().includes(q)) return false
  if (assigneeFilter.value === 'me' && t.assignee?.id !== me?.id) return false
  if (assigneeFilter.value === 'none' && t.assignee) return false
  if (!['all', 'me', 'none'].includes(assigneeFilter.value) && t.assignee?.id !== assigneeFilter.value) return false
  if (overdueOnly.value && dueState(t) !== 'overdue') return false
  return true
}

const byOrder = (a, b) => (a.order_num ?? 1e9) - (b.order_num ?? 1e9) || String(a.ctime).localeCompare(String(b.ctime))
const columnTasks = (statusId) => tasks.value.filter(t => t.status_id === statusId).sort(byOrder)
const visibleColumnTasks = (statusId) => columnTasks(statusId).filter(matchesFilters)

// ---------- подсветка сроков ----------
const dueClass = (t) => {
  const s = dueState(t)
  return s ? `due-${s}` : ''
}
const dueTitle = (t) => ({
  overdue: 'Срок прошёл, задача не закрыта',
  today: 'Срок — сегодня',
  soon: 'Срок скоро',
}[dueState(t)] || 'Срок')

// ---------- задача: открыть / сохранить / удалить ----------
const taskModalOpen = ref(false)
const openedTask = ref(null)
const createDefaults = ref(null)

function openTask(task) {
  if (justDragged) return
  createDefaults.value = null
  openedTask.value = task
  taskModalOpen.value = true
}

function openCreate(statusId) {
  openedTask.value = null
  createDefaults.value = { board_id: board.value.id, status_id: statusId }
  taskModalOpen.value = true
}

function onTaskCreated(task) {
  tasks.value = [...tasks.value, task]
}

// ---------- настройки доски ----------
const settingsOpen = ref(false)
const settingsSaving = ref(false)
const settings = ref({ name: '', description: '', status_ids: [] })

function openSettings() {
  settings.value = {
    name: board.value.name,
    description: board.value.description || '',
    status_ids: statuses.value.map(s => s.id),
  }
  settingsOpen.value = true
}

async function saveSettings() {
  if (!settings.value.name.trim()) {
    message.warning('Укажите название доски')
    return
  }
  if (!settings.value.status_ids.length) {
    message.warning('Выберите хотя бы одну колонку')
    return
  }
  settingsSaving.value = true
  try {
    const updated = await tasksStore.updateBoard(board.value.id, {
      name: settings.value.name.trim(),
      description: settings.value.description.trim() || null,
      status_ids: settings.value.status_ids,
    })
    if (updated) {
      board.value = updated
      boardName.value = updated.name
      tasks.value = updated.tasks
      settingsOpen.value = false
      message.success('Доска сохранена')
    }
  } finally {
    settingsSaving.value = false
  }
}

function onTaskSaved(updated) {
  tasks.value = tasks.value.map(t => (t.id === updated.id ? updated : t))
}

function onTaskDeleted(id) {
  tasks.value = tasks.value.filter(t => t.id !== id)
}

// ---------- перетаскивание (HTML5) ----------
// Состояние перетаскивания — НЕ реактивное, место вставки подсвечивается
// классами прямо в DOM: перерисовка списка во время drag обрывает его.
let draggedId = null
let dropMarker = null // { el, cls }
let justDragged = false

function clearMarker() {
  if (dropMarker) dropMarker.el.classList.remove(dropMarker.cls)
  dropMarker = null
}

function setMarker(el, cls) {
  if (dropMarker && dropMarker.el === el && dropMarker.cls === cls) return
  clearMarker()
  el.classList.add(cls)
  dropMarker = { el, cls }
}

function onDragStart(e, task) {
  draggedId = task.id
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', task.id) // без данных Firefox не начинает drag
  requestAnimationFrame(() => e.target.classList.add('dragging'))
}

function onDragEnd(e) {
  e.target.classList.remove('dragging')
  clearMarker()
  draggedId = null
  // клик после отпускания мыши не должен открывать задачу
  justDragged = true
  setTimeout(() => { justDragged = false }, 50)
}

// Перед какой карточкой (видимой) вставлять — по положению курсора
function cardBefore(columnBody, clientY) {
  const cards = [...columnBody.querySelectorAll('.task-card:not(.dragging)')]
  return cards.find(card => {
    const r = card.getBoundingClientRect()
    return clientY < r.top + r.height / 2
  }) || null
}

function onDragOver(e) {
  if (!draggedId) return
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  const body = e.currentTarget
  const before = cardBefore(body, e.clientY)
  if (before) setMarker(before, 'drop-before')
  else setMarker(body, 'drop-end')
}

function onDragLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) clearMarker()
}

async function onDrop(e, statusId) {
  e.preventDefault()
  if (!draggedId) return
  const id = draggedId
  const beforeId = cardBefore(e.currentTarget, e.clientY)?.dataset.task || null
  clearMarker()

  const task = tasks.value.find(t => t.id === id)
  if (!task) return
  // новый порядок колонки: все её задачи (в т.ч. скрытые фильтром), перенесённая — перед beforeId
  const oldOrder = columnTasks(statusId).map(t => t.id)
  const order = oldOrder.filter(tid => tid !== id)
  const index = beforeId ? order.indexOf(beforeId) : -1
  order.splice(index === -1 ? order.length : index, 0, id)
  // та же колонка и тот же порядок — ничего не делаем
  if (task.status_id === statusId && oldOrder.join() === order.join()) return

  const prevTasks = tasks.value
  const newStatus = statuses.value.find(s => s.id === statusId)
  // сразу показываем результат, сервер подтвердит
  tasks.value = tasks.value.map(t => {
    const pos = order.indexOf(t.id)
    if (pos === -1) return t
    return { ...t, status_id: statusId, order_num: pos, is_closed: t.id === id ? !!newStatus?.is_final : t.is_closed }
  })
  const updated = await tasksStore.moveTask(id, statusId, order)
  if (updated) {
    tasks.value = tasks.value.map(t => (t.id === id ? { ...updated, order_num: t.order_num } : t))
  } else {
    tasks.value = prevTasks
  }
}
</script>

<style scoped>
.board-page {
  --bg: #f7f5f0;
  --column-bg: #efece4;
  --text-title: #211f1a;
  --text-muted: #5a564c;
  --text-faint: #7c7669;
  --accent: #8a6d2f;

  min-height: 100vh;
  background: var(--bg);
  padding: 16px 24px;
}

.board-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.board-title-wrap {
  flex: 1;
  min-width: 0;
}

.board-title-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 22px;
  font-weight: 600;
  color: var(--text-title);
  padding: 2px 6px;
  border-radius: 6px;
}

.board-title-input:focus {
  background: rgba(138, 109, 47, 0.07);
}

.board-description {
  padding: 0 6px;
  font-size: 13px;
  color: var(--text-muted);
}

.statuses-link {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--accent);
}

.board-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.filter-search {
  width: 260px;
}

.filter-assignee {
  width: 200px;
}

/* --- колонки --- */
.columns {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  overflow-x: auto;
  padding-bottom: 12px;
}

.column {
  flex: 0 0 280px;
  background: var(--column-bg);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 180px);
}

.column-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 6px;
  font-weight: 600;
  color: var(--text-title);
}

.column-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.column-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.column-final {
  color: #27ae60;
}

.column-count {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-faint);
}

.column-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 6px 8px 10px;
  overflow-y: auto;
  min-height: 60px;
  border-radius: 0 0 12px 12px;
}

/* --- карточка --- */
.task-card {
  position: relative;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-left: 3px solid transparent;
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.15s;
}

.task-card:hover {
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
}

.task-card.prio-high {
  border-left-color: #c0392b;
}

.task-card.prio-low {
  border-left-color: #b9b3a6;
}

.task-card.dragging {
  opacity: 0.4;
}

/* подсветка сроков: просрочено — красным, сегодня — оранжевым */
.task-card.due-overdue {
  background: #fff5f4;
  border-color: #f3b4ad;
  border-left-color: #d92d20;
}

.task-card.due-today {
  background: #fffaf2;
  border-color: #f7d3a1;
  border-left-color: #f79009;
}

.task-closed .task-card-title {
  color: var(--text-faint);
  text-decoration: line-through;
}

.task-card-title {
  font-size: 14px;
  color: var(--text-title);
  word-break: break-word;
}

.task-card-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  min-height: 0;
}

.task-card-footer:empty {
  display: none;
}

.due-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0 6px;
  border-radius: 8px;
  background: #f1ede4;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 20px;
}

.due-chip.due-overdue {
  background: #d92d20;
  color: #fff;
}

.due-chip.due-today {
  background: #f79009;
  color: #fff;
}

.due-chip.due-soon {
  background: #fef0c7;
  color: #93370d;
}

.prio-chip {
  color: #c0392b;
  font-size: 12px;
}

.desc-mark {
  color: var(--text-faint);
  font-size: 12px;
}

.assignee-avatar {
  margin-left: auto;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* место вставки при перетаскивании */
.task-card.drop-before::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: -6px;
  height: 3px;
  border-radius: 2px;
  background: var(--accent);
}

.column-body.drop-end::after {
  content: '';
  display: block;
  height: 3px;
  border-radius: 2px;
  background: var(--accent);
}

/* --- добавление --- */
.add-task-btn {
  border: none;
  background: none;
  text-align: left;
  padding: 6px 8px;
  border-radius: 8px;
  color: var(--text-muted);
  cursor: pointer;
}

.add-task-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-title);
}

.settings-btn {
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .hide-mobile {
    display: none;
  }
}

@media (max-width: 768px) {
  .board-page {
    padding: 12px;
  }

  .board-header {
    flex-wrap: wrap;
  }

  .filter-search,
  .filter-assignee {
    width: 100%;
  }

  /* колонки листаются вбок по одной */
  .columns {
    scroll-snap-type: x mandatory;
  }

  .column {
    flex-basis: 85vw;
    scroll-snap-align: start;
    max-height: none;
  }
}

.column-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  margin-bottom: 10px;
  padding-bottom: 2px;
}

.column-tab {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 14px;
  background: #fff;
  color: var(--text-muted);
  font-size: 13px;
}

.column-tab b {
  font-weight: 600;
  color: var(--text-faint);
}

.column-tab.active {
  border-color: var(--accent);
  color: var(--accent);
}
</style>
