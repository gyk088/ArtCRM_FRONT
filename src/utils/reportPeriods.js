// Быстрые периоды для отчётов -> [date_from, date_to] в формате 'YYYY-MM-DD'
import dayjs from 'dayjs'

const fmt = (d) => d.format('YYYY-MM-DD')

export const PERIOD_PRESETS = [
  { key: 'this_month', label: 'Этот месяц', range: () => [dayjs().startOf('month'), dayjs().endOf('month')] },
  { key: 'last_month', label: 'Прошлый месяц', range: () => [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
  { key: 'this_quarter', label: 'Этот квартал', range: () => {
    const start = dayjs().month(Math.floor(dayjs().month() / 3) * 3).startOf('month')
    return [start, start.add(2, 'month').endOf('month')]
  } },
  { key: 'this_year', label: 'Этот год', range: () => [dayjs().startOf('year'), dayjs().endOf('year')] },
  { key: 'last_year', label: 'Прошлый год', range: () => [dayjs().subtract(1, 'year').startOf('year'), dayjs().subtract(1, 'year').endOf('year')] },
  { key: 'all', label: 'Всё время', range: () => [null, null] },
]

export function presetRange(key) {
  const preset = PERIOD_PRESETS.find(p => p.key === key)
  if (!preset) return [null, null]
  const [from, to] = preset.range()
  return [from ? fmt(from) : null, to ? fmt(to) : null]
}

// Какому пресету соответствует период (для подсветки), или null
export function matchPreset(dateFrom, dateTo) {
  const found = PERIOD_PRESETS.find(p => {
    const [from, to] = presetRange(p.key)
    return from === (dateFrom || null) && to === (dateTo || null)
  })
  return found?.key || null
}
