<template>
  <div class="ref-panel">
    <div class="ref-toolbar">
      <input
        v-if="hasColor"
        v-model="newColor"
        type="color"
        class="ref-color-input"
        title="Цвет"
      />
      <a-input
        v-model:value="newName"
        :placeholder="`Название — новая(ый) ${singularLabel}`"
        class="ref-input"
        @keyup.enter="handleCreate"
      />
      <a-button type="primary" :loading="creating" @click="handleCreate">
        <template #icon><PlusOutlined /></template>
        Добавить
      </a-button>
    </div>

    <a-table :data-source="items" :columns="columns" :loading="store.loading" row-key="id" size="middle">
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'color'">
          <input
            type="color"
            class="ref-color-input"
            :value="record.color || DEFAULT_COLOR"
            title="Изменить цвет"
            @change="handleColorChange(record, $event.target.value)"
          />
        </template>

        <template v-else-if="column.dataIndex === 'name'">
          <a-input
            v-if="editingId === record.id"
            ref="editInputRef"
            v-model:value="editingName"
            size="small"
            class="ref-edit-input"
            @keyup.enter="handleSaveEdit(record)"
            @keyup.esc="cancelEdit"
            @blur="handleSaveEdit(record)"
          />
          <span v-else>{{ record.name }}</span>
        </template>

        <template v-else-if="column.dataIndex === 'actions'">
          <a-tooltip title="Переименовать">
            <a-button type="text" size="small" @click="startEdit(record)">
              <EditOutlined />
            </a-button>
          </a-tooltip>
          <a-popconfirm
            :title="`Удалить «${record.name}»?`"
            ok-text="Удалить"
            cancel-text="Отмена"
            @confirm="handleDelete(record)"
          >
            <a-tooltip title="Удалить">
              <a-button type="text" danger size="small">
                <DeleteOutlined />
              </a-button>
            </a-tooltip>
          </a-popconfirm>
        </template>
      </template>

      <template #emptyText>
        <span class="ref-empty">Пока пусто — добавьте {{ singularLabel }} выше</span>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { getUser } from '@/services/auth.js'

const props = defineProps({
  store: { type: Object, required: true },
  listField: { type: String, required: true },
  loadAction: { type: String, required: true },
  createAction: { type: String, required: true },
  updateAction: { type: String, required: true },
  deleteAction: { type: String, required: true },
  // Название сущности в родительном падеже для плейсхолдера/пустого состояния,
  // например "художника", "серию", "медиа"
  singularLabel: { type: String, required: true },
  // Только для статусов — показывает колонку/пикер цвета
  hasColor: { type: Boolean, default: false },
})

const DEFAULT_COLOR = '#8a6d2f'

const columns = computed(() => [
  ...(props.hasColor ? [{ title: 'Цвет', dataIndex: 'color', key: 'color', width: 70 }] : []),
  { title: 'Название', dataIndex: 'name', key: 'name' },
  { title: 'Действия', dataIndex: 'actions', key: 'actions', width: 120 },
])

const items = computed(() => props.store[props.listField] || [])

onMounted(() => {
  props.store[props.loadAction]()
})

const newName = ref('')
const newColor = ref(DEFAULT_COLOR)
const creating = ref(false)

async function handleCreate() {
  const name = newName.value.trim()
  if (!name) {
    message.warning('Введите название')
    return
  }

  creating.value = true
  try {
    const payload = { user_id: getUser()?.id, name }
    if (props.hasColor) payload.color = newColor.value

    const result = await props.store[props.createAction](payload)
    if (result) {
      newName.value = ''
      newColor.value = DEFAULT_COLOR
    }
  } finally {
    creating.value = false
  }
}

async function handleColorChange(record, color) {
  await props.store[props.updateAction]({ id: record.id, color })
}

const editingId = ref(null)
const editingName = ref('')
const editInputRef = ref(null)

function startEdit(record) {
  editingId.value = record.id
  editingName.value = record.name
  nextTick(() => editInputRef.value?.focus?.())
}

function cancelEdit() {
  editingId.value = null
  editingName.value = ''
}

async function handleSaveEdit(record) {
  if (editingId.value !== record.id) return

  const name = editingName.value.trim()
  if (!name || name === record.name) {
    cancelEdit()
    return
  }

  await props.store[props.updateAction]({ id: record.id, name })
  cancelEdit()
}

async function handleDelete(record) {
  await props.store[props.deleteAction](record.id)
}
</script>

<style scoped>
.ref-toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.ref-input {
  max-width: 320px;
}

.ref-edit-input {
  max-width: 280px;
}

.ref-color-input {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--border, rgba(0, 0, 0, 0.1));
  border-radius: 6px;
  cursor: pointer;
  background: none;
}

.ref-color-input::-webkit-color-swatch-wrapper {
  padding: 2px;
}

.ref-color-input::-webkit-color-swatch {
  border: none;
  border-radius: 4px;
}

.ref-empty {
  color: var(--text-faint, #7c7669);
  font-size: 13px;
}
</style>
