<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <div class="page-header-top">
          <MobileMenuButton />
          <h2 class="page-title">Админ-панель</h2>
        </div>
        <p class="page-subtitle">Пользователи и галереи системы</p>
      </div>
      <div class="page-header-actions">
        <a-button v-if="isGalleryViewer" @click="openQuotaModal(currentUserId, 'gallery')">
          <template #icon><CrownOutlined /></template>
          Квоты и приглашения
        </a-button>
        <a-input
          v-model:value="searchQuery"
          placeholder="Поиск по имени, фамилии или email"
          allow-clear
          class="search-input"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
      </div>
    </div>

    <a-tabs v-model:activeKey="activeTab" class="admin-tabs">
      <a-tab-pane key="users" tab="Пользователи">
        <div class="tab-toolbar">
          <span class="tab-hint">Менеджеры, художники и супер-админы</span>
          <a-button type="primary" @click="openCreateUser()">
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
          :scroll="{ x: 950 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'fullName'">
              {{ [record.name, record.surname].filter(Boolean).join(' ') || '—' }}
            </template>

            <template v-else-if="column.dataIndex === 'role'">
              <a-select
                :value="record.role"
                :options="isSuperAdminViewer ? roleOptions : managedRoleOptions"
                size="small"
                style="width: 160px"
                :loading="rolePendingId === record.id"
                @change="(value) => handleChangeRole(record, value)"
              />
            </template>

            <template v-else-if="column.dataIndex === 'gallery'">
              <div v-if="isSuperAdminViewer && (record.role === 'manager' || record.role === 'artist')" class="gallery-cell">
                <a-select
                  :value="galleryDraftFor(record)"
                  :options="galleryOptions"
                  allow-clear
                  placeholder="Без галереи"
                  size="small"
                  style="width: 150px"
                  :disabled="galleryPendingId === record.id"
                  @change="(value) => setGalleryDraft(record, value)"
                />
                <a-button
                  v-if="hasGalleryDraftChange(record)"
                  type="link"
                  size="small"
                  :loading="galleryPendingId === record.id"
                  @click="handleAssignGallery(record)"
                >
                  Сохранить
                </a-button>
              </div>
              <span v-else>{{ getGalleryName(record.managed_by_gallery_id) }}</span>
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

            <template v-else-if="column.dataIndex === 'storage'">
              <div class="storage-cell">
                <a-progress
                  :percent="storagePercent(record)"
                  :status="storagePercent(record) >= 100 ? 'exception' : 'normal'"
                  size="small"
                  class="storage-cell-bar"
                />
                <span class="storage-cell-text">
                  {{ formatStorageSize(record.storage_used_bytes) }} / {{ formatStorageSize(record.storage_limit_bytes) }}
                </span>
                <a-button type="link" size="small" @click="openChangeStorage(record)">Изменить</a-button>
              </div>
            </template>

            <template v-else-if="column.dataIndex === 'actions'">
              <div class="actions-cell">
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
                <a-button
                  v-if="isSuperAdminViewer && record.role === 'manager' && !record.managed_by_gallery_id"
                  type="text"
                  size="small"
                  @click="openQuotaModal(record.id, 'manager')"
                >
                  Квоты
                </a-button>
              </div>
            </template>

            <template v-else>
              {{ record[column.dataIndex] }}
            </template>
          </template>
        </a-table>
      </a-tab-pane>

      <a-tab-pane v-if="isSuperAdminViewer" key="galleries" tab="Галереи">
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
          :scroll="{ x: 700 }"
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
              <div class="actions-cell">
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
                <a-button type="text" size="small" @click="openQuotaModal(record.id, 'gallery')">Квоты</a-button>
                <a-button type="text" size="small" @click="openCreateUser(record.id)">
                  <template #icon><UserAddOutlined /></template>
                  Добавить
                </a-button>
              </div>
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
        <a-form-item v-if="isSuperAdminViewer" label="Галерея (необязательно)">
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

    <!-- Изменение лимита места на диске -->
    <a-modal
      v-model:open="isStorageModalOpen"
      title="Лимит места на диске"
      ok-text="Сохранить"
      cancel-text="Отмена"
      :confirm-loading="savingStorage"
      @ok="handleSaveStorage"
    >
      <p class="modal-target">{{ targetLabel }}</p>
      <p v-if="targetUser" class="modal-hint">
        Использовано: {{ formatStorageSize(targetUser.storage_used_bytes) }}
      </p>
      <a-input-number
        id="storageLimitGb"
        v-model:value="newStorageLimitGb"
        :min="0"
        :step="1"
        addon-after="ГБ"
        style="width: 100%"
      />
    </a-modal>

    <!-- Квоты "проданных мест" + пригласительные ссылки -->
    <a-modal
      v-model:open="isQuotaModalOpen"
      title="Квоты и приглашения"
      :ok-text="isSuperAdminViewer ? 'Сохранить' : undefined"
      cancel-text="Закрыть"
      :confirm-loading="savingQuotas"
      :footer="isSuperAdminViewer ? undefined : null"
      @ok="handleSaveQuotas"
    >
      <a-spin :spinning="loadingQuota">
        <template v-if="quotaUsage">
          <template v-if="quotaTargetRole === 'gallery'">
            <div class="quota-row">
              <span class="quota-label">Менеджеры</span>
              <a-input-number
                v-if="isSuperAdminViewer"
                v-model:value="quotaForm.quota_managers"
                :min="0"
                size="small"
                style="width: 90px"
              />
              <span v-else class="quota-value">{{ quotaUsage.managers.quota }}</span>
              <span class="quota-used">использовано: {{ quotaUsage.managers.used }}</span>
            </div>

            <div class="quota-row">
              <span class="quota-label">Художники с кабинетом</span>
              <a-input-number
                v-if="isSuperAdminViewer"
                v-model:value="quotaForm.quota_artist_cabinets"
                :min="0"
                size="small"
                style="width: 90px"
              />
              <span v-else class="quota-value">{{ quotaUsage.artistCabinets.quota }}</span>
              <span class="quota-used">использовано: {{ quotaUsage.artistCabinets.used }}</span>
            </div>
          </template>

          <div class="quota-row">
            <span class="quota-label">Художники в справочнике</span>
            <a-input-number
              v-if="isSuperAdminViewer"
              v-model:value="quotaForm.quota_catalog_artists"
              :min="0"
              size="small"
              style="width: 90px"
            />
            <span v-else class="quota-value">{{ quotaUsage.catalogArtists.quota }}</span>
            <span class="quota-used">использовано: {{ quotaUsage.catalogArtists.used }}</span>
          </div>

          <template v-if="quotaTargetRole === 'gallery'">
            <a-divider />

            <div class="invite-row">
              <div class="invite-row-label">Ссылка для менеджеров</div>
              <div class="invite-row-controls">
                <a-input :value="managerInviteUrl" readonly size="small" />
                <a-button size="small" @click="copyInviteLink(managerInviteUrl)">
                  <template #icon><CopyOutlined /></template>
                </a-button>
                <a-button
                  size="small"
                  :loading="regeneratingRole === 'manager'"
                  @click="handleRegenerateInvite('manager')"
                >
                  Перевыпустить
                </a-button>
              </div>
            </div>

            <div class="invite-row">
              <div class="invite-row-label">Ссылка для художников</div>
              <div class="invite-row-controls">
                <a-input :value="artistInviteUrl" readonly size="small" />
                <a-button size="small" @click="copyInviteLink(artistInviteUrl)">
                  <template #icon><CopyOutlined /></template>
                </a-button>
                <a-button
                  size="small"
                  :loading="regeneratingRole === 'artist'"
                  @click="handleRegenerateInvite('artist')"
                >
                  Перевыпустить
                </a-button>
              </div>
            </div>
          </template>
        </template>
      </a-spin>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, LoginOutlined, ExclamationCircleOutlined, CrownOutlined, CopyOutlined, UserAddOutlined } from '@ant-design/icons-vue'
import { useAdmin } from '@/stores/admin.js'
import { formatStorageSize } from '@/stores/file.js'
import { ROLES, TEXT_ROLES } from '@/services/const.js'
import { getUser } from '@/services/auth.js'
import MobileMenuButton from '@/components/MobileMenuButton.vue'

const adminStore = useAdmin()
const activeTab = ref('users')
const currentUserId = getUser()?.id
const isSuperAdminViewer = computed(() => getUser()?.role === ROLES.SUPER_ADMIN)
const isGalleryViewer = computed(() => getUser()?.role === ROLES.GALLERY)

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
  { title: 'Роль', dataIndex: 'role', key: 'role', width: 160 },
  { title: 'Галерея', dataIndex: 'gallery', key: 'gallery', width: 170 },
  { title: 'Место на диске', dataIndex: 'storage', key: 'storage', width: 220 },
  { title: 'Статус', dataIndex: 'active', key: 'active', width: 150 },
  { title: 'Действия', dataIndex: 'actions', key: 'actions', width: 170 },
]

const galleryColumns = [
  { title: 'Имя', dataIndex: 'fullName', key: 'fullName' },
  { title: 'Email', dataIndex: 'email', key: 'email' },
  { title: 'Управляемых', dataIndex: 'managedCount', key: 'managedCount', width: 120 },
  { title: 'Статус', dataIndex: 'active', key: 'active', width: 150 },
  { title: 'Действия', dataIndex: 'actions', key: 'actions', width: 170 },
]

// === Роль ===
const rolePendingId = ref(null)
const handleChangeRole = async (record, role) => {
  if (role === record.role) return
  rolePendingId.value = record.id
  await adminStore.changeRole(record.id, role)
  rolePendingId.value = null
}

// === Перемещение в другую галерею — работы переезжают вместе с
// пользователем автоматически (они остаются за тем же user_id, см.
// AuthorizationService.gallerySharingScope), если квота новой галереи
// позволяет. Выбор в select — черновик, применяется только по кнопке
// "Сохранить", чтобы случайный клик не перемещал пользователя сразу ===
const galleryPendingId = ref(null)
const galleryDrafts = ref({})

function galleryDraftFor(record) {
  if (record.id in galleryDrafts.value) return galleryDrafts.value[record.id] || undefined
  return record.managed_by_gallery_id || undefined
}

function setGalleryDraft(record, value) {
  galleryDrafts.value = { ...galleryDrafts.value, [record.id]: value || null }
}

function hasGalleryDraftChange(record) {
  if (!(record.id in galleryDrafts.value)) return false
  return galleryDrafts.value[record.id] !== (record.managed_by_gallery_id || null)
}

const handleAssignGallery = async (record) => {
  const nextGalleryId = record.id in galleryDrafts.value ? galleryDrafts.value[record.id] : null
  galleryPendingId.value = record.id
  const result = await adminStore.assignUserToGallery(record.id, nextGalleryId)
  galleryPendingId.value = null
  if (result) {
    const drafts = { ...galleryDrafts.value }
    delete drafts[record.id]
    galleryDrafts.value = drafts
  }
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

function openCreateUser(galleryId = null) {
  createUserForm.value = { name: '', surname: '', email: '', password: '', role: ROLES.ARTIST, managed_by_gallery_id: galleryId }
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

// === Лимит места на диске ===
const GB = 1024 * 1024 * 1024
const isStorageModalOpen = ref(false)
const newStorageLimitGb = ref(5)
const savingStorage = ref(false)

function storagePercent(record) {
  const limit = Number(record.storage_limit_bytes)
  if (!limit) return 0
  return Math.min(100, Math.round((Number(record.storage_used_bytes) / limit) * 100))
}

function openChangeStorage(record) {
  targetUser.value = record
  newStorageLimitGb.value = Math.round((Number(record.storage_limit_bytes) / GB) * 10) / 10
  isStorageModalOpen.value = true
}

async function handleSaveStorage() {
  if (newStorageLimitGb.value == null || newStorageLimitGb.value < 0) {
    message.warning('Укажите лимит в ГБ')
    return
  }
  savingStorage.value = true
  try {
    const limitBytes = Math.round(newStorageLimitGb.value * GB)
    const result = await adminStore.changeStorageLimit(targetUser.value.id, limitBytes)
    if (result) isStorageModalOpen.value = false
  } finally {
    savingStorage.value = false
  }
}

// === Квоты "проданных мест" + пригласительные ссылки ===
const isQuotaModalOpen = ref(false)
const loadingQuota = ref(false)
const savingQuotas = ref(false)
const quotaTargetGalleryId = ref(null)
// 'gallery' — показывать квоты менеджеров/художников-кабинетов и ссылки-
// приглашения; 'manager' — менеджер без галереи, только свой справочник
// художников, без приглашений (они только у галереи).
const quotaTargetRole = ref('gallery')
const quotaUsage = ref(null)
const quotaForm = ref({ quota_managers: 0, quota_artist_cabinets: 0, quota_catalog_artists: 0 })
const invites = ref({ managerToken: '', artistToken: '' })
const regeneratingRole = ref(null)

const managerInviteUrl = computed(() => invites.value.managerToken
  ? `${window.location.origin}/auth?invite=${invites.value.managerToken}`
  : '')
const artistInviteUrl = computed(() => invites.value.artistToken
  ? `${window.location.origin}/auth?invite=${invites.value.artistToken}`
  : '')

async function openQuotaModal(holderId, role = 'gallery') {
  quotaTargetGalleryId.value = holderId
  quotaTargetRole.value = role
  isQuotaModalOpen.value = true
  loadingQuota.value = true
  quotaUsage.value = null
  invites.value = { managerToken: '', artistToken: '' }
  try {
    const usage = await adminStore.getQuotaUsage(holderId)
    const links = role === 'gallery' ? await adminStore.getInviteLinks(holderId) : null
    if (usage) {
      quotaUsage.value = usage
      quotaForm.value = {
        quota_managers: usage.managers.quota,
        quota_artist_cabinets: usage.artistCabinets.quota,
        quota_catalog_artists: usage.catalogArtists.quota,
      }
    }
    if (links) invites.value = links
  } finally {
    loadingQuota.value = false
  }
}

async function handleSaveQuotas() {
  if (!isSuperAdminViewer.value) {
    isQuotaModalOpen.value = false
    return
  }
  savingQuotas.value = true
  try {
    const payload = quotaTargetRole.value === 'gallery'
      ? quotaForm.value
      : { quota_catalog_artists: quotaForm.value.quota_catalog_artists }
    const result = await adminStore.updateQuotas(quotaTargetGalleryId.value, payload)
    if (result) {
      quotaUsage.value = result
      isQuotaModalOpen.value = false
    }
  } finally {
    savingQuotas.value = false
  }
}

async function copyInviteLink(url) {
  if (!url) return
  try {
    await navigator.clipboard.writeText(url)
    message.success('Ссылка скопирована')
  } catch (e) {
    console.error('Clipboard error:', e)
    message.error('Не удалось скопировать')
  }
}

async function handleRegenerateInvite(role) {
  regeneratingRole.value = role
  try {
    const result = await adminStore.regenerateInviteLink(quotaTargetGalleryId.value, role)
    if (result) invites.value = result
  } finally {
    regeneratingRole.value = null
  }
}
</script>

<style scoped>

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

.page-header-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-input {
  width: 320px;
  max-width: 100%;
}

.page-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.quota-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.quota-label {
  flex: 1;
  font-size: 13px;
  color: var(--text-body);
}

.quota-value {
  min-width: 30px;
  text-align: right;
  font-weight: 600;
  color: var(--text-title);
}

.quota-used {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-faint);
}

.invite-row {
  margin-bottom: 12px;
}

.invite-row-label {
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--text-faint);
}

.invite-row-controls {
  display: flex;
  gap: 6px;
}

.invite-row-controls :deep(.ant-input-affix-wrapper),
.invite-row-controls :deep(.ant-input) {
  flex: 1;
  min-width: 0;
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

.modal-hint {
  margin: -6px 0 12px;
  font-size: 12px;
  color: var(--text-faint);
}

.storage-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.gallery-cell {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.actions-cell {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
}

.storage-cell-bar {
  flex: 1;
  min-width: 80px;
}

.storage-cell-text {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-faint);
  white-space: nowrap;
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

@media (max-width: 700px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    width: 100%;
  }

  .tab-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
}
</style>
