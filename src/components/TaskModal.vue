<template>
  <a-modal
    :open="open"
    :title="null"
    width="760px"
    destroy-on-close
    class="task-modal"
    @cancel="close"
  >
    <div v-if="task || isCreate" class="task-modal-body">
      <div v-if="isCreate" class="task-create-heading">Новая задача</div>
      <div v-if="due" class="task-due-banner" :class="`due-${due}`">
        <ExclamationCircleOutlined />
        {{ due === 'overdue' ? `Срок прошёл ${formatDue(form.due_date)} — задача не закрыта` : due === 'today' ? 'Срок — сегодня' : `Срок скоро: ${formatDue(form.due_date)}` }}
      </div>

      <a-input
        ref="titleInputRef"
        v-model:value="form.title"
        class="task-title-input"
        :bordered="false"
        :maxlength="300"
        placeholder="Заголовок задачи"
      />

      <div class="task-layout">
        <div class="task-main">
          <div class="field-label">Описание</div>
          <a-textarea
            v-model:value="form.description"
            :maxlength="20000"
            :auto-size="{ minRows: 6, maxRows: 18 }"
            placeholder="Подробности, ссылки, договорённости…"
          />
        </div>

        <div class="task-side">
          <div class="field-label">Статус</div>
          <a-select v-model:value="form.status_id" :options="statusOptions" class="w-full">
            <template #option="{ label, color, isFinal }">
              <span class="status-option"><span class="status-dot" :style="{ background: color || '#c9c3b6' }" />{{ label }}<CheckOutlined v-if="isFinal" class="final-mark" /></span>
            </template>
          </a-select>

          <div class="field-label">Исполнитель</div>
          <a-select
            v-model:value="form.assignee_id"
            :options="assigneeOptions"
            allow-clear
            show-search
            option-filter-prop="label"
            placeholder="Не назначен"
            class="w-full"
          />

          <template v-if="artists.length || form.artist_id">
            <div class="field-label">Художник</div>
            <a-select
              v-model:value="form.artist_id"
              :options="artistOptions"
              allow-clear
              show-search
              option-filter-prop="label"
              placeholder="Не привязана"
              class="w-full"
            />
          </template>
          <div class="field-label">Срок</div>
          <a-date-picker
            v-model:value="form.due_date"
            value-format="YYYY-MM-DD"
            format="DD.MM.YYYY"
            placeholder="Без срока"
            class="w-full"
          />

          <div class="field-label">Приоритет</div>
          <a-radio-group v-model:value="form.priority" button-style="solid" size="small">
            <a-radio-button v-for="p in PRIORITIES" :key="p.value" :value="p.value">{{ p.label }}</a-radio-button>
          </a-radio-group>

          <div v-if="!isCreate" class="task-meta">
            <div>Создал(а): <b>{{ personName(task.createdBy) }}</b><br>{{ formatDateTime(task.ctime) }}</div>
            <div v-if="task.updatedBy">Изменил(а): <b>{{ personName(task.updatedBy) }}</b><br>{{ formatDateTime(task.utime) }}</div>
            <div v-if="task.completed_at" class="meta-done">Выполнена: {{ formatDateTime(task.completed_at) }}</div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="task-footer">
        <a-popconfirm
          v-if="!isCreate && canDelete"
          title="Удалить задачу?"
          ok-text="Удалить"
          ok-type="danger"
          cancel-text="Отмена"
          @confirm="remove"
        >
          <a-button danger><DeleteOutlined /> Удалить</a-button>
        </a-popconfirm>
        <span v-else />
        <div class="task-footer-right">
          <HistoryButton v-if="!isCreate && task?.id" type="task" :id="task.id" title="История задачи" icon-only />
          <a-button @click="close">Отмена</a-button>
          <a-button type="primary" :loading="saving" @click="save">{{ isCreate ? 'Создать задачу' : 'Сохранить' }}</a-button>
        </div>
      </div>
    </template>
  </a-modal>
</template>

<script setup>
import HistoryButton from '@/components/HistoryButton.vue'
// Просмотр и правка задачи (сохраняется по кнопке «Сохранить») и создание
// новой: task = null + createDefaults { board_id, status_id }.
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { DeleteOutlined, ExclamationCircleOutlined, CheckOutlined } from '@ant-design/icons-vue'
import { useTasks } from '@/stores/tasks.js'
import { getUser } from '@/services/auth.js'
import { PRIORITIES, dueState, formatDue, formatDateTime, personName } from '@/utils/tasks.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  task: { type: Object, default: null },
  statuses: { type: Array, default: () => [] },
  assignees: { type: Array, default: () => [] },
  // справочник художников ({ id, name }) — задачу можно привязать к художнику
  artists: { type: Array, default: () => [] },
  // режим создания: { board_id, status_id } — колонка, где нажали «Добавить задачу»
  createDefaults: { type: Object, default: null },
})
// saved(task) — задача изменена; created(task) — создана; deleted(id) — удалена
const emit = defineEmits(['update:open', 'saved', 'created', 'deleted'])

const isCreate = computed(() => !props.task && !!props.createDefaults)
const titleInputRef = ref(null)

const tasksStore = useTasks()
const me = getUser()
const saving = ref(false)

const form = reactive({ title: '', description: '', status_id: null, assignee_id: undefined, artist_id: undefined, due_date: null, priority: 'normal' })

watch(() => [props.open, props.task, props.createDefaults], async () => {
  if (props.open && isCreate.value) {
    Object.assign(form, {
      title: '',
      description: '',
      status_id: props.createDefaults.status_id,
      assignee_id: undefined,
      artist_id: props.createDefaults.artist_id || undefined,
      due_date: null,
      priority: 'normal',
    })
    await nextTick()
    setTimeout(() => titleInputRef.value?.focus(), 50)
    return
  }
  if (props.open && props.task) {
    Object.assign(form, {
      title: props.task.title,
      description: props.task.description || '',
      status_id: props.task.status_id,
      assignee_id: props.task.assignee?.id || undefined,
      artist_id: props.task.artist?.id || undefined,
      due_date: props.task.due_date || null,
      priority: props.task.priority || 'normal',
    })
  }
}, { immediate: true })

const statusOptions = computed(() => props.statuses.map(s => ({ label: s.name, value: s.id, color: s.color, isFinal: s.is_final })))
const assigneeOptions = computed(() => props.assignees.map(u => ({ label: personName(u), value: u.id })))
const artistOptions = computed(() => {
  const list = props.artists.map(a => ({ label: a.name, value: a.id }))
  // привязанный художник мог не попасть в справочник (например, удалён из списка) — показываем имя
  const current = props.task?.artist
  if (current && !list.some(o => o.value === current.id)) list.unshift({ label: current.name || 'Художник', value: current.id })
  return list.sort((a, b) => String(a.label).localeCompare(String(b.label), 'ru'))
})

// подсветка срока — по тому, что сейчас в форме
const due = computed(() => {
  const status = props.statuses.find(s => s.id === form.status_id)
  return dueState({ due_date: form.due_date, is_closed: !!status?.is_final })
})

const canDelete = computed(() => props.task && (props.task.createdBy?.id === me?.id || me?.role === 'gallery'))

function close() {
  emit('update:open', false)
}

async function save() {
  if (!form.title.trim()) {
    message.warning('Укажите заголовок задачи')
    return
  }
  const payload = {
    title: form.title.trim(),
    description: form.description,
    status_id: form.status_id,
    assignee_id: form.assignee_id || null,
    artist_id: form.artist_id || null,
    due_date: form.due_date || null,
    priority: form.priority,
  }
  saving.value = true
  try {
    if (isCreate.value) {
      const created = await tasksStore.createTask({ ...payload, board_id: props.createDefaults.board_id })
      if (created) {
        message.success(created.assignee && created.assignee.id !== me?.id
          ? 'Задача создана, исполнителю отправлено уведомление'
          : 'Задача создана')
        emit('created', created)
        close()
      }
      return
    }
    const updated = await tasksStore.updateTask(props.task.id, payload)
    if (updated) {
      emit('saved', updated)
      close()
    }
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (await tasksStore.deleteTask(props.task.id)) {
    message.success('Задача удалена')
    emit('deleted', props.task.id)
    close()
  }
}
</script>

<style scoped>
.task-modal-body {
  padding-top: 8px;
}

.task-due-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
}

.due-overdue {
  background: #fdecea;
  color: #b42318;
}

.due-today {
  background: #fff4e5;
  color: #b54708;
}

.due-soon {
  background: #fffbea;
  color: #8a6d2f;
}

.task-title-input {
  font-size: 20px;
  font-weight: 600;
  padding: 4px 0;
  margin-bottom: 12px;
}

.task-layout {
  display: grid;
  grid-template-columns: 1fr 240px;
  gap: 20px;
}

.field-label {
  font-size: 12px;
  color: #7c7669;
  margin: 10px 0 4px;
}

.task-main .field-label:first-child,
.task-side .field-label:first-child {
  margin-top: 0;
}

.w-full {
  width: 100%;
}

.status-option {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.final-mark {
  color: #27ae60;
  font-size: 11px;
}

.task-meta {
  margin-top: 16px;
  padding-top: 10px;
  border-top: 1px solid rgba(0, 0, 0, 0.07);
  display: grid;
  gap: 8px;
  font-size: 12px;
  color: #7c7669;
}

.task-meta b {
  color: #5a564c;
}

.meta-done {
  color: #1e7b45;
}

.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.task-footer-right {
  display: flex;
  gap: 8px;
}

@media (max-width: 700px) {
  .task-layout {
    grid-template-columns: 1fr;
  }
}

.task-create-heading {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #8a6d2f;
}
</style>
