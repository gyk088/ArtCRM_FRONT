<template>
  <div class="notes-page">
    <div class="page-header">
      <div>
        <div class="page-header-top">
          <MobileMenuButton />
          <h2 class="page-title">Заметки</h2>
        </div>
        <p class="page-subtitle">{{ notesStore.listNotes.length }} {{ pluralNotes(notesStore.listNotes.length) }}</p>
      </div>
      <a-button type="primary" :loading="creating" @click="createNote">
        <template #icon><PlusOutlined /></template>
        Создать заметку
      </a-button>
    </div>

    <div class="notes-filters">
      <a-input v-model:value="search" placeholder="Поиск по заголовку и тексту" allow-clear class="notes-search">
        <template #prefix><SearchOutlined /></template>
      </a-input>
      <a-select
        v-model:value="artistFilter"
        :options="artistOptions"
        placeholder="Художник"
        allow-clear
        show-search
        option-filter-prop="label"
        class="notes-artist-filter"
      />
    </div>

    <a-spin :spinning="notesStore.loading && !notesStore.listNotes.length">
      <div v-if="filteredNotes.length" class="notes-grid">
        <div v-for="note in filteredNotes" :key="note.id" class="note-card" @click="openNote(note)">
          <div class="note-card-top">
            <div class="note-card-title">{{ note.title }}</div>
            <div class="note-card-actions" @click.stop>
              <a-popconfirm
                v-if="canDelete(note)"
                :title="`Удалить заметку «${note.title}»?`"
                ok-text="Удалить"
                ok-type="danger"
                cancel-text="Отмена"
                @confirm="removeNote(note)"
              >
                <button type="button" class="icon-btn icon-btn-danger" title="Удалить"><DeleteOutlined /></button>
              </a-popconfirm>
            </div>
          </div>
          <span v-if="note.artist" class="note-artist"><UserOutlined /> {{ note.artist.name }}</span>
          <p v-if="note.preview" class="note-preview">{{ note.preview }}</p>
          <p v-else class="note-preview note-preview-empty">Пустая заметка</p>
          <div class="note-meta">
            <div>Создал(а): {{ personName(note.createdBy) }}, {{ formatDateTime(note.ctime) }}</div>
            <div v-if="note.updatedBy">Изменил(а): {{ personName(note.updatedBy) }}, {{ formatDateTime(note.utime) }}</div>
          </div>
        </div>
      </div>

      <div v-else-if="!notesStore.loading" class="empty-state">
        <FormOutlined class="empty-icon" />
        <template v-if="notesStore.listNotes.length">
          <p class="empty-title">Ничего не найдено</p>
          <p class="empty-subtitle">Измените поиск или фильтр по художнику</p>
        </template>
        <template v-else>
          <p class="empty-title">Заметок пока нет</p>
          <p class="empty-subtitle">
            Записывайте договорённости, идеи и всё, что нужно не забыть. Заметку можно привязать к художнику
            и выгрузить в PDF.
          </p>
          <a-button type="primary" :loading="creating" @click="createNote">Создать заметку</a-button>
        </template>
      </div>
    </a-spin>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, DeleteOutlined, FormOutlined, UserOutlined } from '@ant-design/icons-vue'
import MobileMenuButton from '@/components/MobileMenuButton.vue'
import { useNotes } from '@/stores/notes.js'
import { useArtist } from '@/stores/artist.js'
import { getUser } from '@/services/auth.js'

const router = useRouter()
const notesStore = useNotes()
const artistStore = useArtist()
const me = getUser()

const search = ref('')
const artistFilter = ref(undefined)
const creating = ref(false)

onMounted(() => {
  notesStore.getListNotes()
  if (!artistStore.listArtists.length) artistStore.getListArtists()
})

const artistOptions = computed(() => artistStore.listArtists.map(a => ({ label: a.name, value: a.id })))

const filteredNotes = computed(() => {
  const q = search.value.trim().toLowerCase()
  return notesStore.listNotes.filter(n =>
    (!artistFilter.value || n.artist?.id === artistFilter.value)
    && (!q || n.title.toLowerCase().includes(q) || (n.preview || '').toLowerCase().includes(q))
  )
})

// Новая заметка создаётся сразу (с черновым заголовком) — дальше всё
// редактируется и сохраняется само на странице заметки
async function createNote() {
  creating.value = true
  try {
    const note = await notesStore.createNote({ title: 'Новая заметка', artist_id: artistFilter.value || null })
    if (note) router.push({ name: 'note', params: { id: note.id }, query: { new: '1' } })
  } finally {
    creating.value = false
  }
}

function openNote(note) {
  router.push({ name: 'note', params: { id: note.id } })
}

async function removeNote(note) {
  if (await notesStore.deleteNote(note.id)) message.success('Заметка удалена')
}

// Удалить может автор или сама галерея (как работы)
function canDelete(note) {
  return note.createdBy?.id === me?.id || me?.role === 'gallery'
}

function personName(p) {
  return [p?.name, p?.surname].map(v => (v || '').trim()).filter(Boolean).join(' ') || '—'
}

function formatDateTime(value) {
  return value
    ? new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'
}

function pluralNotes(n) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'заметка'
  if ([2, 3, 4].includes(m10) && ![12, 13, 14].includes(m100)) return 'заметки'
  return 'заметок'
}
</script>

<style scoped>
.notes-page {
  --bg: #f7f5f0;
  --bg-elevated: #ffffff;
  --card-bg: #efece4;
  --text-title: #211f1a;
  --text-muted: #5a564c;
  --text-faint: #7c7669;
  --accent: #8a6d2f;
  --border-soft: rgba(0, 0, 0, 0.07);

  min-height: 100vh;
  background: var(--bg);
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.page-header-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-title {
  margin: 0;
  font-size: 22px;
  color: var(--text-title);
}

.page-subtitle {
  margin: 4px 0 0;
  color: var(--text-muted);
}

.notes-filters {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.notes-search {
  width: 320px;
  max-width: 100%;
}

.notes-artist-filter {
  width: 240px;
  max-width: 100%;
}

.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}

.note-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: box-shadow 0.15s;
}

.note-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.note-card-top {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.note-card-title {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  font-size: 16px;
  color: var(--text-title);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-card-actions {
  margin: -6px -6px 0 0;
}

.note-artist {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--accent);
  font-size: 12px;
}

.note-preview {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.note-preview-empty {
  font-style: italic;
  color: var(--text-faint);
}

.note-meta {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--border-soft);
  font-size: 12px;
  color: var(--text-faint);
  display: grid;
  gap: 2px;
}

.icon-btn {
  border: none;
  background: none;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-faint);
}

.icon-btn-danger:hover {
  background: #f8e9e9;
  color: #8f2c2c;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: var(--bg-elevated);
  border-radius: 12px;
  border: 1px solid var(--border-soft);
}

.empty-icon {
  font-size: 40px;
  color: var(--accent);
}

.empty-title {
  font-size: 17px;
  font-weight: 600;
  margin: 12px 0 4px;
}

.empty-subtitle {
  max-width: 460px;
  margin: 0 auto 16px;
  color: var(--text-muted);
}

@media (max-width: 600px) {
  .notes-page {
    padding: 16px;
  }

  .notes-search,
  .notes-artist-filter {
    width: 100%;
  }

  .page-header > .ant-btn {
    width: 100%;
  }
}
</style>
