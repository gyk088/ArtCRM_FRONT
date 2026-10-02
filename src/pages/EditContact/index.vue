<template>
  <div class="edit-contact-page">
    <div class="page-header">
      <div class="page-header-top">
        <MobileMenuButton />
        <h2 class="page-title">{{ isNewContact ? 'Новый контакт' : 'Редактировать контакт' }}</h2>
      </div>
      <p class="page-subtitle">{{ form.name || 'Без имени' }}</p>
    </div>

    <a-spin :spinning="loading">
      <div class="edit-container">
        <!-- Левая колонка — форма -->
        <div class="left-column">
          <a-form layout="vertical" :model="form" class="contact-form">
            <div class="field-row">
              <a-form-item label="ФИО" required class="field-half">
                <a-input v-model:value="form.name" placeholder="Иванов Иван Иванович" />
              </a-form-item>
              <a-form-item label="Телефон" class="field-half">
                <a-input v-model:value="form.phone" placeholder="+375 (__) ___-__-__" />
              </a-form-item>
            </div>

            <div class="field-row">
              <a-form-item label="Email" class="field-half">
                <a-input v-model:value="form.email" placeholder="email@example.com" />
              </a-form-item>
              <a-form-item label="Мессенджер" class="field-half">
                <a-input v-model:value="form.messenger" placeholder="Telegram, WhatsApp и т.д.">
                  <template #suffix>
                    <button type="button" class="messenger-scan-btn" title="Сканировать QR код" @click="isMessengerScanOpen = true">
                      <QrcodeOutlined />
                    </button>
                  </template>
                </a-input>
              </a-form-item>
            </div>

            <div class="field-row">
              <a-form-item label="Компания" class="field-half">
                <a-input v-model:value="form.company" placeholder="Название организации" />
              </a-form-item>
              <a-form-item label="Город" class="field-half">
                <a-input v-model:value="form.city" placeholder="Город" />
              </a-form-item>
            </div>

            <div class="field-row">
              <a-form-item label="Источник" class="field-half">
                <a-select
                  v-model:value="form.source"
                  :options="sourceOptions"
                  placeholder="Откуда пришёл контакт"
                  allow-clear
                />
              </a-form-item>
              <a-form-item label="Категория" class="field-half">
                <a-select
                  v-model:value="form.category"
                  :options="categoryOptions"
                  placeholder="Тип контакта"
                  allow-clear
                />
              </a-form-item>
            </div>

            <a-form-item label="День рождения">
              <a-date-picker
                v-model:value="form.birthday"
                value-format="YYYY-MM-DD"
                placeholder="Выберите дату"
                style="width: 100%"
              />
            </a-form-item>

            <a-form-item label="Заметки">
              <a-textarea v-model:value="form.notes" placeholder="Любая полезная информация" :rows="3" />
            </a-form-item>
          </a-form>

          <div class="buttons-wrapper">
            <a-button type="primary" :loading="saving" @click="handleSave" class="save-btn">
              Сохранить
            </a-button>
            <a-button :disabled="saving" @click="goBack" class="back-btn">
              Отмена
            </a-button>
          </div>
        </div>

        <!-- Правая колонка — работы, отдельно от формы -->
        <div class="right-column">
          <section class="form-section works-card">
            <div class="section-heading">Работы</div>

            <template v-if="!isNewContact">
              <div class="works-group">
                <div class="works-group-title">Уже купил</div>
                <div v-if="purchasedWorks.length" class="works-list">
                  <div v-for="work in purchasedWorks" :key="work.id" class="work-chip">
                    <img v-if="work.avatar?.url" :src="work.avatar.url" class="work-chip-img" />
                    <div v-else class="work-chip-img work-chip-img--empty"><PictureOutlined /></div>
                    <span class="work-chip-name">{{ work.name || 'Без названия' }}</span>
                    <button type="button" class="work-chip-remove" title="Отвязать" @click="handleRemoveWork(work)">
                      <CloseOutlined />
                    </button>
                  </div>
                </div>
                <p v-else class="works-empty">Пока ничего не отмечено</p>
              </div>

              <div class="works-group">
                <div class="works-group-title">Интересуется</div>
                <div v-if="interestedWorks.length" class="works-list">
                  <div v-for="work in interestedWorks" :key="work.id" class="work-chip">
                    <img v-if="work.avatar?.url" :src="work.avatar.url" class="work-chip-img" />
                    <div v-else class="work-chip-img work-chip-img--empty"><PictureOutlined /></div>
                    <span class="work-chip-name">{{ work.name || 'Без названия' }}</span>
                    <a-button type="text" size="small" title="Отметить купленной" @click="handleMarkPurchased(work)">
                      <CheckOutlined />
                    </a-button>
                    <button type="button" class="work-chip-remove" title="Отвязать" @click="handleRemoveWork(work)">
                      <CloseOutlined />
                    </button>
                  </div>
                </div>
                <p v-else class="works-empty">Пока ничего не отмечено</p>
              </div>

              <a-button class="add-work-btn" @click="openWorkPicker">
                <template #icon><PlusOutlined /></template>
                Добавить работу
              </a-button>
            </template>
            <p v-else class="works-hint">Сохраните контакт, чтобы отмечать связанные с ним работы</p>
          </section>
        </div>
      </div>
    </a-spin>

    <!-- Добавление работы контакту — тот же модал выбора работ, что и в ссылках -->
    <a-modal
      v-model:open="isWorkPickerOpen"
      title="Добавить работу"
      :width="isMobile ? '96vw' : '1300px'"
      centered
      ok-text="Добавить"
      cancel-text="Отмена"
      :get-container="false"
      :confirm-loading="addingWorks"
      :ok-button-props="{ disabled: !pickerSelectedKeys.length }"
      @ok="handleAddWorks"
    >
      <a-radio-group v-model:value="pickerStatus" class="picker-status-group">
        <a-radio-button value="purchased">Уже купил</a-radio-button>
        <a-radio-button value="interested">Интересуется</a-radio-button>
      </a-radio-group>

      <div class="modal-filters-panel">
        <a-select v-model:value="filterArtist" mode="multiple" placeholder="Художник" allowClear style="width: 180px" max-tag-count="responsive" :options="artistOptions" />
        <a-select v-model:value="filterLocation" mode="multiple" placeholder="Локация" allowClear style="width: 180px" max-tag-count="responsive" :options="locationOptions" />
        <a-select v-model:value="filterSeria" mode="multiple" placeholder="Серия" allowClear style="width: 180px" max-tag-count="responsive" :options="seriaOptions" />
        <a-select v-model:value="filterMedia" mode="multiple" placeholder="Медиа" allowClear style="width: 180px" max-tag-count="responsive" :options="mediaOptions" />
        <a-select v-model:value="filterStatus" mode="multiple" placeholder="Статус" allowClear style="width: 180px" max-tag-count="responsive" :options="statusOptions" />
        <a-input-number v-model:value="filterPriceFrom" placeholder="Цена от" :min="0" style="width: 120px" />
        <a-input-number v-model:value="filterPriceTo" placeholder="Цена до" :min="0" style="width: 120px" />
      </div>

      <div class="modal-selected-count">Выбрано работ: {{ pickerSelectedKeys.length }}</div>

      <WorksPickerTable
        :data="filteredPickerWorks"
        :columns="pickerColumns"
        v-model:selected-row-keys="pickerSelectedKeys"
        :loading="artWorkStore.loading"
      >
        <template #cell="{ column, record }">
          <template v-if="column.dataIndex === 'avatar'">
            <img v-if="record.avatar?.url" :src="record.avatar.url" class="preview-img" />
            <div v-else class="img-placeholder"><PictureOutlined /></div>
          </template>
          <template v-else-if="column.dataIndex === 'artist'">
            {{ getArtistName(record.artist) }}
          </template>
          <template v-else-if="column.dataIndex === 'media'">
            {{ getMediaName(record.media) }}
          </template>
          <template v-else-if="column.dataIndex === 'seria'">
            {{ getSeriaName(record.seria) }}
          </template>
          <template v-else-if="column.dataIndex === 'location'">
            {{ getLocationName(record.location) }}
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            {{ getStatusName(record.status) }}
          </template>
          <template v-else>
            {{ record[column.dataIndex] }}
          </template>
        </template>
      </WorksPickerTable>
    </a-modal>

    <QrScannerModal v-model:open="isMessengerScanOpen" pick-mode @scanned="handleMessengerScanned" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { PlusOutlined, QrcodeOutlined, PictureOutlined, CloseOutlined, CheckOutlined } from '@ant-design/icons-vue'
import { useContact } from '@/stores/contact.js'
import { useArtWork } from '@/stores/artWork.js'
import { useArtist } from '@/stores/artist.js'
import { useSerias } from '@/stores/seria.js'
import { useMedia } from '@/stores/media.js'
import { useLocations } from '@/stores/locations.js'
import { useStatuses } from '@/stores/statuses.js'
import { useContactSource } from '@/stores/contactSource.js'
import { useContactCategory } from '@/stores/contactCategory.js'
import { getUser } from '@/services/auth.js'
import { useIsMobile } from '@/composables/useIsMobile.js'
import MobileMenuButton from '@/components/MobileMenuButton.vue'
import QrScannerModal from '@/components/QrScannerModal.vue'
import WorksPickerTable from '@/components/WorksPickerTable.vue'

const route = useRoute()
const router = useRouter()
const contactStore = useContact()
const artWorkStore = useArtWork()
const artistStore = useArtist()
const seriasStore = useSerias()
const mediaStore = useMedia()
const locationsStore = useLocations()
const statusesStore = useStatuses()
const contactSourceStore = useContactSource()
const contactCategoryStore = useContactCategory()
const { isMobile } = useIsMobile()

const isNewContact = computed(() => route.params.id === 'new')
const loading = ref(false)
const saving = ref(false)

const EMPTY_FORM = { name: '', phone: '', email: '', messenger: '', company: '', city: '', source: null, category: null, birthday: null, notes: '' }
const form = ref({ ...EMPTY_FORM })
const currentContact = ref(null)

const purchasedWorks = computed(() => (currentContact.value?.works || []).filter(w => w.status === 'purchased'))
const interestedWorks = computed(() => (currentContact.value?.works || []).filter(w => w.status === 'interested'))

function getArtistName(artistId) {
  if (!artistId) return '—'
  const artist = artistStore.listArtists.find(a => a.id === artistId)
  return artist ? artist.name : '—'
}

function getMediaName(mediaId) {
  if (!mediaId) return '—'
  const media = mediaStore.listMedia.find(m => m.id === mediaId)
  return media ? media.name : '—'
}

function getSeriaName(seriaId) {
  if (!seriaId) return '—'
  const seria = seriasStore.listSerias.find(s => s.id === seriaId)
  return seria ? seria.name : '—'
}

function getLocationName(locationId) {
  if (!locationId) return '—'
  const location = locationsStore.listLocations.find(l => l.id === locationId)
  return location ? location.name : '—'
}

function getStatusName(statusId) {
  if (!statusId) return '—'
  const status = statusesStore.listStatuses.find(s => s.id === statusId)
  return status ? status.name : '—'
}

const sourceOptions = computed(() => contactSourceStore.listSources.map(s => ({ label: s.name, value: s.id })))
const categoryOptions = computed(() => contactCategoryStore.listCategories.map(c => ({ label: c.name, value: c.id })))

const isMessengerScanOpen = ref(false)
function handleMessengerScanned(data) {
  form.value.messenger = data
  message.success('Ссылка из QR добавлена в поле «Мессенджер»')
}

async function loadContact() {
  if (isNewContact.value) return

  loading.value = true
  try {
    const contact = await contactStore.getContactById(route.params.id)
    if (contact) {
      currentContact.value = contact
      form.value = {
        name: contact.name || '',
        phone: contact.phone || '',
        email: contact.email || '',
        messenger: contact.messenger || '',
        company: contact.company || '',
        city: contact.city || '',
        source: contact.source || null,
        category: contact.category || null,
        birthday: contact.birthday ? contact.birthday.slice(0, 10) : null,
        notes: contact.notes || '',
      }
    } else {
      message.error('Контакт не найден')
      goBack()
    }
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  const name = form.value.name.trim()
  if (!name) {
    message.warning('Введите ФИО')
    return
  }

  saving.value = true
  try {
    const payload = {
      name,
      phone: form.value.phone.trim(),
      email: form.value.email.trim(),
      messenger: form.value.messenger.trim(),
      company: form.value.company.trim(),
      city: form.value.city.trim(),
      source: form.value.source || null,
      category: form.value.category || null,
      birthday: form.value.birthday || null,
      notes: form.value.notes.trim(),
    }

    let result
    if (isNewContact.value) {
      result = await contactStore.createContact({ user_id: getUser()?.id, ...payload })
    } else {
      result = await contactStore.updateContact({ id: route.params.id, ...payload })
    }

    if (result) {
      router.push({ name: 'contacts' })
    }
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.push({ name: 'contacts' })
}

// === Добавление работ контакту — фильтры и колонки как в модалке выбора
// работ на странице Ссылки, плюс переключатель купил/интересуется ===
const isWorkPickerOpen = ref(false)
const pickerStatus = ref('purchased')
const pickerSelectedKeys = ref([])
const addingWorks = ref(false)

const filterArtist = ref([])
const filterLocation = ref([])
const filterSeria = ref([])
const filterMedia = ref([])
const filterStatus = ref([])
const filterPriceFrom = ref(null)
const filterPriceTo = ref(null)

const artistOptions = computed(() => artistStore.listArtists.map(a => ({ label: a.name, value: a.id })))
const locationOptions = computed(() => locationsStore.listLocations.map(l => ({ label: l.name, value: l.id })))
const seriaOptions = computed(() => seriasStore.listSerias.map(s => ({ label: s.name, value: s.id })))
const mediaOptions = computed(() => mediaStore.listMedia.map(m => ({ label: m.name, value: m.id })))
const statusOptions = computed(() => statusesStore.listStatuses.map(s => ({ label: s.name, value: s.id })))

const filteredPickerWorks = computed(() => {
  let result = artWorkStore.listArtWorks

  if (filterArtist.value?.length) result = result.filter(w => filterArtist.value.includes(w.artist))
  if (filterLocation.value?.length) result = result.filter(w => filterLocation.value.includes(w.location))
  if (filterSeria.value?.length) result = result.filter(w => filterSeria.value.includes(w.seria))
  if (filterMedia.value?.length) result = result.filter(w => filterMedia.value.includes(w.media))
  if (filterStatus.value?.length) result = result.filter(w => filterStatus.value.includes(w.status))
  if (filterPriceFrom.value != null) result = result.filter(w => Number(w.price) >= filterPriceFrom.value)
  if (filterPriceTo.value != null) result = result.filter(w => Number(w.price) <= filterPriceTo.value)

  return result
})

const pickerColumns = [
  { title: 'Картина', dataIndex: 'avatar', key: 'avatar', width: 70 },
  { title: 'Название', dataIndex: 'name', key: 'name', sorter: (a, b) => (a.name || '').localeCompare(b.name || '', 'ru') },
  { title: 'Художник', dataIndex: 'artist', key: 'artist', sorter: (a, b) => getArtistName(a.artist).localeCompare(getArtistName(b.artist), 'ru') },
  { title: 'Медиа', dataIndex: 'media', key: 'media', sorter: (a, b) => getMediaName(a.media).localeCompare(getMediaName(b.media), 'ru') },
  { title: 'Серия', dataIndex: 'seria', key: 'seria', sorter: (a, b) => getSeriaName(a.seria).localeCompare(getSeriaName(b.seria), 'ru') },
  { title: 'Локация', dataIndex: 'location', key: 'location', sorter: (a, b) => getLocationName(a.location).localeCompare(getLocationName(b.location), 'ru') },
  { title: 'Статус', dataIndex: 'status', key: 'status', width: 120, sorter: (a, b) => getStatusName(a.status).localeCompare(getStatusName(b.status), 'ru') },
  { title: 'Цена', dataIndex: 'price', key: 'price', width: 100, sorter: (a, b) => a.price - b.price },
]

function openWorkPicker() {
  pickerStatus.value = 'purchased'
  pickerSelectedKeys.value = []
  filterArtist.value = []
  filterLocation.value = []
  filterSeria.value = []
  filterMedia.value = []
  filterStatus.value = []
  filterPriceFrom.value = null
  filterPriceTo.value = null
  isWorkPickerOpen.value = true
}

async function handleAddWorks() {
  if (!currentContact.value || !pickerSelectedKeys.value.length) return

  addingWorks.value = true
  try {
    for (const artId of pickerSelectedKeys.value) {
      const works = await contactStore.addWorkToContact(currentContact.value.id, artId, pickerStatus.value)
      if (works) currentContact.value = { ...currentContact.value, works }
    }
    isWorkPickerOpen.value = false
  } finally {
    addingWorks.value = false
  }
}

async function handleMarkPurchased(work) {
  const works = await contactStore.updateContactWorkStatus(currentContact.value.id, work.id, 'purchased')
  if (works) currentContact.value = { ...currentContact.value, works }
}

async function handleRemoveWork(work) {
  const works = await contactStore.removeWorkFromContact(currentContact.value.id, work.id)
  if (works) currentContact.value = { ...currentContact.value, works }
}

onMounted(async () => {
  await Promise.all([
    loadContact(),
    artWorkStore.getListArtWorks(),
    artistStore.getListArtists(),
    seriasStore.getListSerias(),
    mediaStore.getListMedia(),
    locationsStore.getListLocations(),
    statusesStore.getListStatuses(),
    contactSourceStore.getListSources(),
    contactCategoryStore.getListCategories(),
  ])
})
</script>

<style scoped>
.edit-contact-page {
  --bg: #f7f5f0;
  --bg-elevated: #ffffff;
  --card-bg: #efece4;
  --text-title: #211f1a;
  --text-body: #2c2a25;
  --text-muted: #5a564c;
  --text-faint: #7c7669;
  --accent: #8a6d2f;
  --accent-strong: #6f581f;
  --border: rgba(0, 0, 0, 0.08);
  --border-soft: rgba(0, 0, 0, 0.06);

  background: var(--bg);
  color: var(--text-body);
  border-radius: 14px;
  padding: 20px 24px 40px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.page-header-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 26px;
  font-weight: 600;
  color: var(--text-title);
  margin: 0 0 4px;
}

.page-subtitle {
  margin: 0 0 20px;
  font-size: 13px;
  color: var(--text-faint);
}

/* === КОЛОНКИ === */
.edit-container {
  display: flex;
  gap: 20px;
}

.left-column {
  width: 60%;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.right-column {
  width: 40%;
  padding-left: 20px;
  border-left: 1px solid var(--border);
}

.contact-form {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 24px;
}

.field-row {
  display: flex;
  gap: 12px;
}

.field-row .field-half {
  flex: 1;
  min-width: 0;
}

.messenger-scan-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 0;
  color: var(--text-faint);
  font-size: 15px;
  cursor: pointer;
}

.messenger-scan-btn:hover {
  color: var(--accent);
}

.section-heading {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 12px;
}

.form-section {
  background: var(--bg-elevated);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 16px;
}

.works-hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-faint);
}

.works-group {
  margin-bottom: 16px;
}

.works-group-title {
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.works-empty {
  margin: 0;
  font-size: 12px;
  color: var(--text-faint);
}

.works-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.work-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: var(--card-bg);
  border-radius: 8px;
}

.work-chip-img {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.work-chip-img--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-elevated);
  color: var(--text-faint);
  font-size: 14px;
}

.work-chip-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--text-body);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-chip-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-faint);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  flex-shrink: 0;
}

.work-chip-remove:hover {
  color: #b43c3c;
  background: rgba(180, 60, 60, 0.1);
}

.add-work-btn {
  align-self: flex-start;
  border-color: var(--accent);
  color: var(--accent);
}

.add-work-btn:hover {
  border-color: var(--accent-strong) !important;
  color: var(--accent-strong) !important;
}

.picker-status-group {
  margin-bottom: 12px;
}

.modal-filters-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}

.modal-selected-count {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 500;
  color: var(--accent);
}

.preview-img {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
}

.img-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card-bg);
  color: var(--text-faint);
}

.buttons-wrapper {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.save-btn {
  background-color: var(--accent) !important;
  border-color: var(--accent) !important;
  border-radius: 20px !important;
  font-weight: 500;
}

.save-btn:hover {
  background-color: var(--accent-strong) !important;
  border-color: var(--accent-strong) !important;
}

.back-btn {
  border-radius: 20px !important;
  border-color: var(--border) !important;
  color: var(--text-muted) !important;
  background: transparent !important;
}

.back-btn:hover {
  border-color: var(--accent) !important;
  color: var(--accent) !important;
}

@media (max-width: 900px) {
  .edit-container {
    flex-direction: column;
  }

  .left-column,
  .right-column {
    width: 100%;
  }

  .right-column {
    padding-left: 0;
    border-left: none;
    padding-top: 20px;
    border-top: 1px solid var(--border);
  }
}

@media (max-width: 700px) {
  .field-row {
    flex-direction: column;
    gap: 0;
  }

  .contact-form {
    padding: 16px;
  }
}
</style>
