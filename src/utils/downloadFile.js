import apiClient from '@/services/api.js'

// dev.myoffer.life/files отдаётся напрямую nginx без CORS-заголовков,
// поэтому для скачивания (fetch + blob, с корректным именем файла)
// берём файл через API-хост, где CORS настроен
export async function downloadFile(file) {
  if (!file?.id || !file?.ext) return

  const url = `${apiClient.defaults.baseURL}/${file.id}.${file.ext}`
  const base = file.name || file.filename || 'file'
  const filename = base.toLowerCase().endsWith(`.${file.ext.toLowerCase()}`)
    ? base
    : `${base}.${file.ext}`

  const resp = await fetch(url)
  if (!resp.ok) throw new Error('Download failed')
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
