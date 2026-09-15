<template>
  <Teleport to="body">
    <div v-if="props.open" class="qr-scanner-overlay">
      <div class="qr-scanner-header">
        <span class="qr-scanner-title">Сканировать QR код</span>
        <button class="qr-scanner-close" aria-label="Закрыть" @click="close">
          <CloseOutlined />
        </button>
      </div>

      <div class="qr-scanner-viewport">
        <video ref="videoRef" class="qr-scanner-video" muted playsinline />

        <div v-if="errorMessage" class="qr-scanner-message qr-scanner-error">
          {{ errorMessage }}
        </div>

        <div v-else-if="result" class="qr-scanner-result">
          <div class="qr-scanner-result-label">Распознано:</div>
          <div class="qr-scanner-result-value">{{ result }}</div>

          <div v-if="saveAsContact" class="qr-notes-wrap">
            <a-textarea
              v-model:value="contactNotes"
              placeholder="Заметка (необязательно)"
              :rows="2"
              class="qr-notes-input"
            />
            <button
              v-if="speechSupported"
              type="button"
              class="qr-mic-btn"
              :class="{ 'qr-mic-active': isListening }"
              :title="isListening ? 'Остановить надиктовку' : 'Надиктовать заметку'"
              @click="toggleDictation"
            >
              <AudioOutlined />
            </button>
          </div>

          <div class="qr-scanner-result-actions">
            <a-button v-if="saveAsContact" type="primary" class="qr-result-btn" :loading="savingContact" @click="handleSaveContact">
              Сохранить
            </a-button>
            <a-button v-else-if="pickMode" type="primary" class="qr-result-btn" @click="useResult">
              Использовать
            </a-button>
            <a-button v-else-if="isUrl" type="primary" class="qr-result-btn" @click="openResult">
              Перейти по ссылке
            </a-button>
            <a-button class="qr-result-btn" @click="copyResult">
              Копировать
            </a-button>
            <a-button class="qr-result-btn" @click="scanAgain">
              Сканировать ещё раз
            </a-button>
          </div>
        </div>

        <button v-if="hasFlash && !result && !errorMessage" class="qr-scanner-flash" aria-label="Фонарик" @click="toggleFlash">
          <ThunderboltOutlined :class="{ 'qr-flash-on': flashOn }" />
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { message } from 'ant-design-vue'
import { CloseOutlined, ThunderboltOutlined, AudioOutlined } from '@ant-design/icons-vue'
import QrScanner from 'qr-scanner'
import { useContact } from '@/stores/contact.js'
import { getUser } from '@/services/auth.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  // Режим «выбрать значение»: после распознавания вместо перехода по
  // ссылке показывает кнопку «Использовать», которая отдаёт результат
  // вызывающему компоненту через событие scanned (например, чтобы
  // записать ссылку из QR прямо в поле формы).
  pickMode: { type: Boolean, default: false },
  // Режим «сохранить как контакт»: после распознавания показывает поле
  // для заметки и кнопку «Сохранить», которая сразу создаёт новую строку
  // в таблице контактов (ссылка из QR попадает в поле «Мессенджер»).
  saveAsContact: { type: Boolean, default: false },
})
const emit = defineEmits(['update:open', 'scanned'])

const contactStore = useContact()

const videoRef = ref(null)
const errorMessage = ref('')
const result = ref('')
const hasFlash = ref(false)
const flashOn = ref(false)
const contactNotes = ref('')
const savingContact = ref(false)
const isListening = ref(false)

let scanner = null

// Надиктовка заметки голосом (Web Speech API) — не полифиллится, доступна
// не во всех браузерах (есть в Chrome/Safari, нет в Firefox), поэтому
// кнопку показываем только если API реально есть.
const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
const speechSupported = !!SpeechRecognitionCtor
let recognition = null
let dictationBaseText = ''

const isUrl = computed(() => /^https?:\/\//i.test(result.value))

async function startScanner() {
  errorMessage.value = ''
  result.value = ''
  contactNotes.value = ''
  flashOn.value = false
  stopDictation()

  await nextTick()
  if (!videoRef.value) return

  try {
    scanner = new QrScanner(
      videoRef.value,
      (scanResult) => onDecode(scanResult.data),
      {
        returnDetailedScanResult: true,
        preferredCamera: 'environment',
        highlightScanRegion: true,
        highlightCodeOutline: true,
      }
    )
    await scanner.start()
    hasFlash.value = await scanner.hasFlash()
  } catch (e) {
    console.error('QR scanner start error:', e)
    errorMessage.value = e?.message?.includes('Permission')
      ? 'Нет доступа к камере — разрешите доступ в настройках браузера'
      : 'Не удалось открыть камеру на этом устройстве'
  }
}

function stopScanner() {
  scanner?.stop()
  scanner?.destroy()
  scanner = null
  hasFlash.value = false
  flashOn.value = false
  stopDictation()
}

function onDecode(data) {
  if (result.value) return
  result.value = data
  scanner?.stop()
}

function scanAgain() {
  result.value = ''
  contactNotes.value = ''
  stopDictation()
  scanner?.start()
}

async function toggleFlash() {
  try {
    await scanner?.toggleFlash()
    flashOn.value = scanner?.isFlashOn() || false
  } catch (e) {
    console.error('QR scanner flash error:', e)
  }
}

function toggleDictation() {
  if (!speechSupported) {
    message.warning('Голосовой ввод не поддерживается в этом браузере')
    return
  }

  if (isListening.value) {
    recognition?.stop()
    return
  }

  dictationBaseText = contactNotes.value ? `${contactNotes.value} ` : ''

  recognition = new SpeechRecognitionCtor()
  recognition.lang = 'ru-RU'
  recognition.continuous = true
  recognition.interimResults = true

  recognition.onresult = (event) => {
    let finalChunk = ''
    let interimChunk = ''

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript
      if (event.results[i].isFinal) {
        finalChunk += transcript
      } else {
        interimChunk += transcript
      }
    }

    if (finalChunk) {
      dictationBaseText += `${finalChunk} `
    }
    contactNotes.value = dictationBaseText + interimChunk
  }

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error)
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      message.error('Нет доступа к микрофону')
    }
  }

  recognition.onend = () => {
    isListening.value = false
  }

  recognition.start()
  isListening.value = true
}

function stopDictation() {
  recognition?.stop()
  recognition = null
  isListening.value = false
}

function openResult() {
  window.location.href = result.value
}

function useResult() {
  emit('scanned', result.value)
  close()
}

async function handleSaveContact() {
  stopDictation()
  savingContact.value = true
  try {
    const created = await contactStore.createContact({
      user_id: getUser()?.id,
      name: '',
      phone: '',
      messenger: result.value,
      notes: contactNotes.value.trim(),
    })
    if (created) {
      close()
    }
  } finally {
    savingContact.value = false
  }
}

async function copyResult() {
  try {
    await navigator.clipboard.writeText(result.value)
    message.success('Скопировано')
  } catch (e) {
    console.error('Clipboard error:', e)
    message.error('Не удалось скопировать')
  }
}

function close() {
  emit('update:open', false)
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    startScanner()
  } else {
    stopScanner()
  }
})

onBeforeUnmount(stopScanner)
</script>

<style scoped>
.qr-scanner-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  background: #0b0b0d;
}

.qr-scanner-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  flex-shrink: 0;
}

.qr-scanner-title {
  color: #fbfaf7;
  font-family: 'Cormorant Garamond', serif;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.qr-scanner-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: #e7e4dd;
  font-size: 16px;
  cursor: pointer;
}

.qr-scanner-viewport {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.qr-scanner-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.qr-scanner-message {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  font-size: 14px;
}

.qr-scanner-error {
  color: #f09090;
}

.qr-scanner-result {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 24px;
  padding: 16px;
  background: rgba(15, 15, 17, 0.92);
  border: 1px solid rgba(200, 183, 137, 0.35);
  border-radius: 12px;
}

.qr-scanner-result-label {
  color: #8f8c84;
  font-size: 12px;
  margin-bottom: 4px;
}

.qr-scanner-result-value {
  color: #fbfaf7;
  font-size: 14px;
  word-break: break-all;
  margin-bottom: 14px;
}

.qr-notes-wrap {
  position: relative;
  margin-bottom: 12px;
}

.qr-notes-input {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.2);
  color: #fbfaf7;
  padding-right: 38px;
}

.qr-notes-input::placeholder {
  color: #8f8c84;
}

.qr-mic-btn {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: #8f8c84;
  font-size: 15px;
  cursor: pointer;
}

.qr-mic-btn:hover {
  color: #c8b789;
}

.qr-mic-active {
  color: #f09090;
  animation: qr-mic-pulse 1.2s ease-in-out infinite;
}

@keyframes qr-mic-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.qr-scanner-result-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.qr-result-btn {
  flex: 1 1 auto;
}

.qr-scanner-flash {
  position: absolute;
  right: 16px;
  bottom: 24px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 15, 17, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  color: #e7e4dd;
  font-size: 18px;
  cursor: pointer;
}

.qr-flash-on {
  color: #c8b789;
}
</style>
