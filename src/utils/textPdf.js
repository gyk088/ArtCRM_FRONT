import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { message } from 'ant-design-vue'
import { toEditableHtml, htmlToPlainText } from './richText.js'

// jsPDF не умеет рендерить кириллицу встроенными шрифтами,
// поэтому контент отрисовывается в DOM и захватывается html2canvas.
export function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str ?? ''
  return div.innerHTML
}

// Общий генератор PDF для текстовых документов (биография, резюме и т.п.)
export async function downloadTextPdf(doc) {
  if (!htmlToPlainText(doc?.text).trim()) return

  const container = document.createElement('div')
  container.style.cssText = `
    position: fixed;
    top: -9999px;
    left: -9999px;
    width: 700px;
    padding: 56px 48px;
    background: #ffffff;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #2c2a25;
  `
  container.innerHTML = `
    <div style="border-bottom: 2px solid #8a6d2f; padding-bottom: 16px; margin-bottom: 24px;">
      <h1 style="font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 600; color: #211f1a; margin: 0;">
        ${escapeHtml(doc.title || 'Без названия')}
      </h1>
    </div>
    <div class="doc-pdf-content" style="font-size: 15px; line-height: 1.8;">${toEditableHtml(doc.text)}</div>
    <style>
      .doc-pdf-content p { margin: 0 0 12px; }
      .doc-pdf-content ul, .doc-pdf-content ol { margin: 0 0 12px; padding-left: 24px; }
      .doc-pdf-content blockquote { margin: 0 0 12px; padding-left: 14px; border-left: 3px solid #8a6d2f; color: #5a564c; }
    </style>
  `
  document.body.appendChild(container)

  try {
    await document.fonts.ready

    const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff' })
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

    while (heightLeft > 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    const filename = (doc.title || 'document').trim().replace(/[\\/:*?"<>|]/g, '') || 'document'
    pdf.save(`${filename}.pdf`)
  } catch (error) {
    console.error('Error generating PDF:', error)
    message.error('Не удалось создать PDF')
  } finally {
    document.body.removeChild(container)
  }
}
