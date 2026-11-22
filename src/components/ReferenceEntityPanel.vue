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

    <div v-if="hasSoldFlag" class="ref-sold-hint">
      <div class="ref-sold-hint-title"><CheckSquareOutlined /> Статус продажи</div>
      <p>
        Отметьте галочкой в колонке «При продаже» статус, который работа будет получать
        <b>автоматически</b>, как только вы отметите её проданной (кнопка «Отметить как проданную»).
        Например, «Продано».
      </p>
      <ul>
        <li>Галочка может стоять <b>только у одного</b> статуса: отметите другой — с прежнего она снимется сама.</li>
        <li>Если продажу отменить, работе вернётся статус, который был у неё до продажи.</li>
        <li>Нет галочки ни у одного статуса — при продаже статус работы не меняется.</li>
        <li>Уже проданные работы не меняются — правило действует для новых продаж.</li>
      </ul>
      <div class="ref-sold-current">
        Сейчас:
        <b v-if="soldItem">«{{ soldItem.name }}»</b>
        <span v-else>не выбран</span>
      </div>
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

        <template v-else-if="column.dataIndex === 'is_sold'">
          <a-tooltip :title="record.is_sold ? 'Снять: при продаже статус меняться не будет' : 'Ставить этот статус работе при продаже'">
            <a-checkbox
              :checked="!!record.is_sold"
              :disabled="soldSaving"
              @change="handleSoldToggle(record, $event.target.checked)"
            />
          </a-tooltip>
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
          <span v-else>
            {{ record.name }}
            <a-tag v-if="hasSoldFlag && record.is_sold" color="green" class="ref-sold-tag">ставится при продаже</a-tag>
          </span>
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
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckSquareOutlined } from '@ant-design/icons-vue'
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
  // Только для статусов работ — галочка «статус продажи» (ставится работе при продаже)
  hasSoldFlag: { type: Boolean, default: false },
})

const DEFAULT_COLOR = '#8a6d2f'

const columns = computed(() => [
  ...(props.hasColor ? [{ title: 'Цвет', dataIndex: 'color', key: 'color', width: 70 }] : []),
  { title: 'Название', dataIndex: 'name', key: 'name' },
  ...(props.hasSoldFlag ? [{ title: 'При продаже', dataIndex: 'is_sold', key: 'is_sold', width: 110, align: 'center' }] : []),
  { title: 'Действия', dataIndex: 'actions', key: 'actions', width: 120 },
])

const items = computed(() => props.store[props.listField] || [])
const soldItem = computed(() => items.value.find(i => i.is_sold))

// Статус продажи — только один: сервер сам снимает галочку с прежнего,
// поэтому после сохранения перечитываем список
const soldSaving = ref(false)
async function handleSoldToggle(record, checked) {
  soldSaving.value = true
  try {
    const result = await props.store[props.updateAction]({ id: record.id, is_sold: checked })
    if (!result) return
    await props.store[props.loadAction]()
    // сообщение — по тому, что реально сохранилось на сервере
    const saved = !!items.value.find(i => i.id === record.id)?.is_sold
    if (saved !== checked) message.warning('Не удалось сохранить отметку — попробуйте позже')
    else if (checked) message.success(`Теперь при продаже работа будет получать статус «${record.name}»`)
    else message.info('Статус продажи не выбран — при продаже статус работы меняться не будет')
  } finally {
    soldSaving.value = false
  }
}

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

.ref-sold-hint {
  margin-bottom: 16px;
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-body, #2c2a25);
  background: #faf8f3;
  border: 1px solid rgba(138, 109, 47, 0.25);
  border-radius: 10px;
}

.ref-sold-hint-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  font-weight: 600;
  color: var(--accent-strong, #6f581f);
}

.ref-sold-hint p {
  margin: 0 0 6px;
}

.ref-sold-hint ul {
  margin: 0 0 6px;
  padding-left: 18px;
}

.ref-sold-current {
  color: var(--text-faint, #7c7669);
}

.ref-sold-current b {
  color: var(--text-title, #211f1a);
}

.ref-sold-tag {
  margin-left: 6px;
  font-size: 11px;
}

.ref-empty {
  color: var(--text-faint, #7c7669);
  font-size: 13px;
}

@media (max-width: 600px) {
  .ref-toolbar {
    flex-wrap: wrap;
  }

  .ref-input {
    max-width: none;
    flex: 1 1 160px;
  }
}
</style>
