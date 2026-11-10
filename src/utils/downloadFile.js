import { fileUrl } from '@/services/const.js'

// Скачивание через fetch + blob, чтобы задать корректное имя файла.
// Файл берём из /files/ на том же домене, что и фронт (CORS не нужен).
export async function downloadFile(file) {
  if (!file?.id || !file?.ext) return

  const url = fileUrl(file)
  const base = file.name || file.filename || 'file'
  const filename = base.toLowerCase().endsWith(`.${file.ext.toLowerCase()}`)
    ? base
    : `${base}.${file.ext}`

  const resp = await fetch(url)
  if (!resp.ok) throw new Error('Download failed')
  // nginx на неизвестный путь отдаёт index.html со статусом 200
  if ((resp.headers.get('content-type') || '').startsWith('text/html')) throw new Error('Download failed: got HTML')
  const blob = await resp.blob()

  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(objectUrl)
}
