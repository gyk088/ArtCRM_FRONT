<template>
  <div class="contacts-page">
    <div class="page-header">
      <div>
        <div class="page-header-top">
          <MobileMenuButton />
          <h2 class="page-title">Контакты</h2>
        </div>
        <p class="page-subtitle">
          {{ contactList.length ? `${contactList.length} ${pluralize(contactList.length)}` : 'Пока нет ни одного контакта' }}
        </p>
      </div>
      <a-button type="primary" class="add-btn" @click="openCreateModal">
        <template #icon>
          <PlusOutlined />
        </template>
        Добавить контакт
      </a-button>
    </div>

    <div class="filters-panel">
      <a-input
        v-model:value="searchQuery"
        placeholder="Поиск по ФИО, телефону или мессенджеру"
        allow-clear
        class="search-input"
      >
        <template #prefix><SearchOutlined /></template>
      </a-input>
    </div>

    <a-table
      class="contacts-table"
      :columns="columns"
      :data-source="filteredContacts"
      :loading="contactStore.loading"
      row-key="id"
      :scroll="{ x: 'max-content' }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'name'">
          {{ record.name || 'Без имени' }}
        </template>
        <template v-else-if="column.dataIndex === 'phone'">
          <a v-if="record.phone" :href="`tel:${record.phone}`" class="contact-link">{{ record.phone }}</a>
          <span v-else class="contact-empty">—</span>
        </template>
        <template v-else-if="column.dataIndex === 'messenger'">
          <a
            v-if="isLink(record.messenger)"
            :href="record.messenger"
            target="_blank"
            rel="noopener noreferrer"
            class="contact-link"
            @click.stop
          >
            {{ record.messenger }}
          </a>
          <span v-else-if="record.messenger">{{ record.messenger }}</span>
          <span v-else class="contact-empty">—</span>
        </template>
        <template v-else-if="column.dataIndex === 'notes'">
          <span class="notes-cell">{{ record.notes || '—' }}</span>
        </template>
        <template v-else-if="column.dataIndex === 'actions'">
          <a-tooltip title="Редактировать">
            <a-button type="text" size="small" @click="openEditModal(record)">
              <EditOutlined />
            </a-button>
          </a-tooltip>
          <a-popconfirm
            :title="`Удалить контакт «${record.name || 'без имени'}»?`"
            ok-text="Удалить"
            cancel-text="Отмена"
            @confirm="handleDelete(record)"
          >
            <a-tooltip title="Удалить">
              <a-button type="text" danger size="small">
                <DeleteOutlined />
              </a-button>
            </a-tooltip>
          </a-popconfirm>
        </template>
      </template>

      <template #emptyText>
        <span class="contacts-empty">Пока пусто — добавьте контакт выше</span>
      </template>
    </a-table>

    <a-modal
      v-model:open="isModalOpen"
      :title="editingContact ? 'Редактировать контакт' : 'Новый контакт'"
      :get-container="false"
    >
      <a-form layout="vertical" :model="form">
        <a-form-item label="ФИО" required>
          <a-input v-model:value="form.name" placeholder="Иванов Иван Иванович" />
        </a-form-item>
        <a-form-item label="Телефон">
          <a-input v-model:value="form.phone" placeholder="+375 (__) ___-__-__" />
        </a-form-item>
        <a-form-item label="Мессенджер">
          <a-input v-model:value="form.messenger" placeholder="Telegram, WhatsApp и т.д.">
            <template #suffix>
              <button type="button" class="messenger-scan-btn" title="Сканировать QR код" @click="isMessengerScanOpen = true">
                <QrcodeOutlined />
              </button>
            </template>
          </a-input>
        </a-form-item>
        <a-form-item label="Заметки">
          <a-textarea v-model:value="form.notes" placeholder="Любая полезная информация" :rows="3" />
        </a-form-item>
      </a-form>

      <template #footer>
        <a-button class="cancel-modal-btn" @click="isModalOpen = false">Отмена</a-button>
        <a-button type="primary" class="save-modal-btn" :loading="saving" @click="handleSave">Сохранить</a-button>
      </template>
    </a-modal>

    <QrScannerModal v-model:open="isMessengerScanOpen" pick-mode @scanned="handleMessengerScanned" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, QrcodeOutlined } from '@ant-design/icons-vue'
import { useContact } from '@/stores/contact.js'
import { getUser } from '@/services/auth.js'
import MobileMenuButton from '@/components/MobileMenuButton.vue'
import QrScannerModal from '@/components/QrScannerModal.vue'

const contactStore = useContact()
const contactList = computed(() => contactStore.listContacts)

onMounted(() => {
  contactStore.getListContacts()
})

function isLink(value) {
  return /^https?:\/\//i.test(value || '')
}

function pluralize(n) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'контакт'
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'контакта'
  return 'контактов'
}

const searchQuery = ref('')
const filteredContacts = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return contactList.value
  return contactList.value.filter(c =>
    (c.name || '').toLowerCase().includes(query) ||
    (c.phone || '').toLowerCase().includes(query) ||
    (c.messenger || '').toLowerCase().includes(query)
  )
})

const columns = [
  { title: 'ФИО', dataIndex: 'name', key: 'name' },
  { title: 'Телефон', dataIndex: 'phone', key: 'phone' },
  { title: 'Мессенджер', dataIndex: 'messenger', key: 'messenger' },
  { title: 'Заметки', dataIndex: 'notes', key: 'notes' },
  { title: 'Действия', dataIndex: 'actions', key: 'actions', width: 100 },
]

const isModalOpen = ref(false)
const saving = ref(false)
const editingContact = ref(null)
const form = ref({ name: '', phone: '', messenger: '', notes: '' })

const isMessengerScanOpen = ref(false)
function handleMessengerScanned(data) {
  form.value.messenger = data
  message.success('Ссылка из QR добавлена в поле «Мессенджер»')
}

function openCreateModal() {
  editingContact.value = null
  form.value = { name: '', phone: '', messenger: '', notes: '' }
  isModalOpen.value = true
}

function openEditModal(record) {
  editingContact.value = record
  form.value = { name: record.name || '', phone: record.phone || '', messenger: record.messenger || '', notes: record.notes || '' }
  isModalOpen.value = true
}

async function handleSave() {
  const name = form.value.name.trim()
  if (!name) {
    message.warning('Введите ФИО')
    return
  }

  saving.value = true
  try {
    const payload = {
      name,
      phone: form.value.phone.trim(),
      messenger: form.value.messenger.trim(),
      notes: form.value.notes.trim(),
    }

    let result
    if (editingContact.value) {
      result = await contactStore.updateContact({ id: editingContact.value.id, ...payload })
    } else {
      result = await contactStore.createContact({ user_id: getUser()?.id, ...payload })
    }

    if (result) {
      isModalOpen.value = false
    }
  } finally {
    saving.value = false
  }
}

async function handleDelete(record) {
  await contactStore.deleteContact(record.id)
}
</script>

<style scoped>
.contacts-page {
  --bg: #f7f5f0;
  --bg-elevated: #ffffff;
  --card-bg: #efece4;
  --text-title: #211f1a;
  --text-body: #2c2a25;
  --text-muted: #5a564c;
  --text-faint: #7c7669;
  --accent: #8a6d2f;
  --accent-strong: #6f581f;
  --border: rgba(0, 0, 0, 0.08);

  background: var(--bg);
  color: var(--text-body);
  border-radius: 14px;
  padding: 20px 24px;
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

.add-btn {
  background-color: var(--accent) !important;
  border-color: var(--accent) !important;
  border-radius: 20px !important;
  font-weight: 500;
  flex-shrink: 0;
}

.add-btn:hover {
  background-color: var(--accent-strong) !important;
  border-color: var(--accent-strong) !important;
}

.save-modal-btn {
  background-color: var(--accent) !important;
  border-color: var(--accent) !important;
  border-radius: 20px !important;
  font-weight: 500;
}

.save-modal-btn:hover {
  background-color: var(--accent-strong) !important;
  border-color: var(--accent-strong) !important;
}

.cancel-modal-btn {
  border-radius: 20px !important;
  border-color: var(--border) !important;
  color: var(--text-muted) !important;
  background: transparent !important;
}

.cancel-modal-btn:hover {
  border-color: var(--accent) !important;
  color: var(--accent) !important;
}

.filters-panel {
  display: flex;
  margin-bottom: 16px;
}

.search-input {
  width: 320px;
  max-width: 100%;
}

.contact-link {
  color: var(--accent);
}

.contact-link:hover {
  color: var(--accent-strong);
}

.contact-empty {
  color: var(--text-faint);
}

.messenger-scan-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 0;
  color: var(--text-faint);
  font-size: 15px;
  cursor: pointer;
}

.messenger-scan-btn:hover {
  color: var(--accent);
}

.notes-cell {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 260px;
  color: var(--text-muted);
  font-size: 13px;
}

.contacts-empty {
  color: var(--text-faint);
  font-size: 13px;
}

.contacts-page :deep(.ant-table) {
  background: var(--bg-elevated);
}

.contacts-page :deep(.ant-table-thead > tr > th) {
  background: var(--card-bg);
  color: var(--accent);
  font-weight: 600;
}

/* Инпуты формы контакта — свой акцент вместо синего цвета antd по умолчанию.
   Работает только благодаря :get-container="false" на a-modal: без него
   модалка телепортируется в body и перестаёт быть потомком .contacts-page,
   а значит переменные вроде var(--accent) там просто не резолвятся. */
.contacts-page :deep(.ant-input),
.contacts-page :deep(.ant-input-affix-wrapper) {
  border-color: var(--border) !important;
}

.contacts-page :deep(.ant-input:hover),
.contacts-page :deep(.ant-input-affix-wrapper:hover) {
  border-color: var(--accent) !important;
}

.contacts-page :deep(.ant-input:focus),
.contacts-page :deep(.ant-input-focused),
.contacts-page :deep(.ant-input-affix-wrapper:focus),
.contacts-page :deep(.ant-input-affix-wrapper-focused) {
  border-color: var(--accent) !important;
  box-shadow: 0 0 0 2px rgba(138, 109, 47, 0.15) !important;
}

@media (max-width: 700px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .add-btn {
    width: 100%;
    justify-content: center;
  }

  .search-input {
    width: 100%;
  }
}
</style>
