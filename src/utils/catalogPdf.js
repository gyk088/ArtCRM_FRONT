import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { message } from 'ant-design-vue'
import { escapeHtml } from './textPdf.js'
import apiClient from '@/services/api.js'

// fetch()/<img> не имеют встроенного таймаута — если файл недоступен, но
// соединение не рвётся явно (зависший прокси, недоступный CORS-хост и т.п.),
// промис может не завершиться вообще никогда, и вся выгрузка каталога
// "зависает" на первой же проблемной картинке. Жёстко ограничиваем каждый
// шаг по времени, чтобы такая работа просто пропускалась, а не блокировала
// весь PDF.
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    promise.then(
      (value) => { clearTimeout(timer); resolve(value) },
      (error) => { clearTimeout(timer); reject(error) }
    )
  })
}

// Подгружаем обложку как data URL заранее, чтобы избежать "tainted canvas"
// при кросс-доменной картинке на этапе рендера html2canvas — тот же приём,
// что и в certificatePdf.js
async function loadImageAsDataUrl(url) {
  try {
    const resp = await withTimeout(fetch(url), 8000)
    if (!resp.ok) throw new Error('Image fetch failed')
    const blob = await resp.blob()

    return await withTimeout(new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    }), 8000)
  } catch (error) {
    return await withTimeout(new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        canvas.getContext('2d').drawImage(img, 0, 0)
        try {
          resolve(canvas.toDataURL('image/png'))
        } catch (canvasError) {
          reject(canvasError)
        }
      }
      img.onerror = () => reject(error)
      img.src = url
    }), 8000)
  }
}

const CURRENCY_SYMBOLS = { RUB: '₽', BYN: 'Br', USD: '$', EUR: '€' }

function formatPrice(price, currency) {
  if (!price) return ''
  const symbol = CURRENCY_SYMBOLS[currency] || CURRENCY_SYMBOLS.RUB
  return `${new Intl.NumberFormat('ru-RU').format(price)} ${symbol}`
}

// Одна страница каталога — работа. Контейнер 700×985px подогнан под A4
// (700/210 ≈ 985/297), как в certificatePdf.js, поэтому ровно одна
// страница на работу без переполнения.
async function renderWorkPage(work, { visibleFields, names }) {
  const isVisible = (key) => visibleFields[key] !== false

  let imageDataUrl = null
  if (work.avatar?.id && work.avatar?.ext) {
    // dev.myoffer.life/files отдаётся напрямую nginx без CORS, поэтому
    // читаем файл через API-хост, где CORS настроен
    const corsUrl = `${apiClient.defaults.baseURL}/${work.avatar.id}.${work.avatar.ext}`
    try {
      imageDataUrl = await loadImageAsDataUrl(corsUrl)
    } catch (error) {
      console.error('Не удалось загрузить изображение работы для каталога:', error)
    }
  }

  const rows = [
    isVisible('technique') && work.technique ? ['Техника', work.technique] : null,
    isVisible('size') && work.size ? ['Размер', work.size] : null,
    isVisible('seria') && names.seria ? ['Серия', names.seria] : null,
    isVisible('media') && names.media ? ['Медиа', names.media] : null,
    isVisible('location') && names.location ? ['Локация', names.location] : null,
    isVisible('status') && names.status ? ['Статус', names.status] : null,
  ].filter(Boolean)

  const container = document.createElement('div')
  container.style.cssText = `
    position: fixed;
    top: -9999px;
    left: -9999px;
    width: 700px;
    height: 985px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    padding: 50px;
    background: #ffffff;
    font-family: Arial, Helvetica, sans-serif;
    color: #000000;
  `

  container.innerHTML = `
    <div style="flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center;">
      ${imageDataUrl
        ? `<img src="${imageDataUrl}" style="max-width: 100%; max-height: 620px; object-fit: contain; display: block;" />`
        : ''}
    </div>
    <div style="flex-shrink: 0; margin-top: 24px;">
      ${names.artist ? `<div style="font-size: 14px; color: #000000; margin-bottom: 4px;">${escapeHtml(names.artist)}</div>` : ''}
      <div style="font-size: 19px; font-weight: 700; color: #000000; margin-bottom: 8px;">
        ${escapeHtml(work.name || 'Без названия')}${work.year && isVisible('year') ? `, ${escapeHtml(String(work.year))}` : ''}
      </div>
      ${rows.map(([label, value]) => `
        <div style="font-size: 12px; color: #333333; padding: 1px 0;">${escapeHtml(label)}: ${escapeHtml(String(value))}</div>
      `).join('')}
      ${isVisible('price') && work.price ? `<div style="font-size: 15px; font-weight: 700; color: #000000; margin-top: 10px;">${escapeHtml(formatPrice(work.price, work.currency))}</div>` : ''}
    </div>
  `

  document.body.appendChild(container)
  try {
    await document.fonts.ready
    // logging:false — иначе html2canvas на каждую страницу пишет в консоль
    // десяток строк трассировки, из-за которых на большом каталоге
    // (много работ) кажется, что что-то "зависло", хотя рендер просто идёт.
    return await html2canvas(container, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false })
  } finally {
    document.body.removeChild(container)
  }
}

/**
 * Генерирует и скачивает PDF-каталог со всеми переданными работами —
 * по одной работе на странице (картина + название/художник/детали/цена),
 * с учётом тех же переключателей видимости полей, что и на публичной
 * странице ссылки/выставки.
 *
 * @param {string} title - имя файла (обычно название ссылки/выставки)
 * @param {object[]} works - работы (как в form.works, с резолвленными avatar)
 * @param {object} options
 * @param {object} options.visibleFields - {technique, size, year, seria, media, location, status, price}
 * @param {(work: object) => {artist, seria, media, location, status}} options.resolveNames
 * @param {(current: number, total: number) => void} options.onProgress - для индикации в UI (иначе много работ выглядит как зависание)
 */
export async function downloadCatalogPdf(title, works, { visibleFields = {}, resolveNames, onProgress } = {}) {
  if (!works.length) {
    message.warning('Нет работ для выгрузки')
    return
  }

  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  let addedPages = 0
  let skipped = 0

  try {
    for (let i = 0; i < works.length; i++) {
      const work = works[i]
      const names = resolveNames ? resolveNames(work) : {}
      if (onProgress) onProgress(i + 1, works.length)

      let canvas
      try {
        // Рендер одной страницы (включая подгрузку картинки) тоже ограничен
        // по времени — сбой на одной работе не должен вешать весь каталог.
        canvas = await withTimeout(renderWorkPage(work, { visibleFields, names }), 20000)
      } catch (error) {
        console.error('Пропускаем работу в каталоге:', work?.name, error)
        skipped++
        continue
      }

      // JPEG вместо PNG — для десятков полноразмерных (scale:2) страниц
      // кодирование в PNG заметно медленнее и даёт куда более тяжёлый файл;
      // для фотографий работ разница в качестве на глаз не заметна.
      const imgData = canvas.toDataURL('image/jpeg', 0.92)
      const imgHeight = (canvas.height * pageWidth) / canvas.width

      if (addedPages > 0) pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, Math.min(imgHeight, pageHeight))
      addedPages++
    }

    if (!addedPages) {
      message.error('Не удалось создать PDF-каталог — ни одна работа не отрендерилась')
      return
    }

    const filename = (title || 'Каталог').trim().replace(/[\\/:*?"<>|]/g, '') || 'Каталог'
    pdf.save(`${filename}.pdf`)

    if (skipped) {
      message.warning(`Каталог сохранён, но ${skipped} ${skipped === 1 ? 'работа не попала' : 'работ(ы) не попали'} в PDF — см. консоль`)
    }
  } catch (error) {
    console.error('Error generating catalog PDF:', error)
    message.error('Не удалось создать PDF-каталог')
  }
}
