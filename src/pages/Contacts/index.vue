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
      <div class="header-actions">
        <a-button class="quick-add-btn" @click="openQuickAdd">
          <template #icon><ThunderboltOutlined /></template>
          Быстро добавить
        </a-button>
        <a-button type="primary" class="add-btn" @click="openCreatePage">
          <template #icon><PlusOutlined /></template>
          Добавить контакт
        </a-button>
      </div>
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

    <!-- Телефон: карточки вместо широкой таблицы; телефон и мессенджер — крупные кнопки -->
    <a-spin v-if="isMobile" :spinning="contactStore.loading">
      <div v-if="!filteredContacts.length && !contactStore.loading" class="contacts-empty m-contacts-empty">
        Пока пусто — добавьте контакт выше
      </div>
      <div class="m-contacts">
        <div v-for="record in filteredContacts" :key="record.id" class="m-contact" @click="openEditPage(record)">
          <div class="m-contact-top">
            <div class="m-contact-name">{{ record.name || 'Без имени' }}</div>
            <a-popconfirm
              :title="`Удалить контакт «${record.name || 'без имени'}»?`"
              ok-text="Удалить"
              cancel-text="Отмена"
              @confirm="handleDelete(record)"
            >
              <button type="button" class="m-contact-delete" aria-label="Удалить" @click.stop>
                <DeleteOutlined />
              </button>
            </a-popconfirm>
          </div>
          <div class="m-contact-meta">
            <a-tag v-if="getSourceName(record.source)" class="source-tag">{{ getSourceName(record.source) }}</a-tag>
            <span v-if="purchasedCount(record)" class="works-badge works-badge--purchased">{{ purchasedCount(record) }} куплено</span>
            <span v-if="interestedCount(record)" class="works-badge works-badge--interested">{{ interestedCount(record) }} в интересах</span>
          </div>
          <div v-if="record.notes" class="m-contact-notes">{{ record.notes }}</div>
          <div v-if="record.phone || record.messenger" class="m-contact-actions" @click.stop>
            <a v-if="record.phone" :href="`tel:${record.phone}`" class="m-contact-btn">
              <PhoneOutlined /> {{ record.phone }}
            </a>
            <a
              v-if="isLink(record.messenger)"
              :href="record.messenger"
              target="_blank"
              rel="noopener noreferrer"
              class="m-contact-btn"
            >
              <MessageOutlined /> Написать
            </a>
            <span v-else-if="record.messenger" class="m-contact-btn m-contact-btn-plain">
              <MessageOutlined /> {{ record.messenger }}
            </span>
          </div>
        </div>
      </div>
    </a-spin>

    <a-table
      v-else
      class="contacts-table"
      :columns="columns"
      :data-source="filteredContacts"
      :loading="contactStore.loading"
      row-key="id"
      :scroll="{ x: 'max-content' }"
      :custom-row="customRow"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'name'">
          {{ record.name || 'Без имени' }}
        </template>
        <template v-else-if="column.dataIndex === 'phone'">
          <a v-if="record.phone" :href="`tel:${record.phone}`" class="contact-link" @click.stop>{{ record.phone }}</a>
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
        <template v-else-if="column.dataIndex === 'source'">
          <a-tag v-if="getSourceName(record.source)" class="source-tag">{{ getSourceName(record.source) }}</a-tag>
          <span v-else class="contact-empty">—</span>
        </template>
        <template v-else-if="column.dataIndex === 'works'">
          <div class="works-summary">
            <span v-if="purchasedCount(record)" class="works-badge works-badge--purchased">
              {{ purchasedCount(record) }} куплено
            </span>
            <span v-if="interestedCount(record)" class="works-badge works-badge--interested">
              {{ interestedCount(record) }} в интересах
            </span>
            <span v-if="!purchasedCount(record) && !interestedCount(record)" class="contact-empty">—</span>
          </div>
        </template>
        <template v-else-if="column.dataIndex === 'notes'">
          <span class="notes-cell">{{ record.notes || '—' }}</span>
        </template>
        <template v-else-if="column.dataIndex === 'actions'">
          <a-tooltip title="Редактировать">
            <a-button type="text" size="small" @click.stop="openEditPage(record)">
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
              <a-button type="text" danger size="small" @click.stop>
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

    <!-- Быстрое добавление — минимум полей, удобно на мобильном "на ходу" -->
    <a-modal
      v-model:open="isQuickAddOpen"
      title="Быстро добавить контакт"
      :get-container="false"
      ok-text="Сохранить"
      cancel-text="Отмена"
      :confirm-loading="quickSaving"
      @ok="handleQuickSave"
    >
      <a-form layout="vertical">
        <a-form-item label="ФИО" required>
          <a-input v-model:value="quickForm.name" placeholder="Иванов Иван Иванович" autofocus />
        </a-form-item>
        <a-form-item label="Телефон">
          <a-input v-model:value="quickForm.phone" placeholder="+375 (__) ___-__-__" />
        </a-form-item>
        <a-form-item label="Мессенджер">
          <a-input v-model:value="quickForm.messenger" placeholder="Telegram, WhatsApp и т.д.">
            <template #suffix>
              <button type="button" class="messenger-scan-btn" title="Сканировать QR код" @click="isMessengerScanOpen = true">
                <QrcodeOutlined />
              </button>
            </template>
          </a-input>
        </a-form-item>
      </a-form>
      <p class="quick-add-hint">Остальные поля (email, компания, источник, работы и т.д.) можно заполнить позже — откройте контакт и нажмите «Редактировать».</p>
    </a-modal>

    <QrScannerModal v-model:open="isMessengerScanOpen" pick-mode @scanned="handleMessengerScanned" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, QrcodeOutlined, ThunderboltOutlined, PhoneOutlined, MessageOutlined } from '@ant-design/icons-vue'
import { useIsMobile } from '@/composables/useIsMobile.js'
import { useContact } from '@/stores/contact.js'
import { useContactSource } from '@/stores/contactSource.js'
import { getUser } from '@/services/auth.js'
import MobileMenuButton from '@/components/MobileMenuButton.vue'
import QrScannerModal from '@/components/QrScannerModal.vue'

const router = useRouter()
const contactStore = useContact()
const contactSourceStore = useContactSource()
const { isMobile } = useIsMobile()
const contactList = computed(() => contactStore.listContacts)

onMounted(() => {
  contactStore.getListContacts()
  contactSourceStore.getListSources()
})

function getSourceName(sourceId) {
  if (!sourceId) return ''
  return contactSourceStore.listSources.find(s => s.id === sourceId)?.name || ''
}

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
  { title: 'Источник', dataIndex: 'source', key: 'source' },
  { title: 'Работы', dataIndex: 'works', key: 'works' },
  { title: 'Заметки', dataIndex: 'notes', key: 'notes' },
  { title: 'Действия', dataIndex: 'actions', key: 'actions', width: 100 },
]

function purchasedCount(record) {
  return (record.works || []).filter(w => w.status === 'purchased').length
}

function interestedCount(record) {
  return (record.works || []).filter(w => w.status === 'interested').length
}

// Клик по строке — тоже открывает редактирование (кроме кликов по
// телефону/мессенджеру/кнопкам, у них свой @click.stop)
function customRow(record) {
  return { class: 'clickable-row', onClick: () => openEditPage(record) }
}

function openCreatePage() {
  router.push({ name: 'edit-contact', params: { id: 'new' } })
}

function openEditPage(record) {
  router.push({ name: 'edit-contact', params: { id: record.id } })
}

async function handleDelete(record) {
  await contactStore.deleteContact(record.id)
}

// === Быстрое добавление — минимум полей, без перехода на страницу ===
const isQuickAddOpen = ref(false)
const quickSaving = ref(false)
const quickForm = ref({ name: '', phone: '', messenger: '' })
const isMessengerScanOpen = ref(false)

function openQuickAdd() {
  quickForm.value = { name: '', phone: '', messenger: '' }
  isQuickAddOpen.value = true
}

function handleMessengerScanned(data) {
  quickForm.value.messenger = data
  message.success('Ссылка из QR добавлена в поле «Мессенджер»')
}

async function handleQuickSave() {
  const name = quickForm.value.name.trim()
  if (!name) {
    message.warning('Введите ФИО')
    return
  }

  quickSaving.value = true
  try {
    const result = await contactStore.createContact({
      user_id: getUser()?.id,
      name,
      phone: quickForm.value.phone.trim(),
      messenger: quickForm.value.messenger.trim(),
    })
    if (result) {
      isQuickAddOpen.value = false
    }
  } finally {
    quickSaving.value = false
  }
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

.header-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.add-btn {
  background-color: var(--accent) !important;
  border-color: var(--accent) !important;
  border-radius: 20px !important;
  font-weight: 500;
}

.add-btn:hover {
  background-color: var(--accent-strong) !important;
  border-color: var(--accent-strong) !important;
}

.quick-add-btn {
  border-radius: 20px !important;
  border-color: var(--accent) !important;
  color: var(--accent) !important;
  background: transparent !important;
}

.quick-add-btn:hover {
  border-color: var(--accent-strong) !important;
  color: var(--accent-strong) !important;
}

.quick-add-hint {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--text-faint);
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

.source-tag {
  background: var(--card-bg);
  border-color: var(--border);
  color: var(--text-muted);
}

.works-summary {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.works-badge {
  font-size: 11px;
  white-space: nowrap;
}

.works-badge--purchased {
  color: #2f8a35;
}

.works-badge--interested {
  color: var(--accent);
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

.contacts-page :deep(.clickable-row) {
  cursor: pointer;
}

.contacts-page :deep(.ant-table-tbody > tr:hover > td) {
  background: rgba(200, 183, 137, 0.06) !important;
}

/* Инпуты формы — свой акцент вместо синего цвета antd по умолчанию.
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

  .header-actions {
    flex-direction: column;
  }

  .search-input {
    width: 100%;
  }
}

/* === Телефон: карточки контактов === */
.m-contacts {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.m-contacts-empty {
  display: block;
  padding: 24px 0;
  text-align: center;
}

.m-contact {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 12px;
  padding: 12px 14px;
}

.m-contact-top {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.m-contact-name {
  flex: 1;
  min-width: 0;
  font-size: 16px;
  font-weight: 600;
  color: #211f1a;
}

.m-contact-delete {
  border: none;
  background: none;
  color: #8f2c2c;
  width: 32px;
  height: 32px;
  margin: -6px -8px 0 0;
  font-size: 16px;
}

.m-contact-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.m-contact-meta:empty {
  display: none;
}

.m-contact-notes {
  margin-top: 6px;
  font-size: 13px;
  color: #5a564c;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.m-contact-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.m-contact-btn {
  flex: 1;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 40px;
  padding: 0 10px;
  border-radius: 20px;
  border: 1px solid #8a6d2f;
  color: #8a6d2f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.m-contact-btn-plain {
  border-color: rgba(0, 0, 0, 0.12);
  color: #5a564c;
}
</style>
