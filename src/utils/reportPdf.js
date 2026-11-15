// PDF отчёта о продажах — формируется целиком на клиенте.
//
// jsPDF не умеет кириллицу встроенными шрифтами, поэтому каждая страница
// собирается в скрытом DOM-блоке (альбомный A4) и снимается html2canvas.
// Строки таблицы добавляются, пока помещаются на страницу, дальше —
// новая страница с повторённой шапкой таблицы: строки не режутся, а
// большой отчёт не упирается в ограничение размера canvas.
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { escapeHtml } from './textPdf.js'
import { formatMoney, formatPct, formatDate } from './money.js'

const PAGE_W = 1123 // A4 альбомный при 96 dpi
const PAGE_H = 794
const PAD = 36
const FOOTER_H = 22

const esc = (v) => escapeHtml(v == null ? '' : String(v))

const STYLE = `
  <style>
    .rp-page { box-sizing: border-box; width: ${PAGE_W}px; height: ${PAGE_H}px; padding: ${PAD}px ${PAD}px ${PAD + FOOTER_H}px;
      background: #fff; color: #2c2a25; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; position: relative; overflow: hidden; }
    .rp-title { font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 600; color: #211f1a; margin: 0 0 4px; }
    .rp-sub { font-size: 12px; color: #7c7669; margin-bottom: 12px; }
    .rp-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
    .rp-kpi { border: 1px solid #e6e1d6; border-radius: 8px; padding: 8px 10px; }
    .rp-kpi-main { background: #f4f1ea; }
    .rp-kpi-label { font-size: 11px; color: #7c7669; }
    .rp-kpi-value { font-size: 17px; font-weight: 700; color: #211f1a; margin-top: 2px; }
    .rp-kpi-hint { font-size: 10px; color: #7c7669; margin-top: 1px; }
    .rp-warn { font-size: 11px; color: #b54708; margin: -6px 0 10px; }
    .rp-table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .rp-table th { background: #efece4; color: #5a564c; font-weight: 600; text-align: left; padding: 6px; border-bottom: 1px solid #d9d4c7; }
    .rp-table td { padding: 5px 6px; border-bottom: 1px solid #eee9de; vertical-align: top; }
    .rp-table .num { text-align: right; white-space: nowrap; }
    .rp-table .center { text-align: center; }
    .rp-muted { color: #7c7669; font-size: 10px; }
    .rp-paid { color: #1e7b45; font-weight: 700; }
    .rp-unpaid { color: #b9b3a6; }
    .rp-norate { color: #b54708; }
    .rp-total td { font-weight: 700; background: #faf8f3; border-top: 1px solid #d9d4c7; }
    .rp-footer { position: absolute; left: ${PAD}px; right: ${PAD}px; bottom: ${PAD - 14}px; display: flex; justify-content: space-between;
      font-size: 10px; color: #9c968a; }
  </style>
`

/**
 * @param {object} p
 * @param {string} p.title
 * @param {string} p.subtitle - период, валюта, комиссия
 * @param {{label, value, hint?, main?}[]} p.kpis
 * @param {string} [p.warning] - например, продажи без курса
 * @param {string} p.currency - валюта отчёта
 * @param {object[]} p.rows - строки ReportService.compute
 * @param {object} p.summary
 */
export async function downloadReportPdf({ title, subtitle, kpis, warning, currency, rows, summary }) {
  const host = document.createElement('div')
  host.style.cssText = 'position: fixed; left: -20000px; top: 0;'
  host.innerHTML = STYLE
  document.body.appendChild(host)

  const head = `
    <thead><tr>
      <th style="width:70px">Дата</th><th>Работа</th><th style="width:130px">Художник</th>
      <th class="num" style="width:90px">Продажа</th><th class="num" style="width:60px">Скидка</th>
      <th class="num" style="width:95px">В ${esc(currency)}</th><th class="num" style="width:95px">Комиссия</th>
      <th class="num" style="width:95px">Художнику</th><th class="center" style="width:58px">Расчёт</th>
    </tr></thead>`

  const rowHtml = (r) => `
    <tr>
      <td>${esc(formatDate(r.sale_date))}</td>
      <td>${esc(r.art_name)}${r.contact ? `<div class="rp-muted">${esc(r.contact.name)}</div>` : ''}</td>
      <td>${esc(r.artist?.name || '—')}</td>
      <td class="num">${esc(formatMoney(r.sale_price, r.currency))}</td>
      <td class="num">${r.discount_pct > 0 ? '−' + esc(formatPct(r.discount_pct)) : '—'}</td>
      <td class="num">${r.sale_price_converted !== null ? esc(formatMoney(r.sale_price_converted, currency)) : `<span class="rp-norate">нет курса</span>`}</td>
      <td class="num">${r.commission_converted !== null ? esc(formatMoney(r.commission_converted, currency))
        + (r.commission_pct !== null ? `<div class="rp-muted">${esc(formatPct(r.commission_pct))}</div>` : '') : '—'}</td>
      <td class="num">${r.net_converted !== null ? esc(formatMoney(r.net_converted, currency)) : '—'}</td>
      <td class="center">${r.artist_paid ? '<span class="rp-paid">✓</span>' : '<span class="rp-unpaid">—</span>'}</td>
    </tr>`

  const totalHtml = `
    <tr class="rp-total">
      <td colspan="5">Итого (с курсом)</td>
      <td class="num">${esc(formatMoney(summary.total, currency))}</td>
      <td class="num">${esc(formatMoney(summary.commission_total, currency))}</td>
      <td class="num">${esc(formatMoney(summary.net_total, currency))}</td>
      <td class="center rp-muted">${summary.paid_count || 0}/${summary.count}</td>
    </tr>`

  const pages = []
  const newPage = (first) => {
    const page = document.createElement('div')
    page.className = 'rp-page'
    page.innerHTML = (first ? `
      <div class="rp-title">${esc(title)}</div>
      <div class="rp-sub">${esc(subtitle)}</div>
      <div class="rp-kpis">${kpis.map(k => `
        <div class="rp-kpi ${k.main ? 'rp-kpi-main' : ''}">
          <div class="rp-kpi-label">${esc(k.label)}</div>
          <div class="rp-kpi-value">${esc(k.value)}</div>
          ${k.hint ? `<div class="rp-kpi-hint">${esc(k.hint)}</div>` : ''}
        </div>`).join('')}
      </div>
      ${warning ? `<div class="rp-warn">${esc(warning)}</div>` : ''}` : '')
      + `<table class="rp-table">${head}<tbody></tbody></table>`
    host.appendChild(page)
    pages.push(page)
    return page.querySelector('tbody')
  }
  // помещается ли содержимое страницы (без нижнего поля и номера страницы)
  const fits = (page) => page.scrollHeight <= PAGE_H

  try {
    await document.fonts.ready
    let tbody = newPage(true)
    const items = [...rows.map(rowHtml), totalHtml]
    if (!rows.length) items.unshift('<tr><td colspan="9" class="rp-muted" style="text-align:center;padding:16px">Нет продаж под выбранные фильтры</td></tr>')
    for (const html of items) {
      tbody.insertAdjacentHTML('beforeend', html)
      const page = pages[pages.length - 1]
      if (!fits(page) && tbody.children.length > 1) {
        tbody.lastElementChild.remove()
        tbody = newPage(false)
        tbody.insertAdjacentHTML('beforeend', html)
      }
    }

    const printed = new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    pages.forEach((page, i) => {
      page.insertAdjacentHTML('beforeend',
        `<div class="rp-footer"><span>${esc(title)} · сформирован ${esc(printed)}</span><span>Стр. ${i + 1} из ${pages.length}</span></div>`)
    })

    const pdf = new jsPDF('l', 'mm', 'a4')
    const w = pdf.internal.pageSize.getWidth()
    const h = pdf.internal.pageSize.getHeight()
    for (const [i, page] of pages.entries()) {
      const canvas = await html2canvas(page, { scale: 2, backgroundColor: '#ffffff', width: PAGE_W, height: PAGE_H, windowWidth: PAGE_W })
      if (i > 0) pdf.addPage()
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, w, h)
    }
    const filename = (title || 'Отчёт').trim().replace(/[\\/:*?"<>|]+/g, '_') || 'Отчёт'
    pdf.save(`${filename}.pdf`)
  } finally {
    document.body.removeChild(host)
  }
}
