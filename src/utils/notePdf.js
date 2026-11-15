// PDF заметки — формируется целиком на клиенте.
//
// jsPDF не умеет кириллицу встроенными шрифтами, поэтому заметка рисуется
// в скрытом DOM-блоке со всем форматированием (шрифты, размеры, цвета,
// выравнивание) и снимается html2canvas. Чтобы строки не резались на
// границе страниц A4, перед съёмкой блоки, пересекающие границу страницы,
// сдвигаются на следующую страницу.
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { escapeHtml } from './textPdf.js'

const PAGE_WIDTH_PX = 794 // A4 при 96 dpi
const PAGE_HEIGHT_PX = Math.round(PAGE_WIDTH_PX * 297 / 210)
const MARGIN_PX = 56

const personName = (p) => [p?.name, p?.surname].map(v => (v || '').trim()).filter(Boolean).join(' ')
const fmt = (d) => (d ? new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '')

/**
 * @param {object} note - { title, content (HTML), artist, createdBy, ctime, updatedBy, utime }
 */
export async function downloadNotePdf(note) {
  const container = document.createElement('div')
  container.style.cssText = `
    position: fixed; top: 0; left: -10000px;
    width: ${PAGE_WIDTH_PX}px; box-sizing: border-box;
    padding: ${MARGIN_PX}px; background: #ffffff;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #2c2a25; font-size: 15px; line-height: 1.6;
  `
  const meta = [
    note.artist?.name ? `Художник: ${escapeHtml(note.artist.name)}` : '',
    `Создал(а): ${escapeHtml(personName(note.createdBy) || '—')}, ${fmt(note.ctime)}`,
    note.updatedBy ? `Изменил(а): ${escapeHtml(personName(note.updatedBy) || '—')}, ${fmt(note.utime)}` : '',
  ].filter(Boolean).map(line => `<div>${line}</div>`).join('')

  container.innerHTML = `
    <div class="note-pdf-block" style="border-bottom: 2px solid #8a6d2f; padding-bottom: 12px; margin-bottom: 20px;">
      <h1 style="font-family: 'Cormorant Garamond', serif; font-size: 30px; font-weight: 600; color: #211f1a; margin: 0 0 6px;">
        ${escapeHtml(note.title || 'Без названия')}
      </h1>
      <div style="font-size: 12px; color: #7c7669; line-height: 1.5;">${meta}</div>
    </div>
    <div class="note-pdf-content">${note.content || ''}</div>
    <style>
      .note-pdf-content > * { margin: 0 0 10px; }
      .note-pdf-content h1 { font-size: 28px; line-height: 1.25; }
      .note-pdf-content h2 { font-size: 22px; line-height: 1.3; }
      .note-pdf-content h3 { font-size: 18px; line-height: 1.35; }
      .note-pdf-content ul, .note-pdf-content ol { padding-left: 24px; }
      .note-pdf-content li > p { margin: 0; }
      .note-pdf-content blockquote { padding-left: 14px; border-left: 3px solid #8a6d2f; color: #5a564c; }
      .note-pdf-content hr { border: none; border-top: 1px solid #d9d4c7; margin: 14px 0; }
      .note-pdf-content mark { padding: 0 2px; border-radius: 2px; }
      .note-pdf-content a { color: #8a6d2f; }
    </style>
  `
  document.body.appendChild(container)

  try {
    await document.fonts.ready
    avoidPageBreakInsideBlocks(container)

    // высота — ровно целое число страниц, чтобы нарезка совпала с границами
    const pages = Math.max(1, Math.ceil(container.scrollHeight / PAGE_HEIGHT_PX))
    container.style.height = `${pages * PAGE_HEIGHT_PX}px`

    const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff', windowWidth: PAGE_WIDTH_PX })
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfW = pdf.internal.pageSize.getWidth()
    const pdfH = pdf.internal.pageSize.getHeight()
    const slicePx = canvas.height / pages

    for (let i = 0; i < pages; i++) {
      const page = document.createElement('canvas')
      page.width = canvas.width
      page.height = slicePx
      page.getContext('2d').drawImage(canvas, 0, i * slicePx, canvas.width, slicePx, 0, 0, canvas.width, slicePx)
      if (i > 0) pdf.addPage()
      pdf.addImage(page.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pdfW, pdfH)
    }

    const filename = (note.title || 'Заметка').trim().replace(/[\\/:*?"<>|]+/g, '_') || 'Заметка'
    pdf.save(`${filename}.pdf`)
  } finally {
    document.body.removeChild(container)
  }
}

// Блок (абзац, заголовок, пункт списка...), пересекающий границу страницы,
// сдвигаем отступом на начало следующей страницы (с учётом полей).
function avoidPageBreakInsideBlocks(container) {
  const content = container.querySelector('.note-pdf-content')
  const blocks = []
  for (const el of content.children) {
    // у списков переносим по пунктам, а не весь список целиком
    if (el.tagName === 'UL' || el.tagName === 'OL') blocks.push(...el.children)
    else blocks.push(el)
  }
  const top0 = container.getBoundingClientRect().top
  for (const el of blocks) {
    const rect = el.getBoundingClientRect()
    const top = rect.top - top0
    const bottom = rect.bottom - top0
    const pageIndex = Math.floor(top / PAGE_HEIGHT_PX)
    const pageBottom = (pageIndex + 1) * PAGE_HEIGHT_PX - MARGIN_PX
    // блок выше страницы целиком не перенести — пусть режется как есть
    if (bottom > pageBottom && rect.height < PAGE_HEIGHT_PX - 2 * MARGIN_PX) {
      const shift = (pageIndex + 1) * PAGE_HEIGHT_PX + MARGIN_PX - top
      el.style.marginTop = `${(parseFloat(getComputedStyle(el).marginTop) || 0) + shift}px`
    }
  }
}
