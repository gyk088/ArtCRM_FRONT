<template>
  <div class="task-status-panel">
    <p class="panel-hint">
      Статусы — это колонки на досках задач, в этом порядке. Статус с отметкой «Закрывает задачу»
      (например, «Готово» или «Отменено») считает задачу завершённой: она не подсвечивается как просроченная.
    </p>

    <div class="add-row">
      <input v-model="newColor" type="color" class="color-input" title="Цвет" />
      <a-input v-model:value="newName" placeholder="Новый статус" :maxlength="100" class="add-name" @press-enter="create" />
      <a-checkbox v-model:checked="newFinal">Закрывает задачу</a-checkbox>
      <a-button type="primary" :loading="creating" @click="create"><PlusOutlined /> Добавить</a-button>
    </div>

    <a-spin :spinning="loading">
      <div class="status-list">
        <div v-for="(s, index) in tasksStore.statuses" :key="s.id" class="status-row">
          <div class="order-btns">
            <button type="button" :disabled="index === 0" title="Выше" @click="move(index, -1)"><ArrowUpOutlined /></button>
            <button type="button" :disabled="index === tasksStore.statuses.length - 1" title="Ниже" @click="move(index, 1)"><ArrowDownOutlined /></button>
          </div>
          <input
            type="color"
            class="color-input"
            :value="s.color || '#c9c3b6'"
            title="Цвет"
            @change="(e) => tasksStore.updateStatus(s.id, { color: e.target.value })"
          />
          <a-input
            :value="s.name"
            :maxlength="100"
            class="status-name"
            @change="(e) => (drafts[s.id] = e.target.value)"
            @blur="saveName(s)"
            @press-enter="(e) => e.target.blur()"
          />
          <a-checkbox :checked="s.is_final" @change="(e) => tasksStore.updateStatus(s.id, { is_final: e.target.checked })">
            Закрывает задачу
          </a-checkbox>
          <a-popconfirm
            v-if="canDelete(s)"
            :title="`Удалить статус «${s.name}»?`"
            ok-text="Удалить"
            ok-type="danger"
            cancel-text="Отмена"
            @confirm="remove(s)"
          >
            <button type="button" class="delete-btn" title="Удалить"><DeleteOutlined /></button>
          </a-popconfirm>
          <span v-else class="delete-placeholder" />
        </div>
      </div>
    </a-spin>
  </div>
</template>

<script setup>
// Справочник статусов задач (= колонки досок): цвет, порядок, «закрывает задачу»
import { onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, ArrowUpOutlined, ArrowDownOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { useTasks } from '@/stores/tasks.js'
import { getUser } from '@/services/auth.js'

const tasksStore = useTasks()
const me = getUser()
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  await tasksStore.getStatuses()
  loading.value = false
})

const newName = ref('')
const newColor = ref('#8a6d2f')
const newFinal = ref(false)
const creating = ref(false)

async function create() {
  if (!newName.value.trim()) {
    message.warning('Введите название статуса')
    return
  }
  creating.value = true
  try {
    const s = await tasksStore.createStatus({ name: newName.value.trim(), color: newColor.value, is_final: newFinal.value })
    if (s) {
      newName.value = ''
      newFinal.value = false
    }
  } finally {
    creating.value = false
  }
}

const drafts = reactive({})
async function saveName(s) {
  const name = (drafts[s.id] ?? s.name).trim()
  delete drafts[s.id]
  if (!name || name === s.name) return
  await tasksStore.updateStatus(s.id, { name })
}

async function move(index, delta) {
  const ids = tasksStore.statuses.map(s => s.id)
  const [id] = ids.splice(index, 1)
  ids.splice(index + delta, 0, id)
  await tasksStore.reorderStatuses(ids)
}

async function remove(s) {
  if (await tasksStore.deleteStatus(s.id)) message.success('Статус удалён')
}

// удалить — автор или галерея (как остальные справочники)
const canDelete = (s) => s.user_id === me?.id || me?.role === 'gallery'
</script>

<style scoped>
.panel-hint {
  margin: 0 0 14px;
  font-size: 13px;
  color: #5a564c;
  max-width: 760px;
}

.add-row,
.status-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.add-row {
  margin-bottom: 14px;
}

.add-name {
  width: 260px;
}

.status-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.status-row {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 10px;
  padding: 8px 10px;
}

.status-name {
  width: 260px;
}

.color-input {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
  background: none;
  cursor: pointer;
}

.order-btns {
  display: flex;
  flex-direction: column;
}

.order-btns button,
.delete-btn {
  border: none;
  background: none;
  cursor: pointer;
  color: #7c7669;
  padding: 0 4px;
}

.order-btns button:disabled {
  opacity: 0.3;
  cursor: default;
}

.delete-btn {
  margin-left: auto;
  color: #a33a3a;
  font-size: 15px;
}

.delete-placeholder {
  margin-left: auto;
}

@media (max-width: 600px) {
  .add-name,
  .status-name {
    width: 100%;
  }
}
</style>
