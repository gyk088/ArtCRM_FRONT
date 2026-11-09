// Форматирование денег/процентов/дат для продаж и отчётов
export const CURRENCIES = ['RUB', 'BYN', 'USD', 'EUR']

export const CURRENCY_SIGNS = { RUB: '₽', BYN: 'Br', USD: '$', EUR: '€' }

export const CURRENCY_OPTIONS = [
  { label: '₽ RUB', value: 'RUB' },
  { label: 'Br BYN', value: 'BYN' },
  { label: '$ USD', value: 'USD' },
  { label: '€ EUR', value: 'EUR' },
]

export function formatMoney(value, currency) {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  return currency ? `${num} ${CURRENCY_SIGNS[currency] || currency}` : num
}

export function formatPct(value) {
  if (value === null || value === undefined) return '—'
  return `${Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 })}%`
}

// 'YYYY-MM-DD' -> 'DD.MM.YYYY' без участия часового пояса
export function formatDate(value) {
  if (!value) return '—'
  const s = String(value).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split('-').reverse().join('.') : new Date(value).toLocaleDateString('ru-RU')
}

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']

// 'YYYY-MM' -> 'Март 2026'
export function formatMonth(value) {
  const [y, m] = String(value).split('-')
  return `${MONTHS[Number(m) - 1] || m} ${y}`
}
