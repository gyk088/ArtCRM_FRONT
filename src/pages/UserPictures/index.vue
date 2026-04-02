<template>
  <div>
    <div class="header-content">
      <h3>Мои работы</h3>
    </div>

    <div class="filters-panel">
      <div class="filters-left">
        <a-select v-model:value="filterAddress" placeholder="Локация" allowClear style="width: 200px"
          :options="addressOptions" />
        <a-select v-model:value="filterSeries" placeholder="Серия" allowClear style="width: 200px"
          :options="seriesOptions" />
        <a-select v-model:value="filterStatus" placeholder="Статус" allowClear style="width: 200px" :options="[
          { text: 'Доступно', value: 'Доступно' },
          { text: 'Частная коллекция', value: 'Частная коллекция' },
          { text: 'Резерв', value: 'Резерв' }]" />
        </div>

        <div class="filters-right">
        <!-- Кнопка появляется только если есть выбранные строки -->
        <a-button class="buttons" type="primary" v-if="selectedRowKeys.length > 0" @click="createCollection">
          Создать коллекцию
        </a-button>
        <a-button class="buttons" type="primary" @click="openEditPage()">Добавить</a-button>
        </div>
    </div>

    <!-- Таблица -->
    <a-table class="custom-table" :columns="columns" :data-source="filteredData" row-key="id" :row-selection="rowSelection">
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

        <!-- Колонка действий -->
        <template v-else-if="column.dataIndex === 'actions'">
          <a-button type="text" class="edit-btn" @click="openEditPage(record)">
            Редактировать
          </a-button>
          <a-button type="text" danger @click="deleteRow(record.id)">
            Удалить
          </a-button>
        </template>

        <!-- Остальные колонки -->
        <template v-else>
          {{ record[column.dataIndex] }}
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { PictureOutlined } from '@ant-design/icons-vue'
import { Modal } from 'ant-design-vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const data = ref([])
const selectedRowKeys = ref([])
const filterAddress = ref(null)
const filterSeries = ref(null)
const filterStatus = ref(null)

// Загрузка данных из localStorage при старте
onMounted(() => {
  const saved = localStorage.getItem('works')
  if (saved) {
    data.value = JSON.parse(saved)
  }
})

// Уникальные локации из данных
const addressOptions = computed(() => {
  const set = new Set()
  data.value.forEach(item => item.address && set.add(item.address))
  return [...set].map(a => ({ label: a, value: a }))
})

// Уникальные серии 
const seriesOptions = computed(() => {
  const set = new Set()
  data.value.forEach(item => {
    if (item.series) {
      item.series
        .filter(Boolean)
        .forEach(s => set.add(s))
    }
  })
  return [...set].map(s => ({ label: s, value: s }))
})

// Фильтруем данные перед показом в таблице
const filteredData = computed(() => {
  return data.value.filter(item => {
    if (filterAddress.value && item.address !== filterAddress.value)
      return false

    if (filterStatus.value && item.status !== filterStatus.value)
      return false

    if (filterSeries.value) {
      const seriesList = item.series
        ? item.series.map(s => s.trim()) : []
      if (!seriesList.includes(filterSeries.value))
        return false
    }
    return true
  })
})

// Колонки таблицы
const columns = computed(() => [
  { title: 'Картина', dataIndex: 'avatar', key: 'avatar', width: 90 },
  { title: 'Название', dataIndex: 'name', key: 'name' },
  { title: 'Техника', dataIndex: 'technique', key: 'technique', width: 140  },
  { title: 'Год', dataIndex: 'year', key: 'year', width: 90, sorter: (a, b) => a.year - b.year },
  { title: 'Описание', dataIndex: 'description', key: 'description', className: 'desc-col'},
  { title: 'Локация', dataIndex: 'address', key: 'address', width: 150 },
  { title: 'Серия', dataIndex: 'series', key: 'series', width: 120 },
  { title: 'Статус', dataIndex: 'status', key: 'status', width: 120 },
  { title: 'Стоимость', dataIndex: 'price', key: 'price', width: 100, sorter: (a, b) => a.price - b.price },
  { title: 'Действия', dataIndex: 'actions', key: 'actions', width: 100 },
])

// Открытие страницы редактирования или добавления
const openEditPage = (record) => {
  if (record && record.id) {
    router.push({ name: 'edit-work', params: { id: record.id } })
  } else {
    router.push({ name: 'edit-work', params: { id: 'new' } })
  }
}

// Удаление записи
const deleteRow = (id) => {
  Modal.confirm({
    title: 'Удалить запись?',
    content: 'Вы уверены, что хотите удалить эту работу?',
    okText: 'Удалить',
    okType: 'danger',
    cancelText: 'Отмена',
    onOk() {
      data.value = data.value.filter(item => item.id !== id)
      localStorage.setItem('works', JSON.stringify(data.value))
    }
  })
}

// выбранные строки
const rowSelection = {
  onChange: (selectedKeys) => {
    selectedRowKeys.value = selectedKeys
    console.log('Выбранные строки:', selectedKeys)
  },
}

const createCollection = () => {
  const selectedItems = data.value.filter(item =>
    selectedRowKeys.value.includes(item.id)
  )
  console.log('Создаем коллекцию из выбранных работ:', selectedItems)

  // Здесь можно вызвать модалку или переход на страницу коллекции
}
</script>

<style>
.header-content {
  display: flex;
  margin-bottom: 8px;
  font-size: 20px;
}

.filters-panel {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
}
.filters-panel .ant-space {
  gap: 12px !important; /* расстояние между select */
}
.filters-panel .ant-select {
  background: white;
}

.edit-btn {
  color: #1E90FF !important;
}
.edit-btn:hover {
  color: #4096ff !important;
}
/* фиксированная высота строки и минимальные паддинги */
.ant-table-tbody > tr > td {
  height: 60px !important;
  padding: 4px 8px !important;
  vertical-align: middle !important;
}
.desc-col {
  max-width: 200px;
  white-space: nowrap;     
  overflow: hidden;         
  text-overflow: ellipsis;   
}
.preview-img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #eee;
}
.img-placeholder {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  border: 1px dashed #bbb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #999;
  background: #fafafa;
}
.filters-panel {
  display: flex;
  justify-content: space-between; /* разделяем левую и правую части */
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap; /* чтобы красиво переносилось на маленьких экранах */
  gap: 12px;
}

.filters-left {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filters-right {
  display: flex;
  gap: 12px;
}
.buttons {
  width: 170px;
  background-color: #4f4ec1;
  border-color: #5761b3;
  color: #fff;
  transition: all 0.3s ease;
}
.buttons:hover {
  border-color: #2e2e9f; /* цвет рамки при наведении */
  background-color: #6c6bff; /* немного светлее фон */
  color: #fff;
}
</style>