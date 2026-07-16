<template>
  <div class="landing" :class="theme">

    <!-- Переключатель темы -->
    <button class="theme-toggle" type="button" :aria-label="theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'" @click="toggleTheme">
      <svg v-if="theme === 'dark'" class="theme-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.6" />
        <path stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.4 5.6l-1.55 1.55M7.15 16.85 5.6 18.4M18.4 18.4l-1.55-1.55M7.15 7.15 5.6 5.6" />
      </svg>
      <svg v-else class="theme-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M20.5 14.4A8.5 8.5 0 1 1 9.6 3.5a7 7 0 0 0 10.9 10.9Z" />
      </svg>
    </button>

    <!-- ==== Загрузка ==== -->
    <div v-if="loading" class="state-screen">
      <a-spin size="large" />
    </div>

    <!-- ==== Коллекция не найдена ==== -->
    <div v-else-if="!collection" class="state-screen">
      <div class="not-found">
        <div class="not-found-icon">✦</div>
        <h1>Коллекция не найдена</h1>
        <p>Ссылка недействительна или коллекция была удалена.</p>
      </div>
    </div>

    <!-- ==== Лендинг коллекции ==== -->
    <div v-else class="collection-landing">

      <!-- Hero -->
      <header class="hero" :class="{ 'no-image': !heroImage }">
        <div v-if="heroImage" class="hero-bg" :style="{ backgroundImage: `url(${heroImage})` }"></div>
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <div class="hero-eyebrow">ART CRM · КОЛЛЕКЦИЯ</div>
          <h1 class="hero-title">{{ collection.name || 'Без названия' }}</h1>
          <p v-if="collection.description" class="hero-description">{{ collection.description }}</p>
          <div class="hero-meta">
            <span>{{ works.length }} {{ workWord }}</span>
            <span v-if="artistName" class="hero-dot">·</span>
            <span v-if="artistName">{{ artistName }}</span>
          </div>
        </div>
      </header>

      <!-- Галерея -->
      <main class="gallery-wrap">
        <div v-if="!works.length" class="empty-state">
          <a-empty description="В этой коллекции пока нет работ" />
        </div>

        <div v-else class="gallery-grid">
          <article
            v-for="work in works"
            :key="work.id"
            class="art-card"
            @click="openViewer(work)"
          >
            <div class="art-image-wrap">
              <img v-if="work.avatar?.url" :src="work.avatar.url" :alt="work.name" class="art-image" />
              <div v-else class="art-placeholder">
                <PictureOutlined />
              </div>
              <span v-if="getStatusName(work.status)" class="status-badge" :class="statusClass(work.status)">
                {{ getStatusName(work.status) }}
              </span>
            </div>
            <div class="art-info">
              <h3 class="art-name">{{ work.name || 'Без названия' }}</h3>
              <p class="art-technique">
                <span v-if="work.technique">{{ work.technique }}</span>
                <span v-if="work.technique && work.year"> · </span>
                <span v-if="work.year">{{ work.year }}</span>
              </p>
              <p v-if="work.price" class="art-price">{{ formatPrice(work.price) }}</p>
            </div>
          </article>
        </div>
      </main>

      <footer class="landing-footer">
        <span class="footer-brand">ART CRM</span>
        <span v-if="artistName" class="footer-artist">{{ artistName }}</span>
      </footer>
    </div>

    <!-- ==== Модалка просмотра работы ==== -->
    <a-modal
      v-model:open="viewerOpen"
      :footer="null"
      width="920px"
      centered
      :class="['work-modal', theme]"
      :get-container="false"
      destroyOnClose
    >
      <div v-if="activeWork" class="work-modal-content">
        <div class="work-modal-image">
          <img
            v-if="activeImage"
            :src="activeImage"
            :alt="activeWork.name"
          />
          <div v-else class="art-placeholder large">
            <PictureOutlined />
          </div>

          <div v-if="thumbnails.length > 1" class="thumb-row">
            <button
              v-for="(thumb, idx) in thumbnails"
              :key="thumb.url + idx"
              class="thumb-btn"
              :class="{ active: idx === activeImageIndex }"
              @click="activeImageIndex = idx"
            >
              <img :src="thumb.url" :alt="`${activeWork.name} ${idx + 1}`" />
            </button>
          </div>
        </div>

        <div class="work-modal-details">
          <span v-if="getStatusName(activeWork.status)" class="status-badge" :class="statusClass(activeWork.status)">
            {{ getStatusName(activeWork.status) }}
          </span>
          <h2 class="work-modal-title">{{ activeWork.name || 'Без названия' }}</h2>

          <dl class="detail-list">
            <div v-if="activeWork.technique" class="detail-row">
              <dt>Техника</dt>
              <dd>{{ activeWork.technique }}</dd>
            </div>
            <div v-if="activeWork.year" class="detail-row">
              <dt>Год</dt>
              <dd>{{ activeWork.year }}</dd>
            </div>
            <div v-if="getSeriaName(activeWork.seria)" class="detail-row">
              <dt>Серия</dt>
              <dd>{{ getSeriaName(activeWork.seria) }}</dd>
            </div>
            <div v-if="getMediaName(activeWork.media)" class="detail-row">
              <dt>Медиа</dt>
              <dd>{{ getMediaName(activeWork.media) }}</dd>
            </div>
            <div v-if="getLocationName(activeWork.location)" class="detail-row">
              <dt>Локация</dt>
              <dd>{{ getLocationName(activeWork.location) }}</dd>
            </div>
          </dl>

          <p v-if="activeWork.description" class="work-description">{{ activeWork.description }}</p>

          <div v-if="activeWork.price" class="work-price">
            {{ formatPrice(activeWork.price) }}
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { PictureOutlined } from '@ant-design/icons-vue'
import { useArtWork } from '@/stores/artWork.js'
import { useStatuses } from '@/stores/statuses.js'
import { useSerias } from '@/stores/seria.js'
import { useMedia } from '@/stores/media.js'
import { useLocations } from '@/stores/locations.js'
import { getUser } from '@/services/auth.js'

const route = useRoute()

const artWorkStore = useArtWork()
const statusesStore = useStatuses()
const seriasStore = useSerias()
const mediaStore = useMedia()
const locationsStore = useLocations()

const loading = ref(true)
const collection = ref(null)
const works = ref([])

const viewerOpen = ref(false)
const activeWork = ref(null)
const activeImageIndex = ref(0)

const THEME_STORAGE_KEY = 'collectionLandingTheme'
const prefersLight = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-color-scheme: light)').matches
  : false
const theme = ref(localStorage.getItem(THEME_STORAGE_KEY) || (prefersLight ? 'light' : 'dark'))

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}

watch(theme, (value) => {
  localStorage.setItem(THEME_STORAGE_KEY, value)
})

const artistName = computed(() => {
  const user = getUser()
  if (!user) return ''
  return [user.name, user.surname].filter(Boolean).join(' ')
})

const heroImage = computed(() => {
  const withAvatar = works.value.find(w => w.avatar?.url)
  return withAvatar?.avatar?.url || ''
})

const workWord = computed(() => {
  const n = works.value.length % 100
  const n1 = n % 10
  if (n > 10 && n < 20) return 'работ'
  if (n1 === 1) return 'работа'
  if (n1 >= 2 && n1 <= 4) return 'работы'
  return 'работ'
})

const thumbnails = computed(() => {
  if (!activeWork.value) return []
  const list = []
  if (activeWork.value.avatar?.url) list.push(activeWork.value.avatar)
  if (Array.isArray(activeWork.value.images)) list.push(...activeWork.value.images)
  return list
})

const activeImage = computed(() => thumbnails.value[activeImageIndex.value]?.url || '')

function getStatusName(id) {
  if (!id) return ''
  const status = statusesStore.listStatuses.find(s => s.id === id)
  return status?.name || ''
}

function statusClass(id) {
  const name = getStatusName(id).toLowerCase()
  if (name.includes('прода')) return 'status-sold'
  if (name.includes('налич') || name.includes('доступ')) return 'status-available'
  return 'status-default'
}

function getSeriaName(id) {
  if (!id) return ''
  return seriasStore.listSerias.find(s => s.id === id)?.name || ''
}

function getMediaName(id) {
  if (!id) return ''
  return mediaStore.listMedia.find(m => m.id === id)?.name || ''
}

function getLocationName(id) {
  if (!id) return ''
  return locationsStore.listLocations.find(l => l.id === id)?.name || ''
}

function formatPrice(price) {
  const num = Number(price)
  if (Number.isNaN(num)) return price
  return new Intl.NumberFormat('ru-RU').format(num) + ' ₽'
}

function openViewer(work) {
  activeWork.value = work
  activeImageIndex.value = 0
  viewerOpen.value = true
}

onMounted(async () => {
  loading.value = true
  try {
    const storedCollections = JSON.parse(localStorage.getItem('collectionList') || '[]')
    const collectionId = Number(route.params.id)
    const found = storedCollections.find(c => c.id === collectionId)

    if (!found) {
      collection.value = null
      return
    }
    collection.value = found

    const savedSelectedWorks = JSON.parse(localStorage.getItem('selectedWorks') || '{}')
    const workIds = savedSelectedWorks[collectionId] || found.works || []

    await Promise.all([
      artWorkStore.getListArtWorks(),
      statusesStore.getListStatuses(),
      seriasStore.getListSerias(),
      mediaStore.getListMedia(),
      locationsStore.getListLocations()
    ])

    works.value = artWorkStore.listArtWorks.filter(w => workIds.includes(w.id))
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

.landing {
  --bg: #0f0f11;
  --bg-soft: radial-gradient(circle at 30% 20%, #24222a 0%, #0f0f11 70%);
  --bg-elevated: #16151a;
  --bg-image: #0c0c0e;
  --card-bg: #1b1a1e;
  --text-title: #fbfaf7;
  --text-body: #f2f0ec;
  --text-muted: #cbc8c0;
  --text-faint: #9a978f;
  --text-dim: #6a675f;
  --text-label: #8b887f;
  --accent: #c8b789;
  --accent-strong: #d8c896;
  --border: rgba(255, 255, 255, 0.08);
  --border-soft: rgba(255, 255, 255, 0.07);
  --hero-overlay-from: rgba(15, 15, 17, 0.35);
  --hero-overlay-mid: rgba(15, 15, 17, 0.55);
  --hero-overlay-to: #0f0f11;
  --shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  --shadow-hover: 0 14px 32px rgba(0, 0, 0, 0.5);
  --status-available-bg: rgba(87, 190, 91, 0.18);
  --status-available-fg: #7fe08a;
  --status-available-border: rgba(127, 224, 138, 0.4);
  --status-sold-bg: rgba(224, 90, 90, 0.18);
  --status-sold-fg: #f09090;
  --status-sold-border: rgba(240, 144, 144, 0.4);
  --status-default-bg: rgba(200, 183, 137, 0.18);
  --status-default-fg: #d8c896;
  --status-default-border: rgba(216, 200, 150, 0.4);

  min-height: 100vh;
  background: var(--bg);
  color: var(--text-body);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  transition: background 0.3s ease, color 0.3s ease;
}

.landing.light {
  --bg: #f7f5f0;
  --bg-soft: radial-gradient(circle at 30% 20%, #ffffff 0%, #f7f5f0 70%);
  --bg-elevated: #ffffff;
  --bg-image: #efece4;
  --card-bg: #efece4;
  --text-title: #211f1a;
  --text-body: #2c2a25;
  --text-muted: #5a564c;
  --text-faint: #7c7669;
  --text-dim: #a29c8c;
  --text-label: #8a8474;
  --accent: #8a6d2f;
  --accent-strong: #6f581f;
  --border: rgba(0, 0, 0, 0.08);
  --border-soft: rgba(0, 0, 0, 0.07);
  --hero-overlay-from: rgba(247, 245, 240, 0.25);
  --hero-overlay-mid: rgba(247, 245, 240, 0.55);
  --hero-overlay-to: #f7f5f0;
  --shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  --shadow-hover: 0 14px 32px rgba(0, 0, 0, 0.16);
  --status-available-bg: rgba(58, 150, 62, 0.12);
  --status-available-fg: #2f8a35;
  --status-available-border: rgba(47, 138, 53, 0.35);
  --status-sold-bg: rgba(196, 62, 62, 0.12);
  --status-sold-fg: #b43c3c;
  --status-sold-border: rgba(180, 60, 60, 0.35);
  --status-default-bg: rgba(138, 109, 47, 0.12);
  --status-default-fg: #8a6d2f;
  --status-default-border: rgba(138, 109, 47, 0.35);
}

/* ==== Переключатель темы ==== */
.theme-toggle {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 60;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-body);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.3s ease, color 0.3s ease;
  box-shadow: var(--shadow);
}

.theme-toggle:hover {
  transform: translateY(-2px) scale(1.05);
  border-color: var(--accent);
  color: var(--accent);
}

.theme-icon {
  width: 20px;
  height: 20px;
}

.state-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.not-found {
  text-align: center;
  color: var(--text-body);
}

.not-found-icon {
  font-size: 32px;
  color: var(--accent);
  margin-bottom: 12px;
}

.not-found h1 {
  font-family: 'Cormorant Garamond', serif;
  font-size: 32px;
  margin: 0 0 8px;
}

.not-found p {
  color: var(--text-faint);
}

/* ==== Hero ==== */
.hero {
  position: relative;
  min-height: 52vh;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  background: var(--bg-soft);
}

.hero.no-image {
  min-height: 38vh;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  filter: blur(18px) brightness(0.55) saturate(1.1);
  transform: scale(1.15);
}

.landing.light .hero-bg {
  filter: blur(18px) brightness(0.9) saturate(1.05);
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, var(--hero-overlay-from) 0%, var(--hero-overlay-mid) 55%, var(--hero-overlay-to) 100%);
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 900px;
  margin: 0 auto;
  padding: 96px 32px 48px;
  width: 100%;
  box-sizing: border-box;
  text-align: center;
}

.hero-eyebrow {
  font-size: 12px;
  letter-spacing: 0.25em;
  color: var(--accent);
  margin-bottom: 18px;
  font-weight: 500;
}

.hero-title {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 600;
  font-size: clamp(36px, 6vw, 64px);
  line-height: 1.1;
  margin: 0 0 16px;
  color: var(--text-title);
}

.hero-description {
  font-size: 16px;
  line-height: 1.7;
  color: var(--text-muted);
  max-width: 620px;
  margin: 0 auto 20px;
}

.hero-meta {
  font-size: 13px;
  letter-spacing: 0.05em;
  color: var(--text-faint);
  text-transform: uppercase;
}

.hero-dot {
  margin: 0 8px;
  color: var(--text-dim);
}

/* ==== Gallery ==== */
.gallery-wrap {
  max-width: 1200px;
  margin: 0 auto;
  padding: 56px 32px 40px;
}

.empty-state {
  padding: 80px 0;
  display: flex;
  justify-content: center;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 28px;
}

.art-card {
  cursor: pointer;
  transition: transform 0.25s ease;
}

.art-card:hover {
  transform: translateY(-6px);
}

.art-image-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 5;
  border-radius: 10px;
  overflow: hidden;
  background: var(--card-bg);
  box-shadow: var(--shadow);
}

.art-card:hover .art-image-wrap {
  box-shadow: var(--shadow-hover);
}

.art-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s ease;
}

.art-card:hover .art-image {
  transform: scale(1.04);
}

.art-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: var(--text-dim);
  background: var(--card-bg);
}

.art-placeholder.large {
  min-height: 320px;
  border-radius: 10px;
}

.status-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 10px;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border-radius: 20px;
  backdrop-filter: blur(4px);
  font-weight: 600;
}

.status-available {
  background: var(--status-available-bg);
  color: var(--status-available-fg);
  border: 1px solid var(--status-available-border);
}

.status-sold {
  background: var(--status-sold-bg);
  color: var(--status-sold-fg);
  border: 1px solid var(--status-sold-border);
}

.status-default {
  background: var(--status-default-bg);
  color: var(--status-default-fg);
  border: 1px solid var(--status-default-border);
}

.art-info {
  padding: 14px 2px 0;
}

.art-name {
  font-family: 'Cormorant Garamond', serif;
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 4px;
  color: var(--text-title);
}

.art-technique {
  font-size: 13px;
  color: var(--text-faint);
  margin: 0 0 6px;
}

.art-price {
  font-size: 14px;
  color: var(--accent-strong);
  margin: 0;
  font-weight: 500;
}

/* ==== Footer ==== */
.landing-footer {
  border-top: 1px solid var(--border);
  padding: 24px 32px 40px;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  letter-spacing: 0.1em;
  color: var(--text-dim);
  text-transform: uppercase;
}

/* ==== Modal ==== */
.work-modal :deep(.ant-modal-content) {
  background: var(--bg-elevated);
  border-radius: 14px;
  padding: 0;
  overflow: hidden;
}

.work-modal :deep(.ant-modal-close) {
  color: var(--text-muted);
  top: 14px;
  inset-inline-end: 14px;
}

.work-modal-content {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
}

.work-modal-image {
  background: var(--bg-image);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.work-modal-image img {
  max-width: 100%;
  max-height: 480px;
  object-fit: contain;
  border-radius: 6px;
}

.thumb-row {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  flex-wrap: wrap;
  justify-content: center;
}

.thumb-btn {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid transparent;
  padding: 0;
  cursor: pointer;
  opacity: 0.6;
  background: none;
  transition: all 0.2s ease;
}

.thumb-btn img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.thumb-btn.active,
.thumb-btn:hover {
  opacity: 1;
  border-color: var(--accent);
}

.work-modal-details {
  padding: 40px 36px;
  color: var(--text-body);
  overflow-y: auto;
  max-height: 560px;
}

.work-modal-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 30px;
  font-weight: 600;
  margin: 14px 0 20px;
  color: var(--text-title);
}

.detail-list {
  margin: 0 0 20px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 9px 0;
  border-bottom: 1px solid var(--border-soft);
  font-size: 13px;
}

.detail-row dt {
  color: var(--text-label);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 11px;
}

.detail-row dd {
  margin: 0;
  color: var(--text-body);
  font-weight: 500;
  text-align: right;
}

.work-description {
  font-size: 14px;
  line-height: 1.75;
  color: var(--text-muted);
  white-space: pre-wrap;
}

.work-price {
  margin-top: 24px;
  font-family: 'Cormorant Garamond', serif;
  font-size: 26px;
  font-weight: 600;
  color: var(--accent-strong);
}

/* ==== Адаптив ==== */
@media (max-width: 760px) {
  .theme-toggle {
    top: 14px;
    right: 14px;
    width: 38px;
    height: 38px;
  }

  .hero-content {
    padding: 64px 20px 36px;
  }

  .gallery-wrap {
    padding: 40px 18px 24px;
  }

  .gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 18px;
  }

  .work-modal-content {
    grid-template-columns: 1fr;
  }

  .work-modal-details {
    max-height: none;
    padding: 28px 22px 32px;
  }

  .landing-footer {
    padding: 20px 20px 32px;
    flex-direction: column;
    gap: 6px;
    text-align: center;
  }
}
</style>
