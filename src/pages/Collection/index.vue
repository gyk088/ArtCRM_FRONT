<template>
  <div class="edit-page">
    <h2>{{ route.params.id === 'new' ? 'Создать коллекцию' : 'Редактировать коллекцию' }}</h2>

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
  <h3>Добавленные работы</h3>
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
        <template v-else-if="column.dataIndex === 'series'">
          {{ Array.isArray(record.series) ? record.series.join(', ') : record.series }}
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
      @ok="addSelectedWorks"
    >
      <a-table
        :data-source="worksTable"
        :columns="columns"
        row-key="id"
        :row-selection="rowSelection">

         <template #bodyCell="{ column, record }">
        <!-- Колонка аватара -->
        <template v-if="column.dataIndex === 'avatar'">
          <img v-if="record.avatar && record.avatar.url" :src="record.avatar.url" class="preview-img" />
          <div v-else class="img-placeholder">
            <PictureOutlined />
          </div>
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
import { PlusOutlined } from '@ant-design/icons-vue'

const route = useRoute()
const router = useRouter()

const isWorksModalOpen = ref(false)
const worksTable = ref([])

const form = reactive({
  id: route.params.id !== 'new' ? Number(route.params.id) : Date.now(),
  name: '',
  description: '',
  works: []
})

// === Инициализация формы ===
onMounted(() => {
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

  loadWorksFromLocalStorage()

  // Загружаем выбранные работы
  const savedSelectedWorks = JSON.parse(localStorage.getItem('selectedWorks') || '{}')
  if (savedSelectedWorks[form.id]) {
    form.works = [...savedSelectedWorks[form.id]]
    selectedRowKeys.value = [...form.works]
  }
})

function loadWorksFromLocalStorage() {
  worksTable.value = JSON.parse(localStorage.getItem('works') || '[]')
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
  { title: 'Серия', dataIndex: 'series', key: 'series', width: 200 },
  { title: 'Статус', dataIndex: 'status', key: 'status', width: 200 },
  { title: 'Стоимость', dataIndex: 'price', key: 'price', width: 200 },
  { title: "Действия", dataIndex: "actions", key: "actions" }
]

function openWorksModal() {
  loadWorksFromLocalStorage()
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
.edit-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh; /* растягиваем */
  padding: 24px;
  background: #fff;
  border-radius: 8px;
}

.edit-form {
  flex: 1; /* занимает всё пространство */
  padding-top: 20px;
}
.fixed-input {
  width: 500px; /* фиксированная ширина */
  max-width: 100%; /* чтобы не выходила за пределы контейнера */
  border-color: #BDD6F4;
}
.fixed-input:hover {
  border-color: #4f4ec1;
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
  border: 1px solid #eee;
}
.img-placeholder {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  border: 1px dashed #bbb;
  color: #999;
  background: #fafafa;
}
.save-btn {
  background-color: #4f4ec1;
  border-color: #5761b3;
  color: #fff;
  transition: all 0.3s ease;
}
.save-btn:hover {
  border-color: #2e2e9f; /* цвет рамки при наведении */
  background-color: #6c6bff; /* немного светлее фон */
  color: #fff;
}

.add-work-btn-wrapper {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.add-work-btn {
  background: #57be5b !important; /* зелёная */
  border: none;
  color: #fff;
  width: 40px;
  height: 40px;
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-work-btn:hover {
  background: #43a047 !important; 
  color: #fff;
}

.add-work-text {
  font-size: 16px;
  color: #2c2b2b;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.add-more-btn {
  background-color: #4f4ec1;
  border-color: #4f4ec1;
  color: #fff;
}

/* Нижняя панель кнопок */
.buttons-footer {
  display: flex;
  justify-content: flex-start; 
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #eee;
  margin-top: auto; /* прижимает вниз */
  padding-bottom: 8px;
}

/* Стили кнопок */
.save-btn {
  background-color: #4f4ec1;
  border-color: #5761b3;
  color: #fff;
}

.save-btn:hover {
  border-color: #2e2e9f;
  background-color: #6c6bff;
}

.cancel-btn {
  margin-left: 8px;
}
</style>