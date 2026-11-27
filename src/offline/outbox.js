// Изменения без интернета: очередь действий (IndexedDB «outbox»).
//
// Без сети разрешённые действия (см. RULES) не падают с ошибкой, а
// встают в очередь; приложение сразу получает ответ «как от сервера»
// (запись после изменения), а сохранённые на устройстве данные
// обновляются — изменение видно и после перезагрузки. Когда сеть вернётся,
// очередь отправит sync.js.
//
// Каждое такое действие — с ключом Idempotency-Key: если связь оборвалась
// уже после того, как сервер сохранил изменение, повтор не задвоит его.
import { idbGet, idbPut, idbGetAll } from './db.js'
import { getUser } from '@/services/auth.js'

const ID = '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'

// Что можно делать без интернета. type — вид записи, op — создать/изменить,
// list — сохранённый список, в котором запись надо обновить, detail — адрес
// самой записи, idFrom: 'body' — id записи в теле запроса (а не в адресе)
export const RULES = [
  { method: 'post', re: /^\/api\/v1\/contacts$/, type: 'contact', op: 'create', list: '/api/v1/contacts', label: 'Новый контакт' },
  { method: 'put', re: new RegExp(`^/api/v1/contacts/${ID}$`), type: 'contact', op: 'update', list: '/api/v1/contacts', label: 'Контакт' },
  { method: 'post', re: /^\/api\/v1\/notes$/, type: 'note', op: 'create', list: '/api/v1/notes', label: 'Новая заметка' },
  { method: 'put', re: new RegExp(`^/api/v1/notes/${ID}$`), type: 'note', op: 'update', list: '/api/v1/notes', label: 'Заметка' },
  { method: 'post', re: /^\/api\/v1\/art\/art-objects$/, type: 'art', op: 'create', list: '/api/v1/art/art-objects', label: 'Новая работа' },
  { method: 'put', re: /^\/api\/v1\/art\/art-objects$/, type: 'art', op: 'update', idFrom: 'body', list: '/api/v1/art/art-objects', label: 'Работа' },
  { method: 'put', re: new RegExp(`^/api/v1/art/art-objects/${ID}$`), type: 'art', op: 'update', list: '/api/v1/art/art-objects', label: 'Работа' },
  { method: 'put', re: new RegExp(`^/api/v1/collections/${ID}$`), type: 'collection', op: 'update', list: '/api/v1/collections', label: 'Ссылка' },
  { method: 'post', re: /^\/api\/v1\/sales$/, type: 'sale', op: 'create', label: 'Продажа' },
]

const DETAIL = {
  contact: id => `/api/v1/contacts/${id}`,
  note: id => `/api/v1/notes/${id}`,
  art: id => `/api/v1/art/art-objects/${id}`,
  collection: id => `/api/v1/collections/${id}`,
}

export function matchRule(method, path) {
  const m = String(method || 'get').toLowerCase()
  for (const rule of RULES) {
    if (rule.method !== m) continue
    const hit = rule.re.exec(path)
    if (hit) return { rule, pathId: hit[1] || null }
  }
  return null
}

export const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : `k${Date.now()}${Math.random().toString(36).slice(2)}`)

// === Сохранённые ответы (тот же ключ, что в apiCache.js) ===
const cacheKey = (path) => `${getUser()?.id || 'anon'}|${path}`

export async function readCached(path) {
  const hit = await idbGet('responses', cacheKey(path)).catch(() => null)
  if (!hit) return null
  try {
    return typeof hit.data === 'string' ? JSON.parse(hit.data) : hit.data
  } catch {
    return null
  }
}

export async function writeCached(path, value) {
  await idbPut('responses', { data: JSON.stringify(value), time: Date.now() }, cacheKey(path)).catch(() => {})
}

// Запись из сохранённого: сама запись, иначе из сохранённого списка
async function findCachedEntity(type, list, id) {
  if (DETAIL[type]) {
    const detail = await readCached(DETAIL[type](id))
    if (detail && detail.id === id) return { entity: detail, full: true }
  }
  if (list) {
    const items = await readCached(list)
    const item = Array.isArray(items) ? items.find(x => x?.id === id) : null
    if (item) return { entity: item, full: false }
  }
  return { entity: null, full: false }
}

async function upsertInList(list, entity, { prepend = false } = {}) {
  if (!list) return
  const items = await readCached(list)
  if (!Array.isArray(items)) return
  const idx = items.findIndex(x => x?.id === entity.id)
  if (idx === -1) {
    if (prepend) items.unshift(entity)
    else items.push(entity)
  } else {
    items[idx] = { ...items[idx], ...entity }
  }
  await writeCached(list, items)
}

const me = () => {
  const u = getUser()
  return u ? { id: u.id, name: u.name ?? null, surname: u.surname ?? null } : null
}

// === Продажа офлайн: считаем как сервер (цена × количество − скидка) ===
const round2 = (n) => Math.round(n * 100) / 100

async function buildSale(body, tempId) {
  const arts = await readCached('/api/v1/art/art-objects')
  const art = Array.isArray(arts) ? arts.find(w => w.id === body.art_id) : null
  const quantity = Number(body.quantity) || 1
  const unit = art?.price != null ? Number(art.price) : null
  let listPrice = null
  let salePrice = body.sale_price != null ? Number(body.sale_price) : null
  let currency = body.currency || art?.currency || 'RUB'
  if (body.discount_type && unit !== null) {
    listPrice = round2(unit * quantity)
    const v = Number(body.discount_value) || 0
    salePrice = body.discount_type === 'pct' ? round2(listPrice * (100 - v) / 100) : round2(listPrice - v)
    currency = art.currency || currency
  } else if (unit !== null && currency === (art?.currency || currency)) {
    listPrice = round2(unit * quantity)
  }
  const contacts = body.contact_id ? await readCached('/api/v1/contacts') : null
  const contact = Array.isArray(contacts) ? contacts.find(c => c.id === body.contact_id) : null
  const sellers = body.sold_by ? await readCached('/api/v1/sales/sellers') : null
  const seller = Array.isArray(sellers) ? sellers.find(s => s.id === body.sold_by) : null
  const sale = {
    id: tempId,
    art_id: body.art_id,
    sale_date: body.sale_date,
    quantity,
    list_price: listPrice,
    sale_price: salePrice,
    unit_price: unit,
    discount_type: body.discount_type || null,
    discount_value: body.discount_type ? Number(body.discount_value) || 0 : null,
    discount_pct: listPrice ? round2(((listPrice - salePrice) / listPrice) * 100) : null,
    discount_amount: listPrice !== null && salePrice !== null ? round2(listPrice - salePrice) : null,
    currency,
    contact: body.contact_id ? { id: body.contact_id, name: contact?.name ?? null } : null,
    sold_by: seller ? { id: seller.id, name: seller.name, surname: seller.surname } : me(),
    comment: body.comment ?? null,
    artist_paid: false,
    _pending: true,
  }

  // экземпляры работы и сводка продаж — как их пересчитает сервер
  const summaryPath = `/api/v1/sales/art/${body.art_id}/list`
  const total = art?.quantity ?? 1
  const summary = (await readCached(summaryPath)) || {
    total, sold: art?.sold_count ?? 0, available: art?.available ?? total, edition: art?.edition ?? null, sales: [],
  }
  summary.sold += quantity
  summary.available = Math.max(summary.available - quantity, 0)
  summary.sales = [sale, ...(summary.sales || [])]
  await writeCached(summaryPath, summary)
  if (art) {
    await upsertInList('/api/v1/art/art-objects', {
      id: art.id,
      sold_count: summary.sold,
      available: summary.available,
      sale: { id: tempId, sale_date: sale.sale_date, sale_price: sale.sale_price, currency, sales_count: summary.sales.length },
    })
  }
  return sale
}

/**
 * Поставить действие в очередь и вернуть ответ «как от сервера».
 * @returns {Promise<object>} данные ответа (запись после изменения)
 */
export async function enqueue({ method, path, body, key, match }) {
  const { rule, pathId } = match
  const now = new Date().toISOString()
  const data = body && typeof body === 'object' ? { ...body } : {}
  const sendBody = { ...data }
  let result
  let entityId = null
  let tempId = null
  let baseUtime = null

  if (rule.op === 'create') {
    tempId = newKey()
    entityId = tempId
    if (rule.type === 'sale') {
      result = await buildSale(data, tempId)
    } else {
      result = {
        ...data,
        id: tempId,
        user_id: getUser()?.id ?? null,
        ctime: now,
        utime: now,
        createdBy: me(),
        _pending: true,
        ...(rule.type === 'art' ? { avatar: null, images: [], sale: null, sold_count: 0, available: data.quantity || 1 } : {}),
        ...(rule.type === 'collection' ? { works: data.works || [] } : {}),
      }
      await upsertInList(rule.list, result, { prepend: rule.type !== 'art' })
      if (DETAIL[rule.type]) await writeCached(DETAIL[rule.type](tempId), result)
    }
  } else {
    entityId = rule.idFrom === 'body' ? data.id : pathId
    const { entity, full } = await findCachedEntity(rule.type, rule.list, entityId)
    baseUtime = entity?.utime ?? null
    result = { ...(entity || {}), ...data, id: entityId, utime: now, _pending: true }
    // Работа открыта из общего списка (её доп. изображения на устройстве
    // неизвестны) — изображения не отправляем, иначе стёрли бы их на сервере
    if (rule.type === 'art' && !full && 'images' in sendBody) {
      delete sendBody.images
      if (entity) result.images = entity.images || []
    }
    await upsertInList(rule.list, result)
    if (DETAIL[rule.type]) await writeCached(DETAIL[rule.type](entityId), result)
  }

  // Склейка: правка записи, которая ещё ждёт отправки, вливается в уже
  // стоящее в очереди действие (автосохранение заметки офлайн не плодит
  // десятки отправок). Ещё не созданная на сервере запись — в её создание.
  if (rule.op === 'update' && entityId) {
    const waiting = (await idbGetAll('outbox').catch(() => []))
      .filter(i => i.status === 'pending' && i.type === rule.type && i.entityId === entityId)
      .sort((x, y) => y.id - x.id)[0]
    if (waiting && (waiting.op === 'create' || waiting.url === path)) {
      // в тело создания id не нужен (его выдаст сервер)
      const fields = { ...sendBody }
      delete fields.id
      await idbPut('outbox', {
        ...waiting,
        body: { ...waiting.body, ...(waiting.op === 'create' ? fields : sendBody) },
        title: data.name || data.title || waiting.title,
      })
      return result
    }
  }

  await idbPut('outbox', {
    key,
    method,
    url: path,
    body: sendBody,
    type: rule.type,
    op: rule.op,
    label: rule.label,
    title: data.name || data.title || result?.name || result?.title || null,
    entityId,
    tempId,
    baseUtime,
    createdAt: Date.now(),
    status: 'pending',
    error: null,
  })
  return result
}

export const outboxItems = () => idbGetAll('outbox').catch(() => [])
