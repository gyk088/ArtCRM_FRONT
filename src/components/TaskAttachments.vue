<template>
  <div class="ta">
    <!-- Заметки -->
    <div class="ta-head">
      <span class="field-label ta-label"><FileTextOutlined /> Заметки · {{ notes.length }}</span>
      <div class="ta-head-actions">
        <a-button size="small" :loading="creating" @click="createNote"><PlusOutlined /> Новая</a-button>
        <a-button size="small" @click="openLinkPicker"><LinkOutlined /> Привязать</a-button>
      </div>
    </div>

    <div v-if="linkPickerOpen" class="ta-link">
      <a-select
        v-model:value="linkNoteId"
        show-search
        option-filter-prop="label"
        placeholder="Выберите заметку"
        :options="linkOptions"
        :loading="notesStore.loading"
        :not-found-content="notesStore.loading ? 'Загрузка…' : 'Нет заметок без задачи'"
        class="ta-link-select"
      />
      <a-button size="small" type="primary" class="ta-primary" :disabled="!linkNoteId" :loading="linking" @click="linkNote">Привязать</a-button>
      <a-button size="small" type="text" @click="linkPickerOpen = false"><CloseOutlined /></a-button>
    </div>

    <div v-if="loading && !loaded" class="ta-empty"><LoadingOutlined /> Загрузка…</div>
    <div v-else-if="!notes.length" class="ta-empty">Заметок нет. Создайте новую или привяжите существующую из «Заметок».</div>
    <div v-else class="ta-notes">
      <div v-for="n in notes" :key="n.id" class="ta-note" @click="openNote(n)">
        <FileTextOutlined class="ta-note-icon" />
        <div class="ta-note-main">
          <div class="ta-note-title">{{ n.title || 'Без заголовка' }}</div>
          <div v-if="n.preview" class="ta-note-preview">{{ n.preview }}</div>
          <div class="ta-note-meta">{{ personName(n.createdBy) }} · {{ formatDateTime(n.utime) }}</div>
        </div>
        <a-tooltip title="Отвязать от задачи (заметка останется в «Заметках»)">
          <button type="button" class="ta-x" @click.stop="unlinkNote(n)"><CloseOutlined /></button>
        </a-tooltip>
      </div>
    </div>

    <!-- Файлы -->
    <div class="ta-head ta-head-files">
      <span class="field-label ta-label"><PaperClipOutlined /> Файлы · {{ files.length }}</span>
      <a-button size="small" @click="filesOpen = true"><PlusOutlined /> Прикрепить</a-button>
    </div>
    <div v-if="loaded && !files.length" class="ta-empty">Файлов нет. Прикрепите из «Файлов» или загрузите новый.</div>
    <div v-else-if="files.length" class="ta-files">
      <div v-for="f in files" :key="f.id" class="ta-file">
        <div class="ta-file-thumb"><FileView :file="f" /></div>
        <div class="ta-file-name" :title="f.name">{{ f.name || 'Файл' }}</div>
        <a-tooltip title="Открепить (файл останется в «Файлах»)">
          <button type="button" class="ta-x ta-file-x" @click="detach(f)"><CloseOutlined /></button>
        </a-tooltip>
      </div>
    </div>

    <a-drawer v-model:open="filesOpen" title="Прикрепить файл" placement="right" :width="isMobile ? '100%' : '700px'" destroy-on-close>
      <p class="ta-drawer-hint">Нажмите «Выбрать» у файла — он прикрепится к задаче. Можно выбрать несколько подряд или загрузить новый.</p>
      <FileUploader :select="true" @select="attach" />
    </a-drawer>
  </div>
</template>

<script setup>
// Заметки (из раздела «Заметки») и файлы (из «Файлов») задачи — в окне задачи
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  FileTextOutlined, PaperClipOutlined, PlusOutlined, LinkOutlined, CloseOutlined, LoadingOutlined,
} from '@ant-design/icons-vue'
import FileView from '@/components/FileView.vue'
import FileUploader from '@/components/FileUploader.vue'
import { useTasks } from '@/stores/tasks.js'
import { useNotes } from '@/stores/notes.js'
import { useIsMobile } from '@/composables/useIsMobile.js'
import { formatDateTime, personName } from '@/utils/tasks.js'

const props = defineProps({
  taskId: { type: String, required: true },
  taskTitle: { type: String, default: '' },
})
// counts — изменилось число заметок/файлов (для значков на карточке);
// leave — уходим со страницы доски (открыть заметку) — окно задачи закрыть
const emit = defineEmits(['counts', 'leave'])

const route = useRoute()
const router = useRouter()
const tasksStore = useTasks()
const notesStore = useNotes()
const { isMobile } = useIsMobile()

const notes = ref([])
const files = ref([])
const loading = ref(false)
const loaded = ref(false)

function apply(data) {
  if (!data) return
  notes.value = data.notes || []
  files.value = data.files || []
  emit('counts', { notes_count: notes.value.length, files_count: files.value.length })
}

async function load() {
  loading.value = true
  try {
    apply(await tasksStore.getAttachments(props.taskId))
    loaded.value = true
  } finally {
    loading.value = false
  }
}
onMounted(load)

// === Заметки ===
// Открыть заметку: в адрес доски кладём ?task=, чтобы «Назад» вернул в эту задачу
async function goToNote(id) {
  if (route.name === 'task-board' && route.query.task !== props.taskId) {
    await router.replace({ query: { ...route.query, task: props.taskId } })
  }
  emit('leave')
  router.push({ name: 'note', params: { id } })
}
const openNote = (n) => goToNote(n.id)

const creating = ref(false)
async function createNote() {
  creating.value = true
  try {
    const created = await notesStore.createNote({
      title: props.taskTitle ? `Заметка к задаче «${props.taskTitle}»` : 'Заметка к задаче',
      content: '',
      task_id: props.taskId,
    })
    if (created) goToNote(created.id)
  } finally {
    creating.value = false
  }
}

const linkPickerOpen = ref(false)
const linkNoteId = ref(undefined)
const linking = ref(false)
async function openLinkPicker() {
  linkPickerOpen.value = true
  linkNoteId.value = undefined
  await notesStore.getListNotes()
}
// В список — заметки, ещё не привязанные к этой задаче
const linkOptions = computed(() => {
  const linked = new Set(notes.value.map(n => n.id))
  return notesStore.listNotes
    .filter(n => !linked.has(n.id))
    .map(n => ({
      value: n.id,
      label: `${n.title || 'Без заголовка'}${n.task ? ` (сейчас в задаче «${n.task.title}»)` : ''}`,
    }))
})
async function linkNote() {
  linking.value = true
  try {
    const saved = await notesStore.updateNote(linkNoteId.value, { task_id: props.taskId })
    if (saved) {
      message.success('Заметка привязана к задаче')
      linkPickerOpen.value = false
      await load()
    }
  } finally {
    linking.value = false
  }
}
async function unlinkNote(n) {
  const saved = await notesStore.updateNote(n.id, { task_id: null })
  if (saved) {
    message.success('Заметка отвязана — она осталась в «Заметках»')
    await load()
  }
}

// === Файлы ===
const filesOpen = ref(false)
async function attach(file) {
  if (files.value.some(f => f.id === file.id)) {
    message.info('Этот файл уже прикреплён')
    return
  }
  const data = await tasksStore.attachFile(props.taskId, file.id)
  if (data) {
    apply(data)
    message.success('Файл прикреплён — можно выбрать ещё')
  }
}
async function detach(f) {
  const data = await tasksStore.detachFile(props.taskId, f.id)
  if (data) apply(data)
}
</script>

<style scoped>
.ta {
  margin-top: 16px;
}

.ta-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.ta-head-files {
  margin-top: 18px;
}

.ta-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
}

.ta-head-actions {
  display: flex;
  gap: 6px;
}

.ta-link {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.ta-link-select {
  flex: 1;
  min-width: 0;
}

.ta-primary {
  background: #8a6d2f;
  border-color: #8a6d2f;
}

.ta-empty {
  padding: 10px 12px;
  font-size: 13px;
  color: #7c7669;
  background: #faf8f3;
  border: 1px dashed rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

.ta-notes {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ta-note {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.15s;
}

.ta-note:hover {
  border-color: #8a6d2f;
}

.ta-note-icon {
  margin-top: 3px;
  color: #8a6d2f;
}

.ta-note-main {
  flex: 1;
  min-width: 0;
}

.ta-note-title {
  font-weight: 600;
  color: #211f1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ta-note-preview {
  font-size: 12px;
  color: #5a564c;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.ta-note-meta {
  margin-top: 2px;
  font-size: 11px;
  color: #7c7669;
}

.ta-x {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #a29c8c;
  cursor: pointer;
}

.ta-x:hover {
  color: #b43c3c;
  background: rgba(180, 60, 60, 0.08);
}

.ta-files {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
}

.ta-file {
  position: relative;
  padding: 6px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  background: #fff;
}

.ta-file-thumb {
  height: 84px;
  border-radius: 6px;
  overflow: hidden;
  background: #efece4;
}

.ta-file-name {
  margin-top: 4px;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ta-file-x {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(255, 255, 255, 0.92);
}

.ta-drawer-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: #7c7669;
}
</style>
