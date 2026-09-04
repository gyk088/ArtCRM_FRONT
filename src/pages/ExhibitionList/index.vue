<template>
  <div class="exhibition-page">
    <div class="exhibition-header">
      <div class="header-heading">
        <h3 class="page-title">Мои Выставки</h3>
        <p class="page-subtitle">
          {{ exhibitionList.length ? `Выставок: ${exhibitionList.length}` : 'Здесь появятся ваши выставки' }}
        </p>
      </div>
      <div class="header-actions">
        <a-button type="primary" class="create-btn" @click="openEditPage">
          <template #icon>
            <PlusOutlined />
          </template>
          Создать выставку
        </a-button>
      </div>
    </div>

    <div class="filters-panel">
      <a-input
        id="exhibitionSearchQuery"
        name="exhibitionSearchQuery"
        v-model:value="searchQuery"
        placeholder="Поиск по названию"
        allow-clear
        style="width: 240px"
        class="name-search"
      >
        <template #prefix>
          <SearchOutlined />
        </template>
      </a-input>
    </div>

    <div v-if="filteredExhibitionList.length" class="exhibition-grid">
      <a-card v-for="exhibition in filteredExhibitionList" :key="exhibition.id" class="exhibition-card"
        hoverable @click="openEditPage(exhibition)">
        <template #cover>
          <div class="card-cover">
            <img v-if="exhibition.avatar?.url" :src="exhibition.avatar.url" :alt="exhibition.name" class="cover-img" />
            <div v-else class="cover-placeholder">
              <PictureOutlined />
            </div>
          </div>
        </template>

        <h4 class="card-title">{{ exhibition.name || 'Без названия' }}</h4>

        <p v-if="dateVenueLine(exhibition)" class="card-date-venue">
          <CalendarOutlined />
          {{ dateVenueLine(exhibition) }}
        </p>

        <p class="exhibition-text" :class="{ 'exhibition-text--empty': !exhibition.description }">
          {{ descriptionPreview(exhibition.description) || 'Без описания' }}
        </p>

        <div class="card-meta">
          <PictureOutlined />
          {{ (exhibition.works || []).length }} {{ pluralizeWorks((exhibition.works || []).length) }}
        </div>

        <div class="exhibition-actions">
          <a-button type="default" @click.stop="copyExhibitionLink(exhibition)" class="copy-link-btn">
            <template #icon>
              <CopyOutlined />
            </template>
            Копировать ссылку
          </a-button>
          <a-popconfirm title="Удалить выставку?" ok-text="Да" cancel-text="Нет"
            @confirm.stop="handleDeleteExhibition(exhibition.id)">
            <a-tooltip title="Удалить">
              <a-button type="text" danger class="delete-btn" @click.stop>
                <template #icon>
                  <DeleteOutlined />
                </template>
              </a-button>
            </a-tooltip>
          </a-popconfirm>
        </div>
      </a-card>
    </div>

    <div v-else-if="exhibitionList.length" class="empty-state">
      <FolderOpenOutlined class="empty-icon" />
      <p class="empty-title">Ничего не найдено</p>
      <p class="empty-hint">Попробуйте изменить поиск</p>
      <a-button class="reset-search-btn" @click="searchQuery = ''">Сбросить поиск</a-button>
    </div>

    <div v-else class="empty-state">
      <FolderOpenOutlined class="empty-icon" />
      <p class="empty-title">Пока нет ни одной выставки</p>
      <p class="empty-hint">Создайте первую выставку — с датами, местом проведения, галереей фото и работами</p>
      <a-button type="primary" class="create-btn" @click="openEditPage">
        <template #icon>
          <PlusOutlined />
        </template>
        Создать выставку
      </a-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { CopyOutlined, DeleteOutlined, PlusOutlined, FolderOpenOutlined, PictureOutlined, SearchOutlined, CalendarOutlined } from '@ant-design/icons-vue'
import { htmlToPlainText } from '@/utils/richText.js'
import { useExhibition } from '@/stores/exhibition.js'

const router = useRouter()
const exhibitionStore = useExhibition()
const searchQuery = ref('')

const exhibitionList = computed(() => exhibitionStore.listExhibitions)

onMounted(async () => {
  try {
    await exhibitionStore.getAllExhibitions()
  } catch (error) {
    console.error('Error loading exhibitions:', error)
  }
})

const filteredExhibitionList = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return exhibitionList.value

  return exhibitionList.value.filter(exhibition => (exhibition.name || '').toLowerCase().includes(query))
})

function descriptionPreview(description) {
  return htmlToPlainText(description)
}

const MONTHS_RU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

function formatDate(d) {
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()]} ${d.getFullYear()}`
}

// Человекочитаемый диапазон дат — зеркалит formatDateRange из
// src/controllers/publicPage.js на бэкенде (упрощённая версия для карточки).
function formatDateRange(startDate, endDate) {
  const start = startDate ? new Date(startDate) : null
  const end = endDate ? new Date(endDate) : null

  if (!start && !end) return ''
  if (start && !end) return `С ${formatDate(start)}`
  if (!start && end) return `По ${formatDate(end)}`
  if (start.getTime() === end.getTime()) return formatDate(start)

  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${MONTHS_RU[start.getMonth()]} ${start.getFullYear()}`
  }

  return `${formatDate(start)} – ${formatDate(end)}`
}

function dateVenueLine(exhibition) {
  const dateText = formatDateRange(exhibition.startDate, exhibition.endDate)
  return [dateText, exhibition.venue].filter(Boolean).join(' · ')
}

// Функция копирования ссылки на выставку
const copyExhibitionLink = async (exhibition) => {
  const link = `${window.location.origin}/exhibition/${exhibition.id}`

  try {
    await navigator.clipboard.writeText(link)
    message.success('Ссылка на выставку скопирована!')
  } catch (err) {
    console.error('Ошибка копирования:', err)
    const textarea = document.createElement('textarea')
    textarea.value = link
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    message.success('Ссылка скопирована!')
  }
}

const openEditPage = (exhibition) => {
  if (exhibition && exhibition.id) {
    router.push({ name: 'edit-exhibition', params: { id: exhibition.id } })
  } else {
    router.push({ name: 'edit-exhibition', params: { id: 'new' } })
  }
}

async function handleDeleteExhibition(id) {
  await exhibitionStore.deleteExhibition(id)
}

function pluralizeWorks(count) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'работа'
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'работы'
  return 'работ'
}
</script>

<style scoped>

.exhibition-page {
  --bg: #f7f5f0;
  --bg-elevated: #ffffff;
  --card-bg: #efece4;
  --text-title: #211f1a;
  --text-body: #2c2a25;
  --text-muted: #5a564c;
  --text-faint: #7c7669;
  --accent: #8a6d2f;
  --accent-strong: #6f581f;
  --border: rgba(0, 0, 0, 0.1);
  --border-soft: rgba(0, 0, 0, 0.07);

  padding: 20px 24px;
  background: var(--bg);
  color: var(--text-body);
  border-radius: 14px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.exhibition-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  font-size: 18px;
}

.header-heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.page-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 28px;
  font-weight: 600;
  color: var(--text-title);
  margin: 0;
}

.page-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--text-faint);
}

.filters-panel {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.name-search :deep(.ant-input) {
  background: var(--bg-elevated) !important;
  color: var(--text-body) !important;
}

.name-search :deep(.ant-input-affix-wrapper) {
  background: var(--bg-elevated) !important;
  border-color: var(--border) !important;
  border-radius: 20px !important;
}

.name-search :deep(.ant-input-affix-wrapper):hover,
.name-search :deep(.ant-input-affix-wrapper):focus-within {
  border-color: var(--accent) !important;
}

.name-search :deep(.ant-input-prefix) {
  color: var(--text-faint) !important;
  margin-right: 6px;
}

.name-search :deep(.ant-input-clear-icon) {
  color: var(--text-faint) !important;
}

.exhibition-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.exhibition-card {
  width: 100%;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  background: var(--bg-elevated) !important;
  border: 1px solid var(--border) !important;
  border-radius: 10px;
}

.exhibition-card :deep(.ant-card-body) {
  padding: 14px 16px 16px;
}

.exhibition-card:hover {
  transform: translateY(-4px);
  border-color: var(--accent) !important;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.exhibition-card:hover .cover-img {
  transform: scale(1.05);
}

.card-cover {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-soft);
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: var(--text-faint);
}

.card-title {
  margin: 0 0 4px;
  font-family: 'Cormorant Garamond', serif;
  font-size: 19px;
  font-weight: 600;
  color: var(--text-title);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-date-venue {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.exhibition-text {
  display: -webkit-box;
  -webkit-line-clamp: 2; /* stylelint-disable-line */
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
  margin-bottom: 10px;
  line-height: 1.5;
  font-size: 13px !important;
  min-height: 42px;
  color: var(--text-muted);
}

.exhibition-text--empty {
  font-style: italic;
  color: var(--text-faint);
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 14px;
  font-size: 12px;
  color: var(--text-faint);
}

.exhibition-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border-soft);
  padding-top: 12px;
}

.copy-link-btn {
  border: 1px solid var(--accent) !important;
  color: var(--accent) !important;
  background: transparent !important;
  border-radius: 20px !important;
  padding: 4px 12px !important;
  height: auto !important;
  font-size: 12px !important;
}

.copy-link-btn:hover {
  background-color: var(--accent) !important;
  color: #fff !important;
  border-color: var(--accent-strong) !important;
}

.delete-btn {
  color: #b43c3c !important;
}

.delete-btn:hover {
  color: #fff !important;
  background-color: #b43c3c !important;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.create-btn {
  background-color: var(--accent) !important;
  border-color: var(--accent) !important;
  border-radius: 20px !important;
  font-weight: 500;
}

.create-btn:hover {
  background-color: var(--accent-strong) !important;
  border-color: var(--accent-strong) !important;
}

.reset-search-btn {
  border-radius: 20px;
  border-color: var(--border);
  color: var(--text-muted);
  background: transparent;
}

.reset-search-btn:hover {
  border-color: var(--accent) !important;
  color: var(--accent) !important;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 64px 24px;
  background: var(--bg-elevated);
  border: 1px dashed var(--border);
  border-radius: 14px;
  text-align: center;
}

.empty-icon {
  font-size: 36px;
  color: var(--text-faint);
  margin-bottom: 8px;
}

.empty-title {
  margin: 0;
  font-family: 'Cormorant Garamond', serif;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-title);
}

.empty-hint {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--text-faint);
}

@media (max-width: 640px) {
  .exhibition-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions .ant-btn {
    flex: 1;
  }
}
</style>
