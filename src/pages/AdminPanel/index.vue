<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">Админ-панель</h2>
        <p class="page-subtitle">Пользователи и галереи системы</p>
      </div>
      <a-input
        v-model:value="searchQuery"
        placeholder="Поиск по имени, фамилии или email"
        allow-clear
        class="search-input"
      >
        <template #prefix><SearchOutlined /></template>
      </a-input>
    </div>

    <a-tabs v-model:activeKey="activeTab" class="admin-tabs">
      <a-tab-pane key="users" tab="Пользователи">
        <div class="tab-toolbar">
          <span class="tab-hint">Менеджеры, художники и супер-админы</span>
          <a-button type="primary" @click="openCreateUser">
            <template #icon><PlusOutlined /></template>
            Создать пользователя
          </a-button>
        </div>

        <a-table
          :data-source="userRows"
          :columns="userColumns"
          :loading="adminStore.loading"
          row-key="id"
          size="middle"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'fullName'">
              {{ [record.name, record.surname].filter(Boolean).join(' ') || '—' }}
            </template>

            <template v-else-if="column.dataIndex === 'role'">
              <a-select
                :value="record.role"
                :options="roleOptions"
                size="small"
                style="width: 160px"
                :loading="rolePendingId === record.id"
                @change="(value) => handleChangeRole(record, value)"
              />
            </template>

            <template v-else-if="column.dataIndex === 'gallery'">
              {{ getGalleryName(record.managed_by_gallery_id) }}
            </template>

            <template v-else-if="column.dataIndex === 'active'">
              <a-switch
                :checked="record.active !== false"
                :loading="blockPendingId === record.id"
                @change="(checked) => handleToggleBlock(record, checked)"
              />
              <span class="status-text" :class="{ blocked: record.active === false }">
                {{ record.active === false ? 'Заблокирован' : 'Активен' }}
              </span>
            </template>

            <template v-else-if="column.dataIndex === 'actions'">
              <a-tooltip v-if="record.id === currentUserId" title="Это ваш аккаунт">
                <a-button type="text" size="small" disabled>
                  <LoginOutlined />
                </a-button>
              </a-tooltip>
              <a-tooltip v-else :title="record.active === false ? 'Пользователь заблокирован' : 'Войти под пользователем'">
                <a-button
                  type="text"
                  size="small"
                  :disabled="record.active === false"
                  :loading="impersonatingId === record.id"
                  @click="handleImpersonate(record)"
                >
                  <LoginOutlined />
                </a-button>
              </a-tooltip>
              <a-button type="text" size="small" @click="openChangePassword(record)">Пароль</a-button>
              <a-button type="text" size="small" @click="openChangeEmail(record)">Email</a-button>
            </template>

            <template v-else>
              {{ record[column.dataIndex] }}
            </template>
          </template>
        </a-table>
      </a-tab-pane>

      <a-tab-pane key="galleries" tab="Галереи">
        <div class="tab-toolbar">
          <span class="tab-hint">Управляющие пользователи — каждая видит только своих менеджеров/художников</span>
          <a-button type="primary" @click="openCreateGallery">
            <template #icon><PlusOutlined /></template>
            Создать галерею
          </a-button>
        </div>

        <a-table
          :data-source="galleryRows"
          :columns="galleryColumns"
          :loading="adminStore.loading"
          row-key="id"
          size="middle"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'fullName'">
              {{ [record.name, record.surname].filter(Boolean).join(' ') || '—' }}
            </template>

            <template v-else-if="column.dataIndex === 'managedCount'">
              {{ managedCountFor(record.id) }}
            </template>

            <template v-else-if="column.dataIndex === 'active'">
              <a-switch
                :checked="record.active !== false"
                :loading="blockPendingId === record.id"
                @change="(checked) => handleToggleBlock(record, checked)"
              />
              <span class="status-text" :class="{ blocked: record.active === false }">
                {{ record.active === false ? 'Заблокирован' : 'Активен' }}
              </span>
            </template>

            <template v-else-if="column.dataIndex === 'actions'">
              <a-tooltip v-if="record.id === currentUserId" title="Это ваш аккаунт">
                <a-button type="text" size="small" disabled>
                  <LoginOutlined />
                </a-button>
              </a-tooltip>
              <a-tooltip v-else :title="record.active === false ? 'Пользователь заблокирован' : 'Войти под пользователем'">
                <a-button
                  type="text"
                  size="small"
                  :disabled="record.active === false"
                  :loading="impersonatingId === record.id"
                  @click="handleImpersonate(record)"
                >
                  <LoginOutlined />
                </a-button>
              </a-tooltip>
              <a-button type="text" size="small" @click="openChangePassword(record)">Пароль</a-button>
              <a-button type="text" size="small" @click="openChangeEmail(record)">Email</a-button>
            </template>

            <template v-else>
              {{ record[column.dataIndex] }}
            </template>
          </template>
        </a-table>
      </a-tab-pane>
    </a-tabs>

    <!-- Создание пользователя (manager/artist) -->
    <a-modal
      v-model:open="isCreateUserOpen"
      title="Создать пользователя"
      ok-text="Создать"
      cancel-text="Отмена"
      :confirm-loading="creating"
      @ok="handleCreateUser"
    >
      <a-form layout="vertical">
        <a-form-item label="Имя">
          <a-input v-model:value="createUserForm.name" />
        </a-form-item>
        <a-form-item label="Фамилия">
          <a-input v-model:value="createUserForm.surname" />
        </a-form-item>
        <a-form-item label="Email">
          <a-input v-model:value="createUserForm.email" />
        </a-form-item>
        <a-form-item label="Пароль">
          <a-input-password v-model:value="createUserForm.password" placeholder="Не менее 6 символов" />
        </a-form-item>
        <a-form-item label="Роль">
          <a-select v-model:value="createUserForm.role" :options="managedRoleOptions" />
        </a-form-item>
        <a-form-item label="Галерея (необязательно)">
          <a-select
            v-model:value="createUserForm.managed_by_gallery_id"
            :options="galleryOptions"
            allow-clear
            placeholder="Без галереи — напрямую под Super Admin"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Создание галереи -->
    <a-modal
      v-model:open="isCreateGalleryOpen"
      title="Создать галерею"
      ok-text="Создать"
      cancel-text="Отмена"
      :confirm-loading="creating"
      @ok="handleCreateGallery"
    >
      <a-form layout="vertical">
        <a-form-item label="Имя">
          <a-input v-model:value="createGalleryForm.name" />
        </a-form-item>
        <a-form-item label="Фамилия">
          <a-input v-model:value="createGalleryForm.surname" />
        </a-form-item>
        <a-form-item label="Email">
          <a-input v-model:value="createGalleryForm.email" />
        </a-form-item>
        <a-form-item label="Пароль">
          <a-input-password v-model:value="createGalleryForm.password" placeholder="Не менее 6 символов" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Смена пароля -->
    <a-modal
      v-model:open="isPasswordModalOpen"
      title="Сменить пароль"
      ok-text="Сохранить"
      cancel-text="Отмена"
      :confirm-loading="savingPassword"
      @ok="handleSavePassword"
    >
      <p class="modal-target">{{ targetLabel }}</p>
      <a-input-password v-model:value="newPassword" placeholder="Новый пароль, не менее 6 символов" />
    </a-modal>

    <!-- Смена email -->
    <a-modal
      v-model:open="isEmailModalOpen"
      title="Сменить email"
      ok-text="Сохранить"
      cancel-text="Отмена"
      :confirm-loading="savingEmail"
      @ok="handleSaveEmail"
    >
      <p class="modal-target">{{ targetLabel }}</p>
      <a-input v-model:value="newEmail" placeholder="Новый email" />
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, LoginOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { useAdmin } from '@/stores/admin.js'
import { ROLES, TEXT_ROLES } from '@/services/const.js'
import { getUser } from '@/services/auth.js'

const adminStore = useAdmin()
const activeTab = ref('users')
const currentUserId = getUser()?.id

onMounted(() => {
  adminStore.getAllUsers()
})

const searchQuery = ref('')

function matchesSearch(user) {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return true

  const haystack = [user.name, user.surname, user.email].filter(Boolean).join(' ').toLowerCase()
  return haystack.includes(query)
}

const userRows = computed(() => adminStore.listUsers.filter(u => u.role !== ROLES.GALLERY && matchesSearch(u)))
const galleryRows = computed(() => adminStore.listUsers.filter(u => u.role === ROLES.GALLERY && matchesSearch(u)))

function getGalleryName(galleryId) {
  if (!galleryId) return '—'
  const gallery = adminStore.listUsers.find(u => u.id === galleryId)
  if (!gallery) return '—'
  return [gallery.name, gallery.surname].filter(Boolean).join(' ') || gallery.email
}

function managedCountFor(galleryId) {
  return adminStore.listUsers.filter(u => u.managed_by_gallery_id === galleryId).length
}

const roleOptions = Object.values(ROLES).map(role => ({ label: TEXT_ROLES[role] || role, value: role }))
const managedRoleOptions = [
  { label: TEXT_ROLES[ROLES.MANAGER], value: ROLES.MANAGER },
  { label: TEXT_ROLES[ROLES.ARTIST], value: ROLES.ARTIST },
]
const galleryOptions = computed(() => adminStore.listUsers
  .filter(u => u.role === ROLES.GALLERY)
  .map(g => ({
    label: [g.name, g.surname].filter(Boolean).join(' ') || g.email,
    value: g.id,
  })))

const userColumns = [
  { title: 'Имя', dataIndex: 'fullName', key: 'fullName' },
  { title: 'Email', dataIndex: 'email', key: 'email' },
  { title: 'Роль', dataIndex: 'role', key: 'role', width: 180 },
  { title: 'Галерея', dataIndex: 'gallery', key: 'gallery' },
  { title: 'Статус', dataIndex: 'active', key: 'active', width: 200 },
  { title: 'Действия', dataIndex: 'actions', key: 'actions', width: 210 },
]

const galleryColumns = [
  { title: 'Имя', dataIndex: 'fullName', key: 'fullName' },
  { title: 'Email', dataIndex: 'email', key: 'email' },
  { title: 'Управляемых', dataIndex: 'managedCount', key: 'managedCount', width: 140 },
  { title: 'Статус', dataIndex: 'active', key: 'active', width: 200 },
  { title: 'Действия', dataIndex: 'actions', key: 'actions', width: 210 },
]

// === Роль ===
const rolePendingId = ref(null)
const handleChangeRole = async (record, role) => {
  if (role === record.role) return
  rolePendingId.value = record.id
  await adminStore.changeRole(record.id, role)
  rolePendingId.value = null
}

// === Блокировка ===
const blockPendingId = ref(null)
const handleToggleBlock = async (record, checked) => {
  blockPendingId.value = record.id
  await adminStore.toggleBlock(record.id, checked)
  blockPendingId.value = null
}

// === Войти под пользователем (имперсонация) ===
const impersonatingId = ref(null)
function handleImpersonate(record) {
  const fullName = [record.name, record.surname].filter(Boolean).join(' ') || record.email

  Modal.confirm({
    title: 'Войти под пользователем?',
    icon: () => h(ExclamationCircleOutlined),
    content: `Вы перейдёте в аккаунт «${fullName}». Вернуться в свой аккаунт можно будет через баннер вверху страницы.`,
    okText: 'Войти',
    cancelText: 'Отмена',
    onOk: async () => {
      impersonatingId.value = record.id
      const success = await adminStore.impersonate(record.id)
      impersonatingId.value = null

      if (success) {
        // Полная перезагрузка — самый надёжный способ сбросить кэш всех
        // остальных сторов (работы, ссылки и т.д.), которые могли успеть
        // подгрузить данные ещё от лица администратора/галереи.
        window.location.href = '/home'
      }
    }
  })
}

// === Создание пользователя ===
const isCreateUserOpen = ref(false)
const creating = ref(false)
const createUserForm = ref({ name: '', surname: '', email: '', password: '', role: ROLES.ARTIST, managed_by_gallery_id: null })

function openCreateUser() {
  createUserForm.value = { name: '', surname: '', email: '', password: '', role: ROLES.ARTIST, managed_by_gallery_id: null }
  isCreateUserOpen.value = true
}

async function handleCreateUser() {
  if (!createUserForm.value.email) {
    message.warning('Укажите email')
    return
  }
  creating.value = true
  try {
    const result = await adminStore.createUser(createUserForm.value)
    if (result) isCreateUserOpen.value = false
  } finally {
    creating.value = false
  }
}

// === Создание галереи ===
const isCreateGalleryOpen = ref(false)
const createGalleryForm = ref({ name: '', surname: '', email: '', password: '' })

function openCreateGallery() {
  createGalleryForm.value = { name: '', surname: '', email: '', password: '' }
  isCreateGalleryOpen.value = true
}

async function handleCreateGallery() {
  if (!createGalleryForm.value.email) {
    message.warning('Укажите email')
    return
  }
  creating.value = true
  try {
    const result = await adminStore.createGallery(createGalleryForm.value)
    if (result) isCreateGalleryOpen.value = false
  } finally {
    creating.value = false
  }
}

// === Смена пароля/email — общий выбранный пользователь ===
const targetUser = ref(null)
const targetLabel = computed(() => {
  if (!targetUser.value) return ''
  const name = [targetUser.value.name, targetUser.value.surname].filter(Boolean).join(' ')
  return name ? `${name} (${targetUser.value.email})` : targetUser.value.email
})

const isPasswordModalOpen = ref(false)
const newPassword = ref('')
const savingPassword = ref(false)

function openChangePassword(record) {
  targetUser.value = record
  newPassword.value = ''
  isPasswordModalOpen.value = true
}

async function handleSavePassword() {
  if (!newPassword.value || newPassword.value.length < 6) {
    message.warning('Пароль должен быть не короче 6 символов')
    return
  }
  savingPassword.value = true
  try {
    const success = await adminStore.changePassword(targetUser.value.id, newPassword.value)
    if (success) isPasswordModalOpen.value = false
  } finally {
    savingPassword.value = false
  }
}

const isEmailModalOpen = ref(false)
const newEmail = ref('')
const savingEmail = ref(false)

function openChangeEmail(record) {
  targetUser.value = record
  newEmail.value = record.email || ''
  isEmailModalOpen.value = true
}

async function handleSaveEmail() {
  if (!newEmail.value) {
    message.warning('Укажите email')
    return
  }
  savingEmail.value = true
  try {
    const result = await adminStore.changeEmail(targetUser.value.id, newEmail.value)
    if (result) isEmailModalOpen.value = false
  } finally {
    savingEmail.value = false
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

.admin-page {
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
  --danger: #b43c3c;

  min-height: 100%;
  padding: 20px 24px 40px;
  background: var(--bg);
  color: var(--text-body);
  border-radius: 14px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.search-input {
  width: 320px;
  max-width: 100%;
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

.tab-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.tab-hint {
  font-size: 12px;
  color: var(--text-faint);
}

.status-text {
  margin-left: 8px;
  font-size: 12px;
  color: var(--text-muted);
}

.status-text.blocked {
  color: var(--danger);
}

.modal-target {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--text-muted);
}

.admin-page :deep(.ant-btn-primary) {
  background: var(--accent);
  border-color: var(--accent);
}

.admin-page :deep(.ant-btn-primary:not(:disabled):hover) {
  background: var(--accent-strong) !important;
  border-color: var(--accent-strong) !important;
}

.admin-page :deep(.ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn) {
  color: var(--accent-strong);
}

.admin-page :deep(.ant-tabs-ink-bar) {
  background: var(--accent);
}

.admin-page :deep(.ant-table) {
  background: var(--bg-elevated);
}

.admin-page :deep(.ant-table-thead > tr > th) {
  background: var(--card-bg);
  color: var(--accent);
  font-weight: 600;
}
</style>
