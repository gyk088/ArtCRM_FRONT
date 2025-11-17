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
            <a-input v-model:value="form.year" placeholder="Год" class="fixed-input" />
          </a-form-item>

          <a-form-item>
            <a-input v-model:value="form.description" placeholder="Описание" class="fixed-input" />
          </a-form-item>

          <a-form-item>
            <a-input v-model:value="form.address" placeholder="Локация" class="fixed-input" />
          </a-form-item>

          <a-form-item>
            <a-select v-model:value="form.series" mode="tags" :options="seriesOptions"
              placeholder="Введите или выберите серию" @change="saveSeriesOptions" class="series-select" allowClear />
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
                <a-textarea v-model:value="img.comment" placeholder="Комментарий" class="image-comment"
                  auto-size="{ minRows: 2, maxRows: 6 }" />
              </div>
            </div>
          </div>
        </a-form-item>

        <a-form-item label="Экспозиция" :label-col="{ span: 24 }" :wrapper-col="{ span: 24 }" class="images-item">
          <div class="images-block">
            <!-- Кнопка загрузки -->
             <div class="my-upload-block">
            <a-upload list-type="picture-card" multiple :before-upload="handleBeforeUploadExposition" show-upload-list="false"
              @remove="handleRemoveExposition">
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
                <a-textarea v-model:value="img.comment" placeholder="Комментарий" class="image-comment"
                  auto-size="{ minRows: 2, maxRows: 6 }" />
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PlusOutlined } from '@ant-design/icons-vue'

const route = useRoute()
const router = useRouter()
const collectionList = ref([]);
const seriesOptions = ref([])
const form = reactive({
  avatar: null,
  name: '',
  technique: '',
  year: '',
  description: '',
  address: '',
  series: '',
  price: '',
  collections: [],
  images: [],
  exposition: []
})

onMounted(() => {
  const save = localStorage.getItem("seriesOptions");
  if (save) {
    seriesOptions.value = JSON.parse(save);
  }

  const storedData = JSON.parse(localStorage.getItem('works') || '[]')
  if (route.params.id !== 'new') {
    const work = storedData.find(w => w.id == route.params.id)
    if (work) Object.assign(form, work)
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

// сохраняем при изменении
const saveSeriesOptions = (value) => {
  value.forEach(v => {
    if (!seriesOptions.value.find(opt => opt.value === v)) {
      seriesOptions.value.push({ label: v, value: v });
    }
  });
  localStorage.setItem("seriesOptions", JSON.stringify(seriesOptions.value));
};

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
  gap: 30px;
  margin-top: 24px;
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
  border-color: #6c6bff;
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
  border-color: #6c6bff !important;
}

/* === Кнопка сохранения === */
.save-btn {
  background-color: #4f4ec1;
  border-color: #5761b3;
  color: #fff;
  transition: all 0.3s ease;
}
.save-btn:hover {
  border-color: #fff;
  background-color: #6c6bff;
  color: #fff;
}
.back-btn {
  border-color: #5761b3;
  color: #5761b3;
}
.back-btn:hover {
  background-color: #6c6bff;
  border-color: #fff;
  color: #fff;
}

.images-item {
  display: block;
  font-size: 20px;
}
.images-block {
  display: flex;
  flex-direction: column; 
  gap: 16px;         
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
  width: 90px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.image-container {
  position: relative;
  width: 90px;
  height: 90px;
}
.image-comment {
  margin-top: 6px;
  font-size: 10px;
  padding: 8px 6px;
  border-color: #BDD6F4;
}
.image-comment:hover {
  border-color: #6c6bff;
}
.preview-image {
  width: 90px;
  height: 90px;
  object-fit: cover;
  border-radius: 6px;
  cursor: pointer;
  transition: transform 0.2s;
  border: 1px solid #fff;
  box-shadow: 0 -1px 6px #BDD6F4;
}
.preview-image:hover {
  transform: scale(1.08);
  border-color: #6c6bff;
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
  border-color: #4f4ec1 !important; /* твой цвет */
}

/* кнопка удаления */
.delete-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
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