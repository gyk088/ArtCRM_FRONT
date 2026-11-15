// stores/tasks.js
// Задачи в стиле Trello: доски (проекты), статусы задач (колонки досок,
// справочник) и задачи. В галерее всё общее (см. TaskService на бэкенде).
import { defineStore } from 'pinia'
import apiClient from '@/services/api.js'
import { notifyServerError } from '@/services/notify.js'

const SERVER_ERRORS = {
  'Board not found': 'Доска не найдена',
  'Task not found': 'Задача не найдена — обновите страницу',
  'Task status not found': 'Статус не найден — обновите страницу',
  'Assignee not found': 'Исполнитель не найден',
  'Board name is required': 'Укажите название доски',
  'Task title is required': 'Укажите заголовок задачи',
  'Status name is required': 'Укажите название статуса',
  'due_date must be YYYY-MM-DD': 'Некорректный срок',
  'Task status is not used on this board': 'Этой колонки нет на доске — обновите страницу',
  'Choose at least one status for the board': 'Выберите хотя бы одну колонку',
}

export function taskErrorText(e, fallback) {
  const raw = e?.response?.data?.error
  if (raw && raw.startsWith('Cannot remove statuses with tasks: ')) {
    return `Нельзя убрать колонки, в которых есть задачи: ${raw.slice('Cannot remove statuses with tasks: '.length)}. Сначала перенесите задачи.`
  }
  if (raw && /^Cannot delete status: it is used by (\d+)/.test(raw)) {
    return `Статус нельзя удалить: в нём есть задачи (${raw.match(/(\d+)/)[1]}). Сначала перенесите их.`
  }
  return SERVER_ERRORS[raw] || raw || fallback
}

async function request(fn, fallback) {
  try {
    return (await fn()).data
  } catch (e) {
    console.error(fallback, e)
    notifyServerError(taskErrorText(e, fallback))
    return null
  }
}

export const useTasks = defineStore('tasks', {
  state: () => ({
    boards: [],
    statuses: [],
    loading: false,
  }),

  actions: {
    // ---------- доски ----------
    async getBoards() {
      this.loading = true
      try {
        const data = await request(() => apiClient.get('/api/v1/tasks/boards'), 'Не удалось загрузить доски')
        if (data) this.boards = data
        return !!data
      } finally {
        this.loading = false
      }
    },
    getBoard(id) {
      return request(() => apiClient.get(`/api/v1/tasks/boards/${id}`), 'Не удалось загрузить доску')
    },
    createBoard(data) {
      return request(() => apiClient.post('/api/v1/tasks/boards', data), 'Не удалось создать доску')
    },
    updateBoard(id, data) {
      return request(() => apiClient.put(`/api/v1/tasks/boards/${id}`, data), 'Не удалось сохранить доску')
    },
    async deleteBoard(id) {
      const ok = await request(() => apiClient.delete(`/api/v1/tasks/boards/${id}`), 'Не удалось удалить доску')
      if (ok) this.boards = this.boards.filter(b => b.id !== id)
      return !!ok
    },

    // ---------- задачи ----------
    createTask(data) {
      return request(() => apiClient.post('/api/v1/tasks', data), 'Не удалось создать задачу')
    },
    updateTask(id, data) {
      return request(() => apiClient.put(`/api/v1/tasks/${id}`, data), 'Не удалось сохранить задачу')
    },
    moveTask(id, statusId, order) {
      return request(() => apiClient.put(`/api/v1/tasks/${id}/move`, { status_id: statusId, order }), 'Не удалось переместить задачу')
    },
    async deleteTask(id) {
      return !!(await request(() => apiClient.delete(`/api/v1/tasks/${id}`), 'Не удалось удалить задачу'))
    },

    // ---------- статусы (справочник) ----------
    async getStatuses() {
      const data = await request(() => apiClient.get('/api/v1/tasks/statuses'), 'Не удалось загрузить статусы задач')
      if (data) this.statuses = data
      return !!data
    },
    async createStatus(data) {
      const s = await request(() => apiClient.post('/api/v1/tasks/statuses', data), 'Не удалось создать статус')
      if (s) this.statuses = [...this.statuses, s]
      return s
    },
    async updateStatus(id, data) {
      const s = await request(() => apiClient.put(`/api/v1/tasks/statuses/${id}`, data), 'Не удалось сохранить статус')
      if (s) this.statuses = this.statuses.map(x => (x.id === id ? s : x))
      return s
    },
    async deleteStatus(id) {
      const ok = await request(() => apiClient.delete(`/api/v1/tasks/statuses/${id}`), 'Не удалось удалить статус')
      if (ok) this.statuses = this.statuses.filter(s => s.id !== id)
      return !!ok
    },
    async reorderStatuses(ids) {
      const data = await request(() => apiClient.put('/api/v1/tasks/statuses/reorder', { ids }), 'Не удалось изменить порядок')
      if (data) this.statuses = data
      return !!data
    },
  },
})
