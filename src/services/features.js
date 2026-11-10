// Временное включение/выключение разделов. Код разделов не удаляется —
// чтобы вернуть раздел, достаточно поставить true и пересобрать фронт.

// «Биография» и «Резюме»: скрыты из меню, прямые адреса /home/bio и
// /home/cv перенаправляют на главную (см. meta.feature в router/index.js)
export const SHOW_BIO_CV = false

export const FEATURES = {
  bioCv: SHOW_BIO_CV,
}
