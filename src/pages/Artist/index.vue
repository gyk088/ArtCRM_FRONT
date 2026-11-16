<template>
  <div class="artist-page">
    <div class="page-top">
      <MobileMenuButton />
      <router-link :to="{ name: 'artists' }" class="back-link"><LeftOutlined /> Мои художники</router-link>
    </div>

    <a-spin :spinning="loading && !data">
      <div v-if="notFound" class="empty">Художник не найден или у вас нет к нему доступа.</div>

      <template v-else-if="data">
        <!-- Шапка: фото, имя, анкета -->
        <section class="artist-head">
          <!-- Фото: клик — загрузить с устройства / выбрать из «Файлов» / убрать -->
          <a-dropdown :trigger="['click']" placement="bottomLeft">
            <button type="button" class="avatar-btn" title="Сменить фото" :disabled="savingPhoto">
              <ArtistAvatar :artist="artist" :size="isMobile ? 64 : 84" />
              <span class="avatar-overlay"><LoadingOutlined v-if="savingPhoto" /><CameraOutlined v-else /></span>
            </button>
            <template #overlay>
              <a-menu @click="onPhotoMenu">
                <a-menu-item key="upload"><UploadOutlined /> Загрузить фото</a-menu-item>
                <a-menu-item key="files"><FolderOpenOutlined /> Выбрать из «Файлов»</a-menu-item>
                <a-menu-item v-if="artist.avatar" key="remove" danger><DeleteOutlined /> Убрать фото</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
          <input ref="photoInput" type="file" accept="image/*" class="hidden-input" @change="onPhotoFile" />
          <div class="head-main">
            <h2 class="page-title">{{ artist.name }}</h2>
            <div v-if="headSub" class="head-sub">{{ headSub }}</div>
            <div v-if="artist.phone || artist.email || artist.messenger" class="head-contacts">
              <a v-if="artist.phone" :href="`tel:${artist.phone.replace(/[^\d+]/g, '')}`"><PhoneOutlined /> {{ artist.phone }}</a>
              <a v-if="artist.email" :href="`mailto:${artist.email}`"><MailOutlined /> {{ artist.email }}</a>
              <span v-if="artist.messenger"><MessageOutlined /> {{ artist.messenger }}</span>
            </div>
            <p v-if="artist.bio" class="head-bio">{{ artist.bio }}</p>
          </div>
          <div class="head-actions">
            <a-button @click="openEdit"><EditOutlined /> Анкета</a-button>
            <HistoryButton type="artist" :id="artist.id" title="История анкеты художника" />
            <a-button v-if="data.sales.length" :loading="creatingReport" @click="openReport"><BarChartOutlined /> Отчёт по продажам</a-button>
          </div>
        </section>

        <!-- Сводка -->
        <section class="kpis">
          <div class="kpi">
            <div class="kpi-label">Работ</div>
            <div class="kpi-value">{{ stats.works_count }}</div>
            <div class="kpi-hint">в продаже {{ stats.available_count }} · продано {{ stats.sold_count }}</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">Продажи</div>
            <div class="kpi-value kpi-money">{{ moneyList(stats.sales_total) }}</div>
            <div class="kpi-hint">
              {{ stats.sales_count }} {{ pluralSales(stats.sales_count) }}
              <template v-if="stats.sales_count">
                <br />художнику {{ moneyList(stats.artist_total) }}
                <template v-if="stats.gallery_total?.length"> · галерее {{ moneyList(stats.gallery_total) }}</template>
              </template>
            </div>
          </div>
          <div class="kpi" :class="{ 'kpi-warn': stats.unpaid_count }">
            <div class="kpi-label">Не выплачено художнику</div>
            <div class="kpi-value kpi-money">{{ moneyList(stats.unpaid_net_total) }}</div>
            <div class="kpi-hint">
              <template v-if="stats.unpaid_count">
                {{ stats.unpaid_count }} {{ pluralSales(stats.unpaid_count) }} · за вычетом комиссии галереи
              </template>
              <template v-else-if="stats.sales_count">всё выплачено</template>
              <template v-else>продаж пока нет</template>
            </div>
          </div>
          <div class="kpi">
            <div class="kpi-label">Покупателей</div>
            <div class="kpi-value">{{ stats.buyers_count }}</div>
            <div class="kpi-hint">открытых задач: {{ stats.open_tasks_count }}</div>
          </div>
        </section>

        <a-tabs v-model:activeKey="activeTab" class="artist-tabs">
          <!-- Работы -->
          <a-tab-pane key="works" :tab="`Работы · ${data.works.length}`">
            <ArtistWorks :artist-id="artist.id" :artist-name="artist.name" @changed="load" />
          </a-tab-pane>

          <!-- Продажи -->
          <a-tab-pane key="sales" :tab="`Продажи · ${data.sales.length}`">
            <div v-if="!data.sales.length" class="empty">Продаж пока нет</div>
            <template v-else>
              <!-- Без комиссии «художнику» = вся сумма — подсказываем, где её задать -->
              <div v-if="stats.no_commission_count" class="commission-alert">
                <span>
                  Комиссия галереи не задана<template v-if="stats.no_commission_count < data.sales.length"> для {{ stats.no_commission_count }} {{ pluralSales(stats.no_commission_count) }}</template>
                  — художнику сейчас считается вся сумма.
                </span>
                <span class="commission-alert-form">
                  <a-input-number v-model:value="quickCommission" :min="0" :max="100" :precision="2" size="small" placeholder="%" class="quick-pct">
                    <template #addonAfter>%</template>
                  </a-input-number>
                  <a-button size="small" type="primary" :loading="savingCommission" :disabled="quickCommission === null" @click="saveQuickCommission">
                    Задать в анкете
                  </a-button>
                </span>
              </div>

              <div class="rows">
                <div v-for="s in data.sales" :key="s.id" class="row row-link sale-row" @click="openSale(s)">
                  <span class="sale-check" :title="s.artist_paid ? 'Выплачено художнику' : 'Отметить: выплачено художнику'" @click.stop>
                    <a-checkbox :checked="s.artist_paid" :disabled="payingIds.includes(s.id)" @change="e => setPaid(s, e.target.checked)" />
                  </span>
                  <img v-if="s.art.avatar" v-thumb="s.art.avatar" class="row-thumb" alt="" />
                  <span v-else class="row-thumb row-thumb-empty"><PictureOutlined /></span>
                  <div class="row-main">
                    <div class="row-title">{{ s.art.name || 'Без названия' }}</div>
                    <div class="row-sub">
                      {{ formatDate(s.sale_date) }}
                      <template v-if="s.contact"> · {{ s.contact.name }}</template>
                      <template v-if="s.sold_by"> · продал(а) {{ personName(s.sold_by) }}</template>
                    </div>
                  </div>
                  <div class="row-right">
                    <div class="row-money">{{ formatMoney(s.net_amount, s.currency) }}</div>
                    <div class="row-sub">
                      из {{ formatMoney(s.sale_price, s.currency) }}
                      <template v-if="s.commission_pct !== null"> · галерее {{ formatPct(s.commission_pct) }}</template>
                      <span v-else class="no-commission">· комиссия не задана</span>
                    </div>
                    <span class="paid-chip" :class="{ paid: s.artist_paid }">{{ s.artist_paid ? 'выплачено' : 'не выплачено' }}</span>
                  </div>
                </div>
              </div>
              <p class="tab-hint">
                Галочка слева — выплачено художнику. Суммы — художнику, за вычетом комиссии галереи.
                Нажмите на продажу, чтобы увидеть подробности и задать комиссию для неё.
              </p>
            </template>
          </a-tab-pane>

          <!-- Покупатели -->
          <a-tab-pane key="buyers" :tab="`Покупатели · ${data.buyers.length}`">
            <div v-if="!data.buyers.length && !data.interested.length" class="empty">
              Покупателей пока нет. Покупатель появляется здесь, если указан в продаже или в карточке контакта («Уже купил»).
            </div>
            <div v-if="data.buyers.length" class="rows">
              <ContactRow v-for="c in data.buyers" :key="c.id" :contact="c" />
            </div>
            <template v-if="data.interested.length">
              <div class="sub-heading">Интересуются работами</div>
              <div class="rows">
                <ContactRow v-for="c in data.interested" :key="c.id" :contact="c" />
              </div>
            </template>
          </a-tab-pane>

          <!-- Задачи -->
          <a-tab-pane key="tasks" :tab="`Задачи · ${data.tasks.length}`">
            <div v-if="!data.tasks.length" class="empty">
              Задач пока нет. Чтобы привязать задачу, откройте её на доске и выберите художника в поле «Художник».
            </div>
            <div v-else class="rows">
              <router-link v-for="t in data.tasks" :key="t.id" :to="`/home/tasks/${t.board.id}?task=${t.id}`" class="row row-link" :class="{ closed: t.is_closed }">
                <span class="status-dot" :style="{ background: t.status?.color || '#c9c3b6' }" />
                <div class="row-main">
                  <div class="row-title">{{ t.title }}</div>
                  <div class="row-sub">
                    {{ t.board.name }}<template v-if="t.status"> · {{ t.status.name }}</template>
                    <template v-if="t.assignee"> · {{ personName(t.assignee) }}</template>
                  </div>
                </div>
                <div class="row-right">
                  <span v-if="t.due_date" class="due" :class="`due-${dueState(t) || 'none'}`">{{ formatDue(t.due_date) }}</span>
                </div>
              </router-link>
            </div>
          </a-tab-pane>

          <!-- Заметки -->
          <a-tab-pane key="notes" :tab="`Заметки · ${data.notes.length}`">
            <div v-if="!data.notes.length" class="empty">Заметок о художнике пока нет. В заметке можно выбрать художника — она появится здесь.</div>
            <div v-else class="rows">
              <router-link v-for="n in data.notes" :key="n.id" :to="`/home/notes/${n.id}`" class="row row-link">
                <FileTextOutlined class="row-icon" />
                <div class="row-main">
                  <div class="row-title">{{ n.title || 'Без заголовка' }}</div>
                  <div v-if="n.preview" class="row-sub row-preview">{{ n.preview }}</div>
                </div>
                <div class="row-right row-sub">{{ formatDateTime(n.utime) }}</div>
              </router-link>
            </div>
          </a-tab-pane>

          <!-- Портфолио -->
          <a-tab-pane key="portfolio" :tab="portfolioCount === null ? 'Портфолио' : `Портфолио · ${portfolioCount}`">
            <ArtistPortfolios :artist-id="artist.id" @count="n => (portfolioCount = n)" />
          </a-tab-pane>

          <!-- Ссылки и выставки -->
          <a-tab-pane key="links" :tab="`Ссылки и выставки · ${data.collections.length + data.exhibitions.length}`">
            <div v-if="!data.collections.length && !data.exhibitions.length" class="empty">Работы художника пока не входят ни в одну ссылку или выставку</div>
            <template v-if="data.exhibitions.length">
              <div class="sub-heading">Выставки</div>
              <div class="rows">
                <router-link v-for="e in data.exhibitions" :key="e.id" :to="`/home/exhibition/${e.id}`" class="row row-link">
                  <BankOutlined class="row-icon" />
                  <div class="row-main">
                    <div class="row-title">{{ e.name }}</div>
                    <div class="row-sub">{{ [e.venue, period(e)].filter(Boolean).join(' · ') }}</div>
                  </div>
                  <div class="row-right row-sub">работ: {{ e.works }}</div>
                </router-link>
              </div>
            </template>
            <template v-if="data.collections.length">
              <div class="sub-heading">Ссылки</div>
              <div class="rows">
                <router-link v-for="c in data.collections" :key="c.id" :to="`/home/collection/${c.id}`" class="row row-link">
                  <LinkOutlined class="row-icon" />
                  <div class="row-main"><div class="row-title">{{ c.name }}</div></div>
                  <div class="row-right row-sub">работ: {{ c.works }}</div>
                </router-link>
              </div>
            </template>
          </a-tab-pane>
        </a-tabs>
      </template>
    </a-spin>

    <!-- Анкета -->
    <a-modal
      v-model:open="isEditOpen"
      title="Анкета художника"
      ok-text="Сохранить"
      cancel-text="Отмена"
      :confirm-loading="saving"
      width="620px"
      @ok="save"
    >
      <div class="edit-form">
        <div class="edit-photo">
          <ArtistAvatar :artist="{ ...artist, name: edit.name, avatar: edit.avatar }" :size="72" />
          <div class="edit-photo-actions">
            <a-button size="small" :loading="uploadingEditPhoto" @click="editPhotoInput?.click()"><UploadOutlined /> Загрузить</a-button>
            <a-button size="small" @click="isFilesOpen = true"><FolderOpenOutlined /> Из «Файлов»</a-button>
            <input ref="editPhotoInput" type="file" accept="image/*" class="hidden-input" @change="onEditPhotoFile" />
            <a-button v-if="edit.avatar" size="small" type="link" danger @click="edit.avatar = null">Убрать</a-button>
          </div>
        </div>
        <label class="field">
          <span class="field-label">Имя</span>
          <a-input v-model:value="edit.name" :maxlength="300" />
        </label>
        <div class="field-row">
          <label class="field">
            <span class="field-label">Телефон</span>
            <a-input v-model:value="edit.phone" :maxlength="100" placeholder="+375 (__) ___-__-__" />
          </label>
          <label class="field">
            <span class="field-label">Email</span>
            <a-input v-model:value="edit.email" :maxlength="200" placeholder="name@example.com" />
          </label>
        </div>
        <div class="field-row">
          <label class="field">
            <span class="field-label">Мессенджер</span>
            <a-input v-model:value="edit.messenger" :maxlength="200" placeholder="@username или ссылка" />
          </label>
          <label class="field">
            <span class="field-label">Город</span>
            <a-input v-model:value="edit.city" :maxlength="200" />
          </label>
        </div>
        <div class="field-row">
          <label class="field">
            <span class="field-label">Год рождения</span>
            <a-input-number v-model:value="edit.birth_year" :min="1000" :max="2100" :precision="0" class="w-full" placeholder="например, 1985" />
          </label>
          <label class="field">
            <span class="field-label">Комиссия галереи по умолчанию</span>
            <a-input-number v-model:value="edit.commission_pct" :min="0" :max="100" :precision="2" class="w-full" placeholder="не задана">
              <template #addonAfter>%</template>
            </a-input-number>
          </label>
        </div>
        <p class="field-hint">
          Комиссия подставляется в отчёты о продажах работ этого художника. Индивидуальная комиссия продажи в отчёте важнее,
          общая комиссия отчёта — для художников, у которых своя не задана.
        </p>
        <label class="field">
          <span class="field-label">О художнике</span>
          <a-textarea v-model:value="edit.bio" :maxlength="5000" :auto-size="{ minRows: 3, maxRows: 10 }" placeholder="Коротко: направление, образование, выставки…" />
        </label>
      </div>
    </a-modal>

    <a-drawer v-model:open="isFilesOpen" title="Фото художника" placement="right" :width="isMobile ? '100%' : '700px'" destroy-on-close>
      <FileUploader :select="true" @select="selectPhoto" />
    </a-drawer>

    <SaleDetailDrawer
      v-model:open="isSaleOpen"
      :sale="detailSale"
      :artist-commission="artist.commission_pct ?? null"
      @changed="load"
    />
  </div>
</template>

<script setup>
import { computed, defineComponent, h, reactive, ref, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  LeftOutlined, EditOutlined, BarChartOutlined, PhoneOutlined, MailOutlined, MessageOutlined,
  PictureOutlined, FileTextOutlined, BankOutlined, LinkOutlined,
  CameraOutlined, UploadOutlined, FolderOpenOutlined, DeleteOutlined, LoadingOutlined,
} from '@ant-design/icons-vue'
import MobileMenuButton from '@/components/MobileMenuButton.vue'
import ArtistAvatar from '@/components/ArtistAvatar.vue'
import FileUploader from '@/components/FileUploader.vue'
import ArtistWorks from '@/components/ArtistWorks.vue'
import HistoryButton from '@/components/HistoryButton.vue'
import ArtistPortfolios from '@/components/ArtistPortfolios.vue'
import SaleDetailDrawer from '@/components/SaleDetailDrawer.vue'
import { useSale } from '@/stores/sale.js'
import { useFile, MAX_FILE_SIZE, showFileTooLargeModal } from '@/stores/file.js'
import { useCloseOnBack } from '@/composables/useCloseOnBack.js'
import { useArtist } from '@/stores/artist.js'
import { useReport } from '@/stores/report.js'
import { useIsMobile } from '@/composables/useIsMobile.js'
import { formatMoney, formatPct, formatDate } from '@/utils/money.js'
import { dueState, formatDue, formatDateTime, personName } from '@/utils/tasks.js'
import { fileUrl, thumbUrl } from '@/services/const.js'

const route = useRoute()
const router = useRouter()
const artistStore = useArtist()
const reportStore = useReport()
const { isMobile } = useIsMobile()

const data = ref(null)
const loading = ref(false)
const notFound = ref(false)
const activeTab = ref(route.query.tab ? String(route.query.tab) : 'works')
// число портфолио — вкладка сама загружает список и сообщает количество
const portfolioCount = ref(null)
watch(() => data.value?.stats?.portfolios_count, (n) => { if (n !== undefined && n !== null) portfolioCount.value = n })

const artist = computed(() => data.value?.artist || {})
const stats = computed(() => data.value?.stats || {})
const headSub = computed(() => [
  artist.value.city,
  artist.value.birth_year ? `${artist.value.birth_year} г. р.` : null,
  artist.value.commission_pct !== null && artist.value.commission_pct !== undefined ? `комиссия ${formatPct(artist.value.commission_pct)}` : null,
].filter(Boolean).join(' · '))

const moneyList = (list) => (list?.length ? list.map(x => formatMoney(x.amount, x.currency)).join(' + ') : '—')
const pluralSales = (n) => {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'продажа'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'продажи'
  return 'продаж'
}
const period = (e) => [e.start_date, e.end_date].filter(Boolean).map(formatDate).join(' — ')

// Строка контакта (покупатели / интересуются)
const ContactRow = defineComponent({
  props: { contact: { type: Object, required: true } },
  setup(props) {
    return () => {
      const c = props.contact
      return h(RouterLink, { to: `/home/contacts/${c.id}`, class: 'row row-link' }, () => [
        h('div', { class: 'row-main' }, [
          h('div', { class: 'row-title' }, c.name || 'Без имени'),
          h('div', { class: 'row-sub' }, [c.company, c.city, c.phone, c.email].filter(Boolean).join(' · ')),
          h('div', { class: 'row-sub row-works' }, c.works.map(w => w.name || 'Без названия').join(', ')),
        ]),
        h('div', { class: 'row-right' }, [
          c.totals?.length ? h('div', { class: 'row-money' }, moneyList(c.totals)) : null,
          h('div', { class: 'row-sub' }, `работ: ${c.works.length}`),
        ]),
      ])
    }
  },
})

async function load() {
  loading.value = true
  notFound.value = false
  try {
    const result = await artistStore.getOverview(route.params.id)
    if (result) {
      data.value = result
      restoreSaleFromUrl()
    } else notFound.value = true
  } finally {
    loading.value = false
  }
}

// === Анкета ===
const isEditOpen = ref(false)
const isFilesOpen = ref(false)
const saving = ref(false)
const edit = reactive({ name: '', phone: '', email: '', messenger: '', city: '', birth_year: null, commission_pct: null, bio: '', avatar: null })

function openEdit() {
  const a = artist.value
  Object.assign(edit, {
    name: a.name || '',
    phone: a.phone || '',
    email: a.email || '',
    messenger: a.messenger || '',
    city: a.city || '',
    birth_year: a.birth_year ?? null,
    commission_pct: a.commission_pct ?? null,
    bio: a.bio || '',
    avatar: a.avatar || null,
  })
  isEditOpen.value = true
}

function selectPhoto(file) {
  if (!thumbUrl(file)) {
    message.warning('Выберите картинку (jpg, png, webp…)')
    return
  }
  isFilesOpen.value = false
  // Выбор из анкеты — сохранится вместе с анкетой; из шапки — сразу
  if (isEditOpen.value) {
    edit.avatar = { id: file.id, ext: file.ext, url: fileUrl(file), thumb_url: thumbUrl(file) }
  } else {
    savePhoto(file.id)
  }
}

// Загрузка фото с устройства внутри анкеты — сохранится вместе с анкетой
const editPhotoInput = ref(null)
const uploadingEditPhoto = ref(false)
async function onEditPhotoFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    message.warning('Выберите картинку (jpg, png, webp…)')
    return
  }
  if (file.size > MAX_FILE_SIZE) {
    showFileTooLargeModal(file)
    return
  }
  uploadingEditPhoto.value = true
  try {
    const ok = await fileStore.uploadFile(file, { name: `Фото — ${edit.name || artist.value.name}`, comment: '' })
    const uploaded = ok ? fileStore.files[0] : null
    if (uploaded?.id) selectPhoto(uploaded)
  } finally {
    uploadingEditPhoto.value = false
  }
}

// === Фото из шапки карточки ===
const fileStore = useFile()
const photoInput = ref(null)
const savingPhoto = ref(false)

function onPhotoMenu({ key }) {
  if (key === 'upload') photoInput.value?.click()
  else if (key === 'files') isFilesOpen.value = true
  else if (key === 'remove') savePhoto(null)
}

async function savePhoto(fileId) {
  savingPhoto.value = true
  try {
    const saved = await artistStore.saveProfile({ id: artist.value.id, avatar_id: fileId })
    if (saved) {
      message.success(fileId ? 'Фото обновлено' : 'Фото убрано')
      await load()
    }
  } finally {
    savingPhoto.value = false
  }
}

// Загрузка с устройства: файл попадает в «Файлы» и сразу становится фото
async function onPhotoFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    message.warning('Выберите картинку (jpg, png, webp…)')
    return
  }
  if (file.size > MAX_FILE_SIZE) {
    showFileTooLargeModal(file)
    return
  }
  savingPhoto.value = true
  try {
    const ok = await fileStore.uploadFile(file, { name: `Фото — ${artist.value.name}`, comment: '' })
    const uploaded = ok ? fileStore.files[0] : null
    if (uploaded?.id) await savePhoto(uploaded.id)
  } finally {
    savingPhoto.value = false
  }
}

async function save() {
  if (!edit.name.trim()) {
    message.warning('Укажите имя художника')
    return
  }
  saving.value = true
  try {
    const saved = await artistStore.saveProfile({
      id: artist.value.id,
      name: edit.name.trim(),
      phone: edit.phone,
      email: edit.email,
      messenger: edit.messenger,
      city: edit.city,
      birth_year: edit.birth_year ?? null,
      commission_pct: edit.commission_pct ?? null,
      bio: edit.bio,
      avatar_id: edit.avatar?.id || null,
    })
    if (saved) {
      isEditOpen.value = false
      message.success('Анкета сохранена')
      load()
    }
  } finally {
    saving.value = false
  }
}

// === Продажи: выплата художнику, подробности, комиссия ===
const saleStore = useSale()
const payingIds = ref([])
async function setPaid(sale, paid) {
  payingIds.value = [...payingIds.value, sale.id]
  try {
    const result = await saleStore.updateSale(sale.id, { artist_paid: paid })
    if (result) {
      message.success(paid ? 'Отмечено: выплачено художнику' : 'Отметка о выплате снята')
      await load()
    }
  } finally {
    payingIds.value = payingIds.value.filter(id => id !== sale.id)
  }
}

const isSaleOpen = ref(false)
const detailSaleId = ref(null)
// берём из свежих данных — после изменений панель показывает актуальное
const detailSale = computed(() => data.value?.sales.find(s => s.id === detailSaleId.value) || null)
function openSale(sale) {
  detailSaleId.value = sale.id
  isSaleOpen.value = true
}
// продажу отменили — закрываем панель
watch(detailSale, (s) => { if (!s && isSaleOpen.value) isSaleOpen.value = false })
// «Назад» в браузере/на телефоне закрывает панель продажи
const { restoreFromUrl: restoreSaleFromUrl } = useCloseOnBack(isSaleOpen, {
  key: 'sale',
  value: () => detailSaleId.value,
  restore: (id) => {
    if (!data.value?.sales.some(s => s.id === id)) return false
    detailSaleId.value = id
    isSaleOpen.value = true
    return true
  },
})

const quickCommission = ref(null)
const savingCommission = ref(false)
async function saveQuickCommission() {
  savingCommission.value = true
  try {
    const saved = await artistStore.saveProfile({ id: artist.value.id, commission_pct: quickCommission.value })
    if (saved) {
      message.success('Комиссия сохранена в анкете')
      quickCommission.value = null
      await load()
    }
  } finally {
    savingCommission.value = false
  }
}

// === Отчёт по продажам художника ===
const creatingReport = ref(false)
async function openReport() {
  creatingReport.value = true
  try {
    // валюта отчёта — та, в которой продано больше всего
    const currency = stats.value.sales_total?.[0]?.currency || 'EUR'
    const report = await reportStore.createReport({
      name: `Продажи — ${artist.value.name}`,
      currency,
      filters: { artists: [artist.value.id] },
    })
    if (report) router.push({ name: 'report', params: { id: report.id } })
  } finally {
    creatingReport.value = false
  }
}

// Только пока открыта именно карточка художника: при уходе на другую
// страницу (например, в работу /home/edit/:id) params.id меняется раньше,
// чем карточка исчезает, — без проверки она запрашивала «художника» с id работы
watch(() => route.params.id, (id) => {
  if (id && route.name === 'artist') load()
}, { immediate: true })
watch(activeTab, (tab) => {
  if (route.name === 'artist') router.replace({ query: { ...route.query, tab } })
})
</script>

<style scoped>
.artist-page {
  --bg: #f7f5f0;
  --bg-elevated: #ffffff;
  --text-title: #211f1a;
  --text-body: #2c2a25;
  --text-muted: #5a564c;
  --text-faint: #7c7669;
  --accent: #8a6d2f;
  --accent-strong: #6f581f;
  --border: rgba(0, 0, 0, 0.08);

  min-height: 100%;
  background: var(--bg);
  color: var(--text-body);
  border-radius: 14px;
  padding: 20px 24px 40px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.page-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.back-link {
  color: var(--text-faint);
  font-size: 13px;
}

.back-link:hover {
  color: var(--accent);
}

.artist-head {
  display: flex;
  gap: 18px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.head-main {
  flex: 1;
  min-width: 0;
}

.page-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 30px;
  font-weight: 600;
  color: var(--text-title);
  margin: 0 0 2px;
  line-height: 1.15;
}

.head-sub {
  font-size: 13px;
  color: var(--text-faint);
}

.head-contacts {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin-top: 8px;
  font-size: 13px;
}

.head-contacts a {
  color: var(--accent);
}

.head-bio {
  margin: 8px 0 0;
  max-width: 760px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-muted);
  white-space: pre-line;
}

.head-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}


/* Фото в шапке: клик — сменить */
.avatar-btn {
  position: relative;
  padding: 0;
  border: none;
  background: none;
  border-radius: 50%;
  cursor: pointer;
  flex-shrink: 0;
  line-height: 0;
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 22px;
  color: #fff;
  background: rgba(0, 0, 0, 0.38);
  opacity: 0;
  transition: opacity 0.15s;
}

.avatar-btn:hover .avatar-overlay,
.avatar-btn:focus-visible .avatar-overlay,
.avatar-btn:disabled .avatar-overlay {
  opacity: 1;
}

/* на телефоне наведения нет — маленький значок камеры всегда виден */
@media (hover: none) {
  .avatar-overlay {
    inset: auto -2px -2px auto;
    width: 26px;
    height: 26px;
    font-size: 13px;
    opacity: 1;
    background: var(--accent);
    border: 2px solid #fff;
  }
}

.hidden-input {
  display: none;
}

/* Продажи */
.commission-alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 10px 14px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #8a4a12;
  background: rgba(214, 140, 40, 0.1);
  border: 1px solid rgba(214, 140, 40, 0.35);
  border-radius: 10px;
}

.commission-alert-form {
  display: flex;
  gap: 6px;
}

.quick-pct {
  width: 110px;
}

.sale-row {
  cursor: pointer;
}

.sale-check {
  display: flex;
  align-items: center;
  padding: 4px;
  margin: -4px 0 -4px -4px;
}

.sale-check :deep(.ant-checkbox-inner) {
  width: 20px;
  height: 20px;
}

.sale-check :deep(.ant-checkbox-checked .ant-checkbox-inner) {
  background: #2f8a35;
  border-color: #2f8a35;
}

.no-commission {
  color: #b4441c;
}

.kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 8px;
}

.kpi {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px 14px;
  min-width: 0;
}

.kpi-warn {
  border-color: rgba(180, 68, 28, 0.35);
}

.kpi-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--accent);
}

.kpi-value {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-title);
  margin: 2px 0;
}

.kpi-money {
  font-size: 17px;
  overflow-wrap: anywhere;
}

.kpi-warn .kpi-value {
  color: #b4441c;
}

.kpi-hint {
  font-size: 12px;
  color: var(--text-faint);
}

.artist-tabs :deep(.ant-tabs-tab) {
  font-size: 13px;
}

.empty {
  padding: 24px 0;
  color: var(--text-faint);
  font-size: 13px;
}

.tab-hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--text-faint);
}

.sub-heading {
  margin: 18px 0 8px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--accent);
}

/* Работы */
.works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 12px;
}

.work-card {
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 8px 8px 10px;
  color: inherit;
  min-width: 0;
}

.work-card:hover {
  border-color: var(--accent);
}

.work-img {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: #efece4;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.work-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.work-img-empty {
  font-size: 28px;
  color: #c9c3b6;
}

.sold-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  background: rgba(33, 31, 26, 0.75);
  color: #fff;
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 10px;
}

.work-name {
  font-weight: 500;
  color: var(--text-title);
  font-size: 13px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-sub {
  font-size: 12px;
  color: var(--text-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-height: 16px;
}

.work-bottom {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  margin-top: 6px;
  font-size: 12px;
}

.work-price {
  font-weight: 500;
}

.status-chip {
  padding: 0 7px;
  border-radius: 10px;
  background: #efece4;
  font-size: 11px;
}

/* Строки (продажи, задачи, заметки, покупатели) */
.rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rows :deep(.row),
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  color: inherit;
  min-width: 0;
}

.rows :deep(.row-link:hover),
.row-link:hover {
  border-color: var(--accent);
}

.row.closed {
  opacity: 0.6;
}

.row-thumb {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.row-thumb-empty {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #efece4;
  color: #c9c3b6;
}

.row-icon {
  font-size: 18px;
  color: var(--accent);
  flex-shrink: 0;
}

.rows :deep(.row-main),
.row-main {
  flex: 1;
  min-width: 0;
}

.rows :deep(.row-title),
.row-title {
  font-weight: 500;
  color: var(--text-title);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rows :deep(.row-sub),
.row-sub {
  font-size: 12px;
  color: var(--text-faint);
}

.row-sub a {
  color: var(--accent);
}

.rows :deep(.row-works),
.row-preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rows :deep(.row-right),
.row-right {
  text-align: right;
  flex-shrink: 0;
}

.rows :deep(.row-money),
.row-money {
  font-weight: 600;
  color: var(--text-title);
}

.paid-chip {
  display: inline-block;
  margin-top: 2px;
  padding: 0 8px;
  border-radius: 10px;
  font-size: 11px;
  background: rgba(180, 68, 28, 0.1);
  color: #b4441c;
}

.paid-chip.paid {
  background: rgba(39, 174, 96, 0.12);
  color: #1e8449;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.due {
  font-size: 12px;
  color: var(--text-faint);
}

.due-overdue {
  color: #c0392b;
  font-weight: 600;
}

.due-today,
.due-soon {
  color: #d35400;
}

/* Анкета */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-photo {
  display: flex;
  align-items: center;
  gap: 14px;
}

.edit-photo-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.field-label {
  font-size: 12px;
  color: #5a564c;
}

.field-row {
  display: flex;
  gap: 12px;
}

.field-hint {
  margin: -4px 0 0;
  font-size: 12px;
  color: #7c7669;
}

.w-full {
  width: 100%;
}

@media (max-width: 900px) {
  .kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .artist-page {
    padding: 16px 16px 32px;
  }

  .artist-head {
    flex-wrap: wrap;
    gap: 12px;
  }

  .head-actions {
    flex-direction: row;
    flex-wrap: wrap;
    width: 100%;
  }

  .page-title {
    font-size: 24px;
  }

  .works-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .field-row {
    flex-direction: column;
  }

  .row-thumb {
    width: 36px;
    height: 36px;
  }
}
</style>
