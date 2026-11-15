<template>
  <div class="boards-page">
    <div class="page-header">
      <div>
        <div class="page-header-top">
          <MobileMenuButton />
          <h2 class="page-title">Задачи</h2>
        </div>
        <p class="page-subtitle">Доски проектов: задачи, исполнители и сроки</p>
      </div>
      <a-button type="primary" @click="openCreate">
        <template #icon><PlusOutlined /></template>
        Новая доска
      </a-button>
    </div>

    <a-spin :spinning="tasksStore.loading && !tasksStore.boards.length">
      <div v-if="tasksStore.boards.length" class="boards-grid">
        <div v-for="board in tasksStore.boards" :key="board.id" class="board-card" @click="openBoard(board)">
          <div class="board-card-top">
            <div class="board-icon"><ProjectOutlined /></div>
            <div class="board-card-title">{{ board.name }}</div>
            <div class="board-card-actions" @click.stop>
              <a-popconfirm
                v-if="canDelete(board)"
                :title="`Удалить доску «${board.name}» со всеми задачами?`"
                ok-text="Удалить"
                ok-type="danger"
                cancel-text="Отмена"
                @confirm="removeBoard(board)"
              >
                <button type="button" class="icon-btn icon-btn-danger" title="Удалить доску"><DeleteOutlined /></button>
              </a-popconfirm>
            </div>
          </div>
          <p v-if="board.description" class="board-description">{{ board.description }}</p>
          <div class="board-counts">
            <span class="count-chip">{{ board.counts.open }} {{ pluralOpen(board.counts.open) }} из {{ board.counts.total }}</span>
            <span v-if="board.counts.overdue" class="count-chip count-overdue">
              <ExclamationCircleOutlined /> просрочено: {{ board.counts.overdue }}
            </span>
            <span v-if="board.counts.mine" class="count-chip count-mine">мне: {{ board.counts.mine }}</span>
          </div>
          <div class="board-meta">
            Создал(а): {{ personName(board.createdBy) }} · изменена {{ formatDateTime(board.utime) }}
          </div>
        </div>
      </div>

      <div v-else-if="!tasksStore.loading" class="empty-state">
        <ProjectOutlined class="empty-icon" />
        <p class="empty-title">Досок пока нет</p>
        <p class="empty-subtitle">
          Создайте доску для проекта — например, «Выставка в Минске» — и добавляйте на неё задачи:
          с исполнителями, сроками и статусами, которые можно перетаскивать между колонками.
        </p>
        <a-button type="primary" @click="openCreate">Создать доску</a-button>
      </div>
    </a-spin>

    <a-modal
      v-model:open="createOpen"
      title="Новая доска"
      ok-text="Создать"
      cancel-text="Отмена"
      :confirm-loading="creating"
      @ok="createBoard"
    >
      <a-form layout="vertical">
        <a-form-item label="Название" required>
          <a-input v-model:value="form.name" :maxlength="200" placeholder="Например, «Выставка в Минске»" @press-enter="createBoard" />
        </a-form-item>
        <a-form-item label="Описание">
          <a-textarea v-model:value="form.description" :maxlength="2000" :auto-size="{ minRows: 2, maxRows: 6 }" placeholder="Необязательно" />
        </a-form-item>
        <a-form-item label="Колонки (статусы задач) на доске">
          <BoardStatusPicker v-model:value="form.status_ids" :statuses="tasksStore.statuses" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { PlusOutlined, ProjectOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import MobileMenuButton from '@/components/MobileMenuButton.vue'
import BoardStatusPicker from '@/components/BoardStatusPicker.vue'
import { useTasks } from '@/stores/tasks.js'
import { getUser } from '@/services/auth.js'
import { personName, formatDateTime } from '@/utils/tasks.js'

const router = useRouter()
const tasksStore = useTasks()
const me = getUser()

onMounted(() => tasksStore.getBoards())

const createOpen = ref(false)
const creating = ref(false)
const form = reactive({ name: '', description: '', status_ids: [] })

async function openCreate() {
  if (!tasksStore.statuses.length) await tasksStore.getStatuses()
  // по умолчанию — все статусы
  Object.assign(form, { name: '', description: '', status_ids: tasksStore.statuses.map(s => s.id) })
  createOpen.value = true
}

async function createBoard() {
  if (!form.name.trim()) {
    message.warning('Укажите название доски')
    return
  }
  if (!form.status_ids.length) {
    message.warning('Выберите хотя бы одну колонку')
    return
  }
  creating.value = true
  try {
    const board = await tasksStore.createBoard({
      name: form.name.trim(),
      description: form.description.trim() || null,
      status_ids: form.status_ids,
    })
    if (board) {
      createOpen.value = false
      router.push({ name: 'task-board', params: { id: board.id } })
    }
  } finally {
    creating.value = false
  }
}

function openBoard(board) {
  router.push({ name: 'task-board', params: { id: board.id } })
}

async function removeBoard(board) {
  if (await tasksStore.deleteBoard(board.id)) message.success('Доска удалена')
}

function canDelete(board) {
  return board.createdBy?.id === me?.id || me?.role === 'gallery'
}

function pluralOpen(n) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'открытая'
  return 'открытых'
}
</script>

<style scoped>
.boards-page {
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

.boards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}

.board-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: box-shadow 0.15s;
}

.board-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.board-card-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.board-icon {
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

.board-card-title {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  font-size: 16px;
  color: var(--text-title);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.board-description {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.board-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.count-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-muted);
  font-size: 12px;
}

.count-overdue {
  background: #fdecea;
  color: #b42318;
  font-weight: 600;
}

.count-mine {
  background: #e8f1fb;
  color: #2e6db4;
}

.board-meta {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--border-soft);
  font-size: 12px;
  color: var(--text-faint);
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
  max-width: 480px;
  margin: 0 auto 16px;
  color: var(--text-muted);
}

@media (max-width: 600px) {
  .boards-page {
    padding: 16px;
  }

  .page-header > .ant-btn {
    width: 100%;
  }
}
</style>
