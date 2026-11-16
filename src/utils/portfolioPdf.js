// Выгрузка портфолио художника в PDF (альбомный A4) — целиком в браузере.
//
// Страницы (по мотивам классического портфолио художника):
//   обложка (фото во весь лист + имя) → «о художнике» (текст + фото) →
//   выставки (персональные / групповые) → по каждому проекту: страница
//   с названием и текстом, фото экспозиции (по одному на лист с подписью),
//   работы (по одной на лист с подписью) → контакты.
//
// Каждая страница — HTML-блок 1123×794 px (A4 альбом при 96 dpi), который
// рендерится html2canvas и кладётся в jsPDF картинкой. Длинный текст
// (биография, выставки, описание проекта) сам переносится на следующие листы.
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { message } from 'ant-design-vue'
import { escapeHtml } from './textPdf.js'
import { withTimeout, loadImageAsDataUrl } from './catalogPdf.js'
import { fileUrl } from '@/services/const.js'

const W = 1123
const H = 794
const M = 64 // поля листа
const FONT_HEAD = "'Oswald', 'Arial Narrow', Arial, sans-serif"
const FONT_BODY = "'Inter', Arial, Helvetica, sans-serif"

const paragraphs = (text) => String(text || '').split(/\n+/).map(t => t.trim()).filter(Boolean)

// Строка выставки «2020 "Название", место» → [год, текст]; без года — продолжение предыдущей
function exhibitionLines(text) {
  const lines = []
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const m = line.match(/^(\d{4}(?:\s*[–—-]\s*\d{2,4})?)[\s.,:—–-]+(.+)$/)
    if (!m && lines.length) lines[lines.length - 1][1] += ` ${line}`
    else lines.push(m ? [m[1], m[2]] : ['', line])
  }
  return lines
}

const workCaption = (w) => [w.year, w.technique, w.size].filter(Boolean).join('. ')

// Шрифт заголовков как в типичных портфолио — тонкий узкий гротеск
async function ensureFonts() {
  if (!document.getElementById('portfolio-pdf-fonts')) {
    const link = document.createElement('link')
    link.id = 'portfolio-pdf-fonts'
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500&family=Inter:wght@400;500;600&display=swap'
    document.head.appendChild(link)
  }
  try {
    await withTimeout(Promise.all([
      document.fonts.load(`300 24px Oswald`),
      document.fonts.load(`400 24px Oswald`),
      document.fonts.load(`400 14px Inter`),
    ]), 5000)
  } catch {
    // нет сети к Google Fonts — PDF будет с запасным шрифтом
  }
}

// Картинки заранее как data URL (иначе html2canvas «пачкает» canvas чужим
// доменом) + натуральные размеры — чтобы самим вписать картинку в рамку
async function imageData(file, cache) {
  if (!file?.id || !file?.ext) return null
  if (cache.has(file.id)) return cache.get(file.id)
  let result = null
  try {
    const src = await loadImageAsDataUrl(fileUrl(file))
    const img = await withTimeout(new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = src
    }), 8000)
    result = { src, w: img.naturalWidth || 1, h: img.naturalHeight || 1 }
  } catch (error) {
    console.error('Портфолио: не удалось загрузить картинку', file.id, error)
  }
  cache.set(file.id, result)
  return result
}

/**
 * Картинка в рамке box {x, y, w, h}: contain — целиком, cover — заполнить с
 * обрезкой. Размеры считаем сами (html2canvas не умеет object-fit, а фоновые
 * картинки на листе вне экрана рисует ненадёжно). alignY: 'top'|'center'|'bottom'.
 */
function imgBox(image, box, { mode = 'contain', alignX = 'center', alignY = 'center' } = {}) {
  if (!image) return ''
  const k = mode === 'cover'
    ? Math.max(box.w / image.w, box.h / image.h)
    : Math.min(box.w / image.w, box.h / image.h)
  const w = Math.round(image.w * k)
  const h = Math.round(image.h * k)
  const pos = (free, align) => (align === 'start' || align === 'top' ? 0 : align === 'end' || align === 'bottom' ? free : free / 2)
  const left = Math.round(pos(box.w - w, alignX))
  const top = Math.round(pos(box.h - h, alignY))
  return `<div style="position:absolute;left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px;overflow:hidden;">
    <img src="${image.src}" style="position:absolute;left:${left}px;top:${top}px;width:${w}px;height:${h}px;max-width:none;" />
  </div>`
}

function makePage(inner, { background = '#ffffff' } = {}) {
  const page = document.createElement('div')
  page.style.cssText = `
    position: fixed; left: -20000px; top: 0;
    width: ${W}px; height: ${H}px; overflow: hidden; box-sizing: border-box;
    background: ${background}; color: #1d1d1b; font-family: ${FONT_BODY};
  `
  page.innerHTML = inner
  return page
}

/**
 * Текст, который не влезает в один лист, переносится на следующие.
 * build(isFirst) → { html, slotSelector } — разметка листа и контейнер,
 * куда кладутся блоки; блоки добавляются по одному, пока помещаются.
 */
function flowPages(root, blocks, build) {
  const pages = []
  let i = 0
  let first = true
  while (i < blocks.length || first) {
    const { html } = build(first)
    const page = makePage(html)
    root.appendChild(page)
    const slot = page.querySelector('[data-slot]')
    let placed = 0
    while (i < blocks.length) {
      slot.insertAdjacentHTML('beforeend', blocks[i])
      if (slot.scrollHeight > slot.clientHeight + 1 && placed > 0) {
        slot.removeChild(slot.lastElementChild)
        break
      }
      placed++
      i++
    }
    pages.push(page)
    first = false
    if (!blocks.length) break
  }
  return pages
}

const headerSmall = (left, right = '') => `
  <div style="position:absolute;left:${M}px;right:${M}px;top:40px;display:flex;justify-content:space-between;
    font-family:${FONT_HEAD};font-weight:300;font-size:26px;color:#1d1d1b;">
    <span>${left}</span><span style="font-size:22px;">${right}</span>
  </div>`

/**
 * @param {object} portfolio — как отдаёт GET /api/v1/portfolios/:id
 * @param {{ onProgress?: (done:number, total:number) => void }} options
 */
export async function downloadPortfolioPdf(portfolio, { onProgress } = {}) {
  const root = document.createElement('div')
  root.style.cssText = 'position:fixed;left:-20000px;top:0;'
  document.body.appendChild(root)
  const cache = new Map()
  const pages = []
  const name = escapeHtml(portfolio.title || '')

  try {
    await ensureFonts()

    // === Обложка ===
    const cover = await imageData(portfolio.cover, cache)
    pages.push(makePage(`
      ${imgBox(cover, { x: 0, y: 0, w: W, h: H }, { mode: 'cover' })}
      ${cover ? '<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 55%,rgba(0,0,0,0.42) 100%);"></div>' : ''}
      <div style="position:absolute;right:${M}px;bottom:${M - 6}px;text-align:right;color:${cover ? '#ffffff' : '#1d1d1b'};">
        <div style="font-family:${FONT_HEAD};font-weight:300;font-size:64px;line-height:1.05;">${name}</div>
        ${portfolio.subtitle ? `<div style="font-family:${FONT_HEAD};font-weight:400;font-size:22px;letter-spacing:0.06em;margin-top:8px;">${escapeHtml(portfolio.subtitle)}</div>` : ''}
      </div>
    `, { background: cover ? '#222' : '#ffffff' }))
    root.appendChild(pages[0])

    // === О художнике ===
    const bioPhoto = await imageData(portfolio.bio_photo, cache)
    const bioBlocks = paragraphs(portfolio.bio).map(t =>
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#2c2c28;">${escapeHtml(t)}</p>`)
    if (bioBlocks.length || bioPhoto) {
      const textWidth = bioPhoto ? 520 : W - 2 * M
      pages.push(...flowPages(root, bioBlocks, (first) => ({
        html: `
          <div style="position:absolute;left:${M}px;top:${M}px;bottom:${M}px;width:${textWidth}px;display:flex;flex-direction:column;">
            ${first ? `
              <div style="font-family:${FONT_HEAD};font-weight:300;font-size:38px;line-height:1.1;margin-bottom:22px;">${name}</div>
              ${portfolio.subtitle ? `<div style="font-family:${FONT_HEAD};font-weight:500;font-size:20px;margin-bottom:12px;">${escapeHtml(portfolio.subtitle)}</div>` : ''}
            ` : ''}
            <div data-slot style="flex:1;min-height:0;overflow:hidden;"></div>
          </div>
          ${bioPhoto && first ? imgBox(bioPhoto, { x: M + textWidth + 40, y: M, w: W - 2 * M - textWidth - 40, h: H - 2 * M }, { alignY: 'top' }) : ''}
        `,
      })))
    }

    // === Выставки ===
    const exRow = ([year, text]) => `
      <div style="display:flex;gap:18px;padding:3px 0;font-family:${FONT_HEAD};font-weight:300;font-size:19px;line-height:1.4;">
        <span style="flex:0 0 74px;">${escapeHtml(year)}</span><span style="flex:1;">${escapeHtml(text)}</span>
      </div>`
    const exLists = [['Персональные выставки:', portfolio.exhibitions_solo], ['Групповые выставки:', portfolio.exhibitions_group]]
      .map(([title, text]) => [title, exhibitionLines(text).map(exRow)])
      .filter(([, rows]) => rows.length)
    // Оба списка короткие — один лист в две колонки; иначе каждый со своих листов
    let exDone = false
    if (exLists.length === 2) {
      const col = ([title, rows]) => `
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;">
          <div style="font-family:${FONT_HEAD};font-weight:300;font-size:32px;margin-bottom:20px;">${title}</div>
          <div data-col style="flex:1;min-height:0;overflow:hidden;">${rows.join('')}</div>
        </div>`
      const page = makePage(`
        <div style="position:absolute;left:${M}px;top:${M - 10}px;right:${M}px;bottom:${M}px;display:flex;gap:48px;">
          ${exLists.map(col).join('')}
        </div>`)
      root.appendChild(page)
      const fits = [...page.querySelectorAll('[data-col]')].every(el => el.scrollHeight <= el.clientHeight + 1)
      if (fits) {
        pages.push(page)
        exDone = true
      } else {
        root.removeChild(page)
      }
    }
    if (!exDone) {
      for (const [title, rows] of exLists) {
        pages.push(...flowPages(root, rows, () => ({
          html: `
            <div style="position:absolute;left:${M}px;top:${M - 10}px;right:${M}px;bottom:${M}px;display:flex;flex-direction:column;">
              <div style="font-family:${FONT_HEAD};font-weight:300;font-size:36px;margin-bottom:22px;">${title}</div>
              <div data-slot style="flex:1;min-height:0;overflow:hidden;max-width:820px;"></div>
            </div>`,
        })))
      }
    }

    // === Проекты ===
    for (const s of portfolio.sections || []) {
      const head = escapeHtml([s.year, portfolio.title].filter(Boolean).join('  '))
      const textBlocks = paragraphs(s.text).map(t =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#2c2c28;">${escapeHtml(t)}</p>`)
      if (s.title || textBlocks.length) {
        pages.push(...flowPages(root, textBlocks, (first) => ({
          html: `
            ${headerSmall(head)}
            <div style="position:absolute;left:${M + 40}px;right:${M + 40}px;top:${first ? 300 : 120}px;bottom:${M}px;display:flex;flex-direction:column;">
              ${first && s.title ? `<div style="text-align:center;font-family:${FONT_HEAD};font-weight:400;font-size:34px;margin-bottom:26px;">«${escapeHtml(s.title)}»${s.year ? `<span style="font-weight:300;color:#6b6b66;"> ${escapeHtml(s.year)}</span>` : ''}</div>` : ''}
              <div data-slot style="flex:1;min-height:0;overflow:hidden;"></div>
            </div>`,
        })))
      }

      // Фото экспозиции — по одному на лист
      for (const ph of s.photos || []) {
        const data = await imageData(ph.file, cache)
        if (!data) continue
        const page = makePage(`
          ${imgBox(data, { x: M, y: M - 10, w: W - 2 * M, h: H - (M - 10) - (ph.caption ? 96 : M) })}
          ${ph.caption ? `<div style="position:absolute;right:${M}px;bottom:54px;max-width:820px;text-align:right;font-family:${FONT_HEAD};font-weight:300;font-size:17px;color:#2c2c28;">${escapeHtml(ph.caption)}</div>` : ''}
        `)
        root.appendChild(page)
        pages.push(page)
      }

      // Работы — по одной на лист: картинка + подпись
      for (const w of s.works || []) {
        const data = await imageData(w.avatar, cache)
        const caption = workCaption(w)
        const page = makePage(`
          ${headerSmall(name, s.title ? `«${escapeHtml(s.title)}»` : '')}
          ${imgBox(data, { x: M, y: 110, w: W - 2 * M, h: H - 110 - 120 })}
          <div style="position:absolute;left:${M}px;right:${M}px;bottom:52px;font-family:${FONT_HEAD};font-weight:300;font-size:18px;color:#2c2c28;">
            <span style="font-weight:500;color:#1d1d1b;">«${escapeHtml(w.name || 'Без названия')}»</span>${caption ? `. ${escapeHtml(caption)}` : ''}
          </div>
        `)
        root.appendChild(page)
        pages.push(page)
      }
    }

    // === Контакты ===
    if (portfolio.contacts) {
      const page = makePage(`
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px;">
          <div style="font-family:${FONT_HEAD};font-weight:300;font-size:44px;margin-bottom:12px;">${name}</div>
          ${paragraphs(portfolio.contacts).map(t => `<div style="font-family:${FONT_HEAD};font-weight:300;font-size:20px;">${escapeHtml(t)}</div>`).join('')}
        </div>
      `)
      root.appendChild(page)
      pages.push(page)
    }

    // === Рендер в PDF ===
    const pdf = new jsPDF('l', 'mm', 'a4')
    const pw = pdf.internal.pageSize.getWidth()
    const ph = pdf.internal.pageSize.getHeight()
    let added = 0
    for (let i = 0; i < pages.length; i++) {
      if (onProgress) onProgress(i + 1, pages.length)
      let canvas
      try {
        canvas = await withTimeout(html2canvas(pages[i], { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false }), 30000)
      } catch (error) {
        console.error('Портфолио: страница не отрендерилась', i, error)
        continue
      }
      if (added > 0) pdf.addPage('a4', 'l')
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, pw, ph)
      added++
    }
    if (!added) {
      message.error('Не удалось создать PDF портфолио')
      return false
    }
    const filename = (`Портфолио — ${portfolio.title || ''}`).trim().replace(/[\\/:*?"<>|]/g, '') || 'Портфолио'
    pdf.save(`${filename}.pdf`)
    return true
  } catch (error) {
    console.error('Error generating portfolio PDF:', error)
    message.error('Не удалось создать PDF портфолио')
    return false
  } finally {
    document.body.removeChild(root)
  }
}
