import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { message } from 'ant-design-vue'
import { escapeHtml } from './textPdf.js'
import apiClient from '@/services/api.js'

// Подгружаем обложку как data URL заранее, чтобы избежать "tainted canvas"
// при кросс-доменной картинке на этапе рендера html2canvas
async function loadImageAsDataUrl(url) {
  try {
    const resp = await fetch(url)
    if (!resp.ok) throw new Error('Image fetch failed')
    const blob = await resp.blob()

    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    // Фолбэк на случай если fetch заблокирован (CORS/ORB и т.п.) —
    // догружаем картинку напрямую через <img> и перерисовываем в canvas
    return await new Promise((resolve, reject) => {
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
    })
  }
}

export const DEFAULT_CERTIFICATE_HEADER_TEXT =
  'Настоящий сертификат подтверждает подлинность произведения искусства и передачу неисключительной лицензии на использование его изображения любым способом, с правом передачи третьим лицам.'

// Генерирует и скачивает сертификат подлинности работы в PDF
export async function downloadCertificatePdf(work, { artistName = '', seriaName = '', headerText = DEFAULT_CERTIFICATE_HEADER_TEXT } = {}) {
  let avatarDataUrl = null
  if (work.avatar?.id && work.avatar?.ext) {
    // dev.myoffer.life/files отдаётся напрямую nginx без CORS-заголовков,
    // поэтому для чтения пикселей в canvas берём файл через API-хост,
    // где CORS настроен (см. cors в ArtCRM_BACKEND/src/index.js)
    const corsAvatarUrl = `${apiClient.defaults.baseURL}/${work.avatar.id}.${work.avatar.ext}`
    try {
      avatarDataUrl = await loadImageAsDataUrl(corsAvatarUrl)
    } catch (error) {
      console.error('Не удалось загрузить обложку для сертификата:', error)
    }
  }

  const now = new Date()
  const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`

  const rows = [
    ['Художник:', artistName],
    ['Название работы:', work.name],
    ['Серия:', seriaName],
    ['Год создания:', work.year],
    ['Техника:', work.technique],
    ['Размер работы:', work.size],
  ].filter(([, value]) => value)

  // Высота подогнана так, чтобы контейнер (при ширине 700px) укладывался в одну
  // страницу A4 в jsPDF (теоретический максимум 700 * 297/210 = 990px; берём
  // с запасом, вплотную к 990 плавающая точка иногда рождает пустую вторую страницу).
  // Отступы/шрифты/пропорции сверены с образцом сертификата (docx): поля 20мм
  // со всех сторон (20мм * 700/210 ≈ 67px), Arial, заголовок того же размера,
  // что и остальной текст (просто жирный), блок полей и подписи — с отступом слева.
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
    padding: 67px;
    background: #ffffff;
    font-family: Arial, Helvetica, sans-serif;
    color: #000000;
  `

  container.innerHTML = `
    <div style="flex-shrink: 0; text-align: center; margin-bottom: 4px; line-height: 1;">
      <div style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: 700; color: #000000; letter-spacing: 0.04em;">
        СЕРТИФИКАТ ПОДЛИННОСТИ
      </div>
      <div style="font-size: 11px; color: #000000; margin-top: 2px; white-space: pre-wrap;">
        ${escapeHtml(headerText)}
      </div>
    </div>

    <div style="flex-shrink: 0; text-align: center; margin-bottom: 32px;">
      ${avatarDataUrl ? `<img src="${avatarDataUrl}" style="max-width: 380px; max-height: 480px; object-fit: contain; display: inline-block;" />` : ''}
    </div>

    <div style="flex-shrink: 0; text-align: left; padding-left: 42px; font-size: 13px; line-height: 1.3; color: #000000;">
      ${rows.map(([label, value]) => `
        <div style="padding: 2px 0;">
          ${escapeHtml(label)} ${escapeHtml(String(value))}
        </div>
      `).join('')}
    </div>

    <div style="flex-shrink: 0; margin-top: auto; padding-left: 42px;">
      <div style="display: flex; align-items: flex-end;">
        <span style="font-size: 13px; color: #000000;">Подпись</span>
        <span style="flex: 1; border-bottom: 1px solid #000000; margin: 0 8px 2px;"></span>
        <span style="font-size: 13px; color: #000000; white-space: nowrap;">/ ${escapeHtml(artistName || '—')} /</span>
      </div>
      <div style="font-size: 13px; color: #000000; margin-top: 8px;">${dateStr}</div>
    </div>
  `

  document.body.appendChild(container)

  try {
    await document.fonts.ready

    const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
    const imgData = canvas.toDataURL('image/png')

    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pageWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    let heightLeft = imgHeight
    let position = 0

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    // Небольшой допуск против плавающей точки: сертификат специально подогнан
    // под ровно одну страницу, и доля миллиметра погрешности не должна плодить пустую вторую
    while (heightLeft > 0.5) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    const filename = (work.name || 'работа').trim().replace(/[\\/:*?"<>|]/g, '') || 'работа'
    pdf.save(`Сертификат — ${filename}.pdf`)
  } catch (error) {
    console.error('Error generating certificate PDF:', error)
    message.error('Не удалось создать сертификат')
  } finally {
    document.body.removeChild(container)
  }
}
