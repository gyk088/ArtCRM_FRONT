<template>
  <div class="pf-page">
    <div class="pf-top">
      <MobileMenuButton />
      <router-link v-if="artistId" :to="{ name: 'artist', params: { id: artistId }, query: { tab: 'portfolio' } }" class="back-link">
        <LeftOutlined /> {{ artistName || 'Художник' }}
      </router-link>
    </div>

    <a-spin :spinning="loading">
      <div v-if="notFound" class="pf-empty">Портфолио не найдено или у вас нет к нему доступа.</div>

      <template v-else-if="loaded">
        <!-- Шапка: название и действия -->
        <div class="pf-head">
          <div>
            <h2 class="page-title">Портфолио</h2>
            <div class="pf-head-sub">{{ form.title || 'Без названия' }}<template v-if="dirty"> · есть несохранённые изменения</template></div>
          </div>
          <div class="pf-head-actions">
            <a-tooltip :title="form.is_public ? 'Портфолио открывается по ссылке' : 'Ссылка выключена'">
              <span class="pf-public">
                <a-switch v-model:checked="form.is_public" size="small" /> по ссылке
              </span>
            </a-tooltip>
            <a-button :disabled="!form.is_public || dirty" :title="dirty ? 'Сначала сохраните' : ''" @click="openPublic"><EyeOutlined /> Открыть</a-button>
            <a-button :disabled="!form.is_public" @click="copyPortfolioLink(id)"><LinkOutlined /> Ссылка</a-button>
            <a-button :loading="pdfLoading" @click="exportPdf">
              <FilePdfOutlined /> {{ pdfLoading && pdfProgress ? `PDF ${pdfProgress}` : 'PDF' }}
            </a-button>
            <HistoryButton type="portfolio" :id="id" icon-only />
            <a-button type="primary" :loading="saving" class="pf-save" @click="save"><SaveOutlined /> Сохранить</a-button>
          </div>
        </div>

        <!-- 1. Обложка -->
        <section class="pf-card">
          <div class="pf-card-title">Обложка</div>
          <div class="pf-cover-row">
            <div class="pf-cover" @click="pickFile('cover')">
              <img v-if="form.cover" v-thumb="form.cover" alt="" />
              <span v-else class="pf-cover-empty"><PictureOutlined /><span>Фото обложки</span></span>
            </div>
            <div class="pf-cover-fields">
              <label class="field">
                <span class="field-label">Имя / название</span>
                <a-input v-model:value="form.title" :maxlength="300" placeholder="Имя художника" />
              </label>
              <label class="field">
                <span class="field-label">Подзаголовок</span>
                <a-input v-model:value="form.subtitle" :maxlength="300" placeholder="Например: 1982 | Брест | Беларусь" />
              </label>
              <div class="pf-file-actions">
                <a-button size="small" @click="pickFile('cover')"><PictureOutlined /> {{ form.cover ? 'Сменить фото' : 'Выбрать фото' }}</a-button>
                <a-button v-if="form.cover" size="small" type="link" danger @click="form.cover = null">Убрать</a-button>
              </div>
            </div>
          </div>
        </section>

        <!-- 2. О художнике -->
        <section class="pf-card">
          <div class="pf-card-title">
            О художнике
            <a-button v-if="artistBio" size="small" type="link" @click="form.bio = artistBio">Подставить из анкеты</a-button>
          </div>
          <div class="pf-about">
            <a-textarea
              v-model:value="form.bio"
              :maxlength="20000"
              :auto-size="{ minRows: 6, maxRows: 24 }"
              placeholder="Биография: чем занимается, образование, премии, участие в биеннале… Каждый абзац — с новой строки."
            />
            <div class="pf-side-photo" @click="pickFile('bio_photo')">
              <img v-if="form.bio_photo" v-thumb="form.bio_photo" alt="" />
              <span v-else class="pf-cover-empty"><PictureOutlined /><span>Фото рядом с текстом</span></span>
              <a-button v-if="form.bio_photo" size="small" danger class="pf-photo-remove" @click.stop="form.bio_photo = null"><CloseOutlined /></a-button>
            </div>
          </div>
        </section>

        <!-- 3. Выставки -->
        <section class="pf-card">
          <div class="pf-card-title">Выставки</div>
          <p class="pf-hint">Каждая выставка — с новой строки, в начале год: <i>2020 «Pure future tools», A&amp;V Gallery, Минск</i></p>
          <div class="pf-two">
            <label class="field">
              <span class="field-label">Персональные</span>
              <a-textarea v-model:value="form.exhibitions_solo" :maxlength="20000" :auto-size="{ minRows: 5, maxRows: 20 }" />
            </label>
            <label class="field">
              <span class="field-label">Групповые</span>
              <a-textarea v-model:value="form.exhibitions_group" :maxlength="20000" :auto-size="{ minRows: 5, maxRows: 20 }" />
            </label>
          </div>
        </section>

        <!-- 4. Проекты -->
        <section class="pf-card">
          <div class="pf-card-title">
            Проекты и серии
            <a-button size="small" type="dashed" @click="addSection"><PlusOutlined /> Добавить проект</a-button>
          </div>
          <p class="pf-hint">Проект — название, год, текст, фото экспозиции и работы. В PDF каждое фото и каждая работа — на отдельном листе с подписью.</p>
          <div v-if="!form.sections.length" class="pf-empty pf-empty-sm">Проектов пока нет</div>

          <div v-for="(s, si) in form.sections" :key="s.id" class="pf-section">
            <div class="pf-section-head">
              <span class="pf-section-num">{{ si + 1 }}</span>
              <a-input v-model:value="s.title" :maxlength="300" placeholder="Название проекта / серии" class="pf-section-title" />
              <a-input v-model:value="s.year" :maxlength="50" placeholder="Год" class="pf-section-year" />
              <div class="pf-section-tools">
                <a-button size="small" :disabled="si === 0" title="Выше" @click="moveSection(si, -1)"><ArrowUpOutlined /></a-button>
                <a-button size="small" :disabled="si === form.sections.length - 1" title="Ниже" @click="moveSection(si, 1)"><ArrowDownOutlined /></a-button>
                <a-popconfirm title="Удалить проект из портфолио?" ok-text="Удалить" cancel-text="Отмена" @confirm="form.sections.splice(si, 1)">
                  <a-button size="small" danger title="Удалить"><DeleteOutlined /></a-button>
                </a-popconfirm>
              </div>
            </div>
            <a-textarea
              v-model:value="s.text"
              :maxlength="20000"
              :auto-size="{ minRows: 3, maxRows: 16 }"
              placeholder="Текст о проекте (концепция, где и когда показан)"
            />

            <div class="pf-sub-title">
              Фото экспозиции · {{ s.photos.length }}
              <a-button size="small" @click="pickFile('photo', si)"><PlusOutlined /> Фото</a-button>
            </div>
            <div v-if="s.photos.length" class="pf-photos">
              <div v-for="(p, pi) in s.photos" :key="p.file.id + pi" class="pf-photo">
                <img v-thumb="p.file" alt="" />
                <a-input v-model:value="p.caption" size="small" :maxlength="500" placeholder="Подпись" />
                <div class="pf-photo-tools">
                  <button type="button" :disabled="pi === 0" title="Левее" @click="moveItem(s.photos, pi, -1)"><LeftOutlined /></button>
                  <button type="button" :disabled="pi === s.photos.length - 1" title="Правее" @click="moveItem(s.photos, pi, 1)"><RightOutlined /></button>
                  <button type="button" class="danger" title="Убрать" @click="s.photos.splice(pi, 1)"><CloseOutlined /></button>
                </div>
              </div>
            </div>

            <div class="pf-sub-title">
              Работы · {{ s.works.length }}
              <a-button size="small" @click="openWorksPicker(si)"><AppstoreAddOutlined /> Выбрать работы</a-button>
            </div>
            <div v-if="s.works.length" class="pf-works">
              <div v-for="(w, wi) in s.works" :key="w.id" class="pf-work">
                <div class="pf-work-img">
                  <img v-if="w.avatar" v-thumb="w.avatar" alt="" />
                  <PictureOutlined v-else />
                </div>
                <div class="pf-work-name" :title="w.name">{{ w.name || 'Без названия' }}</div>
                <div class="pf-work-sub">{{ [w.year, w.technique, w.size].filter(Boolean).join(' · ') }}</div>
                <div class="pf-photo-tools">
                  <button type="button" :disabled="wi === 0" title="Левее" @click="moveItem(s.works, wi, -1)"><LeftOutlined /></button>
                  <button type="button" :disabled="wi === s.works.length - 1" title="Правее" @click="moveItem(s.works, wi, 1)"><RightOutlined /></button>
                  <button type="button" class="danger" title="Убрать" @click="s.works.splice(wi, 1)"><CloseOutlined /></button>
                </div>
              </div>
            </div>
          </div>

          <a-button v-if="form.sections.length" type="dashed" block class="pf-add-bottom" @click="addSection"><PlusOutlined /> Добавить проект</a-button>
        </section>

        <!-- 5. Контакты -->
        <section class="pf-card">
          <div class="pf-card-title">Контакты (последний лист)</div>
          <a-textarea v-model:value="form.contacts" :maxlength="2000" :auto-size="{ minRows: 2, maxRows: 8 }" placeholder="Email, телефон, сайт — каждый с новой строки" />
        </section>

        <div class="pf-bottom">
          <a-button type="primary" size="large" :loading="saving" class="pf-save" @click="save"><SaveOutlined /> Сохранить</a-button>
        </div>
      </template>
    </a-spin>

    <!-- Выбор картинки из «Файлов» -->
    <a-drawer v-model:open="filesOpen" title="Выберите фото" placement="right" :width="isMobile ? '100%' : '700px'" destroy-on-close>
      <FileUploader :select="true" @select="onFileSelected" />
    </a-drawer>

    <!-- Выбор работ художника для проекта -->
    <a-modal
      v-model:open="worksPickerOpen"
      title="Работы для проекта"
      :width="isMobile ? '96vw' : '980px'"
      ok-text="Готово"
      cancel-text="Отмена"
      centered
      @ok="applyWorksPicker"
    >
      <div class="wp-top">
        <a-input v-model:value="pickerSearch" allow-clear placeholder="Поиск по названию" class="wp-search">
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-checkbox v-model:checked="pickerAllArtists">Работы всех художников</a-checkbox>
        <span class="wp-count">Выбрано: {{ pickerSelected.length }}</span>
      </div>
      <div class="wp-grid">
        <div
          v-for="w in pickerList"
          :key="w.id"
          class="wp-tile"
          :class="{ 'wp-tile-on': pickerSelected.includes(w.id) }"
          @click="togglePicker(w.id)"
        >
          <span class="wp-check"><a-checkbox :checked="pickerSelected.includes(w.id)" /></span>
          <div class="wp-img">
            <img v-if="w.avatar && w.avatar.url" v-thumb="w.avatar" loading="lazy" alt="" />
            <PictureOutlined v-else />
          </div>
          <div class="wp-name">{{ w.name || 'Без названия' }}</div>
          <div class="wp-sub">{{ [w.year, w.size].filter(Boolean).join(' · ') }}</div>
        </div>
        <div v-if="!pickerList.length" class="pf-empty pf-empty-sm">Работ не найдено</div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
// Редактор портфолио художника (из карточки художника → «Портфолио»)
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import {
  LeftOutlined, RightOutlined, PictureOutlined, PlusOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined,
  CloseOutlined, LinkOutlined, EyeOutlined, FilePdfOutlined, SaveOutlined, AppstoreAddOutlined, SearchOutlined,
} from '@ant-design/icons-vue'
import MobileMenuButton from '@/components/MobileMenuButton.vue'
import FileUploader from '@/components/FileUploader.vue'
import HistoryButton from '@/components/HistoryButton.vue'
import { usePortfolio, copyPortfolioLink, portfolioPublicUrl } from '@/stores/portfolio.js'
import { useArtist } from '@/stores/artist.js'
import { useArtWork } from '@/stores/artWork.js'
import { useIsMobile } from '@/composables/useIsMobile.js'
import { fileUrl, thumbUrl } from '@/services/const.js'
import { downloadPortfolioPdf } from '@/utils/portfolioPdf.js'

const route = useRoute()
// id фиксируем при открытии (см. EditWork: при уходе «Назад» params меняются раньше)
const id = String(route.params.id)
const store = usePortfolio()
const artistStore = useArtist()
const artWorkStore = useArtWork()
const { isMobile } = useIsMobile()

const loading = ref(false)
const loaded = ref(false)
const notFound = ref(false)
const saving = ref(false)
const artistId = ref(null)
const artistName = ref('')
const artistBio = ref('')

const form = reactive({
  title: '',
  subtitle: '',
  cover: null,
  bio: '',
  bio_photo: null,
  exhibitions_solo: '',
  exhibitions_group: '',
  contacts: '',
  is_public: true,
  sections: [],
})

// === Несохранённые изменения ===
const snapshot = ref('')
const payload = () => ({
  title: form.title,
  subtitle: form.subtitle || null,
  cover_id: form.cover?.id || null,
  bio: form.bio || null,
  bio_photo_id: form.bio_photo?.id || null,
  exhibitions_solo: form.exhibitions_solo || null,
  exhibitions_group: form.exhibitions_group || null,
  contacts: form.contacts || null,
  is_public: form.is_public,
  sections: form.sections.map(s => ({
    id: s.id,
    title: s.title || null,
    year: s.year || null,
    text: s.text || null,
    photos: s.photos.map(p => ({ file_id: p.file.id, caption: p.caption || null })),
    works: s.works.map(w => w.id),
  })),
})
const dirty = computed(() => loaded.value && JSON.stringify(payload()) !== snapshot.value)

function fill(p) {
  artistId.value = p.artist?.id || null
  artistName.value = p.artist?.name || ''
  Object.assign(form, {
    title: p.title || '',
    subtitle: p.subtitle || '',
    cover: p.cover || null,
    bio: p.bio || '',
    bio_photo: p.bio_photo || null,
    exhibitions_solo: p.exhibitions_solo || '',
    exhibitions_group: p.exhibitions_group || '',
    contacts: p.contacts || '',
    is_public: p.is_public !== false,
    sections: (p.sections || []).map(s => ({
      id: s.id,
      title: s.title || '',
      year: s.year || '',
      text: s.text || '',
      photos: (s.photos || []).map(ph => ({ file: ph.file, caption: ph.caption || '' })),
      works: [...(s.works || [])],
    })),
  })
  snapshot.value = JSON.stringify(payload())
}

onMounted(async () => {
  loading.value = true
  try {
    const p = await store.get(id)
    if (!p) return
    if (p.notFound) {
      notFound.value = true
      return
    }
    fill(p)
    loaded.value = true
    // био из анкеты — для кнопки «Подставить из анкеты»
    artistStore.getOverview(p.artist?.id).then((o) => { artistBio.value = o?.artist?.bio || '' }).catch(() => {})
  } finally {
    loading.value = false
  }
})

async function save() {
  if (!form.title.trim()) {
    message.warning('Укажите имя / название')
    return false
  }
  saving.value = true
  try {
    const saved = await store.update(id, payload())
    if (saved) {
      fill(saved)
      message.success('Портфолио сохранено')
      return true
    }
    return false
  } finally {
    saving.value = false
  }
}

// Уход со страницы с несохранёнными изменениями — спрашиваем
onBeforeRouteLeave(() => {
  if (!dirty.value) return true
  return new Promise((resolve) => {
    Modal.confirm({
      title: 'Сохранить изменения в портфолио?',
      okText: 'Сохранить',
      cancelText: 'Не сохранять',
      closable: true,
      centered: true,
      onOk: async () => resolve(await save()),
      onCancel: (e) => resolve(!(e && e.triggerCancel)),
    })
  })
})
const beforeUnload = (e) => {
  if (dirty.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}
window.addEventListener('beforeunload', beforeUnload)
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))

// === Публичная ссылка и PDF ===
const openPublic = () => window.open(portfolioPublicUrl(id), '_blank', 'noopener')

const pdfLoading = ref(false)
const pdfProgress = ref('')
async function exportPdf() {
  pdfLoading.value = true
  pdfProgress.value = ''
  try {
    // PDF — из того, что сейчас на экране (в том числе несохранённое)
    const p = payload()
    await downloadPortfolioPdf({
      ...p,
      cover: form.cover,
      bio_photo: form.bio_photo,
      sections: form.sections.map(s => ({ ...s, photos: s.photos, works: s.works })),
    }, { onProgress: (done, total) => { pdfProgress.value = `${done}/${total}` } })
  } finally {
    pdfLoading.value = false
    pdfProgress.value = ''
  }
}

// === Файлы ===
const filesOpen = ref(false)
const fileTarget = ref(null) // { kind: 'cover'|'bio_photo'|'photo', section }
function pickFile(kind, section = null) {
  fileTarget.value = { kind, section }
  filesOpen.value = true
}
function onFileSelected(file) {
  if (!thumbUrl(file)) {
    message.warning('Выберите картинку (jpg, png, webp…)')
    return
  }
  const dto = { id: file.id, ext: file.ext, url: fileUrl(file), thumb_url: thumbUrl(file) }
  const t = fileTarget.value
  if (t?.kind === 'cover') form.cover = dto
  else if (t?.kind === 'bio_photo') form.bio_photo = dto
  else if (t?.kind === 'photo' && form.sections[t.section]) {
    form.sections[t.section].photos.push({ file: dto, caption: '' })
    message.success('Фото добавлено — можно выбрать ещё')
    return // drawer не закрываем: удобно добавить несколько фото подряд
  }
  filesOpen.value = false
}

// === Проекты ===
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)
function addSection() {
  form.sections.push({ id: newId(), title: '', year: '', text: '', photos: [], works: [] })
}
function moveSection(i, d) {
  moveItem(form.sections, i, d)
}
function moveItem(list, i, d) {
  const j = i + d
  if (j < 0 || j >= list.length) return
  const [x] = list.splice(i, 1)
  list.splice(j, 0, x)
}

// === Выбор работ ===
const worksPickerOpen = ref(false)
const pickerSection = ref(null)
const pickerSelected = ref([])
const pickerSearch = ref('')
const pickerAllArtists = ref(false)
async function openWorksPicker(si) {
  pickerSection.value = si
  pickerSelected.value = form.sections[si].works.map(w => w.id)
  pickerSearch.value = ''
  worksPickerOpen.value = true
  if (!artWorkStore.listArtWorks.length) await artWorkStore.getListArtWorks()
}
const pickerList = computed(() => {
  const q = pickerSearch.value.trim().toLowerCase()
  return artWorkStore.listArtWorks.filter(w =>
    (pickerAllArtists.value || w.artist === artistId.value)
    && (!q || (w.name || '').toLowerCase().includes(q)))
})
function togglePicker(workId) {
  pickerSelected.value = pickerSelected.value.includes(workId)
    ? pickerSelected.value.filter(x => x !== workId)
    : [...pickerSelected.value, workId]
}
function applyWorksPicker() {
  const s = form.sections[pickerSection.value]
  if (!s) return
  const byId = new Map(artWorkStore.listArtWorks.map(w => [w.id, w]))
  const kept = s.works.filter(w => pickerSelected.value.includes(w.id))
  const keptIds = new Set(kept.map(w => w.id))
  const added = pickerSelected.value.filter(wid => !keptIds.has(wid)).map(wid => byId.get(wid)).filter(Boolean)
    .map(w => ({
      id: w.id, name: w.name, year: w.year, technique: w.technique, size: w.size,
      avatar: w.avatar?.id ? { id: w.avatar.id, ext: w.avatar.ext, url: w.avatar.url || fileUrl(w.avatar), thumb_url: w.avatar.thumb_url || thumbUrl(w.avatar) } : null,
    }))
  s.works = [...kept, ...added]
  worksPickerOpen.value = false
}
watch(pickerAllArtists, () => { pickerSearch.value = '' })
</script>

<style scoped>
.pf-page {
  --bg: #f7f5f0;
  --bg-elevated: #ffffff;
  --card-bg: #efece4;
  --text-title: #211f1a;
  --text-body: #2c2a25;
  --text-faint: #7c7669;
  --text-dim: #a29c8c;
  --accent: #8a6d2f;
  --accent-strong: #6f581f;
  --border: rgba(0, 0, 0, 0.08);

  background: var(--bg);
  color: var(--text-body);
  border-radius: 14px;
  padding: 20px 20px 40px;
  margin: 0 -16px;
}

.pf-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.back-link {
  color: var(--text-faint);
  font-size: 14px;
}

.back-link:hover {
  color: var(--accent);
}

.pf-head {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 16px;
  padding: 10px 0 12px;
  margin-bottom: 8px;
  background: var(--bg);
}

.page-title {
  margin: 0;
  font-family: 'Cormorant Garamond', serif;
  font-size: 30px;
  font-weight: 600;
  color: var(--text-title);
}

.pf-head-sub {
  font-size: 13px;
  color: var(--text-faint);
}

.pf-head-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.pf-public {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  margin-right: 4px;
}

.pf-public :deep(.ant-switch-checked) {
  background: var(--accent);
}

.pf-save {
  background: var(--accent);
  border-color: var(--accent);
}

.pf-save:hover,
.pf-save:focus {
  background: var(--accent-strong) !important;
  border-color: var(--accent-strong) !important;
}

.pf-card {
  padding: 16px 18px;
  margin-bottom: 14px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.pf-card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
}

.pf-hint {
  margin: -4px 0 12px;
  font-size: 13px;
  color: var(--text-faint);
}

.pf-empty {
  padding: 40px 0;
  text-align: center;
  color: var(--text-faint);
}

.pf-empty-sm {
  padding: 16px 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}

.field-label {
  font-size: 12px;
  color: var(--text-faint);
}

.pf-cover-row {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 20px;
}

.pf-cover,
.pf-side-photo {
  position: relative;
  aspect-ratio: 297 / 210;
  border-radius: 10px;
  overflow: hidden;
  background: var(--card-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 1px dashed var(--border);
}

.pf-cover img,
.pf-side-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pf-cover-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-faint);
}

.pf-cover-empty :deep(.anticon) {
  font-size: 26px;
}

.pf-file-actions {
  display: flex;
  gap: 6px;
}

.pf-about {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 16px;
  align-items: start;
}

.pf-side-photo {
  aspect-ratio: 3 / 4;
}

.pf-photo-remove {
  position: absolute;
  top: 6px;
  right: 6px;
}

.pf-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.pf-section {
  padding: 14px;
  margin-bottom: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fcfbf8;
}

.pf-section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.pf-section-num {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: var(--accent);
}

.pf-section-title {
  flex: 1;
}

.pf-section-year {
  width: 110px;
}

.pf-section-tools {
  display: flex;
  gap: 4px;
}

.pf-sub-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 14px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-title);
}

.pf-photos,
.pf-works {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
}

.pf-photo,
.pf-work {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 8px;
}

.pf-photo img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: 6px;
  background: var(--card-bg);
}

.pf-work-img {
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  overflow: hidden;
  background: var(--card-bg);
  color: var(--text-dim);
  font-size: 22px;
}

.pf-work-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pf-work-name {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 15px;
  color: var(--text-title);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pf-work-sub {
  font-size: 11px;
  color: var(--text-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pf-photo-tools {
  display: flex;
  gap: 4px;
}

.pf-photo-tools button {
  flex: 1;
  height: 26px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: transparent;
  color: var(--accent);
  cursor: pointer;
}

.pf-photo-tools button:disabled {
  opacity: 0.35;
  cursor: default;
}

.pf-photo-tools button.danger {
  color: #b43c3c;
}

.pf-add-bottom {
  margin-top: 4px;
}

.pf-bottom {
  display: flex;
  justify-content: flex-end;
}

/* Выбор работ */
.wp-top {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-bottom: 12px;
}

.wp-search {
  width: 240px;
}

.wp-count {
  margin-left: auto;
  font-weight: 600;
  color: #8a6d2f;
}

.wp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  max-height: 60vh;
  overflow-y: auto;
  padding: 2px;
}

.wp-tile {
  position: relative;
  padding: 6px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  cursor: pointer;
  user-select: none;
}

.wp-tile:hover {
  border-color: #8a6d2f;
}

.wp-tile-on {
  border-color: #8a6d2f;
  box-shadow: 0 0 0 2px #8a6d2f;
}

.wp-check {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1;
  display: flex;
  padding: 2px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 6px;
}

.wp-tile :deep(.ant-checkbox-checked .ant-checkbox-inner) {
  background: #8a6d2f;
  border-color: #8a6d2f;
}

.wp-img {
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  overflow: hidden;
  background: #efece4;
  color: #a29c8c;
  font-size: 22px;
}

.wp-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.wp-name {
  margin-top: 6px;
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wp-sub {
  font-size: 11px;
  color: #7c7669;
}

@media (max-width: 768px) {
  .pf-page {
    padding: 14px 12px 32px;
  }

  .pf-cover-row,
  .pf-about,
  .pf-two {
    grid-template-columns: 1fr;
  }

  .pf-side-photo {
    aspect-ratio: 297 / 210;
  }

  .pf-section-head {
    flex-wrap: wrap;
  }

  .pf-section-title {
    flex-basis: calc(100% - 34px);
  }

  .pf-section-year {
    flex: 1;
  }

  .pf-photos,
  .pf-works {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .wp-search {
    width: 100%;
  }

  .wp-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
