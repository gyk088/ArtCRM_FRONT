<template>
  <div class="edit-page">
    <h2>Редактировать работу</h2>
    <div class="edit-container">

      <!-- Левая колонка — ФОРМА -->
      <div class="left-column">
        <a-form layout="vertical">
          <a-form-item>
            <a-input v-model:value="form.name" placeholder="Имя" class="fixed-input" />
          </a-form-item>

          <a-form-item>
            <a-input v-model:value="form.technique" placeholder="Техника" class="fixed-input" />
          </a-form-item>

          <a-form-item>
            <a-date-picker v-model:value="form.year" picker="year" valueFormat="YYYY" format="YYYY" placeholder="Год"
              @change="onYearSelect" ref="yearPicker" class="fixed-input calendar-input" :allowClear="false" />
          </a-form-item>

          <a-form-item>
            <a-textarea v-model:value="form.description" placeholder="Описание" class="fixed-input description-input" />
          </a-form-item>

          <a-form-item>
            <a-select v-model:value="form.address" placeholder="Выберите или введите город" class="series-select"
              :options="items.map(item => ({ value: item }))" allowClear>
              <template #dropdownRender="{ menuNode: menu }">
                <VNodes :vnodes="menu" />
                <a-divider style="margin: 4px 0" />
                <div style="padding: 4px 8px; display:flex; flex-wrap: wrap; gap: 4px;">
                  <span v-for="(item, idx) in items" :key="item"
                    style="display:flex; align-items:center; background:#f0f0f0; padding:2px 6px; border-radius:4px;">
                    {{ item }}
                    <button @click.prevent="removeItem(idx)"
                      style="margin-left:4px; border:none; background:none; cursor:pointer; color:red;">
                      ×
                    </button>
                  </span>
                </div>
                <a-space style="padding: 4px 8px; margin-top:4px;">
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

          <a-form-item>
            <a-select v-model:value="form.seria" :options="seriesOptions" placeholder="Введите или выберите серию"
              class="series-select" allowClear>
              <template #dropdownRender="{ menuNode: menu }">
                <VNodes :vnodes="menu" />

                <a-divider style="margin: 4px 0" />

                <!-- Блок списка серий с кнопками удаления -->
                <div style="padding: 4px 8px; display:flex; flex-wrap:wrap; gap:6px;">
                  <span v-for="(item, idx) in seriesOptions" :key="item.value"
                    style="display:flex; align-items:center; background:#f0f0f0; padding:2px 6px; border-radius:4px;">
                    {{ item.label }}
                    <button @click.prevent="removeSeries(idx)"
                      style="margin-left:4px; border:none; background:none; cursor:pointer; color:red;">
                      ×
                    </button>
                  </span>
                </div>

                <!-- Добавляем инпут для добавления новой серии (как у городов) -->
                <a-space style="padding: 4px 8px; margin-top:4px;">
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

          <!-- Поле Медиа (после серии) -->
          <a-form-item>
            <a-select v-model:value="form.media" :options="mediaOptions" placeholder="Введите или выберите медиа"
              class="series-select" allowClear>
              <template #dropdownRender="{ menuNode: menu }">
                <VNodes :vnodes="menu" />

                <a-divider style="margin: 4px 0" />

                <div style="padding: 4px 8px; display:flex; flex-wrap:wrap; gap:6px;">
                  <span v-for="(item, idx) in mediaOptions" :key="item.value"
                    style="display:flex; align-items:center; background:#f0f0f0; padding:2px 6px; border-radius:4px;">
                    {{ item.label }}
                    <button @click.prevent="removeMedia(idx)"
                      style="margin-left:4px; border:none; background:none; cursor:pointer; color:red;">
                      ×
                    </button>
                  </span>
                </div>

                <a-space style="padding: 4px 8px; margin-top:4px;">
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

          <a-form-item>
            <a-select v-model:value="form.status" placeholder="Статус" class="status-select" allowClear>
              <template #dropdownRender="{ menuNode: menu }">
                <VNodes :vnodes="menu" />

                <a-divider style="margin: 4px 0" />

                <!-- Блок списка статусов с кнопками удаления -->
                <div style="padding: 4px 8px; display:flex; flex-wrap:wrap; gap:6px;">
                  <span v-for="(item, idx) in statusOptions" :key="item.value"
                    style="display:flex; align-items:center; background:#f0f0f0; padding:2px 6px; border-radius:4px;">
                    {{ item.label }}
                    <button @click.prevent="removeStatus(idx)"
                      style="margin-left:4px; border:none; background:none; cursor:pointer; color:red;">
                      ×
                    </button>
                  </span>
                </div>

                <!-- Добавляем инпут для добавления нового статуса -->
                <a-space style="padding: 4px 8px; margin-top:4px;">
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

          <a-form-item>
            <a-input v-model:value="form.price" placeholder="Стоимость" class="fixed-input" />
          </a-form-item>

          <a-form-item>
            <a-select v-model:value="form.collections" mode="multiple" placeholder="Выберите коллекцию"
              class="series-select" allow-clear>
              <a-select-option v-for="col in collectionList" :key="col.id" :value="col.id">
                {{ col.name }}
              </a-select-option>
            </a-select>
          </a-form-item>

          <div class="buttons-wrapper">
            <a-button type="primary" @click="saveChanges" class="save-btn">
              Сохранить
            </a-button>

            <a-button @click="goBack" class="back-btn">
              Отмена
            </a-button>
          </div>
        </a-form>
      </div>

      <!-- Правая колонка — ИЗОБРАЖЕНИЯ -->
      <div class="right-column">
        <a-form-item label="Главное изображение" :label-col="{ span: 24 }" :wrapper-col="{ span: 24 }"
          class="images-item">
          <div v-if="!form.avatar" class="upload-trigger" @click="openFilesModal('avatar')">
            <div class="upload-placeholder">
              <PlusOutlined />
              <div>Загрузить</div>
            </div>
          </div>

          <div v-else class="avatar-preview">
            <img :src="form.avatar.url" class="avatar-image" />
            <button class="delete-btn" @click="removeAvatar">×</button>
          </div>
        </a-form-item>

        <a-form-item label="Изображения" :label-col="{ span: 24 }" :wrapper-col="{ span: 24 }" class="images-item">
          <div class="images-block">
            <div class="my-upload-block">
              <div class="upload-trigger" @click="openFilesModal('images')">
                <div class="upload-placeholder">
                  <PlusOutlined />
                  <div>Загрузить</div>
                </div>
              </div>
            </div>

            <!-- Галерея превью -->
            <div class="preview-gallery">
              <div v-for="(img, index) in form.images" :key="img.uid" class="image-wrapper">
                <div class="image-container">
                  <img :src="img.url" class="preview-image" @click="openViewer(index)" />
                  <button class="delete-btn" @click.stop="removeImage(index)">×</button>
                </div>
              </div>
            </div>
          </div>
        </a-form-item>

      </div>
    </div>

    <!-- Lightbox -->
    <div v-if="isViewerVisible" class="lightbox" @click.self="closeViewer">
      <button class="nav-btn prev" @click.stop="prevImage">⟨</button>
      <img :src="currentImage" class="lightbox-image" />
      <button class="nav-btn next" @click.stop="nextImage">⟩</button>
      <button class="close-btn" @click="closeViewer">×</button>
    </div>

    <a-modal v-model:open="isFilesModalOpen" title="Файлы" :footer="null" width="700px" destroyOnClose>
      <FileUploader :remove="true" :select="true" @select="handleFileSelect" />
    </a-modal>

  </div>
</template>


<script setup>
import { ref, reactive, computed, onMounted, defineComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useSerias } from '@/stores/seria.js'
import { useLocations } from '@/stores/locations.js'
import { useStatuses } from '@/stores/statuses.js'
import { useMedia } from '@/stores/media.js'
import { useArtWork } from '@/stores/artWork.js'
import FileUploader from "@/components/FileUploader.vue"

const seriasStore = useSerias();
const locationsStore = useLocations()
const statusesStore = useStatuses()
const mediaStore = useMedia()
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
const loading = ref(false)
const isFilesModalOpen = ref(false)
const uploadTarget = ref('avatar')

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
  year: '',
  description: '',
  address: null,
  seria: null,
  media: null,
  status: null,
  price: '',
  collections: [],
  images: []
})

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
        year: work.year ? String(work.year) : '',
        description: work.description || '',
        address: getNameById(work.location, locationsStore, 'listLocations'),
        seria: getNameById(work.seria, seriasStore, 'listSerias'),
        media: work.media || null,
        status: work.status || null,
        price: work.price || '',
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

onMounted(async () => {
  await loadSeriesFromAPI()
  await loadLocationsFromAPI()
  await loadStatusesFromAPI()
  await loadMediaFromAPI()
  await loadArtWork()
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
const isViewerVisible = ref(false)
const currentIndex = ref(0)
const currentImage = computed(() => form.images[currentIndex.value]?.url)

function openViewer(index) {
  currentIndex.value = index
  isViewerVisible.value = true
}

function closeViewer() {
  isViewerVisible.value = false
}

function nextImage() {
  currentIndex.value = (currentIndex.value + 1) % form.images.length
}

function prevImage() {
  currentIndex.value =
    (currentIndex.value - 1 + form.images.length) % form.images.length
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
  } finally {
    items.value.push(cityName)
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

const getLocationIdByName = (locationName) => {
  if (!locationName) return null
  const location = locationsStore.listLocations.find(loc => loc.name === locationName)
  return location ? location.id : null
}

const saveChanges = async () => {
  loading.value = true
  try {
    const locationId = getLocationIdByName(form.address)

    const workData = {
      user_id: localStorage.getItem('userId') || "e56094b2-3faf-4a7b-b494-4640dabcf08a",
      name: form.name,
      technique: form.technique,
      year: form.year ? parseInt(form.year) : null,
      description: form.description,
      location: locationId,
      seria: form.seria,
      media: form.media,
      status: form.status,
      price: form.price ? parseFloat(form.price) : null,
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

    router.push('/home/dashboard')
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
/* === КОЛОНКИ === */
.edit-page {
  padding-top: 10px;
  padding-left: 10px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.edit-page h2 {
  flex-shrink: 0;
}

.edit-container {
  display: flex;
  gap: 20px;
  flex: 1;
  min-height: 0;
  padding-top: 10px;
  overflow: hidden;
}

.left-column {
  width: 40%;
  overflow-y: auto;
  height: 100%;
  padding-right: 8px;
}

/* Кастомный скролл для левой колонки */
.left-column::-webkit-scrollbar,
.right-column::-webkit-scrollbar {
  width: 6px;
}

.left-column::-webkit-scrollbar-track,
.right-column::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 4px;
}

.left-column::-webkit-scrollbar-thumb,
.right-column::-webkit-scrollbar-thumb {
  background: #BDD6F4;
  border-radius: 4px;
}

.left-column::-webkit-scrollbar-thumb:hover,
.right-column::-webkit-scrollbar-thumb:hover {
  background: #1E90FF;
}

.right-column {
  width: 70%;
  padding-left: 20px;
  border-left: 1px solid #eee;
  overflow-y: auto;
  height: 100%;
}

/* === Инпуты === */
:deep(.ant-form-item) {
  margin-bottom: 16px !important;
  /* Было 24px по умолчанию */
}

.fixed-input {
  width: 100%;
  max-width: 450px;
  border-color: #BDD6F4;
}

.fixed-input:hover {
  border-color: #1E90FF;
}

.description-input {
  height: 100px;
}

.calendar-input {
  width: 150px;
}

.series-select {
  width: 100%;
  max-width: 450px;
}

.series-select :deep(.ant-select-selector) {
  border-color: #BDD6F4;
  position: relative;
  padding-right: 28px !important;
}

.series-select :deep(.ant-select-clear) {
  right: 8px !important;
  inset-inline-end: 6px !important;
}

.series-select :deep(.ant-select-selector:hover) {
  border-color: #1E90FF !important;
}

.series-select :deep(.ant-select-arrow) {
  display: none;
}

.status-select {
  width: 100%;
  max-width: 450px;
}

.status-select :deep(.ant-select-selector) {
  border-color: #BDD6F4;
  position: relative;
  padding-right: 28px !important;
}

/* === Кнопка сохранения === */
.save-btn {
  background-color: #1164B4;
  border-color: #5761b3;
  color: #fff;
  transition: all 0.3s ease;
  margin-bottom: 8px;
}

.save-btn:hover {
  border-color: #1164B4;
  background-color: #007FFF;
  color: #fff;
}

.back-btn {
  border-color: #1164B4;
  color: #1164B4;
}

.back-btn:hover {
  background-color: #007FFF;
  border-color: #1164B4;
  color: #fff;
}

/* Контейнер для кнопок */
.buttons-wrapper {
  display: flex;
  gap: 8px;
  margin-top: 40px;
}

.images-item {
  display: block;
}

.images-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
}

.images-item :deep(.ant-form-item-label > label) {
  font-size: 16px;
  font-weight: 500;
}

/* Галерея превью */
.upload-trigger {
  cursor: pointer;
}

.upload-placeholder {
  width: 104px;
  height: 104px;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  background-color: #fafafa;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.upload-placeholder:hover {
  border-color: #1E90FF;
  background-color: #f5f5f5;
}

.upload-placeholder .anticon {
  font-size: 20px;
  color: #999;
  margin-bottom: 8px;
}

.upload-placeholder div {
  font-size: 12px;
  color: #999;
}

.preview-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.image-wrapper {
  display: flex;
  flex-direction: row;
  gap: 24px;
  align-items: flex-start;
  margin-right: 24px;
  margin-top: 24px;
}

.image-container {
  position: relative;
  width: 120px;
  height: 120px;
  flex-shrink: 0;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s;
  border: 1px solid #fff;
  box-shadow: 0 -1px 6px #BDD6F4;
}

.preview-image:hover {
  transform: scale(1.08);
  border-color: #1E90FF;
}

.my-upload-block :deep(.ant-upload-select-picture-card) {
  width: 90px !important;
  height: 90px !important;
  font-size: 12px;
}

.my-upload-block :deep(.ant-upload-select-picture-card svg) {
  width: 14px;
  height: 14px;
}

.my-upload-block :deep(.ant-upload-select-picture-card:hover) {
  border-color: #1E90FF !important;
}

/* кнопка удаления */
.delete-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  border: none;
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  padding: 0 3px;
  border-radius: 8px;
  z-index: 1;
}

.delete-btn:hover {
  background-color: rgba(255, 0, 0, 0.8);
}

.avatar-preview {
  position: relative;
  display: inline-block;
}

.avatar-image {
  width: 110px;
  height: 110px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid #BDD6F4;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.15);
}

.avatar-image:hover {
  border-color: #4f4ec1;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.25);
  transition: all 0.2s ease;
}

/* === Lightbox === */
.lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 3000;
}

.lightbox-image {
  max-width: 90%;
  max-height: 90%;
  border-radius: 10px;
  box-shadow: 0 0 10px #000;
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  color: white;
  font-size: 3rem;
  border: none;
  cursor: pointer;
  user-select: none;
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
  color: white;
  border: none;
  cursor: pointer;
}

/* === Адаптация для маленьких экранов === */
@media (max-width: 1200px) {
  .edit-container {
    flex-direction: column;
    gap: 20px;
  }

  .left-column {
    width: 100%;
    overflow-y: visible;
    max-height: none;
  }

  .right-column {
    width: 100%;
    padding-left: 0;
    border-left: none;
    border-top: 1px solid #eee;
    padding-top: 20px;
    max-height: 500px;
  }

  .fixed-input,
  .series-select,
  .status-select {
    max-width: 100%;
  }
}
</style>