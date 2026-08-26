<template>
  <div class="edit-page">
    <div class="page-header">
      <h2 class="page-title">{{ isNewWork ? "Новая работа" : "Редактировать работу" }}</h2>
      <p class="page-subtitle">{{ form.name || "Без названия" }}</p>
    </div>

    <a-spin :spinning="loading" wrapperClassName="edit-spin-wrapper">
      <div class="edit-container">

        <!-- Левая колонка — ИЗОБРАЖЕНИЯ -->
        <div class="images-column">
          <section class="form-section images-card">
            <a-form-item label="Главное изображение" :label-col="{ span: 24 }" :wrapper-col="{ span: 24 }"
              class="images-item">
              <div v-if="!form.avatar" class="upload-trigger" @click="openFilesModal('avatar')">
                <div class="upload-placeholder avatar-placeholder">
                  <PlusOutlined />
                  <div>Загрузить</div>
                </div>
              </div>

              <div v-else class="avatar-preview">
                <img :src="form.avatar.url" class="avatar-image" @click="openViewer(0)" />
                <button class="download-btn" title="Скачать" @click.stop="handleDownload(form.avatar)">
                  <DownloadOutlined />
                </button>
                <button class="delete-btn" @click.stop="removeAvatar">×</button>
              </div>
            </a-form-item>

            <a-form-item label="Изображения" :label-col="{ span: 24 }" :wrapper-col="{ span: 24 }" class="images-item">
              <div class="images-row">
                <div class="upload-trigger" @click="openFilesModal('images')">
                  <div class="upload-placeholder">
                    <PlusOutlined />
                    <div>Загрузить</div>
                  </div>
                </div>

                <div v-for="(img, index) in form.images" :key="img.id" class="image-container">
                  <img :src="img.url" class="preview-image" @click="openViewer(avatarOffset + index)" />
                  <button class="download-btn" title="Скачать" @click.stop="handleDownload(img)">
                    <DownloadOutlined />
                  </button>
                  <button class="delete-btn" @click.stop="removeImage(index)">×</button>
                </div>
              </div>

              <p v-if="!form.images.length" class="empty-hint">Дополнительные изображения ещё не добавлены</p>
            </a-form-item>
          </section>
        </div>

        <!-- Правая колонка — ФОРМА -->
        <div class="form-column">
          <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">

            <section class="form-section">
              <div class="section-heading">Основная информация</div>

              <a-form-item label="Название" name="name" class="field-full">
                <a-input v-model:value="form.name" class="fixed-input" />
              </a-form-item>

              <a-form-item label="Художник" class="field-full">
                <a-select v-model:value="form.artist" :options="artistOptions" :disabled="isArtistRole"
                  class="series-select" :allowClear="!isArtistRole">
                  <template #dropdownRender="{ menuNode: menu }">
                    <VNodes :vnodes="menu" />

                    <a-divider style="margin: 4px 0" />

                    <div class="chip-list">
                      <span v-for="(item, idx) in artistOptions" :key="item.value" class="chip">
                        {{ item.label }}
                        <button @click.prevent="removeArtist(idx)" class="chip-remove">×</button>
                      </span>
                    </div>

                    <a-space class="add-row">
                      <a-input ref="artistInputRef" v-model:value="newArtist"
                        @keyup.enter="addArtist" />
                      <a-button type="text" @click="addArtist">
                        <template #icon>
                          <PlusOutlined />
                        </template>
                        Добавить
                      </a-button>
                    </a-space>
                  </template>
                </a-select>
              </a-form-item>

              <a-form-item label="Описание" class="field-full">
                <a-textarea v-model:value="form.description" class="fixed-input description-input" />
              </a-form-item>
            </section>

            <section class="form-section">
              <div class="section-heading">Классификация</div>

              <div class="field-row">
                <a-form-item label="Техника" class="field-half">
                  <a-input v-model:value="form.technique" placeholder="Например, холст, масло" class="fixed-input" />
                </a-form-item>

                <a-form-item label="Размер" class="field-half">
                  <a-input v-model:value="form.size" placeholder="Например, 60×80 см" class="fixed-input" />
                </a-form-item>

                <a-form-item label="Год" class="field-half">
                  <a-date-picker v-model:value="form.year" picker="year" valueFormat="YYYY" format="YYYY" placeholder="Год создания"
                    @change="onYearSelect" ref="yearPicker" class="fixed-input" :allowClear="false" />
                </a-form-item>
              </div>

              <div class="field-row">
                <a-form-item label="Город" class="field-half">
                  <a-select v-model:value="form.address" placeholder="Выберите или введите город" class="series-select"
                    :options="items.map(item => ({ value: item }))" allowClear>
                    <template #dropdownRender="{ menuNode: menu }">
                      <VNodes :vnodes="menu" />
                      <a-divider style="margin: 4px 0" />
                      <div class="chip-list">
                        <span v-for="(item, idx) in items" :key="item" class="chip">
                          {{ item }}
                          <button @click.prevent="removeItem(idx)" class="chip-remove">×</button>
                        </span>
                      </div>
                      <a-space class="add-row">
                        <a-input ref="inputRef" v-model:value="name" placeholder="Введите город" @keyup.enter="addItem" />
                        <a-button type="text" @click="addItem">
                          <template #icon>
                            <PlusOutlined />
                          </template>
                          Добавить
                        </a-button>
                      </a-space>
                    </template>
                  </a-select>
                </a-form-item>

                <a-form-item label="Серия" class="field-half">
                  <a-select v-model:value="form.seria" :options="seriesOptions" placeholder="Введите или выберите серию"
                    class="series-select" allowClear>
                    <template #dropdownRender="{ menuNode: menu }">
                      <VNodes :vnodes="menu" />

                      <a-divider style="margin: 4px 0" />

                      <!-- Блок списка серий с кнопками удаления -->
                      <div class="chip-list">
                        <span v-for="(item, idx) in seriesOptions" :key="item.value" class="chip">
                          {{ item.label }}
                          <button @click.prevent="removeSeries(idx)" class="chip-remove">×</button>
                        </span>
                      </div>

                      <!-- Добавляем инпут для добавления новой серии (как у городов) -->
                      <a-space class="add-row">
                        <a-input ref="seriesInputRef" v-model:value="newSeries" placeholder="Введите серию"
                          @keyup.enter="addSeries" />
                        <a-button type="text" @click="addSeries">
                          <template #icon>
                            <PlusOutlined />
                          </template>
                          Добавить
                        </a-button>
                      </a-space>
                    </template>
                  </a-select>
                </a-form-item>
              </div>

              <div class="field-row">
                <!-- Поле Медиа (после серии) -->
                <a-form-item label="Медиа" class="field-half">
                  <a-select v-model:value="form.media" :options="mediaOptions" placeholder="Введите или выберите медиа"
                    class="series-select" allowClear>
                    <template #dropdownRender="{ menuNode: menu }">
                      <VNodes :vnodes="menu" />

                      <a-divider style="margin: 4px 0" />

                      <div class="chip-list">
                        <span v-for="(item, idx) in mediaOptions" :key="item.value" class="chip">
                          {{ item.label }}
                          <button @click.prevent="removeMedia(idx)" class="chip-remove">×</button>
                        </span>
                      </div>

                      <a-space class="add-row">
                        <a-input ref="mediaInputRef" v-model:value="newMedia" placeholder="Введите медиа"
                          @keyup.enter="addMedia" />
                        <a-button type="text" @click="addMedia">
                          <template #icon>
                            <PlusOutlined />
                          </template>
                          Добавить
                        </a-button>
                      </a-space>
                    </template>
                  </a-select>
                </a-form-item>

                <a-form-item label="Статус" class="field-half">
                  <a-select v-model:value="form.status" placeholder="Выберите статус" class="status-select" allowClear>
                    <template #dropdownRender="{ menuNode: menu }">
                      <VNodes :vnodes="menu" />

                      <a-divider style="margin: 4px 0" />

                      <!-- Блок списка статусов с кнопками удаления -->
                      <div class="chip-list">
                        <span v-for="(item, idx) in statusOptions" :key="item.value" class="chip">
                          {{ item.label }}
                          <button @click.prevent="removeStatus(idx)" class="chip-remove">×</button>
                        </span>
                      </div>

                      <!-- Добавляем инпут для добавления нового статуса -->
                      <a-space class="add-row">
                        <a-input ref="statusInputRef" v-model:value="newStatus" placeholder="Введите статус"
                          @keyup.enter="addStatus" />
                        <a-button type="text" @click="addStatus">
                          <template #icon>
                            <PlusOutlined />
                          </template>
                          Добавить
                        </a-button>
                      </a-space>
                    </template>

                    <a-select-option v-for="status in statusOptions" :key="status.value" :value="status.value">
                      {{ status.label }}
                    </a-select-option>
                  </a-select>
                </a-form-item>
              </div>
            </section>

            <section class="form-section">
              <div class="section-heading">Стоимость</div>

              <div class="field-row">
                <a-form-item label="Стоимость" class="field-half">
                  <a-input-group compact class="price-group">
                    <a-input-number
                      v-model:value="form.price"
                      placeholder="0"
                      class="price-input"
                      :min="0"
                      :formatter="value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')"
                      :parser="value => value.replace(/\s/g, '')"
                    />
                    <a-select v-model:value="form.currency" class="currency-select" :options="currencyOptions" />
                  </a-input-group>
                </a-form-item>
              </div>
            </section>

            <div class="buttons-wrapper">
              <a-button type="primary" :loading="loading" @click="saveChanges" class="save-btn">
                Сохранить
              </a-button>

              <a-button :disabled="loading" @click="goBack" class="back-btn">
                Отмена
              </a-button>
            </div>
          </a-form>
        </div>
      </div>
    </a-spin>

    <!-- Lightbox -->
    <div v-if="isViewerVisible" class="lightbox" @click.self="closeViewer">
      <button class="nav-btn prev" @click.stop="prevImage">⟨</button>
      <img :src="currentImage" class="lightbox-image" />
      <button class="nav-btn next" @click.stop="nextImage">⟩</button>
      <button class="lightbox-download-btn" title="Скачать" @click.stop="handleDownload(currentGalleryItem)">
        <DownloadOutlined />
      </button>
      <button class="close-btn" @click="closeViewer">×</button>
    </div>

    <a-drawer v-model:open="isFilesModalOpen" title="Файлы" placement="right" width="700px" destroyOnClose>
      <FileUploader :remove="true" :select="true" @select="handleFileSelect" />
    </a-drawer>

  </div>
</template>


<script setup>
import { ref, reactive, computed, onMounted, defineComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PlusOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useSerias } from '@/stores/seria.js'
import { useLocations } from '@/stores/locations.js'
import { useStatuses } from '@/stores/statuses.js'
import { useMedia } from '@/stores/media.js'
import { useArtist } from '@/stores/artist.js'
import { useArtWork } from '@/stores/artWork.js'
import FileUploader from "@/components/FileUploader.vue"
import { downloadFile } from '@/utils/downloadFile.js'
import { getUser } from '@/services/auth.js'
import { ROLES } from '@/services/const'

const seriasStore = useSerias();
const locationsStore = useLocations()
const statusesStore = useStatuses()
const mediaStore = useMedia()
const artistStore = useArtist()
const artWorkStore = useArtWork()

const route = useRoute()
const router = useRouter()
const collectionList = ref([]);
const seriesOptions = ref([])
const yearPicker = ref(null)
const seriesInputRef = ref(null)
const newSeries = ref('')
const statusOptions = ref([])
const newStatus = ref('')
const statusInputRef = ref(null)
const mediaOptions = ref([])
const newMedia = ref('')
const mediaInputRef = ref(null)
const artistOptions = ref([])
const newArtist = ref('')
const artistInputRef = ref(null)
const loading = ref(false)
const isFilesModalOpen = ref(false)
const uploadTarget = ref('avatar')
const formRef = ref(null)
const isNewWork = computed(() => route.params.id === 'new')

// Для роли "художник" поле "Художник" всегда — сам пользователь, выбор запрещён
const isArtistRole = computed(() => getUser()?.role === ROLES.ARTIST)

const rules = {
  name: [{ required: true, message: 'Введите название работы', trigger: 'blur' }]
}

const VNodes = defineComponent({
  props: { vnodes: { type: Object, required: true } },
  render() { return this.vnodes }
})

const items = ref([])
const inputRef = ref()
const name = ref('')
const form = reactive({
  id: null,
  avatar: null,
  name: '',
  technique: '',
  size: '',
  year: '',
  description: '',
  address: null,
  seria: null,
  media: null,
  status: null,
  artist: null,
  price: '',
  currency: 'RUB',
  collections: [],
  images: []
})

const currencyOptions = [
  { label: '₽ RUB', value: 'RUB' },
  { label: 'Br BYN', value: 'BYN' },
  { label: '$ USD', value: 'USD' },
  { label: '€ EUR', value: 'EUR' },
]

const getNameById = (id, store, listName) => {
  if (!id) return null
  const item = store[listName]?.find(i => i.id === id)
  return item ? item.name : id
}

// Загрузка работы для редактирования
const loadArtWork = async () => {
  if (route.params.id === 'new') return

  loading.value = true
  try {
    const work = await artWorkStore.getArtWorkById(route.params.id)
    if (work) {
      Object.assign(form, {
        id: work.id,
        name: work.name || '',
        technique: work.technique || '',
        size: work.size || '',
        year: work.year ? String(work.year) : '',
        description: work.description || '',
        address: getNameById(work.location, locationsStore, 'listLocations'),
        seria: work.seria || null,
        media: work.media || null,
        status: work.status || null,
        artist: work.artist || null,
        price: work.price || '',
        currency: work.currency || 'RUB',
        collections: work.collections || [],
        images: work.images || [],
        avatar: work.avatar || null
      })
    }
  } catch (error) {
    console.error('Error loading artwork:', error)
    message.error('Ошибка загрузки работы')
  } finally {
    loading.value = false
  }
}

// Загрузка серий из API
const loadSeriesFromAPI = async () => {
  try {
    await seriasStore.getListSerias()
    const apiSeries = seriasStore.listSerias.map(seria => ({
      label: seria.name,
      value: seria.id
    }))
    const allSeries = [...apiSeries]

    seriesOptions.value = allSeries
    console.log('Series loaded:', seriesOptions.value)
  } catch (error) {
    console.error('Error loading series:', error)
    seriesOptions.value = []
  }
}

// Загрузка локаций из API
const loadLocationsFromAPI = async () => {
  try {
    await locationsStore.getListLocations()
    const apiLocations = locationsStore.listLocations.map(loc => loc.name)
    items.value = apiLocations

    console.log('Locations loaded:', locationsStore.listLocations)
  } catch (error) {
    console.error('Error loading locations:', error)
  }
}

// Загрузка статусов из API
const loadStatusesFromAPI = async () => {
  try {
    await statusesStore.getListStatuses()
    const apiStatuses = statusesStore.listStatuses.map(status => ({
      label: status.name,
      value: status.id
    }))

    const allStatuses = [...apiStatuses]

    statusOptions.value = allStatuses
    console.log('Statuses loaded:', statusOptions.value)
  } catch (error) {
    console.error('Error loading statuses:', error)
    statusOptions.value = []
    message.warning('Загружены локальные статусы (API недоступен)')
  }
}

// Загрузка медиа из API
const loadMediaFromAPI = async () => {
  try {
    await mediaStore.getListMedia()
    const apiMedia = mediaStore.listMedia.map(media => ({
      label: media.name,
      value: media.id
    }))

    const allMedia = [...apiMedia]

    mediaOptions.value = allMedia
    console.log('Media loaded:', mediaOptions.value)
  } catch (error) {
    console.error('Error loading media:', error)
    mediaOptions.value = []
  }
}

// Загрузка Художников из API
const loadArtistsFromAPI = async () => {
  try {
    await artistStore.getListArtists()
    const apiArtists = artistStore.listArtists.map(artist => ({
      label: artist.name,
      value: artist.id
    }))

    artistOptions.value = apiArtists
    console.log('Artists loaded:', artistOptions.value)
  } catch (error) {
    console.error('Error loading artists:', error)
    artistOptions.value = []
  }
}

// Гарантирует, что для роли "художник" в поле "Художник" стоит сам
// пользователь — создаёт запись художника с его именем, если её ещё нет,
// и принудительно проставляет её в форму (перекрывая то, что могло
// загрузиться из существующей работы при редактировании).
const ensureOwnArtistSelected = async () => {
  if (!isArtistRole.value) return

  const user = getUser()
  const fullName = [user?.name, user?.surname].filter(Boolean).join(' ').trim()
  if (!fullName) return

  let ownArtist = artistOptions.value.find(opt => opt.label === fullName)

  if (!ownArtist) {
    try {
      const created = await artistStore.createArtist({ user_id: user?.id, name: fullName })
      if (created?.id) {
        ownArtist = { label: created.name, value: created.id }
        artistOptions.value.push(ownArtist)
      }
    } catch (error) {
      console.error('Не удалось создать запись художника для текущего пользователя:', error)
    }
  }

  if (ownArtist) {
    form.artist = ownArtist.value
  }
}

onMounted(async () => {
  await loadSeriesFromAPI()
  await loadLocationsFromAPI()
  await loadStatusesFromAPI()
  await loadMediaFromAPI()
  await loadArtistsFromAPI()
  await loadArtWork()
  await ensureOwnArtistSelected()
})

// === ИЗОБРАЖЕНИЯ ===
const openFilesModal = (target) => {
  uploadTarget.value = target
  isFilesModalOpen.value = true
}

// Обработка выбранного файла из FileUploader
const handleFileSelect = (file) => {
  console.log('Выбран файл:', file)
  
  // Формируем URL для отображения файла (как в FileView компоненте)
  const fileUrl = `https://dev.myoffer.life/files/${file.id}.${file.ext}`
  
  const fileData = {
    uid: file.id,
    name: file.name || file.filename || 'image',
    url: fileUrl,
    comment: file.comment || '',
    filename: file.filename,
    size: file.size,
    mimetype: file.mimetype,
    ext: file.ext,
    id: file.id
  }

  if (uploadTarget.value === 'avatar') {
    // Если есть старый URL из blob, освобождаем его
    if (form.avatar?.url && form.avatar.url.startsWith('blob:')) {
      URL.revokeObjectURL(form.avatar.url)
    }
    form.avatar = fileData
    console.log('Avatar обновлён:', form.avatar)
  } 
  else if (uploadTarget.value === 'images') {
    form.images.push(fileData)
    console.log('Images обновлены:', form.images)
  }

  isFilesModalOpen.value = false
  message.success('Изображение добавлено')
}

// Удаляем аватар
function removeAvatar() {
  form.avatar = null
}

const removeImage = (index) => {
  form.images.splice(index, 1)
};

// === lightbox ===
// Единая галерея для просмотра: главное изображение + дополнительные
const avatarOffset = computed(() => (form.avatar ? 1 : 0))
const galleryImages = computed(() => (form.avatar ? [form.avatar, ...form.images] : form.images))

const isViewerVisible = ref(false)
const currentIndex = ref(0)
const currentGalleryItem = computed(() => galleryImages.value[currentIndex.value])
const currentImage = computed(() => currentGalleryItem.value?.url)

function openViewer(index) {
  currentIndex.value = index
  isViewerVisible.value = true
}

function closeViewer() {
  isViewerVisible.value = false
}

function nextImage() {
  currentIndex.value = (currentIndex.value + 1) % galleryImages.value.length
}

function prevImage() {
  currentIndex.value =
    (currentIndex.value - 1 + galleryImages.value.length) % galleryImages.value.length
}

const handleDownload = async (item) => {
  try {
    await downloadFile(item)
  } catch (error) {
    console.error('Ошибка скачивания файла:', error)
    message.error('Не удалось скачать файл')
  }
}

const onYearSelect = (value) => {
  if (value) {
    form.year = value
  }
  if (yearPicker.value) {
    yearPicker.value.blur()
  }
}

// Удаление серии из списка
const removeSeries = async (idx) => {
  const removed = seriesOptions.value[idx]
  if (!removed) return

  try {
    await seriasStore.deleteSeria(removed.value)
    seriasStore.listSerias = seriasStore.listSerias.filter(s => s.id !== removed.value)
    message.success(`Серия "${removed.label}" удалена на сервере`)
  } catch (error) {
    console.error('Error deleting seria via API:', error)
  }

  // Если удалённая серия была выбрана, сбрасываем
  if (form.seria === removed.value) {
    form.seria = null
  }

  seriesOptions.value.splice(idx, 1)
}

// Добавление новой серии
const addSeries = async (e) => {
  e?.preventDefault()
  if (!newSeries.value.trim()) return

  const seriaName = newSeries.value.trim()
  const existingOption = seriesOptions.value.find(opt => opt.label === seriaName)

  if (existingOption) {
    form.seria = existingOption.value
    newSeries.value = ''
    return
  }

  let newOption = null

  try {
    const userId = localStorage.getItem('userId') || "e56094b2-3faf-4a7b-b494-4640dabcf08a"
    const newSeria = await seriasStore.createSeria({
      user_id: userId,
      name: seriaName
    })

    if (newSeria) {
      newOption = {
        label: newSeria.name,
        value: newSeria.id
      }
      message.success('Серия создана на сервере')
    }
  } catch (error) {
    console.error('Ошибка при создании серии через API:', error)
    message.warning('API недоступен, серия сохранена локально')
  }

  seriesOptions.value.push(newOption)
  form.seria = newOption.value

  newSeries.value = ''
  setTimeout(() => seriesInputRef.value?.focus(), 0)
}

// Удаление локации через API
const deleteLocation = async (locationId) => {
  try {
    await locationsStore.deleteLocation(locationId)
    console.log('Location deleted:', locationId)
    return true
  } catch (error) {
    console.error('Error deleting location:', error)
    return false
  }
}

const addItem = async (e) => {
  e?.preventDefault()
  const cityName = name.value.trim()
  if (!cityName) return

  if (items.value.includes(cityName)) {
    form.address = cityName
    name.value = ''
    return
  }

  try {
    const userId = localStorage.getItem('userId') || "e56094b2-3faf-4a7b-b494-4640dabcf08a"
    await locationsStore.createLocation({ user_id: userId, name: cityName })
    await locationsStore.getListLocations()
    items.value = locationsStore.listLocations.map(loc => loc.name)
    message.success(`Город "${cityName}" добавлен`)
  } catch (error) {
    console.error('Error creating location:', error)
    message.warning('Город добавлен локально')
    items.value.push(cityName)
  } finally {
    form.address = cityName
    name.value = ''
    inputRef.value?.focus()
  }
}

const removeItem = async (idx) => {
  const removedCity = items.value[idx]
  const locationToDelete = locationsStore.listLocations.find(loc => loc.name === removedCity)

  if (locationToDelete && locationToDelete.id) {
    await deleteLocation(locationToDelete.id)
    items.value.splice(idx, 1)
    message.success(`Город "${removedCity}" удалён`)
  }
}

// Создание нового статуса через API
const createStatus = async (statusName) => {
  try {
    const userId = localStorage.getItem('userId') || "e56094b2-3faf-4a7b-b494-4640dabcf08a"
    const newStatusData = await statusesStore.createStatus({
      user_id: userId,
      name: statusName
    })
    if (newStatusData) {
      console.log('Status created:', newStatusData)
      return true
    }
  } catch (error) {
    console.error('Error creating status:', error)
    return false
  }
}

// Удаление статуса через API
const deleteStatusAPI = async (statusId) => {
  try {
    await statusesStore.deleteStatus(statusId)
    console.log('Status deleted:', statusId)
    return true
  } catch (error) {
    console.error('Error deleting status:', error)
    return false
  }
}

// Добавление нового статуса
const addStatus = async (e) => {
  e?.preventDefault()
  if (!newStatus.value.trim()) return

  const statusName = newStatus.value.trim()
  const existingOption = statusOptions.value.find(opt => opt.label === statusName)

  if (existingOption) {
    if (!form.status || form.status !== existingOption.value) {
      form.status = existingOption.value
    }
    newStatus.value = ''
    return
  }
  let newOption = null

  try {
    const created = await createStatus(statusName)
    if (created) {
      await statusesStore.getListStatuses()
      const newStatusData = statusesStore.listStatuses.find(s => s.name === statusName)
      if (newStatusData) {
        newOption = {
          label: newStatusData.name,
          value: newStatusData.id
        }
        createdViaAPI = true
        message.success('Статус создан на сервере')
      }
    }
  } catch (error) {
    console.error('Ошибка при создании статуса через API:', error)
  }

  statusOptions.value.push(newOption)
  form.status = newOption.value

  newStatus.value = ''
  setTimeout(() => statusInputRef.value?.focus(), 0)
}

// Удаление статуса из списка
const removeStatus = async (idx) => {
  const removed = statusOptions.value[idx]
  if (!removed) return

  try {
    await deleteStatusAPI(removed.value)
    message.success(`Статус "${removed.label}" удалён на сервере`)
  } catch (error) {
    console.error('Error deleting status via API:', error)
  }

  if (form.status === removed.value) {
    form.status = null
  }
  statusOptions.value.splice(idx, 1)
}

// Создание нового медиа через API
const createMedia = async (mediaName) => {
  try {
    const userId = localStorage.getItem('userId') || "e56094b2-3faf-4a7b-b494-4640dabcf08a"
    const newMediaData = await mediaStore.createMedia({
      user_id: userId,
      name: mediaName
    })
    if (newMediaData) {
      console.log('Media created:', newMediaData)
      return true
    }
  } catch (error) {
    console.error('Error creating media:', error)
    return false
  }
}

// Удаление медиа через API
const deleteMediaAPI = async (mediaId) => {
  try {
    await mediaStore.deleteMedia(mediaId)
    console.log('Media deleted:', mediaId)
    return true
  } catch (error) {
    console.error('Error deleting media:', error)
    return false
  }
}

// Добавление нового медиа
const addMedia = async (e) => {
  e?.preventDefault()
  if (!newMedia.value.trim()) return

  const mediaName = newMedia.value.trim()
  const existingOption = mediaOptions.value.find(opt => opt.label === mediaName)

  if (existingOption) {
    form.media = existingOption.value
    newMedia.value = ''
    return
  }

  let newOption = null

  try {
    const created = await createMedia(mediaName)
    if (created) {
      await mediaStore.getListMedia()
      const newMediaData = mediaStore.listMedia.find(m => m.name === mediaName)
      if (newMediaData) {
        newOption = {
          label: newMediaData.name,
          value: newMediaData.id
        }
        message.success('Медиа создано на сервере')
      }
    }
  } catch (error) {
    console.error('Ошибка при создании медиа через API:', error)
  }

  mediaOptions.value.push(newOption)
  form.media = newOption.value

  newMedia.value = ''
  setTimeout(() => mediaInputRef.value?.focus(), 0)
}

// Удаление медиа из списка
const removeMedia = async (idx) => {
  const removed = mediaOptions.value[idx]
  if (!removed) return

  try {
    await deleteMediaAPI(removed.value)
    message.success(`Медиа "${removed.label}" удалено на сервере`)
  } catch (error) {
    console.error('Error deleting media via API:', error)
  }

  if (form.media === removed.value) {
    form.media = null
  }
  mediaOptions.value.splice(idx, 1)
}

// Добавление нового Художника
const addArtist = async (e) => {
  e?.preventDefault()
  if (!newArtist.value.trim()) return

  const artistName = newArtist.value.trim()
  const existingOption = artistOptions.value.find(opt => opt.label === artistName)

  if (existingOption) {
    form.artist = existingOption.value
    newArtist.value = ''
    return
  }

  let newOption = null

  try {
    const userId = localStorage.getItem('userId') || "e56094b2-3faf-4a7b-b494-4640dabcf08a"
    const newArtistData = await artistStore.createArtist({
      user_id: userId,
      name: artistName
    })

    if (newArtistData) {
      newOption = {
        label: newArtistData.name,
        value: newArtistData.id
      }
      message.success('Художник создан на сервере')
    }
  } catch (error) {
    console.error('Ошибка при создании художника через API:', error)
    message.warning('API недоступен, художник сохранён локально')
  }

  artistOptions.value.push(newOption)
  form.artist = newOption.value

  newArtist.value = ''
  setTimeout(() => artistInputRef.value?.focus(), 0)
}

// Удаление Художника из списка
const removeArtist = async (idx) => {
  const removed = artistOptions.value[idx]
  if (!removed) return

  try {
    await artistStore.deleteArtist(removed.value)
    message.success(`Художник "${removed.label}" удалён на сервере`)
  } catch (error) {
    console.error('Error deleting artist via API:', error)
  }

  if (form.artist === removed.value) {
    form.artist = null
  }
  artistOptions.value.splice(idx, 1)
}

const getLocationIdByName = (locationName) => {
  if (!locationName) return null
  const location = locationsStore.listLocations.find(loc => loc.name === locationName)
  return location ? location.id : null
}

const saveChanges = async () => {
  try {
    await formRef.value.validate()
  } catch {
    message.warning('Проверьте обязательные поля')
    return
  }

  loading.value = true
  try {
    const locationId = getLocationIdByName(form.address)

    const workData = {
      user_id: localStorage.getItem('userId') || "e56094b2-3faf-4a7b-b494-4640dabcf08a",
      name: form.name,
      technique: form.technique,
      size: form.size,
      year: form.year ? parseInt(form.year) : null,
      description: form.description,
      location: locationId,
      seria: form.seria,
      media: form.media,
      status: form.status,
      artist: form.artist,
      price: form.price ? parseFloat(form.price) : null,
      currency: form.currency,
      avatar_id: form.avatar?.id || null,
      images: form.images,
    }

    console.log('Отправляемые данные:', workData)
    console.log('Отправляемые данные:', form.seria)

    let result
    if (form.id && form.id !== 'new') {
      result = await artWorkStore.updateArtWork({ ...workData, id: form.id })
      if (result) {
        message.success('Работа обновлена')
      }
    } else {
      result = await artWorkStore.createArtWork(workData)
      if (result) {
        message.success('Работа создана')
      }
    }

    if (result) {
      router.push('/home/dashboard')
    }
  } catch (error) {
    console.error('Error saving artwork:', error)
    message.error('Ошибка при сохранении: ' + (error.response?.data?.error || error.message))
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push('/home/dashboard')
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

/* === КОЛОНКИ === */
.edit-page {
  --bg: #f7f5f0;
  --bg-elevated: #ffffff;
  --card-bg: #efece4;
  --text-title: #211f1a;
  --text-body: #2c2a25;
  --text-muted: #5a564c;
  --text-faint: #7c7669;
  --accent: #8a6d2f;
  --accent-strong: #6f581f;
  --border: rgba(0, 0, 0, 0.1);
  --border-soft: rgba(0, 0, 0, 0.07);

  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text-body);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.page-header {
  flex-shrink: 0;
  padding: 10px 24px 8px;
}

.page-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 26px;
  font-weight: 600;
  color: var(--text-title);
  margin: 0 0 4px;
}

.page-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--text-faint);
}

.edit-spin-wrapper {
  flex: 1;
  display: flex;
}

.edit-spin-wrapper :deep(.ant-spin-nested-loading),
.edit-spin-wrapper :deep(.ant-spin-container) {
  width: 100%;
}

.edit-container {
  display: flex;
  align-items: stretch;
  gap: 20px;
  padding: 0 24px 24px;
}

.images-column {
  width: 42%;
  min-width: 0;
  padding-right: 8px;
  display: flex;
}

.images-card {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 18px 18px 20px;
}

/* === Секции формы === */
.form-section {
  background: var(--bg-elevated);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 14px 16px 2px;
  margin-bottom: 12px;
}

/* Два поля в один ряд — компактнее, чем сплошной вертикальный стек */
.field-row {
  display: flex;
  gap: 16px;
}

.field-row .field-half {
  flex: 1;
  min-width: 0;
}

.field-full {
  width: 100%;
}

.section-heading {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 12px;
}

.empty-hint {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-faint);
}

.form-column {
  width: 58%;
  padding-left: 20px;
  border-left: 1px solid var(--border);
  display: flex;
}

.form-column :deep(.ant-form) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

/* === Инпуты === */
:deep(.ant-form-item) {
  margin-bottom: 8px !important;
  /* Было 24px по умолчанию */
}

:deep(.ant-form-item-label) {
  padding-bottom: 2px !important;
}

:deep(.ant-form-item-label > label) {
  color: var(--text-muted);
  height: auto !important;
}

.fixed-input {
  width: 100%;
  max-width: 450px;
  border-color: var(--border);
  background: var(--bg-elevated);
}

.fixed-input:hover {
  border-color: var(--accent);
}

.description-input {
  height: 70px;
}

.series-select {
  width: 100%;
  max-width: 450px;
}

.series-select :deep(.ant-select-selector) {
  border-color: var(--border);
  background: var(--bg-elevated) !important;
  position: relative;
  padding-right: 28px !important;
}

.series-select :deep(.ant-select-clear) {
  right: 8px !important;
  inset-inline-end: 6px !important;
  background: var(--bg-elevated);
}

.series-select :deep(.ant-select-selector:hover) {
  border-color: var(--accent) !important;
}

.series-select :deep(.ant-select-arrow) {
  display: none;
}

.status-select {
  width: 100%;
  max-width: 450px;
}

.status-select :deep(.ant-select-selector) {
  border-color: var(--border);
  background: var(--bg-elevated) !important;
  position: relative;
  padding-right: 28px !important;
}

.status-select :deep(.ant-select-selector:hover) {
  border-color: var(--accent) !important;
}

.price-group {
  display: flex;
  width: 100%;
  max-width: 450px;
}

.price-input {
  width: 65%;
}

.price-input :deep(.ant-input-number) {
  border-color: var(--border);
  background: var(--bg-elevated);
  width: 100%;
}

.price-input :deep(.ant-input-number:hover),
.price-input :deep(.ant-input-number-focused) {
  border-color: var(--accent) !important;
}

.currency-select {
  width: 35%;
}

.currency-select :deep(.ant-select-selector) {
  border-color: var(--border) !important;
  background: var(--bg-elevated) !important;
}

.currency-select:hover :deep(.ant-select-selector) {
  border-color: var(--accent) !important;
}

/* === Чипы (города/серии/медиа/статусы) в выпадающих списках === */
.chip-list {
  padding: 4px 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  display: flex;
  align-items: center;
  background: var(--card-bg);
  color: var(--text-body);
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 13px;
}

.chip-remove {
  margin-left: 6px;
  border: none;
  background: none;
  cursor: pointer;
  color: #b43c3c;
  font-size: 13px;
  line-height: 1;
}

.chip-remove:hover {
  color: #8f2c2c;
}

.add-row {
  padding: 4px 8px;
  margin-top: 4px;
}

/* === Кнопка сохранения === */
.save-btn {
  background-color: var(--accent);
  border-color: var(--accent);
  color: #fff;
  transition: all 0.3s ease;
  margin-bottom: 8px;
}

.save-btn:hover {
  border-color: var(--accent-strong) !important;
  background-color: var(--accent-strong) !important;
  color: #fff !important;
}

.back-btn {
  border-color: var(--accent);
  color: var(--accent);
  background: transparent;
}

.back-btn:hover {
  background-color: var(--accent) !important;
  border-color: var(--accent) !important;
  color: #fff !important;
}

/* Контейнер для кнопок */
.buttons-wrapper {
  display: flex;
  gap: 8px;
  margin-top: auto;
  padding-top: 16px;
}

.images-item {
  display: block;
}

/* Строка с доп. изображениями прижата к самому низу карточки */
.images-item + .images-item {
  margin-top: auto;
  padding-top: 8px;
}

.images-item :deep(.ant-form-item-label > label) {
  font-size: 16px;
  font-weight: 500;
  font-family: 'Cormorant Garamond', serif;
  color: var(--text-title);
}

/* Главное изображение — крупное, по центру карточки */
.upload-trigger {
  cursor: pointer;
}

.avatar-preview {
  position: relative;
  display: block;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
}

.avatar-image {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: contain;
  background: var(--card-bg);
  border-radius: 12px;
  border: 1px solid var(--border);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
  cursor: pointer;
}

.avatar-image:hover {
  border-color: var(--accent);
  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.16);
  transition: all 0.2s ease;
}

.avatar-placeholder {
  width: 100%;
  max-width: 480px;
  aspect-ratio: 1 / 1;
  margin: 0 auto;
}

.avatar-placeholder .anticon {
  font-size: 30px;
}

.avatar-placeholder div {
  font-size: 14px;
}

.avatar-preview .delete-btn {
  top: 10px;
  right: 10px;
  width: 26px;
  height: 26px;
  font-size: 16px;
}

.avatar-preview .download-btn {
  top: 10px;
  left: 10px;
  width: 26px;
  height: 26px;
  font-size: 14px;
}

/* Доп. изображения — одна строка с горизонтальной прокруткой */
.images-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-start;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.images-row::-webkit-scrollbar {
  height: 6px;
}

.images-row::-webkit-scrollbar-track {
  background: var(--card-bg);
  border-radius: 4px;
}

.images-row::-webkit-scrollbar-thumb {
  background: rgba(138, 109, 47, 0.35);
  border-radius: 4px;
}

.images-row::-webkit-scrollbar-thumb:hover {
  background: var(--accent);
}

.images-row .upload-trigger,
.images-row .image-container {
  flex-shrink: 0;
}

.upload-placeholder {
  width: 120px;
  height: 120px;
  border: 1px dashed var(--border);
  border-radius: 8px;
  background-color: var(--card-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.upload-placeholder:hover {
  border-color: var(--accent);
  background-color: var(--bg-elevated);
}

.upload-placeholder .anticon {
  font-size: 20px;
  color: var(--text-faint);
  margin-bottom: 8px;
}

.upload-placeholder div {
  font-size: 12px;
  color: var(--text-faint);
}

.image-container {
  position: relative;
  width: 120px;
  height: 120px;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: var(--card-bg);
  border-radius: 6px;
  cursor: pointer;
  transition: transform 0.2s;
  border: 1px solid var(--bg-elevated);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.preview-image:hover {
  transform: scale(1.08);
  border-color: var(--accent);
}

/* кнопка удаления */
.delete-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  border: none;
  background: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  padding: 0 3px;
  border-radius: 8px;
  z-index: 1;
}

.delete-btn:hover {
  background-color: #d9534f;
  color: #fff;
}

.download-btn {
  position: absolute;
  top: 4px;
  left: 4px;
  border: none;
  background: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  font-size: 11px;
  line-height: 1;
  padding: 3px 4px;
  border-radius: 8px;
  z-index: 1;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
}

.download-btn:hover {
  background-color: var(--accent);
  color: #fff;
}

/* === Lightbox === */
.lightbox {
  position: fixed;
  inset: 0;
  background: rgba(15, 15, 17, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 3000;
}

.lightbox-image {
  max-width: 90%;
  max-height: 90%;
  border-radius: 10px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.6);
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  color: #f2f0ec;
  font-size: 3rem;
  border: none;
  cursor: pointer;
  user-select: none;
}

.nav-btn:hover {
  color: var(--accent-strong);
}

.prev {
  left: 30px;
}

.next {
  right: 30px;
}

.close-btn {
  position: absolute;
  top: 20px;
  right: 30px;
  font-size: 2rem;
  background: none;
  color: #f2f0ec;
  border: none;
  cursor: pointer;
}

.close-btn:hover {
  color: var(--accent-strong);
}

.lightbox-download-btn {
  position: absolute;
  top: 20px;
  left: 30px;
  font-size: 1.5rem;
  background: none;
  color: #f2f0ec;
  border: none;
  cursor: pointer;
}

.lightbox-download-btn:hover {
  color: var(--accent-strong);
}

/* === Адаптация для маленьких экранов === */
@media (max-width: 1200px) {
  .edit-container {
    flex-direction: column;
    gap: 20px;
  }

  .images-column {
    width: 100%;
    padding-right: 0;
  }

  .form-column {
    width: 100%;
    padding-left: 0;
    border-left: none;
    border-top: 1px solid var(--border);
    padding-top: 20px;
  }

  .fixed-input,
  .series-select,
  .status-select,
  .price-group {
    max-width: 100%;
  }
}

@media (max-width: 700px) {
  .field-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>