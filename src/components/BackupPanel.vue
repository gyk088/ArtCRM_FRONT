<template>
  <a-spin :spinning="loading && !status">
    <p v-if="status && !status.allowed" class="backup-hint">{{ status.reason }}</p>

    <div v-else-if="status" class="backup-panel">
      <p v-if="status.usersCount > 1" class="backup-hint">
        В бекап входят данные галереи и её менеджеров ({{ status.usersCount - 1 }}).
      </p>

      <!-- Данные -->
      <div class="backup-card">
        <div class="backup-card-head">
          <DatabaseOutlined class="backup-icon" />
          <div>
            <div class="backup-title">Данные</div>
            <div class="backup-desc">
              Работы, художники, контакты, продажи, ссылки, выставки, задачи, заметки и справочники —
              таблица Excel и полная копия (data.json). Без самих картинок.
            </div>
          </div>
        </div>
        <a-button type="primary" :loading="downloadingData" @click="handleDownloadData">
          <template #icon><DownloadOutlined /></template>
          Скачать данные
        </a-button>
      </div>

      <!-- Файлы -->
      <div class="backup-card">
        <div class="backup-card-head">
          <FolderOpenOutlined class="backup-icon" />
          <div>
            <div class="backup-title">Файлы</div>
            <div class="backup-desc">
              Все загруженные картинки и файлы ({{ status.filesCount }} шт., {{ formatStorageSize(status.filesBytes) }})
              в архиве ZIP, по папкам как в разделе «Файлы».
            </div>
          </div>
        </div>

        <template v-if="isRunning">
          <div class="backup-state">
            <LoadingOutlined spin /> Архив собирается… Пришлём уведомление, когда он будет готов. Страницу можно закрыть.
          </div>
        </template>

        <template v-else-if="files?.status === 'ready'">
          <div class="backup-state backup-state--ready">
            Архив готов {{ formatDate(files.finishedAt) }} · {{ formatStorageSize(files.size) }} ·
            скачать можно до {{ formatDate(files.expiresAt) }}
            <template v-if="files.missingCount"> · {{ files.missingCount }} файл(ов) не найдено на сервере — список в README.txt</template>
          </div>
          <div class="backup-actions">
            <a-button type="primary" :href="backupDownloadUrl(files.downloadUrl)">
              <template #icon><DownloadOutlined /></template>
              Скачать архив
            </a-button>
            <a-button type="link" :loading="starting" @click="handleStartFiles">Собрать заново</a-button>
          </div>
        </template>

        <template v-else>
          <div v-if="files?.status === 'failed'" class="backup-state backup-state--error">
            Не удалось собрать архив: {{ files.error }}
          </div>
          <div v-else-if="files?.status === 'expired'" class="backup-state">
            Срок ссылки на прошлый архив истёк — соберите новый.
          </div>
          <a-button :loading="starting" :disabled="!status.filesCount" @click="handleStartFiles">
            <template #icon><FileZipOutlined /></template>
            Собрать архив файлов
          </a-button>
          <div v-if="!status.filesCount" class="backup-hint backup-hint--inline">Файлов пока нет</div>
        </template>
      </div>
    </div>
  </a-spin>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  DatabaseOutlined,
  DownloadOutlined,
  FolderOpenOutlined,
  FileZipOutlined,
  LoadingOutlined,
} from '@ant-design/icons-vue'
import { useBackup, backupDownloadUrl } from '@/stores/backup.js'
import { formatStorageSize } from '@/stores/file.js'

// userId — чужой бекап (Super Admin в админ-панели); без него — свой
const props = defineProps({
  userId: { type: String, default: null },
})

const backupStore = useBackup()
const status = ref(null)
const loading = ref(false)
const downloadingData = ref(false)
const starting = ref(false)
let pollTimer = null

const files = computed(() => status.value?.files || null)
const isRunning = computed(() => ['queued', 'running'].includes(files.value?.status))

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : ''

async function load() {
  loading.value = true
  try {
    const data = await backupStore.getStatus(props.userId)
    if (data) status.value = data
  } finally {
    loading.value = false
  }
  schedulePoll()
}

// Пока архив собирается — опрашиваем состояние, чтобы кнопка «Скачать»
// появилась сама, без перезагрузки страницы
function schedulePoll() {
  clearTimeout(pollTimer)
  if (isRunning.value) pollTimer = setTimeout(load, 5000)
}

async function handleDownloadData() {
  downloadingData.value = true
  try {
    await backupStore.downloadData(props.userId)
  } finally {
    downloadingData.value = false
  }
}

async function handleStartFiles() {
  starting.value = true
  try {
    const data = await backupStore.startFiles(props.userId)
    if (data) {
      status.value = data
      message.success('Сборка архива запущена — пришлём уведомление, когда он будет готов')
      schedulePoll()
    }
  } finally {
    starting.value = false
  }
}

watch(() => props.userId, () => {
  status.value = null
  load()
})
onMounted(load)
onBeforeUnmount(() => clearTimeout(pollTimer))
</script>

<style scoped>
.backup-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.backup-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  border: 1px solid var(--border, rgba(0, 0, 0, 0.1));
  border-radius: 10px;
}

.backup-card-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.backup-icon {
  font-size: 20px;
  color: var(--accent, #8a6d2f);
  margin-top: 2px;
}

.backup-title {
  font-weight: 600;
  margin-bottom: 2px;
}

.backup-desc {
  font-size: 13px;
  color: var(--text-faint, #7c7669);
  line-height: 1.45;
}

.backup-state {
  font-size: 13px;
  line-height: 1.45;
}

.backup-state--ready {
  color: var(--text-body, #2c2a25);
}

.backup-state--error {
  color: #b43c3c;
}

.backup-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  align-items: center;
}

.backup-hint {
  margin: 0;
  font-size: 13px;
  color: var(--text-faint, #7c7669);
}

.backup-hint--inline {
  font-size: 12px;
}
</style>
