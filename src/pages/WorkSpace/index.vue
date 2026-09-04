<template>
  <div class="workSpace-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">Рабочее пространство</h2>
        <p class="page-subtitle">Заметки, таблицы и ссылки под рукой — держите нужное на виду</p>
      </div>

      <a-tooltip :title="isSplitMode ? 'Вернуться к одной панели' : 'Разделить экран на две панели'">
        <a-button class="split-btn" @click="toggleSplitMode">
          <template #icon>
            <ColumnWidthOutlined v-if="!isSplitMode" />
            <ColumnHeightOutlined v-else />
          </template>
          {{ isSplitMode ? 'Одна панель' : 'Разделить экран' }}
        </a-button>
      </a-tooltip>
    </div>

    <div class="workspace-body" :class="{ split: isSplitMode }">
      <WorkspacePanel
        title="Левая панель"
        :items="leftPanelItems"
        :table-columns="tableColumns"
        @add="showAddMenu('left')"
        @remove="id => removeItem('left', id)"
        @add-table-row="addTableRow"
        @create-link="openEditPage()"
        @open-collection="openEditPage"
        @copy-link="copyCollectionLink"
        @delete-link="deleteCollection"
      />

      <WorkspacePanel
        v-if="isSplitMode"
        title="Правая панель"
        :items="rightPanelItems"
        :table-columns="tableColumns"
        @add="showAddMenu('right')"
        @remove="id => removeItem('right', id)"
        @add-table-row="addTableRow"
        @create-link="openEditPage()"
        @open-collection="openEditPage"
        @copy-link="copyCollectionLink"
        @delete-link="deleteCollection"
      />
    </div>

    <!-- Меню выбора блока -->
    <a-modal
      v-model:open="menuVisible"
      title="Что добавить?"
      :footer="null"
      :closable="true"
      width="380px"
      class="add-menu-modal"
    >
      <div class="menu-options">
        <div class="menu-option" @click="addTextField">
          <FileTextOutlined />
          <span>Текстовое поле</span>
        </div>
        <div class="menu-option" @click="addTable">
          <TableOutlined />
          <span>Табличка</span>
        </div>
        <div class="menu-option" @click="addLinks">
          <LinkOutlined />
          <span>Мои ссылки</span>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  ColumnWidthOutlined,
  ColumnHeightOutlined,
  FileTextOutlined,
  TableOutlined,
  LinkOutlined
} from '@ant-design/icons-vue'
import WorkspacePanel from './WorkspacePanel.vue'

const router = useRouter()
const isSplitMode = ref(false)
const menuVisible = ref(false)
const activePanel = ref(null)

// Данные для панелей
const leftPanelItems = ref([])
const rightPanelItems = ref([])
const globalCollectionList = ref([])

let nextId = 1

onMounted(() => {
  loadCollections()
})

// Колонки для таблицы
const tableColumns = [
  { title: 'Название', dataIndex: 'name', key: 'name' },
  { title: 'Значение', dataIndex: 'value', key: 'value' }
]

// Загрузка коллекций из localStorage
const loadCollections = () => {
  const saved = localStorage.getItem('collectionList')
  if (saved) {
    globalCollectionList.value = JSON.parse(saved)
  }
}

// Сохранение коллекций в localStorage
const saveCollections = () => {
  localStorage.setItem('collectionList', JSON.stringify(globalCollectionList.value))
}

// Обновление всех блоков "Мои ссылки" актуальными коллекциями
const updateAllLinksBlocks = () => {
  leftPanelItems.value.forEach(item => {
    if (item.type === 'links') {
      item.collections = [...globalCollectionList.value]
    }
  })

  rightPanelItems.value.forEach(item => {
    if (item.type === 'links') {
      item.collections = [...globalCollectionList.value]
    }
  })
}

const toggleSplitMode = () => {
  isSplitMode.value = !isSplitMode.value
}

const showAddMenu = (panel) => {
  activePanel.value = panel
  menuVisible.value = true
}

const removeItem = (panel, id) => {
  if (panel === 'left') {
    leftPanelItems.value = leftPanelItems.value.filter(item => item.id !== id)
  } else {
    rightPanelItems.value = rightPanelItems.value.filter(item => item.id !== id)
  }
}

// Функции для таблицы
const addTableRow = (item) => {
  item.data.push({
    key: Date.now(),
    name: '',
    value: ''
  })
}

// Функции для ссылок
const addLinks = () => {
  const newItem = {
    id: nextId++,
    type: 'links',
    collections: [...globalCollectionList.value]
  }

  if (activePanel.value === 'left') {
    leftPanelItems.value.push(newItem)
  } else {
    rightPanelItems.value.push(newItem)
  }

  menuVisible.value = false
}

// Копирование ссылки на коллекцию
const copyCollectionLink = async (collection) => {
  const link = `${window.location.origin}/collection/${collection.id}`

  try {
    await navigator.clipboard.writeText(link)
    message.success('Ссылка на коллекцию скопирована!')
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

// Удаление коллекции из блока и из глобального списка
const deleteCollection = (item, collectionId) => {
  globalCollectionList.value = globalCollectionList.value.filter(c => c.id !== collectionId)
  saveCollections()
  updateAllLinksBlocks()
  message.success('Коллекция удалена')
}

// Открытие страницы редактирования коллекции
const openEditPage = (collection = null) => {
  if (collection && collection.id) {
    router.push(`/collections/edit/${collection.id}`)
  } else {
    router.push('/collections/new')
  }
}

// Добавление элементов
const addTextField = () => {
  const newItem = {
    id: nextId++,
    type: 'text',
    placeholder: 'Введите текст...',
    value: ''
  }

  if (activePanel.value === 'left') {
    leftPanelItems.value.push(newItem)
  } else {
    rightPanelItems.value.push(newItem)
  }

  menuVisible.value = false
}

const addTable = () => {
  const newItem = {
    id: nextId++,
    type: 'table',
    data: []
  }

  if (activePanel.value === 'left') {
    leftPanelItems.value.push(newItem)
  } else {
    rightPanelItems.value.push(newItem)
  }

  menuVisible.value = false
}
</script>

<style scoped>

.workSpace-page {
  --bg: #f7f5f0;
  --bg-elevated: #ffffff;
  --card-bg: #efece4;
  --text-title: #211f1a;
  --text-body: #2c2a25;
  --text-muted: #5a564c;
  --text-faint: #7c7669;
  --text-dim: #a29c8c;
  --accent: #8a6d2f;
  --accent-strong: #6f581f;
  --accent-tint: rgba(138, 109, 47, 0.1);
  --border: rgba(0, 0, 0, 0.08);
  --border-soft: rgba(0, 0, 0, 0.07);
  --danger: #b43c3c;
  --danger-tint: rgba(180, 60, 60, 0.1);

  height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text-body);
  border-radius: 14px;
  padding: 20px 24px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  box-sizing: border-box;
}

.page-header {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.page-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 26px;
  font-weight: 600;
  color: var(--text-title);
  margin: 0 0 4px;
}

.page-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--text-faint);
}

.split-btn {
  flex-shrink: 0;
  border-color: var(--accent);
  color: var(--accent);
  background: transparent;
}

.split-btn:hover {
  background-color: var(--accent) !important;
  border-color: var(--accent) !important;
  color: #fff !important;
}

.workspace-body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 16px;
}

.workspace-body:not(.split) > :deep(.ws-panel) {
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}

/* Переопределение акцентных цветов Ant Design под тёплую палитру проекта */
.workSpace-page :deep(.ant-btn-primary) {
  background: var(--accent);
  border-color: var(--accent);
}

.workSpace-page :deep(.ant-btn-primary:not(:disabled):hover) {
  background: var(--accent-strong) !important;
  border-color: var(--accent-strong) !important;
}

/* Меню выбора блока */
.menu-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.menu-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--card-bg);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-body);
}

.menu-option:hover {
  background: var(--accent-tint);
  transform: translateX(4px);
}

.menu-option .anticon {
  font-size: 18px;
  color: var(--accent);
}

.menu-option span {
  font-size: 14px;
  font-weight: 500;
  font-family: 'Cormorant Garamond', serif;
}

.add-menu-modal :deep(.ant-modal-content) {
  border-radius: 12px;
}
</style>
