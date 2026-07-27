// Биографии изначально хранились как обычный текст. Редактор теперь
// сохраняет HTML (жирный, курсив, списки и т.д.), поэтому эти утилиты
// нужны, чтобы старые записи и новые уживались в одном хранилище.

export function isHtmlContent(str) {
  if (!str) return false
  return /<\/?[a-z][\s\S]*>/i.test(str)
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

export function plainTextToHtml(text) {
  if (!text) return ''
  return text
    .split(/\n{2,}/)
    .map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

export function toEditableHtml(text) {
  if (!text) return ''
  return isHtmlContent(text) ? text : plainTextToHtml(text)
}

export function htmlToPlainText(html) {
  if (!html) return ''
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent || div.innerText || '').replace(/[ \t]+\n/g, '\n').trim()
}
