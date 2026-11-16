// Подписи для истории изменений (см. ChangeLogService на бэкенде)

export const ENTITY_LABELS = {
  art: 'Работа',
  collection: 'Ссылка',
  exhibition: 'Выставка',
  report: 'Отчёт',
  contact: 'Контакт',
  artist: 'Художник',
  portfolio: 'Портфолио',
  note: 'Заметка',
  task: 'Задача',
  board: 'Доска задач',
}

const ACTIONS = {
  create: 'создал(а)',
  update: 'изменил(а)',
  delete: 'удалил(а)',
  move: 'переместил(а)',
  sale_create: 'оформил(а) продажу',
  sale_update: 'изменил(а) продажу',
  sale_cancel: 'отменил(а) продажу',
  sale_paid: 'отметил(а) выплату художнику',
  sale_unpaid: 'снял(а) отметку о выплате художнику',
}

export const actionText = (action) => ACTIONS[action] || action

export const ACTION_COLORS = {
  create: '#2f8a35',
  delete: '#b43c3c',
  sale_create: '#8a6d2f',
  sale_cancel: '#b43c3c',
}

export const actorName = (actor) =>
  actor ? ([actor.name, actor.surname].filter(Boolean).join(' ').trim() || actor.email || 'Пользователь') : 'Удалённый пользователь'

/** Ссылка на запись (null — запись удалена или у неё нет своей страницы) */
export function entityLink(item) {
  if (!item || item.action === 'delete' || item.entity_deleted) return null
  const id = item.entity_id
  switch (item.entity_type) {
    case 'art': return `/home/edit/${id}`
    case 'collection': return `/home/collection/${id}`
    case 'exhibition': return `/home/exhibition/${id}`
    case 'report': return `/home/reports/${id}`
    case 'contact': return `/home/contacts/${id}`
    case 'artist': return `/home/artists/${id}`
    case 'portfolio': return `/home/portfolio/${id}`
    case 'note': return `/home/notes/${id}`
    case 'task': return item.meta?.board_id ? `/home/tasks/${item.meta.board_id}?task=${id}` : null
    case 'board': return `/home/tasks/${id}`
    default: return null
  }
}

export function formatWhen(value) {
  if (!value) return ''
  const d = new Date(value)
  const today = new Date()
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === today.toDateString()) return `сегодня, ${time}`
  const y = new Date(today)
  y.setDate(today.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return `вчера, ${time}`
  return `${d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${time}`
}
