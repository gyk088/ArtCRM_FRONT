<template>
  <a-modal
    :open="open"
    title="Предпросмотр сертификата"
    width="640px"
    :footer="null"
    destroyOnClose
    class="cert-preview-modal"
    @update:open="$emit('update:open', $event)"
  >
    <div v-if="work" class="cert-preview">
      <div class="cert-header">
        <div class="cert-title">СЕРТИФИКАТ ПОДЛИННОСТИ</div>
        <label class="cert-header-label">Текст в шапке сертификата</label>
        <a-textarea
          v-model:value="headerText"
          :rows="4"
          class="cert-header-input"
          placeholder="Текст в шапке сертификата"
        />
      </div>

      <div v-if="work.avatar?.url" class="cert-image">
        <img :src="work.avatar.url" />
      </div>

      <div class="cert-fields">
        <div v-for="[label, value] in fieldRows" :key="label" class="cert-field-row">
          <span class="cert-field-label">{{ label }}</span> {{ value }}
        </div>
      </div>

      <div class="cert-signature">
        <div class="cert-sign-row">
          <span class="cert-sign-label">Подпись</span>
          <span class="cert-sign-line"></span>
          <span class="cert-sign-value">/ {{ artistName || '—' }} /</span>
        </div>
        <div class="cert-sign-date">{{ dateStr }}</div>
      </div>
    </div>

    <div class="cert-actions">
      <a-button @click="close">Отмена</a-button>
      <a-button type="primary" :loading="downloading" class="cert-download-btn" @click="handleDownload">
        Скачать PDF
      </a-button>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import { downloadCertificatePdf, DEFAULT_CERTIFICATE_HEADER_TEXT } from '@/utils/certificatePdf.js'
import { getUser } from '@/services/auth.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  work: { type: Object, default: null },
  artistName: { type: String, default: '' },
  seriaName: { type: String, default: '' }
})

const emit = defineEmits(['update:open'])

// Пользователь может задать свой текст шапки в настройках профиля (UserConfig) —
// используем его, если задан, иначе — дефолтный текст.
function defaultHeaderText() {
  return getUser()?.certificate_header_text || DEFAULT_CERTIFICATE_HEADER_TEXT
}

const headerText = ref(defaultHeaderText())
const downloading = ref(false)
const now = new Date()
const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`

watch(() => props.open, (isOpen) => {
  if (isOpen) headerText.value = defaultHeaderText()
})

const fieldRows = computed(() => {
  if (!props.work) return []
  return [
    ['Художник:', props.artistName],
    ['Название работы:', props.work.name],
    ['Серия:', props.seriaName],
    ['Год создания:', props.work.year],
    ['Техника:', props.work.technique],
    ['Размер работы:', props.work.size],
  ].filter(([, value]) => value)
})

function close() {
  emit('update:open', false)
}

async function handleDownload() {
  if (!props.work || downloading.value) return

  downloading.value = true
  try {
    await downloadCertificatePdf(props.work, {
      artistName: props.artistName,
      seriaName: props.seriaName,
      headerText: headerText.value.trim() || defaultHeaderText()
    })
    close()
  } catch (error) {
    console.error('Ошибка скачивания сертификата:', error)
    message.error('Не удалось скачать сертификат')
  } finally {
    downloading.value = false
  }
}
</script>

<style scoped>
.cert-preview-modal :deep(.ant-modal-content) {
  border-radius: 12px;
}

.cert-preview {
  border: 1px solid #efece4;
  border-radius: 10px;
  padding: 28px;
  background: #fff;
  font-family: Arial, Helvetica, sans-serif;
  color: #000000;
}

.cert-header {
  text-align: center;
  padding-bottom: 16px;
  margin-bottom: 6px;
  line-height: 1.3;
}

.cert-title {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #000000;
  letter-spacing: 0.04em;
  margin-bottom: 0;
}

.cert-header-label {
  display: block;
  text-align: left;
  font-size: 11px;
  color: #7c7669;
  margin-bottom: 4px;
}

.cert-header-input {
  font-size: 12px;
}

.cert-header-input :deep(.ant-input) {
  border-color: #e0ddd4;
}

.cert-header-input :deep(.ant-input:hover),
.cert-header-input :deep(.ant-input:focus) {
  border-color: #8a6d2f;
}

.cert-image {
  text-align: center;
  margin-bottom: 40px;
}

.cert-image img {
  max-width: 190px;
  max-height: 240px;
  object-fit: contain;
}

.cert-fields {
  text-align: left;
  padding-left: 24px;
  font-size: 13px;
  color: #000000;
  margin-bottom: 30px;
}

.cert-field-label {
  font-weight: normal;
}

.cert-signature {
  padding-left: 24px;
}

.cert-sign-row {
  display: flex;
  align-items: flex-end;
}

.cert-sign-line {
  flex: 1;
  border-bottom: 1px solid #000000;
  margin: 0 8px 2px;
}

.cert-sign-label {
  font-size: 12px;
  color: #000000;
  white-space: nowrap;
}

.cert-sign-value {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 12px;
  color: #000000;
  white-space: nowrap;
}

.cert-sign-date {
  font-size: 12px;
  color: #000000;
  margin-top: 8px;
}

.cert-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

.cert-download-btn {
  background: #8a6d2f;
  border-color: #8a6d2f;
}

.cert-download-btn:hover {
  background: #6f581f !important;
  border-color: #6f581f !important;
}
</style>
