<template>
  <div class="edit-page">

    <h2>Редактировать работу</h2>

    <div class="edit-container">

      <!-- Левая колонка — ФОРМА -->
      <div class="left-column">
        <a-form layout="vertical">
          <!-- Кнопка загрузки -->
          <a-form-item>
            <a-upload v-if="!form.avatar" list-type="picture-card" :before-upload="handleBeforeUploadAvatar"
              show-upload-list="false" @remove="removeAvatar">
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
            <a-select v-model:value="form.series" mode="tags" :options="seriesOptions"
              placeholder="Введите или выберите серию" @change="saveSeriesOptions" class="series-select" allowClear>
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
              </template>
            </a-select>
          </a-form-item>

          <a-form-item>
            <a-select v-model:value="form.status" placeholder="Статус" class="status-select">
              <a-select-option value="Доступно">Доступно</a-select-option>
              <a-select-option value="Частная коллекция">Частная коллекция</a-select-option>
              <a-select-option value="Резерв">Резерв</a-select-option>
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

        <a-form-item label="Изображения" :label-col="{ span: 24 }" :wrapper-col="{ span: 24 }" class="images-item">
          <div class="images-block">
            <!-- Кнопка загрузки -->
            <div class="my-upload-block">
              <a-upload list-type="picture-card" multiple :before-upload="handleBeforeUpload" show-upload-list="false"
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
                <a-textarea v-model:value="img.comment" placeholder="Комментарий" class="image-comment"/>
              </div>
            </div>
          </div>
        </a-form-item>

        <a-form-item label="Экспозиция" :label-col="{ span: 24 }" :wrapper-col="{ span: 24 }" class="images-item">
          <div class="images-block">
            <!-- Кнопка загрузки -->
            <div class="my-upload-block">
              <a-upload list-type="picture-card" multiple :before-upload="handleBeforeUploadExposition"
                show-upload-list="false" @remove="handleRemoveExposition">
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
                <a-textarea v-model:value="img.comment" placeholder="Комментарий" class="image-comment"/>
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

const route = useRoute()
const router = useRouter()
const collectionList = ref([]);
const seriesOptions = ref([])
const yearPicker = ref(null)
const VNodes = defineComponent({
  props: { vnodes: { type: Object, required: true } },
  render() { return this.vnodes }
})

const items = ref([])
const value = ref(null)
const inputRef = ref()
const name = ref('')
const form = reactive({
  avatar: null,
  name: '',
  technique: '',
  year: '',
  description: '',
  address: null,
  series: [],
  status: null,
  price: '',
  collections: [],
  images: [],
  exposition: []
})

onMounted(() => {
  const series = localStorage.getItem("seriesOptions");
  if (series) {
    seriesOptions.value = JSON.parse(series)
    .filter(s => s.value && s.value.trim())
  }

   const address = localStorage.getItem("city")
  if (address) {
    items.value = JSON.parse(address)
  } else {
    items.value = ['Москва', 'Санкт-Петербург']
  }

  const storedData = JSON.parse(localStorage.getItem('works') || '[]')
  if (route.params.id !== 'new') {
    const work = storedData.find(w => w.id == route.params.id)
    if (work) Object.assign(form, work)
    if (!work.series || work.series.length === 0) {
      form.series = null
    }
  }
const saved = localStorage.getItem('collectionList');
  if (saved) collectionList.value = JSON.parse(saved);
})

const handleBeforeUpload = (file) => {
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
    form.year = value // уже строка YYYY благодаря valueFormat
  }
  // закрываем календарь вручную
  if (yearPicker.value) {
    yearPicker.value.blur()
  }
}

// сохраняем при изменении
const saveSeriesOptions = (value) => {
  form.series = value.filter(v => v && v.trim())
  value.forEach(v => {
    if (!seriesOptions.value.find(opt => opt.value === v)) {
      seriesOptions.value.push({ label: v, value: v });
    }
  });
  localStorage.setItem("seriesOptions", JSON.stringify(seriesOptions.value));
};

const removeSeries = (idx) => {
  const removed = seriesOptions.value[idx].value
  seriesOptions.value.splice(idx, 1)
  form.series = form.series.filter(s => s !== removed)
  localStorage.setItem("seriesOptions", JSON.stringify(seriesOptions.value))
}

const addItem = (e) => {
  e?.preventDefault()
  if (!name.value.trim()) return
  if (!items.value.includes(name.value.trim())) {
    items.value.push(name.value.trim())
    localStorage.setItem('city', JSON.stringify(items.value))
  }
  name.value = ''
  setTimeout(() => inputRef.value?.focus(), 0)
}

const removeItem = (idx) => {
  if (items.value[idx] === value.value) value.value = ''
  items.value.splice(idx, 1)
  localStorage.setItem('city', JSON.stringify(items.value))
}

const saveChanges = () => {
  let storedWorks = JSON.parse(localStorage.getItem('works') || '[]')
  const workId = form.id || Date.now()

  // Если новая работа, присваиваем id
  if (!form.id) form.id = workId

  const workIndex = storedWorks.findIndex(w => w.id == form.id)
  if (workIndex !== -1) {
    storedWorks[workIndex] = { ...form }
  } else {
    storedWorks.push({ ...form })
  }
  form.address = value.value || ''

  localStorage.setItem('works', JSON.stringify(storedWorks))

  router.push('/home/dashboard')
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
}
.left-column {
  width: 40%;
}
.right-column {
  width: 60%;
  padding-left: 20px;
  border-left: 1px solid #eee;
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
  right: 8px !important; /* возвращаем кнопку в конец */
  inset-inline-end: 6px !important;
}
/* hover */
.series-select :deep(.ant-select-selector:hover) {
  border-color: #1E90FF !important;
}
.series-select >>> .ant-select-arrow {
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
  flex-direction: row; /* картинка слева, комментарий справа */
  width: calc(300px - 6px); /* 2 блока в ряд с учетом gap */
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
  border-color: #1E90FF !important; /* твой цвет */
}

/* кнопка удаления */
.delete-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  border: none;
  background: rgba(255,255,255,0.8);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0 4px;
  border-radius: 2px;
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
  object-fit: cover; /* сохраняет пропорции, обрезая лишнее */
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