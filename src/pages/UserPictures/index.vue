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
    <a-table class="custom-table" :columns="columns" :data-source="data" row-key="id" :row-selection="rowSelection">
      <template #bodyCell="{ column, record }">
        <!-- Кнопки действий -->
        <template v-if="column.dataIndex === 'actions'">
          <a-button type="text" @click="openEditPage(record)">
            <EditOutlined />
          </a-button>
          <a-button type="text" danger @click="deleteRow(record.id)">
            Удалить
          </a-button>
        </template>

        <!-- Остальные поля -->
        <template v-else>
          {{ record[column.dataIndex] }}
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { EditOutlined } from '@ant-design/icons-vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const data = ref([])
const selectedRowKeys = ref([])

// Колонки таблицы
const columns = [
  { title: 'Название', dataIndex: 'name', key: 'name' },
  { title: 'Адрес', dataIndex: 'address', key: 'address' },
  { title: 'Email', dataIndex: 'email', key: 'email' },
  { title: 'Действия', dataIndex: 'actions', key: 'actions' }
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

<style scoped>
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
.custom-table .tbody > tr:hover > td {
  border: 1px solid #1890ff; /* цвет основной границы таблицы */
  background-color: #f5faff;
}
</style>