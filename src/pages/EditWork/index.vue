<template>
  <div class="edit-page">
    <h2>Редактировать работу</h2>

    <a-form layout="vertical">
      <a-form-item label="Имя">
        <a-input v-model:value="form.name" class="fixed-input" />
      </a-form-item>

      <a-form-item label="Адрес">
        <a-input v-model:value="form.address" class="fixed-input" />
      </a-form-item>

      <a-form-item label="Email">
        <a-input v-model:value="form.email" class="fixed-input" />
      </a-form-item>

    <a-form-item label="Коллекция">
  <a-select
    v-model:value="form.collections"
    mode="multiple"
    placeholder="Выберите коллекцию"
    class="fixed-input"
    allow-clear
  >
    <a-select-option v-for="col in collectionList" :key="col.id" :value="col.id">
      {{ col.name }}
    </a-select-option>
  </a-select>
</a-form-item>

       <a-form-item label="Изображения">
          <a-upload
            list-type="picture-card"
            multiple
            :before-upload="handleBeforeUpload"
            show-upload-list="false"  
            @remove="handleRemove"
          >
            <div>
              <PlusOutlined />
              <div>Загрузить</div>
            </div>
          </a-upload>

           <!-- превью изображений с кликом -->
        <div class="preview-gallery">
  <div
    v-for="(img, index) in form.images"
    :key="img.uid"
    class="image-wrapper"
  >
    <img
      :src="img.url"
      class="preview-image"
      @click="openViewer(index)"
    />
    <button class="delete-btn" @click.stop="removeImage(index)">×</button>
  </div>
</div>
        </a-form-item>

      <a-button 
      type="primary" 
      @click="saveChanges"
      class="save-btn"
      >
      Сохранить
      </a-button>
      <a-button style="margin-left: 8px" @click="goBack">Отмена</a-button>
    </a-form>
    <!-- Lightbox просмотр -->
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
const isEditing = ref(!!route.params.id)
const collectionList = ref([]);
const form = reactive({
  name: '',
  address: '',
  email: '',
  collections: [],
  images: []
})

onMounted(() => {
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
      url: e.target.result
    })
  }
  reader.readAsDataURL(file)
  return false
}

const handleRemove = (file) => {
  form.images = form.images.filter(f => f.uid !== file.uid)
}

const removeImage = (index) => {
  form.images.splice(index, 1)
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

  // Обновляем связи коллекции ↔ работа
  const collectionsList = JSON.parse(localStorage.getItem('collectionList') || '[]')
  // Сначала удаляем работу из всех коллекций, чтобы избежать дублирования
  collectionsList.forEach(c => {
  if (!c.works) c.works = []
  c.works = c.works.filter(id => id !== form.id)
})
  // Добавляем работу в выбранные коллекции
  form.collections.forEach(colId => {
  const collection = collectionsList.find(c => c.id === colId)
  if (collection) collection.works.push(form.id)
})
// Сохраняем в localStorage
  localStorage.setItem('works', JSON.stringify(storedWorks))
  localStorage.setItem('collectionList', JSON.stringify(collectionsList))

  router.push('/home/dashboard')
}

function goBack() {
  router.push('/home/dashboard')
}
</script>

<style scoped>
.edit-page {
  background: #fff;
  padding: 24px;
  border-radius: 8px;
}
.fixed-input {
  width: 500px; /* фиксированная ширина */
  max-width: 100%; /* чтобы не выходила за пределы контейнера */
  border-color: #BDD6F4;
}
.fixed-input:hover {
  border-color: #4f4ec1;
}
.save-btn {
  background-color: #4f4ec1;
  border-color: #5761b3;
  color: #fff;
  transition: all 0.3s ease;
}
.save-btn:hover {
  border-color: #2e2e9f; /* цвет рамки при наведении */
  background-color: #6c6bff; /* немного светлее фон */
  color: #fff;
}

/* миниатюры */
.preview-gallery {
  display: flex;
  gap: 16px;
  padding-top: 60px ;
  padding-bottom: 8px;
  padding-left: 8px;
  overflow-x: auto;
}
.image-wrapper {
  position: relative;
  display: inline-block;
  margin: 6px;
}
.preview-image {
  width: 100px;
  height: 100px;
  border-radius: 6px;
  object-fit: cover;
  cursor: pointer;
  transition: transform 0.2s;
  border: 1px solid #fff;
  box-shadow: 0 -1px 6px #BDD6F4;
  box-sizing: content-box;
}
.preview-image:hover {
  border-color: #4f4ec1; 
  transform: scale(1.10); /* лёгкое увеличение */
  transition: all 0.2s;
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
.delete-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 50%;
  width: 17px;
  height: 17px;
  cursor: pointer;
  font-size: 13px;
  line-height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.delete-btn:hover {
  background-color: rgba(255, 0, 0, 0.8);
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
</style>