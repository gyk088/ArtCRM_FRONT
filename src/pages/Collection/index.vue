<template>
  <div class="edit-page">
    <h2 class="page-title">{{ route.params.id === 'new' ? 'Создать коллекцию' : 'Редактировать коллекцию' }}</h2>

    <a-form layout="vertical" class="edit-form">
      <a-form-item label="Название">
        <a-input v-model:value="form.name" class="fixed-input" />
      </a-form-item>

      <a-form-item label="Описание">
        <a-textarea v-model:value="form.description" placeholder="Описание" class="fixed-input description-input" />
      </a-form-item>

    <!-- Таблица выбранных работ под кнопкой -->
<div class="selected-works-table">
    <div class="table-header">
  <h3 class="section-title">Добавленные работы</h3>
<a-button type="primary" @click="openWorksModal" class="add-more-btn">
      Добавить ещё
    </a-button>
  </div>

  <a-table
    :data-source="selectedWorksData"
    :columns="selectedWorksColumns"
    row-key="id"
    size="small"
  >
    <template #bodyCell="{ column, record }">
      <!-- Колонка аватара -->
        <template v-if="column.dataIndex === 'avatar'">
          <img v-if="record.avatar && record.avatar.url" :src="record.avatar.url" class="preview-img" />
          <div v-else class="img-placeholder">
            <PictureOutlined />
          </div>
        </template>
        <template v-else-if="column.dataIndex === 'seria'">
          {{ getSeriaName(record.seria) }}
        </template>
        <template v-else-if="column.dataIndex === 'status'">
          {{ getStatusName(record.status) }}
        </template>
      <template v-else-if="column.dataIndex === 'actions'">
        <a-button type="link" danger @click="removeSelectedWork(record.id)">
          Удалить
        </a-button>
      </template>
    </template>
  </a-table>
</div>
    </a-form>

    <!-- ✅ Модалка с таблицей -->
    <a-modal
      v-model:open="isWorksModalOpen"
      title="Выберите работы"
      width="800px"
      centered
      ok-text="Добавить"
      cancel-text="Отмена"
      class="works-modal"
      :get-container="false"
      @ok="addSelectedWorks"
    >
      <a-table
        :data-source="worksTable"
        :columns="columns"
        row-key="id"
        :loading="worksLoading"
        :row-selection="rowSelection">

         <template #bodyCell="{ column, record }">
        <!-- Колонка аватара -->
        <template v-if="column.dataIndex === 'avatar'">
          <img v-if="record.avatar && record.avatar.url" :src="record.avatar.url" class="preview-img" />
          <div v-else class="img-placeholder">
            <PictureOutlined />
          </div>
        </template>
        <template v-else-if="column.dataIndex === 'status'">
          {{ getStatusName(record.status) }}
        </template>
        <!-- Остальные колонки -->
        <template v-else>
          {{ record[column.dataIndex] }}
        </template>
       </template>
       </a-table>

    </a-modal>

<!-- === FOOTER (кнопки) === -->
    <div class="buttons-footer">
      <a-button
        type="primary"
        @click="saveChanges"
        class="save-btn"
      >
        Сохранить
      </a-button>

      <a-button @click="goBack" class="cancel-btn">Отмена</a-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PictureOutlined } from '@ant-design/icons-vue'
import { useArtWork } from '@/stores/artWork.js'
import { useStatuses } from '@/stores/statuses.js'
import { useSerias } from '@/stores/seria.js'

const route = useRoute()
const router = useRouter()

const artWorkStore = useArtWork()
const statusesStore = useStatuses()
const seriasStore = useSerias()

const isWorksModalOpen = ref(false)
const worksTable = ref([])
const worksLoading = ref(false)

const form = reactive({
  id: route.params.id !== 'new' ? Number(route.params.id) : Date.now(),
  name: '',
  description: '',
  works: []
})

// === Инициализация формы ===
onMounted(async () => {
  const storedCollections = JSON.parse(localStorage.getItem('collectionList') || '[]')

  if (route.params.id && route.params.id !== 'new') {
    const collectionId = Number(route.params.id)
    const collection = storedCollections.find(c => c.id === collectionId)
    if (collection) {
      Object.assign(form, collection)
    }
  } else {
    // Для новой коллекции сразу создаём id
    form.id = Date.now()
  }

  await Promise.all([
    loadWorks(),
    statusesStore.getListStatuses(),
    seriasStore.getListSerias()
  ])

  // Загружаем выбранные работы
  const savedSelectedWorks = JSON.parse(localStorage.getItem('selectedWorks') || '{}')
  if (savedSelectedWorks[form.id]) {
    form.works = [...savedSelectedWorks[form.id]]
    selectedRowKeys.value = [...form.works]
  }
})

async function loadWorks() {
  worksLoading.value = true
  try {
    await artWorkStore.getListArtWorks()
    worksTable.value = artWorkStore.listArtWorks
  } finally {
    worksLoading.value = false
  }
}

function getStatusName(statusId) {
  if (!statusId) return ''
  const status = statusesStore.listStatuses.find(s => s.id === statusId)
  return status ? status.name : statusId
}

function getSeriaName(seriaId) {
  if (!seriaId) return ''
  const seria = seriasStore.listSerias.find(s => s.id === seriaId)
  return seria ? seria.name : seriaId
}

// колонки для модалки
const columns = [
  { title: 'Картина', dataIndex: 'avatar', key: 'avatar' },
  { title: 'Название', dataIndex: 'name', key: 'name' },
  { title: 'Статус', dataIndex: 'status', key: 'status', width: 120 },
  { title: 'Стоимость', dataIndex: 'price', key: 'price', width: 100 },
]

// выбранные работы
const selectedWorksColumns = [
  { title: 'Картина', dataIndex: 'avatar', key: 'avatar', width: 100 },
  { title: "Название", dataIndex: "name", key: "name", width: 300 },
  { title: 'Серия', dataIndex: 'seria', key: 'seria', width: 200 },
  { title: 'Статус', dataIndex: 'status', key: 'status', width: 200 },
  { title: 'Стоимость', dataIndex: 'price', key: 'price', width: 200 },
  { title: "Действия", dataIndex: "actions", key: "actions" }
]

function openWorksModal() {
  loadWorks()
  selectedRowKeys.value = [...form.works];
  isWorksModalOpen.value = true
}

// выбранные ID в модалке
const selectedRowKeys = ref([])

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  }
}))

const selectedWorksData = computed(() => {
  return worksTable.value.filter(work => form.works.includes(work.id))
})

function removeSelectedWork(id) {
  form.works = form.works.filter(w => w !== id)
  saveSelectedWorksToStorage()
}

const addSelectedWorks = () => {
  form.works = [...selectedRowKeys.value]
  saveSelectedWorksToStorage()
  isWorksModalOpen.value = false
}

// сохраняем выбранные работы
function saveSelectedWorksToStorage() {
  const allSelected = JSON.parse(localStorage.getItem('selectedWorks') || '{}')
  allSelected[form.id] = [...form.works]
  localStorage.setItem('selectedWorks', JSON.stringify(allSelected))
}

// сохраняем коллекцию
const saveChanges = () => {
  const storedCollections = JSON.parse(localStorage.getItem('collectionList') || '[]')

  const index = storedCollections.findIndex(c => c.id === form.id)
  if (index !== -1) {
    storedCollections[index] = { ...form }
  } else {
    storedCollections.push({ ...form })
  }

  localStorage.setItem('collectionList', JSON.stringify(storedCollections))
  saveSelectedWorksToStorage()
  router.push('/home/collection')
}

function goBack() {
  router.push('/home/collection')
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

.edit-page {
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

  display: flex;
  flex-direction: column;
  min-height: 100vh; /* растягиваем */
  padding: 24px;
  background: var(--bg);
  color: var(--text-body);
  border-radius: 8px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.page-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 26px;
  font-weight: 600;
  color: var(--text-title);
  margin: 0 0 8px;
}

.section-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-title);
  margin: 0;
}

.edit-form {
  flex: 1; /* занимает всё пространство */
  padding-top: 20px;
}

:deep(.ant-form-item-label > label) {
  color: var(--text-muted);
}

.fixed-input {
  width: 500px; /* фиксированная ширина */
  max-width: 100%; /* чтобы не выходила за пределы контейнера */
  border-color: var(--border);
  background: var(--bg-elevated);
}
.fixed-input:hover {
  border-color: var(--accent);
}
.description-input {
  height: 100px;
  padding-top: 4px;
}

.preview-img {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--border);
}
.img-placeholder {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  border: 1px dashed var(--border);
  color: var(--text-faint);
  background: var(--card-bg);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.add-more-btn {
  background-color: var(--accent);
  border-color: var(--accent);
  color: #fff;
  border-radius: 20px;
}

.add-more-btn:hover {
  background-color: var(--accent-strong) !important;
  border-color: var(--accent-strong) !important;
}

/* === Таблица выбранных работ === */
.selected-works-table :deep(.ant-table) {
  background: transparent;
  color: var(--text-body);
}

.selected-works-table :deep(.ant-table-thead > tr > th) {
  background: var(--card-bg) !important;
  color: var(--accent) !important;
  font-family: 'Cormorant Garamond', serif;
  font-size: 14px;
  font-weight: 600;
  border-bottom: 1px solid var(--border) !important;
}

.selected-works-table :deep(.ant-table-thead > tr > th)::before {
  display: none;
}

.selected-works-table :deep(.ant-table-tbody > tr > td) {
  background: transparent;
  color: var(--text-body);
  border-bottom: 1px solid var(--border-soft) !important;
}

.selected-works-table :deep(.ant-table-tbody > tr:hover > td) {
  background: rgba(138, 109, 47, 0.06) !important;
}

.selected-works-table :deep(.ant-empty-description) {
  color: var(--text-faint);
}

/* Нижняя панель кнопок */
.buttons-footer {
  display: flex;
  justify-content: flex-start;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border-soft);
  margin-top: auto; /* прижимает вниз */
  padding-bottom: 8px;
}

/* Стили кнопок */
.save-btn {
  background-color: var(--accent);
  border-color: var(--accent);
  color: #fff;
  transition: all 0.3s ease;
}

.save-btn:hover {
  border-color: var(--accent-strong);
  background-color: var(--accent-strong);
  color: #fff;
}

.cancel-btn {
  margin-left: 8px;
  border-color: var(--accent);
  color: var(--accent);
  background: transparent;
}

.cancel-btn:hover {
  background-color: var(--accent) !important;
  border-color: var(--accent) !important;
  color: #fff !important;
}

/* === Модалка выбора работ === */
.works-modal :deep(.ant-modal-content) {
  background: var(--bg-elevated);
  border-radius: 14px;
}

.works-modal :deep(.ant-modal-header) {
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-soft);
}

.works-modal :deep(.ant-modal-title) {
  font-family: 'Cormorant Garamond', serif;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-title);
}

.works-modal :deep(.ant-table-thead > tr > th) {
  background: var(--card-bg) !important;
  color: var(--accent) !important;
  font-family: 'Cormorant Garamond', serif;
  font-weight: 600;
  border-bottom: 1px solid var(--border) !important;
}

.works-modal :deep(.ant-table-thead > tr > th)::before {
  display: none;
}

.works-modal :deep(.ant-table-tbody > tr > td) {
  border-bottom: 1px solid var(--border-soft) !important;
}

.works-modal :deep(.ant-table-tbody > tr:hover > td) {
  background: rgba(138, 109, 47, 0.06) !important;
}

.works-modal :deep(.ant-btn-primary) {
  background-color: var(--accent);
  border-color: var(--accent);
}

.works-modal :deep(.ant-btn-primary:hover) {
  background-color: var(--accent-strong) !important;
  border-color: var(--accent-strong) !important;
}
</style>
