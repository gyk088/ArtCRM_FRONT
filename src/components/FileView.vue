<template>
  <div class="file-view">

    <!-- 🔥 КЛИКАБЕЛЬНАЯ ОБЛАСТЬ -->
    <div @click="openPreview" class="clickable">

      <!-- 🖼 КАРТИНКА -->
      <img
        v-if="isImage"
        :src="src"
        class="image"
        alt="file"
      />

      <!-- 🎬 Видео -->
      <video
        v-else-if="isVideo"
        :src="src"
        class="media"
      />

      <!-- 📄 PDF -->
      <div v-else-if="isPdf" class="pdf-preview">
        <FilePdfOutlined />      
      </div>

      <!-- 📁 ИКОНКА -->
      <div v-else class="file-icon">
        <component :is="iconComponent" />
      </div>

    </div>

    <!-- 🔥 FULLSCREEN MODAL -->
    <a-modal
      v-model:open="previewVisible"
      :footer="null"
      width="90%"
      style="top: 20px"
    >

      <!-- 🖼 КАРТИНКА -->
      <img
        v-if="isImage"
        :src="src"
        class="preview-full"
      />

      <!-- 🎬 Видео -->
      <video
        v-else-if="isVideo"
        :src="src"
        controls
        class="preview-full"
      />

      <!-- 📄 PDF -->
      <iframe
        v-else-if="isPdf"
        :src="src"
        class="preview-pdf"
      />

      <!-- 📁 fallback -->
      <div v-else class="file-icon big">
        <component :is="iconComponent" />
         <div>
            <div class="modal-file-name">{{ file.name }}</div>
            <div class="modal-file-comment">{{ file.comment }}</div>
            <a-button class="modal-file-btn" type="link" @click="downloadFile">
              Скачать
            </a-button>
        </div>
      </div>

    </a-modal>

  </div>
</template>

<script setup>
import { computed, ref } from "vue"
import {
  FileTextOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileUnknownOutlined,
  VideoCameraOutlined
} from "@ant-design/icons-vue"

const props = defineProps({
  file: {
    type: Object,
    required: true
  }
})

const previewVisible = ref(false)

const openPreview = () => {
  previewVisible.value = true
}

// 👉 URL файла
const src = computed(() => {
  return `https://dev.myoffer.life/files/${props.file.id}.${props.file.ext}`
})

// 👉 типы
const isImage = computed(() =>
  props.file.mimetype?.startsWith("image/")
)

const isVideo = computed(() =>
  props.file.mimetype?.startsWith("video/")
)

const isPdf = computed(() =>
  props.file.mimetype === "application/pdf"
)

const downloadFile = () => {
  const link = document.createElement("a")
  link.href = src.value
  link.download = props.file.name || "file"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 👉 иконка
const iconComponent = computed(() => {
  if (isImage.value) return FileImageOutlined
  if (isPdf.value) return FilePdfOutlined
  if (isVideo.value) return VideoCameraOutlined
  if (props.file.mimetype?.includes("text")) return FileTextOutlined
  return FileUnknownOutlined
})
</script>

<style scoped>

.file-view {
  width: 100%;
}

.clickable {
  cursor: pointer;
}

/* маленький превью */
.image,
.media {
  width: 100%;
   
}

/* PDF preview */
.pdf-preview {
  font-size: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 80px;
  justify-content: center;
  border: 1px dashed #ccc;
  border-radius: 8px;
  padding: 20px;
}

/* fullscreen */
.preview-full {
  width: 100%;
  max-height: 80vh;
  object-fit: contain;
}

.preview-pdf {
  width: 100%;
  height: 80vh;
  border: none;
  padding: 25px;
}

.file-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80px;
  border: 1px dashed #ccc;
  border-radius: 8px;
  font-size: 24px;
  margin: 20px;
}

.file-icon.big {
  height: 300px;
  font-size: 60px;
}

.file-name {
  font-size: 12px;
  text-align: center;
}

.modal-file-name {
  font-size: 18px;
  margin-top: 8px;
  text-align: center;
}

.modal-file-comment {
  font-size: 18px;
  margin-top: 8px;
  margin-bottom: 19px;
}

.modal-file-btn {
  display: block;   
  margin: 0 auto; 
}

</style>