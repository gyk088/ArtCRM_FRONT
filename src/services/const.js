// Значения должны совпадать с backend ROLES (src/bll/utils/const.js в ArtCRM_BACKEND)
export const ROLES = {
    SUPER_ADMIN: 'super_admin',
    GALLERY: 'gallery',
    MANAGER: 'manager',
    ARTIST: 'artist'
}

export const TEXT_ROLES = {
    super_admin: "Супер-админ",
    gallery: "Галерея",
    manager: "Менеджер",
    artist: "Художник"
}

// Адрес бэкенда (API и раздача загруженных файлов /files) — задаётся
// переменной ARTCRM_BASE_URL в .env.development / .env.production и
// подставляется Vite при сборке как __MY_BASE_URL__ (см. vite.config.js).
// Хвостовой "/" срезаем, чтобы склейка `${API_BASE_URL}/files/...` не давала "//".
// eslint-disable-next-line no-undef
export const API_BASE_URL = String(__MY_BASE_URL__ || '').replace(/\/+$/, '')

// Прямая ссылка на загруженный файл ({ id, ext } из my_file)
export const fileUrl = (file) => `${API_BASE_URL}/files/${file.id}.${file.ext}`
