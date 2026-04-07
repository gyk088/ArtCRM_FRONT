<template>
  <div class="collection-page">
    <div class="collection-header">
      <h3>Мои Ссылки</h3>
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

// Функция импорта
const importCollection = () => {
  if (!importLink.value.trim()) {
    alert('Пожалуйста, введите ссылку')
    return
  }

  // Здесь ваша логика импорта
  console.log('Импорт по ссылке:', importLink.value)

  // Пример: парсинг ссылки и добавление коллекции
  try {
    // Ваш код импорта
    // ...

    // Очистить поле после импорта
    importLink.value = ''
    alert('Коллекция успешно импортирована!')
  } catch (error) {
    console.error('Ошибка импорта:', error)
    alert('Ошибка при импорте коллекции')
  }
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
.collection-page {
  padding: 16px;
  background: #fff;
  border-radius: 12px;
}

.collection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 36px;
  font-size: 18px;
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
}

.collection-card :deep(.ant-card-head) {
  border-bottom: none !important;
   padding-top: 12px !important;
   min-height: auto !important;
}

.collection-card :deep(.ant-card-head-wrapper) {
  padding-bottom: 0 !important;
}

.collection-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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
  color: #666;
}

.collection-actions {
  display: flex;
  border-top: 1px solid #f0f0f0;
  padding-top: 24px;
}

.copy-link-btn {
  border: 1px solid #bdd8f1 !important;
  color: #1164B4 !important;
  border-radius: 12px !important;
  padding: 4px 12px !important;
  height: auto !important;
  font-size: 12px !important;
}

.copy-link-btn:hover {
  background-color: #3288d9 !important;
  color: white !important;
  border-color: #257dcf !important;
}

.collection-actions .ant-btn-link {
  padding: 0 10px;
  height: auto;
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
  border-radius: 8px;
}

.import-link-btn {
  background-color: #52c41a;
  border-color: #52c41a;
}

.import-link-btn:hover {
  background-color: #73d13d;
  border-color: #73d13d;
}
</style>