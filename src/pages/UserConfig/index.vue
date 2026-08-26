<template>
  <div class="profile-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">Профиль</h2>
        <p class="page-subtitle">Ваши личные данные</p>
      </div>
    </div>

    <div class="profile-container">
    <div class="left-column">
      <section class="form-section">
        <div class="section-heading">Основная информация</div>

        <div class="form-row">
          <div class="form-item">
            <label class="field-label">Имя</label>
            <a-input v-model:value="form.name" placeholder="Введите имя" />
          </div>
          <div class="form-item">
            <label class="field-label">Фамилия</label>
            <a-input v-model:value="form.surname" placeholder="Введите фамилию" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="field-label">Дата рождения</label>
            <a-date-picker
              v-model:value="form.bdate"
              value-format="YYYY-MM-DD"
              format="DD.MM.YYYY"
              placeholder="Выберите дату"
              class="fixed-input"
            />
          </div>
          <div class="form-item">
            <label class="field-label">Телефон</label>
            <a-input v-model:value="form.phone" placeholder="+375 (__) ___-__-__" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="field-label">Страна</label>
            <a-input v-model:value="form.country" placeholder="Страна" />
          </div>
          <div class="form-item">
            <label class="field-label">Город</label>
            <a-input v-model:value="form.city" placeholder="Город" />
          </div>
        </div>

        <div class="actions-row">
          <a-button type="primary" :loading="savingProfile" @click="handleSaveProfile">
            Сохранить
          </a-button>
        </div>
      </section>

      <section class="form-section">
        <div class="section-heading">Данные для входа</div>
        <p class="section-hint">Эти данные нельзя изменить на этой странице</p>

        <div class="readonly-row">
          <span class="readonly-label">Email</span>
          <span class="readonly-value">{{ originalUser?.email || '—' }}</span>
        </div>
      </section>

      <section class="form-section">
        <div class="section-heading">Сменить пароль</div>

        <div class="form-item">
          <label class="field-label">Текущий пароль</label>
          <a-input-password v-model:value="passwordForm.currentPassword" placeholder="Введите текущий пароль" class="fixed-input" />
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="field-label">Новый пароль</label>
            <a-input-password v-model:value="passwordForm.newPassword" placeholder="Не менее 6 символов" />
          </div>
          <div class="form-item">
            <label class="field-label">Повторите новый пароль</label>
            <a-input-password v-model:value="passwordForm.confirmPassword" placeholder="Повторите пароль" />
          </div>
        </div>

        <div class="actions-row">
          <a-button :loading="authStore.loading" @click="handleChangePassword">
            Сменить пароль
          </a-button>
        </div>
      </section>
    </div>

    <div class="right-column">
      <section class="form-section">
        <div class="section-heading-row">
          <div class="section-heading">Активные сессии</div>
          <a-button
            v-if="sessions.filter(s => !s.isCurrent).length"
            type="text"
            size="small"
            class="revoke-all-btn"
            :loading="revokingAll"
            @click="handleRevokeOthers"
          >
            Завершить остальные
          </a-button>
        </div>
        <p class="section-hint">Устройства, с которых выполнен вход в ваш аккаунт</p>

        <a-spin :spinning="sessionsLoading">
          <div v-if="sessions.length" class="sessions-list">
            <div v-for="session in sessions" :key="session.token" class="session-row">
              <div class="session-info">
                <div class="session-device">
                  {{ describeUserAgent(session.user_agent) }}
                  <span v-if="session.isCurrent" class="current-badge">Текущая</span>
                </div>
                <div class="session-meta">
                  {{ session.ip || 'IP неизвестен' }} · вход {{ formatSessionDate(session.ctime) }}
                  <template v-if="session.utime"> · активность {{ formatSessionDate(session.utime) }}</template>
                </div>
              </div>
              <a-button
                v-if="!session.isCurrent"
                type="text"
                danger
                size="small"
                :loading="revokingToken === session.token"
                @click="handleRevokeSession(session.token)"
              >
                Завершить
              </a-button>
            </div>
          </div>
          <p v-else-if="!sessionsLoading" class="section-hint">Сессии не найдены</p>
        </a-spin>
      </section>

      <section class="form-section">
        <div class="section-heading">Настройки сертификата</div>
        <p class="section-hint">Этот текст будет подставляться в шапку сертификата подлинности по умолчанию — его всё ещё можно будет изменить перед скачиванием конкретного сертификата</p>

        <div class="form-item">
          <label class="field-label">Текст в шапке сертификата</label>
          <a-textarea
            v-model:value="form.certificateHeaderText"
            :rows="4"
            :placeholder="DEFAULT_CERTIFICATE_HEADER_TEXT"
            class="fixed-input"
          />
        </div>

        <div class="actions-row">
          <a-button type="primary" :loading="savingCertificate" @click="handleSaveCertificate">
            Сохранить
          </a-button>
        </div>
      </section>
    </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { useUser } from '@/stores/user.js'
import { useAuth } from '@/stores/auth.js'
import { getUser } from '@/services/auth.js'
import { DEFAULT_CERTIFICATE_HEADER_TEXT } from '@/utils/certificatePdf.js'

const userStore = useUser()
const authStore = useAuth()

const originalUser = ref(getUser())

const form = reactive({
  name: originalUser.value?.name || '',
  surname: originalUser.value?.surname || '',
  bdate: originalUser.value?.bdate ? originalUser.value.bdate.slice(0, 10) : null,
  phone: originalUser.value?.phone || '',
  country: originalUser.value?.country || '',
  city: originalUser.value?.city || '',
  certificateHeaderText: originalUser.value?.certificate_header_text || '',
})

const savingProfile = ref(false)

const handleSaveProfile = async () => {
  savingProfile.value = true
  try {
    const result = await userStore.updateUser({
      name: form.name,
      surname: form.surname,
      bdate: form.bdate,
      phone: form.phone,
      country: form.country,
      city: form.city,
    })

    if (result) {
      originalUser.value = result
    }
  } finally {
    savingProfile.value = false
  }
}

const savingCertificate = ref(false)

const handleSaveCertificate = async () => {
  savingCertificate.value = true
  try {
    const result = await userStore.updateUser({
      certificate_header_text: form.certificateHeaderText,
    })

    if (result) {
      originalUser.value = result
    }
  } finally {
    savingCertificate.value = false
  }
}

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const handleChangePassword = async () => {
  if (!passwordForm.currentPassword) {
    message.warning('Введите текущий пароль')
    return
  }
  if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
    message.warning('Новый пароль должен быть не короче 6 символов')
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    message.warning('Пароли не совпадают')
    return
  }

  const success = await authStore.changePassword(passwordForm.currentPassword, passwordForm.newPassword)

  if (success) {
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  }
}

// === Активные сессии ===
const sessions = ref([])
const sessionsLoading = ref(false)
const revokingToken = ref(null)
const revokingAll = ref(false)

const loadSessions = async () => {
  sessionsLoading.value = true
  sessions.value = await authStore.getSessions()
  sessionsLoading.value = false
}

loadSessions()

const handleRevokeSession = async (token) => {
  revokingToken.value = token
  const success = await authStore.revokeSession(token)
  if (success) {
    sessions.value = sessions.value.filter(s => s.token !== token)
  }
  revokingToken.value = null
}

const handleRevokeOthers = async () => {
  revokingAll.value = true
  const success = await authStore.revokeOtherSessions()
  if (success) {
    sessions.value = sessions.value.filter(s => s.isCurrent)
  }
  revokingAll.value = false
}

// Простое разбирание User-Agent без сторонних библиотек — только для читаемого отображения
function describeUserAgent(userAgent) {
  if (!userAgent) return 'Неизвестное устройство'

  let os = 'Неизвестная ОС'
  if (/windows/i.test(userAgent)) os = 'Windows'
  else if (/mac os/i.test(userAgent)) os = 'macOS'
  else if (/android/i.test(userAgent)) os = 'Android'
  else if (/iphone|ipad|ios/i.test(userAgent)) os = 'iOS'
  else if (/linux/i.test(userAgent)) os = 'Linux'

  let browser = 'Браузер'
  if (/edg/i.test(userAgent)) browser = 'Edge'
  else if (/chrome/i.test(userAgent)) browser = 'Chrome'
  else if (/firefox/i.test(userAgent)) browser = 'Firefox'
  else if (/safari/i.test(userAgent)) browser = 'Safari'
  else if (/curl|postman|insomnia/i.test(userAgent)) browser = 'API-клиент'

  return `${browser}, ${os}`
}

function formatSessionDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

.profile-page {
  --bg: #f7f5f0;
  --bg-elevated: #ffffff;
  --card-bg: #efece4;
  --text-title: #211f1a;
  --text-body: #2c2a25;
  --text-muted: #5a564c;
  --text-faint: #7c7669;
  --accent: #8a6d2f;
  --accent-strong: #6f581f;
  --border: rgba(0, 0, 0, 0.1);
  --border-soft: rgba(0, 0, 0, 0.07);

  min-height: 100%;
  padding: 20px 24px 40px;
  background: var(--bg);
  color: var(--text-body);
  border-radius: 14px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 26px;
  font-weight: 600;
  color: var(--text-title);
  margin: 0 0 4px;
}

.page-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--text-faint);
}

.profile-container {
  max-width: 1160px;
  display: grid;
  grid-template-columns: 1fr 480px;
  align-items: start;
  gap: 16px;
}

.left-column,
.right-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.right-column {
  position: sticky;
  top: 20px;
}

.form-section {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px 20px;
}

.section-heading {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 14px;
}

.section-hint {
  margin: -8px 0 12px;
  font-size: 12px;
  color: var(--text-faint);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.form-item:last-child {
  margin-bottom: 0;
}

.field-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
}

.fixed-input {
  width: 100%;
}

.readonly-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--card-bg);
  border-radius: 8px;
  font-size: 13px;
}

.readonly-label {
  color: var(--text-faint);
}

.readonly-value {
  color: var(--text-body);
  font-weight: 500;
}

.actions-row {
  display: flex;
  justify-content: flex-end;
}

.section-heading-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.section-heading-row .section-heading {
  margin-bottom: 0;
}

.revoke-all-btn {
  color: var(--text-faint) !important;
  font-size: 12px !important;
}

.revoke-all-btn:hover {
  color: #b43c3c !important;
}

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.session-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: var(--card-bg);
  border-radius: 8px;
}

.session-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.session-device {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-body);
}

.current-badge {
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: var(--accent);
  border-radius: 10px;
}

.session-meta {
  font-size: 12px;
  color: var(--text-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-page :deep(.ant-btn-primary) {
  background: var(--accent);
  border-color: var(--accent);
  border-radius: 20px;
  padding: 4px 24px;
  height: auto;
}

.profile-page :deep(.ant-btn-primary:not(:disabled):hover) {
  background: var(--accent-strong) !important;
  border-color: var(--accent-strong) !important;
}

.profile-page :deep(.ant-input),
.profile-page :deep(.ant-picker) {
  border-radius: 8px;
  background: var(--bg-elevated);
  border-color: var(--border);
  color: var(--text-body);
}

.profile-page :deep(.ant-input:hover),
.profile-page :deep(.ant-input:focus),
.profile-page :deep(.ant-picker:hover),
.profile-page :deep(.ant-picker-focused) {
  border-color: var(--accent) !important;
}

@media (max-width: 860px) {
  .profile-container {
    grid-template-columns: 1fr;
  }

  .right-column {
    position: static;
  }
}

@media (max-width: 560px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
