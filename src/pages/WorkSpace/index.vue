<template>
  <div class="workSpace-page">
    <div class="workSpace-header">
      <h3>Мое Рабочее пространство</h3>
      <a-button @click="toggleSplitMode" class="split-btn">
        <template #icon>
          <ColumnWidthOutlined v-if="!isSplitMode" />
          <ColumnHeightOutlined v-else />
        </template>
      </a-button>
    </div>

    <!-- Обычный режим (левая панель на весь экран) -->
    <div v-if="!isSplitMode" class="single-panel">
      <div class="panel-header">
        <span>Левая панель</span>
        <a-button type="text" class="add-btn" @click="showAddMenu('left')">
          <PlusOutlined />
        </a-button>
      </div>
      <div class="panel-content">
        <div v-for="item in leftPanelItems" :key="item.id" class="added-item">
          <div class="item-header">
            <!-- Рендерим компонент в зависимости от типа -->
            <div v-if="item.type === 'text'">
              <a-textarea 
                v-model:value="item.value"
                :placeholder="item.placeholder || 'Введите текст...'"
                :auto-size="{ minRows: 3, maxRows: 10 }"
                style="width: 100%"
              />
            </div>
            <div v-else-if="item.type === 'table'">
              <div class="table-component">
                <a-table 
                  :columns="tableColumns" 
                  :data-source="item.data" 
                  :pagination="false"
                  size="small"
                />
                <a-button type="dashed" block @click="addTableRow(item)" class="add-row-btn">
                  <PlusOutlined /> Добавить строку
                </a-button>
              </div>
            </div>
             <!-- Мои ссылки (коллекции) -->
              <div v-else-if="item.type === 'links'" class="links-collections">
                <div class="collections-header">
                  <span>Мои коллекции</span>
                  <a-button type="primary" size="small" @click="openEditPage">
                    <PlusOutlined /> Создать коллекцию
                  </a-button>
                </div>
                
                <div class="collection-grid" v-if="item.collections && item.collections.length > 0">
                  <a-card v-for="collection in item.collections" :key="collection.id" class="collection-card" :title="collection.name"
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
                        @confirm.stop="deleteCollection(item, collection.id)">
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
                
                <div v-else class="empty-collections">
                  <a-empty description="Нет созданных коллекций">
                    <a-button type="primary" @click="openEditPage">Создать коллекцию</a-button>
                  </a-empty>
                </div>
              </div>
              
              <a-button type="text" danger size="small" @click="removeItem('left', item.id)" class="remove-item-btn">
                <DeleteOutlined />
              </a-button>
            </div>
          </div>
        </div>
      </div>

    <!-- Режим разделенного экрана -->
    <div v-else class="split-container">
      <!-- Левая панель -->
      <div class="split-panel left-panel">
        <div class="panel-header">
          <span>Левая панель</span>
          <a-button type="text" class="add-btn" @click="showAddMenu('left')">
            <PlusOutlined />
          </a-button>
        </div>
        <div class="panel-content">
          <div v-for="item in leftPanelItems" :key="item.id" class="added-item">
            <div class="item-header">
              <div v-if="item.type === 'text'">
                <a-textarea 
                  v-model:value="item.value"
                  :placeholder="item.placeholder || 'Введите текст...'"
                  :auto-size="{ minRows: 3, maxRows: 10 }"
                  style="width: 100%"
                />
              </div>
              <div v-else-if="item.type === 'table'">
                <div class="table-component">
                  <a-table 
                    :columns="tableColumns" 
                    :data-source="item.data" 
                    :pagination="false"
                    size="small"
                  />
                  <a-button type="dashed" block @click="addTableRow(item)" class="add-row-btn">
                    <PlusOutlined /> Добавить строку
                  </a-button>
                </div>
              </div>
              <div v-else-if="item.type === 'links'">
                <div class="links-component">
                  <div v-for="(link, idx) in item.links" :key="idx" class="link-item">
                    <a-input-group compact>
                      <a-input 
                        v-model:value="link.title" 
                        placeholder="Название" 
                        style="width: 30%"
                      />
                      <a-input 
                        v-model:value="link.url" 
                        placeholder="Ссылка" 
                        style="width: 60%"
                      />
                      <a-button danger @click="removeLink(item, idx)" style="width: 10%">
                        <DeleteOutlined />
                      </a-button>
                    </a-input-group>
                  </div>
                  <a-button type="dashed" block @click="addLink(item)" class="add-link-btn">
                    <PlusOutlined /> Добавить ссылку
                  </a-button>
                </div>
              </div>
              
              <a-button type="text" danger size="small" @click="removeItem('left', item.id)" class="remove-item-btn">
                <DeleteOutlined />
              </a-button>
            </div>
          </div>
        </div>
      </div>

      <!-- Правая панель -->
      <div class="split-panel right-panel">
        <div class="panel-header">
          <span>Правая панель</span>
          <a-button type="text" class="add-btn" @click="showAddMenu('right')">
            <PlusOutlined />
          </a-button>
        </div>
        <div class="panel-content">
          <div v-for="item in rightPanelItems" :key="item.id" class="added-item">
            <div class="item-header">
              <div v-if="item.type === 'text'">
                <a-textarea 
                  v-model:value="item.value"
                  :placeholder="item.placeholder || 'Введите текст...'"
                  :auto-size="{ minRows: 3, maxRows: 10 }"
                  style="width: 100%"
                />
              </div>
              <div v-else-if="item.type === 'table'">
                <div class="table-component">
                  <a-table 
                    :columns="tableColumns" 
                    :data-source="item.data" 
                    :pagination="false"
                    size="small"
                  />
                  <a-button type="dashed" block @click="addTableRow(item)" class="add-row-btn">
                    <PlusOutlined /> Добавить строку
                  </a-button>
                </div>
              </div>
              <div v-else-if="item.type === 'links'">
                <div class="links-component">
                  <div v-for="(link, idx) in item.links" :key="idx" class="link-item">
                    <a-input-group compact>
                      <a-input 
                        v-model:value="link.title" 
                        placeholder="Название" 
                        style="width: 30%"
                      />
                      <a-input 
                        v-model:value="link.url" 
                        placeholder="Ссылка" 
                        style="width: 60%"
                      />
                      <a-button danger @click="removeLink(item, idx)" style="width: 10%">
                        <DeleteOutlined />
                      </a-button>
                    </a-input-group>
                  </div>
                  <a-button type="dashed" block @click="addLink(item)" class="add-link-btn">
                    <PlusOutlined /> Добавить ссылку
                  </a-button>
                </div>
              </div>
              
              <a-button type="text" danger size="small" @click="removeItem('right', item.id)" class="remove-item-btn">
                <DeleteOutlined />
              </a-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Меню выбора -->
    <a-modal 
      v-model:visible="menuVisible" 
      title="Что добавить?" 
      :footer="null"
      :closable="true"
      width="400px"
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
import { ref, onMounted } from 'vue' // Добавлен onMounted
import { useRouter } from 'vue-router' // Добавлен useRouter
import { useMedia } from '@/stores/media.js' 
import { message } from 'ant-design-vue' 
import { 
  ColumnWidthOutlined, 
  ColumnHeightOutlined, 
  PlusOutlined,
  DeleteOutlined,
  FileTextOutlined,
  TableOutlined,
  LinkOutlined,
  CopyOutlined
} from '@ant-design/icons-vue'

const mediaStore = useMedia();
const router = useRouter() 
const isSplitMode = ref(false)
const menuVisible = ref(false)
const activePanel = ref(null)

// Данные для панелей
const leftPanelItems = ref([])
const rightPanelItems = ref([])
const globalCollectionList = ref([])

let nextId = 1

// Загрузка данных при монтировании
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
  // Обновляем в левой панели
  leftPanelItems.value.forEach(item => {
    if (item.type === 'links') {
      item.collections = [...globalCollectionList.value]
    }
  })
  
  // Обновляем в правой панели
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
    collections: [...globalCollectionList.value] // Копируем все коллекции
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
  // Удаляем из глобального списка
  globalCollectionList.value = globalCollectionList.value.filter(c => c.id !== collectionId)
  saveCollections()
  
  // Обновляем все блоки
  updateAllLinksBlocks()
  
  message.success('Коллекция удалена')
}

// Открытие страницы редактирования коллекции
const openEditPage = (collection = null) => {
  if (collection) {
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
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  height: 100%;
}

.workSpace-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.split-btn {
  border: 1px solid #1164B4;
  color: #1164B4;
  background: transparent;
}

.split-btn:hover {
  background-color: #1164B4;
  color: white;
}

/* Одиночная панель */
.single-panel {
  display: flex;
  flex-direction: column;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  height: calc(100vh - 120px);
  overflow: hidden;
}

/* Режим разделенного экрана */
.split-container {
  display: flex;
  gap: 16px;
  height: calc(100vh - 120px);
}

.split-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  font-weight: 500;
}

.add-btn {
  color: #1164B4;
  font-size: 16px;
}

.add-btn:hover {
  color: #1E90FF;
  background-color: #f0f7ff;
}

.panel-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.added-item {
  margin-bottom: 16px;
  padding: 12px;
  background: #fff;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
  position: relative;
}

.item-header {
  position: relative;
}

.remove-item-btn {
  position: absolute;
  top: 5px;
  right: 5px;
  opacity: 0;
  transition: opacity 0.3s;
}

.added-item:hover .remove-item-btn {
  opacity: 1;
}

/* Меню */
.menu-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.menu-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f5f5f5;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.menu-option:hover {
  background: #e6f7ff;
  transform: translateX(4px);
}

.menu-option .anticon {
  font-size: 20px;
  color: #1164B4;
}

.menu-option span {
  font-size: 14px;
  font-weight: 500;
}

/* Стили для текстового поля */
.text-field-wrapper :deep(textarea) {
  border-color: #BDD6F4;
  transition: all 0.3s ease;
}

.text-field-wrapper :deep(textarea):hover {
  border-color: #1E90FF;
}

.text-field-wrapper :deep(textarea):focus {
  border-color: #1E90FF;
  box-shadow: 0 0 0 2px rgba(17, 100, 180, 0.1);
}

/* Стили для таблицы */
.table-component :deep(.ant-table) {
  font-size: 12px;
}

.add-row-btn,
.add-link-btn {
  margin-top: 8px;
}

/* Стили для ссылок */
.link-item {
  margin-bottom: 8px;
}

.collections-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e8e8e8;
}

.collection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  max-height: 500px;
  overflow-y: auto;
  padding: 4px;
}

.collection-card {
  transition: all 0.3s ease;
  cursor: pointer;
}

.collection-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.collection-text {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
  margin-bottom: 12px;
  line-height: 1.5;
  font-size: 13px;
  min-height: 58px;
  color: #666;
}

.collection-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  border-top: 1px solid #f0f0f0;
  padding-top: 8px;
}

.copy-link-btn {
  border: 1px solid #bdd8f1 !important;
  color: #1164B4 !important;
  border-radius: 12px !important;
  padding: 2px 10px !important;
  height: 24px !important;
  font-size: 11px !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
}

.empty-collections {
  padding: 40px 20px;
  text-align: center;
}

.links-collections {
  width: 100%;
}

/* Стили для скролла коллекций */
.collection-grid::-webkit-scrollbar {
  width: 6px;
}

.collection-grid::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 4px;
}

.collection-grid::-webkit-scrollbar-thumb {
  background: #BDD6F4;
  border-radius: 4px;
}

.collection-grid::-webkit-scrollbar-thumb:hover {
  background: #1E90FF;
}
</style>