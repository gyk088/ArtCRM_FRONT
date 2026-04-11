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
            <a-select v-model:value="form.seria" :options="seriesOptions"
              placeholder="Введите или выберите серию" class="series-select" allowClear>
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

          <a-button type="primary" @click="saveChanges" class="save-btn">
            Сохранить
          </a-button>

          <a-button style="margin-left: 8px" @click="goBack" class="back-btn">
            Отмена
          </a-button>
        </a-form>
      </div>

      <!-- Правая колонка — ИЗОБРАЖЕНИЯ -->
      <div class="right-column">
        <!-- Кнопка загрузки -->
        <a-form-item label="Главная картинка" :label-col="{ span: 24 }" :wrapper-col="{ span: 24 }" class="images-item">
          <a-upload v-if="!form.avatar" list-type="picture-card" :before-upload="handleBeforeUploadAvatar"
            :show-upload-list="false" @remove="removeAvatar">
            <div>
              <PlusOutlined />
              <div>Загрузить</div>
            </div>
          </a-upload>

          <div v-else class="avatar-preview">
            <img :src="form.avatar.url" class="avatar-image" />
            <button class="delete-btn" @click="removeAvatar">×</button>
          </div>
        </a-form-item>

        <a-form-item label="Изображения" :label-col="{ span: 24 }" :wrapper-col="{ span: 24 }" class="images-item">
          <div class="images-block">
            <!-- Кнопка загрузки -->
            <div class="my-upload-block">
              <a-upload list-type="picture-card" multiple :before-upload="handleBeforeUpload" :show-upload-list="false"
                @remove="handleRemove">
                <div>
                  <PlusOutlined />
                  <div>Загрузить</div>
                </div>
              </a-upload>
            </div>

            <!-- Галерея превью -->
            <div class="preview-gallery">
              <div v-for="(img, index) in form.images" :key="img.uid" class="image-wrapper">
                <div class="image-container">
                  <img :src="img.url" class="preview-image" @click="openViewer(index)" />
                  <button class="delete-btn" @click.stop="removeImage(index)">×</button>
                </div>
                <a-textarea v-model:value="img.comment" placeholder="Комментарий" class="image-comment" />
              </div>
            </div>
          </div>
        </a-form-item>

        <a-form-item label="Экспозиция" :label-col="{ span: 24 }" :wrapper-col="{ span: 24 }" class="images-item">
          <div class="images-block">
            <!-- Кнопка загрузки -->
            <div class="my-upload-block">
              <a-upload list-type="picture-card" multiple :before-upload="handleBeforeUploadExposition"
                :show-upload-list="false" @remove="handleRemoveExposition">
                <div>
                  <PlusOutlined />
                  <div>Загрузить</div>
                </div>
              </a-upload>
            </div>

            <!-- Галерея превью -->
            <div class="preview-gallery">
              <div v-for="(img, index) in form.exposition" :key="img.uid" class="image-wrapper">
                <div class="image-container">
                  <img :src="img.url" class="preview-image" @click="openViewer(index)" />
                  <button class="delete-btn" @click.stop="removeImageExposition(index)">×</button>
                </div>
                <a-textarea v-model:value="img.comment" placeholder="Комментарий" class="image-comment" />
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

const VNodes = defineComponent({
  props: { vnodes: { type: Object, required: true } },
  render() { return this.vnodes }
})

const items = ref([])
const value = ref(null)
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
  images: [],
  exposition: []
})

// Загрузка работы для редактирования
const loadArtWork = async () => {
  if (route.params.id === 'new') return

  loading.value = true

  try {
    const work = await artWorkStore.getArtWorkById(route.params.id)
     let locationName = null
      if (work.location) {
        const location = locationsStore.listLocations.find(loc => loc.id === work.location)
        locationName = location ? location.name : work.location
      }
      let seriaName = null
      if (work.seria) {
        const seria = seriasStore.listSerias.find(s => s.id === work.seria)
        seriaName = seria ? seria.name : work.seria
      }
      
    if (work) {
      Object.assign(form, {
        id: work.id,
        name: work.name || '',
        technique: work.technique || '',
        year: work.year ? String(work.year) : '',
        description: work.description || '',
        address: locationName || null,
        seria: seriaName || null,
        media: work.media || null,
        status: work.status || null,
        price: work.price || '',
        collections: work.collections || [],
        images: work.images || [],
        exposition: work.exposition || [],
        avatar: work.avatar || null
      })

      console.log('Загружена работа:', form)
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

    // items.value = JSON.parse(address)
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

const handleBeforeUpload = (file) => {
  const isDuplicate = form.exposition.some(img =>
    img.name === file.name || img.url === URL.createObjectURL(file)
  );

  if (isDuplicate) {
    console.warn('Этот файл уже загружен:', file.name);
    alert(`Файл "${file.name}" уже загружен!`);
    return false;
  }
  const reader = new FileReader()
  reader.onload = e => {
    form.images.push({
      uid: file.uid,
      name: file.name,
      url: e.target.result,
      comment: ""
    })
  }
  reader.readAsDataURL(file)
  return false
}

const handleBeforeUploadExposition = (file) => {
  const isDuplicate = form.exposition.some(img =>
    img.name === file.name || img.url === URL.createObjectURL(file)
  );

  if (isDuplicate) {
    console.warn('Этот файл уже загружен:', file.name);
    alert(`Файл "${file.name}" уже загружен!`);
    return false; // Отменяем загрузку дубликата
  }
  const reader = new FileReader()
  reader.onload = e => {
    form.exposition.push({
      uid: file.uid,
      name: file.name,
      url: e.target.result,
      comment: ""
    })
  }
  reader.readAsDataURL(file)
  return false
}

const handleRemoveExposition = (file) => {
  form.exposition = form.exposition.filter(f => f.uid !== file.uid)
}

// Загружаем аватарку
function handleBeforeUploadAvatar(file) {
  const reader = new FileReader()
  reader.onload = e => {
    form.avatar = {
      uid: file.uid,
      name: file.name,
      url: e.target.result
    }
  }
  reader.readAsDataURL(file)
  return false
}

// Удаляем аватар
function removeAvatar() {
  form.avatar = null
}

const handleRemove = (file) => {
  form.images = form.images.filter(f => f.uid !== file.uid)
}

const removeImage = (index) => {
  form.images.splice(index, 1)
  const storedData = JSON.parse(localStorage.getItem('works') || '[]')
  localStorage.setItem('works', JSON.stringify(storedData)); // если у тебя данные хранятся
};

const removeImageExposition = (index) => {
  form.exposition.splice(index, 1)
  const storedData = JSON.parse(localStorage.getItem('works') || '[]')
  localStorage.setItem('works', JSON.stringify(storedData)); // если у тебя данные хранятся
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
  if (!name.value.trim()) return

  const cityName = name.value.trim()
  
  // Проверяем, существует ли уже такой город в списке
  const existingOption = items.value.find(item => item === cityName)

  if (existingOption) {
    // Если существует, выбираем его
    if (!form.address || form.address !== existingOption) {
      form.address = existingOption
    }
    name.value = ''
    return
  }

  let newLocation = null

  try {
    // Создаём новую локацию через API
    const userId = localStorage.getItem('userId') || "e56094b2-3faf-4a7b-b494-4640dabcf08a"
    const created = await locationsStore.createLocation({
      user_id: userId,
      name: cityName
    })
    
    if (created) {
      // Получаем обновлённый список локаций
      await locationsStore.getListLocations()
      const newLocationData = locationsStore.listLocations.find(l => l.name === cityName)
      if (newLocationData) {
        newLocation = newLocationData.name
        message.success(`Город "${cityName}" создан на сервере`)
      }
    }
  } catch (error) {
    console.error('Ошибка при создании города через API:', error)
    message.warning('API недоступен, город сохранён локально')
  }

  // Если не удалось создать через API, создаём локально
  if (!newLocation) {
    newLocation = cityName
  }

  // Добавляем город в список
  items.value.push(newLocation)
  form.address = newLocation

  name.value = ''
  setTimeout(() => inputRef.value?.focus(), 0)
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
.edit-container {
  display: flex;
  gap: 20px;
  margin-top: 20px;
  height: calc(100vh - 120px);
}

.left-column {
  width: 40%;
}

.right-column {
  width: 60%;
  padding-left: 20px;
  border-left: 1px solid #eee;
  overflow-y: auto;
  height: 100%;
  max-height: 100%;
}

/* === Инпуты === */
.fixed-input {
  width: 500px;
  max-width: 100%;
  border-color: #BDD6F4;
}

.fixed-input:hover {
  border-color: #1E90FF;
}

.description-input {
  height: 100px;
  padding-top: 4px;
}

.calendar-input {
  width: 150px;
}

.series-select {
  width: 500px;
  max-width: 100%;
}

.series-select :deep(.ant-select-selector) {
  border-color: #BDD6F4;
  position: relative;
  padding-right: 28px !important;
}

.series-select :deep(.ant-select-clear) {
  right: 8px !important;
  /* возвращаем кнопку в конец */
  inset-inline-end: 6px !important;
}

/* hover */
.series-select :deep(.ant-select-selector:hover) {
  border-color: #1E90FF !important;
}

.series-select :deep(.ant-select-arrow) {
  display: none;
}

.status-select {
  width: 500px;
  max-width: 100%;
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

.images-item {
  display: block;
}

.images-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
}

:deep(.images-item .ant-form-item-label > label) {
  font-size: 16px;
  font-weight: 500;
}

/* Галерея превью */
.preview-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.image-wrapper {
  display: flex;
  flex-direction: row;
  /* картинка слева, комментарий справа */
  width: calc(300px - 6px);
  /* 2 блока в ряд с учетом gap */
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.image-container {
  position: relative;
  width: 90px;
  height: 90px;
}

.image-comment {
  flex: 1;
  width: 100px;
  height: 60px;
  font-size: 10px;
  padding: 3px 6px;
  border: 1px solid #BDD6F4;
  border-radius: 4px;
}

.image-comment:hover {
  border-color: 1E90FF;
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
  /* твой цвет */
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
  /* сохраняет пропорции, обрезая лишнее */
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

/* кнопки навигации */
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

/* закрыть */
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
</style>