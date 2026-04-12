<template>
  <div class="file-uploader">

    <!-- Drag & Drop -->
    <a-upload-dragger
      :before-upload="handleBeforeUpload"
      :show-upload-list="false"
      multiple
    >
      <p class="drag-text">📂 Перетащите файл или нажмите</p>
    </a-upload-dragger>

    <!-- 🟡 Новые файлы -->
    <a-divider v-if="pendingFiles.length">Новые файлы</a-divider> 

    <a-list
      bordered
      :data-source="pendingFiles"
      v-if="pendingFiles.length"
    >
      <template #renderItem="{ item }">
        <a-list-item>
          <div class="pending-card">

            <!-- имя -->
            <div class="file-name">
              <strong>{{ item.originalName }}</strong>
            </div>

            <!-- название -->
            <a-input
              v-model:value="item.title"
              placeholder="Введите название"
              style="margin-bottom: 8px"
            />

            <!-- комментарий -->
            <a-textarea
              v-model:value="item.comment"
              placeholder="Комментарий"
              :rows="3"
            />

            <!-- кнопки -->
            <div class="actions">
              <a-button
                type="primary"
                :loading="item.loading"
                @click="saveFile(item)"
              >
                Сохранить
              </a-button>

              <a-button
                danger
                @click="removePending(item.id)"
              >
                Удалить
              </a-button>
            </div>

          </div>
        </a-list-item>
      </template>
    </a-list>

    <!-- 🟢 Сохраненные файлы -->
    <a-divider>Сохранённые файлы</a-divider>

    <a-input
      v-model:value="search"
      placeholder="Поиск по названию или комментарию"
      allow-clear
      style="margin-bottom: 12px;"
    />

    <a-list bordered :data-source="filteredFiles">
      <template #renderItem="{ item }">
        <a-list-item
          :class="{ selected: selectedFileId === item.id }"
          @click="selectFile(item)"
        >
          
          <div class="preview">
            <FileView :file="item" />
          </div>
         
          
          <a-list-item-meta
            :title="item.title || item.name"
            :description="item.comment || 'Без комментария'"
          />

          <template #actions>
            <div>
              <div v-if="remove">
                  <a-button
                    danger
                    type="text"
                    :loading="item.loading"
                    @click.stop="removeFile(item)"
                  >
                    Удалить
                  </a-button>
                </div>
                <div v-if="select">
                  <a-button 
                    type="primary"
                    :loading="item.loading"
                    @click.stop="handleSelectFile(item)"
                  >
                    Выбрать
                  </a-button>
                </div>
            </div>
          </template>

        </a-list-item>
      </template>
    </a-list>

  </div>
</template>

<script setup>
import { ref, computed, defineProps, defineEmits } from "vue"
import { message } from "ant-design-vue"
import { useFile } from "@/stores/file.js"
import FileView from "./FileView.vue"

const emit = defineEmits(["select"])


const props = defineProps({
  select: {
    type: Boolean    
  },
  remove: {
    type: Boolean    
  }
})


const search = ref("")
const fileStore = useFile()

const pendingFiles = ref([])
 
const selectedFileId = ref(null)

const generateId = () => Date.now() + Math.random()

const files = computed(() => {
  return fileStore.files
})

const filteredFiles = computed(() => {
  if (!search.value) return files.value

  const q = search.value.toLowerCase()

  return files.value.filter(f =>
    (f.title || "").toLowerCase().includes(q) ||
    (f.name || "").toLowerCase().includes(q) ||
    (f.comment || "").toLowerCase().includes(q)
  )
})

// 📥 добавление во временные
const handleBeforeUpload = (file) => {
  pendingFiles.value.unshift({
    id: generateId(),
    originalName: file.name,
    title: file.name, // автоподстановка
    comment: "",
    raw: file
  })

  return false
}

const handleSelectFile = (file) => { 
  // 👉 эмитим событие с выбранным файлом
  emit("select", file)
} 

// 💾 сохранить
const saveFile = async(item) => {

  if (!item.title) {
    message.warning("Введите название")
    return
  }
  item.loading = true

  const success = await fileStore.uploadFile(item.raw, {
    name: item.title,
    comment: item.comment
  })

  item.loading = false
 

  files.value.push({
    id: item.id,
    name: item.originalName,
    title: item.title,
    comment: item.comment,
    raw: item.raw,
    date: new Date()
  })

  pendingFiles.value = pendingFiles.value.filter(f => f.id !== item.id)

  message.success("Файл сохранён")
}

// ❌ удалить из pending
const removePending = (id) => {
  pendingFiles.value = pendingFiles.value.filter(f => f.id !== id)
}

// ❌ удалить сохранённый
const removeFile = async (item) => {
  item.loading = true
  await fileStore.deleteFile(item.id) // Удаляем с сервера   
  item.loading = false 
}

// 👉 выбор
const selectFile = (file) => {
  selectedFileId.value = file.id
  console.log("Выбран файл:", file)
}
</script>

<style scoped>
.preview {
  width: 80px;
  height: 80px;
  margin-right: 16px;
  overflow: hidden;
}

.file-uploader {
  max-width: 600px;
}

.drag-text {
  margin: 0;
}

.pending-card {
  width: 100%;
}

.file-name {
  margin-bottom: 8px;
}

.actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.selected {
  background: #e6f4ff;
}

</style>