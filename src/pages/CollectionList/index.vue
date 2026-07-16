<template>
  <div class="collection-page">
    <div class="collection-header">
      <h3 class="page-title">Мои Ссылки</h3>
      <div class="header-actions">
        <div class="import-wrapper">
          <a-input v-model:value="importLink" placeholder="Ссылка для импорта" class="import-link-input"
            @pressEnter="importCollection" />
          <a-button type="primary" @click="importCollection" class="import-link-btn">
            <ImportOutlined />
          </a-button>
        </div>
        <a-button type="primary" @click="openEditPage">Создать ссылку</a-button>
      </div>
    </div>

    <div class="collection-grid">
      <a-card v-for="collection in collectionList" :key="collection.id" class="collection-card" :title="collection.name"
        hoverable @click="openEditPage(collection)">
        <p class="collection-text">{{ collection.description }}</p>
        <div class="collection-actions">
          <a-button type="default" @click.stop="copyCollectionLink(collection)" class="copy-link-btn">
            <template #icon>
              <CopyOutlined />
            </template>
            Копировать ссылку
          </a-button>
          <a-popconfirm title="Удалить коллекцию?" ok-text="Да" cancel-text="Нет"
            @confirm.stop="deleteСollection(collection.id)">
            <a-button type="link" danger @click.stop>
              <template #icon>
                <DeleteOutlined />
              </template>
              Удалить
            </a-button>
          </a-popconfirm>
        </div>
      </a-card>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { ImportOutlined, CopyOutlined, DeleteOutlined  } from '@ant-design/icons-vue'

// === 1. Загружаем из localStorage при старте ===
const collectionList = ref([]);
const router = useRouter()
const importLink = ref('')

onMounted(() => {
  const saved = localStorage.getItem('collectionList');
  if (saved) collectionList.value = JSON.parse(saved);
});

// Достаём ID коллекции из вставленной ссылки (или принимаем чистый id)
function extractCollectionId(link) {
  const trimmed = link.trim()
  try {
    const url = new URL(trimmed)
    const segments = url.pathname.split('/').filter(Boolean)
    return segments[segments.length - 1] || ''
  } catch {
    // это не полноценный URL — считаем, что вставили сам id
    return trimmed
  }
}

// Импорт коллекции по ссылке — добавляем её карточку в "Мои Ссылки"
const importCollection = () => {
  if (!importLink.value.trim()) {
    message.warning('Пожалуйста, введите ссылку')
    return
  }

  const collectionId = Number(extractCollectionId(importLink.value))
  if (!collectionId) {
    message.error('Не удалось распознать ссылку')
    return
  }

  const stored = JSON.parse(localStorage.getItem('collectionList') || '[]')
  const found = stored.find(c => c.id === collectionId)

  if (!found) {
    message.error('Коллекция по этой ссылке не найдена')
    return
  } else {
    collectionList.value.push(found)
    message.success('Коллекция добавлена в список')
  }

  importLink.value = ''
}

// Функция копирования ссылки на коллекцию
const copyCollectionLink = async (collection) => {
  // Формируем ссылку
  const link = `${window.location.origin}/collection/${collection.id}`

  try {
    await navigator.clipboard.writeText(link)
    message.success('Ссылка на коллекцию скопирована!')
  } catch (err) {
    console.error('Ошибка копирования:', err)
    // fallback
    const textarea = document.createElement('textarea')
    textarea.value = link
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    message.success('Ссылка скопирована!')
  }
}

// === 2. Следим за изменениями и сохраняем ===
watch(collectionList, (newList) => {
  localStorage.setItem('collectionList', JSON.stringify(newList));
}, { deep: true });

const openEditPage = (collection) => {
  if (collection && collection.id) {
    router.push({ name: 'edit-collection', params: { id: collection.id } })
  } else {
    router.push({ name: 'edit-collection', params: { id: 'new' } })
  }
}

function deleteСollection(id) {
  collectionList.value = collectionList.value.filter(b => b.id !== id);
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

.collection-page {
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

.collection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  font-size: 18px;
}

.page-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 28px;
  font-weight: 600;
  color: var(--text-title);
  margin: 0;
}

.collection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.collection-card {
  width: 100%;
  transition: all 0.3s ease;
  cursor: pointer;
  background: var(--bg-elevated) !important;
  border: 1px solid var(--border) !important;
  border-radius: 10px;
}

.collection-card :deep(.ant-card-head) {
  border-bottom: none !important;
   padding-top: 12px !important;
   min-height: auto !important;
   color: var(--text-title);
}

.collection-card :deep(.ant-card-head-title) {
  font-family: 'Cormorant Garamond', serif;
  font-size: 19px;
  font-weight: 600;
}

.collection-card :deep(.ant-card-head-wrapper) {
  padding-bottom: 0 !important;
}

.collection-card:hover {
  transform: translateY(-4px);
  border-color: var(--accent) !important;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.collection-text {
  display: -webkit-box;
  -webkit-line-clamp: 3; /* stylelint-disable-line */
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
  margin-bottom: 12px;
  line-height: 1.5;
  font-size: 13px !important;
  min-height: 63px; /* 3 строки * 1.5 * 14px = 63px */
  color: var(--text-muted);
}

.collection-actions {
  display: flex;
  border-top: 1px solid var(--border-soft);
  padding-top: 24px;
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

.collection-actions .ant-btn-link {
  padding: 0 10px;
  height: auto;
  color: #b43c3c;
}

.collection-actions .ant-btn-link:hover {
  color: #8f2c2c;
}

.header-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.import-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
}

.import-link-input {
  width: 250px;
}

.import-link-input :deep(.ant-input) {
  border-radius: 20px;
  background: var(--bg-elevated);
  border-color: var(--border);
  color: var(--text-body);
}

.import-link-input :deep(.ant-input:hover),
.import-link-input :deep(.ant-input:focus) {
  border-color: var(--accent);
}

.import-link-btn {
  background-color: var(--accent);
  border-color: var(--accent);
  border-radius: 20px;
}

.import-link-btn:hover {
  background-color: var(--accent-strong) !important;
  border-color: var(--accent-strong) !important;
}

.header-actions :deep(.ant-btn-primary:not(.import-link-btn)) {
  background-color: var(--accent);
  border-color: var(--accent);
  border-radius: 20px;
}

.header-actions :deep(.ant-btn-primary:not(.import-link-btn):hover) {
  background-color: var(--accent-strong) !important;
  border-color: var(--accent-strong) !important;
}
</style>
