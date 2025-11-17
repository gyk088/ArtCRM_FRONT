<template>
  <div>
    <div class="header-content">
      <h3>Мои работы</h3>
      <!-- Кнопка появляется только если есть выбранные строки -->
       <div class="header-buttons">
      <a-button class="buttons" type="primary" v-if="selectedRowKeys.length > 0" @click="createCollection">
        Создать коллекцию
      </a-button>
      <a-button class="buttons" type="primary" @click="openEditPage()">Добавить</a-button>
      </div>
    </div>

    <!-- Таблица -->
    <a-table
  class="custom-table"
  :columns="columns"
  :data-source="data"
  row-key="id"
  :row-selection="rowSelection"
>
  <template #bodyCell="{ column, record }">
    <!-- Колонка аватара -->
    <template v-if="column.dataIndex === 'avatar'">
      <img
        v-if="record.avatar && record.avatar.url"
        :src="record.avatar.url"
        class="preview-img"
      />
      <div v-else class="img-placeholder">
        <PictureOutlined />
      </div>
    </template>
    <template v-else-if="column.dataIndex === 'series'">
    {{ Array.isArray(record.series) ? record.series.join(', ') : record.series }}
  </template>

    <!-- Колонка действий -->
    <template v-else-if="column.dataIndex === 'actions'">
      <a-button type="text" @click="openEditPage(record)">
        <EditOutlined />
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
import { ref, onMounted } from 'vue'
import { EditOutlined, PictureOutlined } from '@ant-design/icons-vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const data = ref([])
const selectedRowKeys = ref([])

// Колонки таблицы
const columns = [
  { title: 'Изображение', dataIndex: 'avatar', key: 'avatar', width: 90 },
  { title: 'Название', dataIndex: 'name', key: 'name' },
  { title: 'Техника', dataIndex: 'technique', key: 'technique', width: 140  },
  { title: 'Год', dataIndex: 'year', key: 'year', width: 90  },
  { title: 'Описание', dataIndex: 'description', key: 'description', className: 'desc-col'},
  { title: 'Локация', dataIndex: 'address', key: 'address', width: 140 },
  { title: 'Серия', dataIndex: 'series', key: 'series', width: 120 },
  { title: 'Стоимость', dataIndex: 'price', key: 'price', width: 100 },
  { title: 'Действия', dataIndex: 'actions', key: 'actions', width: 100 },
]

// Загрузка данных из localStorage при старте
onMounted(() => {
  const saved = localStorage.getItem('works')
  if (saved) {
    data.value = JSON.parse(saved)
  }
})

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
  data.value = data.value.filter(item => item.id !== id)
  localStorage.setItem('works', JSON.stringify(data.value))
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
  justify-content: space-between;
  align-items: end;
  margin-bottom: 16px;
  font-size: 18px;
}
.header-buttons {
  display: flex;
  gap: 8px;
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
.buttons {
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