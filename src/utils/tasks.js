// Помощники для задач: сроки, приоритеты, имена

export const PRIORITIES = [
  { value: 'low', label: 'Низкий', color: '#7f8c8d' },
  { value: 'normal', label: 'Обычный', color: '#2e86de' },
  { value: 'high', label: 'Высокий', color: '#c0392b' },
]
export const priorityOf = (value) => PRIORITIES.find(p => p.value === value) || PRIORITIES[1]

// сегодняшняя дата в часовом поясе пользователя, 'YYYY-MM-DD'
export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Состояние срока незакрытой задачи:
 *   'overdue' — срок прошёл, 'today' — срок сегодня, 'soon' — 1–2 дня, null — иначе.
 * Закрытые задачи (статус «закрывает задачу») не подсвечиваются.
 */
export function dueState(task) {
  if (!task?.due_date || task.is_closed) return null
  const today = todayStr()
  if (task.due_date < today) return 'overdue'
  if (task.due_date === today) return 'today'
  const diffDays = (new Date(`${task.due_date}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000
  return diffDays <= 2 ? 'soon' : null
}

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

// '2026-11-12' -> '12 ноя' (год — только если не текущий)
export function formatDue(date) {
  if (!date) return ''
  const [y, m, d] = date.split('-').map(Number)
  const year = y !== new Date().getFullYear() ? ` ${y}` : ''
  return `${d} ${MONTHS[m - 1]}${year}`
}

export function formatDateTime(value) {
  return value
    ? new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'
}

export function personName(p) {
  return [p?.name, p?.surname].map(v => (v || '').trim()).filter(Boolean).join(' ') || '—'
}

export function initials(p) {
  const parts = [p?.name, p?.surname].map(v => (v || '').trim()).filter(Boolean)
  return (parts.map(s => s[0]).join('').slice(0, 2) || '?').toUpperCase()
}

// стабильный цвет кружка исполнителя по его id
const AVATAR_COLORS = ['#8a6d2f', '#2e86de', '#27ae60', '#8e44ad', '#d35400', '#16a085', '#c0392b', '#34495e']
export function avatarColor(id) {
  let h = 0
  for (const ch of String(id || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export function pluralTasks(n) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'задача'
  if ([2, 3, 4].includes(m10) && ![12, 13, 14].includes(m100)) return 'задачи'
  return 'задач'
}
