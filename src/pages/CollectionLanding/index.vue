<template>
  <div class="landing" :class="theme">

    <!-- Имя артиста — зафиксировано наверху, остаётся на месте при прокрутке -->
    <div v-if="artistName" class="artist-bar" :class="{ scrolled }">{{ artistName }}</div>

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

      <!-- Hero — фон зафиксирован во весь экран, пока не появится контент -->
      <header class="hero" :class="{ 'no-image': !coverImage }">
        <div v-if="coverImage" class="hero-bg" :style="{ backgroundImage: `url(${coverImage})` }"></div>
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

      <!-- Контент — непрозрачный, при прокрутке "накрывает" зафиксированный фон -->
      <div class="page-content">

        <!-- Галерея -->
        <main class="gallery-wrap">
          <div v-if="!works.length" class="empty-state">
            <a-empty description="В этой коллекции пока нет работ" />
          </div>

          <div v-else class="gallery-grid">
            <article
              v-for="work in works"
              :key="work.id"
              class="art-card reveal-on-scroll"
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

          <!--
            Свайп-вьювер между работами.
            Три слоя переднего плана (prev / current / next) и три слоя
            параллакс-фона всегда смонтированы одновременно — переключение
            происходит через transform/opacity, а не через v-if/пересоздание
            DOM, поэтому изображения соседних работ уже предзагружены и
            не мигают при переходе.
          -->
          <div
            class="swipe-viewer"
            ref="viewerEl"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          >
            <!-- Параллакс-фон — движется медленнее переднего плана (0.4×) -->
            <div class="swipe-bg" ref="bgPrevEl" v-if="prevWork">
              <img :src="workImage(prevWork)" alt="" />
            </div>
            <div class="swipe-bg" ref="bgCurrentEl">
              <img v-if="activeImage" :src="activeImage" alt="" />
            </div>
            <div class="swipe-bg" ref="bgNextEl" v-if="nextWork">
              <img :src="workImage(nextWork)" alt="" />
            </div>

            <!-- Передний план -->
            <div class="swipe-slide" ref="slidePrevEl" v-if="prevWork">
              <img :src="workImage(prevWork)" :alt="prevWork.name" class="swipe-image" />
            </div>

            <div class="swipe-slide swipe-slide-current" ref="slideCurrentEl">
              <img v-if="activeImage" :src="activeImage" :alt="activeWork.name" class="swipe-image" />
              <div v-else class="art-placeholder large">
                <PictureOutlined />
              </div>
            </div>

            <div class="swipe-slide" ref="slideNextEl" v-if="nextWork">
              <img :src="workImage(nextWork)" :alt="nextWork.name" class="swipe-image" />
            </div>
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

        <transition name="details-fade" mode="out-in">
          <div class="work-modal-details" :key="activeWork.id">
            <span v-if="getStatusName(activeWork.status)" class="status-badge status-badge-top" :class="statusClass(activeWork.status)">
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
        </transition>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
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

// Прозрачный фон плашки артиста поверх hero, обычный фон после прокрутки
const scrolled = ref(false)
const SCROLL_BAR_THRESHOLD = 24

function handleScroll() {
  scrolled.value = window.scrollY > SCROLL_BAR_THRESHOLD
}

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

// 👉 обложка коллекции — приоритет у обложки, заданной на экране редактирования
const coverImage = computed(() => collection.value?.avatar?.url || heroImage.value)

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

// ============================================================
// СВАЙП МЕЖДУ РАБОТАМИ
// ============================================================
// Идея: три слоя переднего плана (prev/current/next) и три слоя
// параллакс-фона всегда смонтированы. Во время жеста они двигаются
// строго 1:1 за пальцем/курсором ("gesture directly controls progress").
// При отпускании решение — довести переход или вернуться — принимается
// по скорости (флик) либо по пройденному расстоянию, а движение до цели
// выполняет пружинный интегратор (демпфированный гармонический
// осциллятор), а не CSS-easing — отсюда естественное, "физическое"
// затухание без резких остановок.
//
// Все стили применяются напрямую через template refs (el.style.transform/
// opacity), минуя реактивность Vue: во время жеста и анимации settle
// компонент не перерендеривается ни разу — обновляются только
// transform/opacity, которые браузер анимирует на compositor-потоке.

// --- refs на DOM-слои ---
const viewerEl = ref(null)
const slidePrevEl = ref(null)
const slideCurrentEl = ref(null)
const slideNextEl = ref(null)
const bgPrevEl = ref(null)
const bgCurrentEl = ref(null)
const bgNextEl = ref(null)

// --- соседи текущей работы в списке (для свайпа между ними) ---
const activeWorkIndex = computed(() => {
  if (!activeWork.value) return -1
  return works.value.findIndex(w => w.id === activeWork.value.id)
})

const prevWork = computed(() => {
  const i = activeWorkIndex.value
  return i > 0 ? works.value[i - 1] : null
})

const nextWork = computed(() => {
  const i = activeWorkIndex.value
  return i >= 0 && i < works.value.length - 1 ? works.value[i + 1] : null
})

function workImage(work) {
  return work?.avatar?.url || ''
}

// --- нереактивное состояние жеста/пружины (обычный объект, НЕ ref —
//     обновляется на каждом кадре, реактивность Vue тут не нужна и вредна) ---
const swipe = {
  dragging: false,
  pointerId: null,
  width: 0,             // ширина вьювера, px — единица измерения прогресса
  startX: 0,
  lastX: 0,
  lastT: 0,
  velocity: 0,          // px/мс, экспоненциально сглаженная скорость пальца
  x: 0,                 // текущее смещение переднего плана, px (0 = состояние покоя)
  v: 0,                 // скорость пружины, px/с (используется после отпускания)
  target: 0,            // цель пружины: 0 — остаться, ±width — уйти к соседу
  raf: 0,
  pendingDirection: 0   // -1 => переключить на next, +1 => на prev, 0 => остаться
}

// Константы пружины и порогов жеста — подобраны под "premium, museum-like"
// ощущение: не слишком упругая, не слишком вязкая.
const SPRING_STIFFNESS = 210         // жёсткость пружины
const SPRING_DAMPING = 26            // демпфирование — гасит колебания без "дребезга"
const FLING_VELOCITY_THRESHOLD = 0.5 // px/мс — выше этого порога считаем жест "фликом"
const DISTANCE_THRESHOLD_RATIO = 0.32 // доля ширины — порог для медленного перетаскивания
const RUBBER_BAND_FACTOR = 0.55       // сопротивление при попытке уйти за пределы коллекции
const SETTLE_EPSILON = 0.5            // px — порог, после которого анимация считается завершённой

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

// Линейная интерполяция значения из одного диапазона в другой (с зажимом
// по краям) — используется вместо дискретных if/else состояний везде,
// где меняются scale/opacity в зависимости от прогресса жеста.
function interpolate(value, inMin, inMax, outMin, outMax) {
  const t = clamp((value - inMin) / (inMax - inMin), 0, 1)
  return outMin + (outMax - outMin) * t
}

// "Резиновое" сопротивление на краях коллекции (первая/последняя работа) —
// чем дальше тянут, тем меньше реальное смещение, как в iOS UIScrollView.
function rubberBand(delta, width) {
  const sign = delta < 0 ? -1 : 1
  const abs = Math.abs(delta)
  return sign * (width * RUBBER_BAND_FACTOR * (1 - 1 / (abs / width + 1)))
}

// --- обработчики жеста (Pointer Events — единый API для мыши/тача/пера) ---

function onPointerDown(event) {
  if (!activeWork.value) return
  cancelAnimationFrame(swipe.raf)

  swipe.dragging = true
  swipe.pointerId = event.pointerId
  swipe.width = viewerEl.value?.clientWidth || 1
  swipe.startX = event.clientX
  swipe.lastX = event.clientX
  swipe.lastT = performance.now()
  swipe.velocity = 0
  viewerEl.value?.setPointerCapture(event.pointerId)
}

function onPointerMove(event) {
  if (!swipe.dragging || event.pointerId !== swipe.pointerId) return

  const now = performance.now()
  const dt = Math.max(now - swipe.lastT, 1)
  const instantVelocity = (event.clientX - swipe.lastX) / dt

  // Экспоненциальное сглаживание скорости — убирает дрожание на "рваных" move-событиях
  swipe.velocity = swipe.velocity * 0.75 + instantVelocity * 0.25

  swipe.lastX = event.clientX
  swipe.lastT = now

  let delta = event.clientX - swipe.startX

  if (delta > 0 && !prevWork.value) delta = rubberBand(delta, swipe.width)
  if (delta < 0 && !nextWork.value) delta = rubberBand(delta, swipe.width)

  // "Gesture movement should directly control animation progress" — 1:1 во время драга
  swipe.x = delta
  applyTransforms()
}

function onPointerUp(event) {
  if (!swipe.dragging || event.pointerId !== swipe.pointerId) return
  swipe.dragging = false
  viewerEl.value?.releasePointerCapture(event.pointerId)

  const progress = swipe.x / swipe.width
  let direction = 0 // -1 => к next, +1 => к prev, 0 => вернуться на место

  // Скорость решает исход при быстром флике, дистанция — при медленном драге
  if (Math.abs(swipe.velocity) > FLING_VELOCITY_THRESHOLD) {
    direction = swipe.velocity < 0 ? -1 : 1
  } else if (Math.abs(progress) > DISTANCE_THRESHOLD_RATIO) {
    direction = progress < 0 ? -1 : 1
  }

  if (direction === -1 && !nextWork.value) direction = 0
  if (direction === 1 && !prevWork.value) direction = 0

  swipe.pendingDirection = direction
  swipe.target = direction === 0 ? 0 : direction * swipe.width
  swipe.v = swipe.velocity * 1000 // px/мс -> px/с для интегратора

  runSpring()
}

// Пружинный интегратор (демпфированный гармонический осциллятор,
// полу-неявный метод Эйлера) — именно он даёт "natural deceleration"
// вместо CSS-кривых.
function runSpring() {
  cancelAnimationFrame(swipe.raf)
  let lastTime = performance.now()

  const step = (now) => {
    const dt = Math.min((now - lastTime) / 1000, 0.032) // сек; ограничение от скачков при лагах
    lastTime = now

    const displacement = swipe.x - swipe.target
    const springForce = -SPRING_STIFFNESS * displacement
    const dampingForce = -SPRING_DAMPING * swipe.v
    const acceleration = springForce + dampingForce

    swipe.v += acceleration * dt
    swipe.x += swipe.v * dt

    applyTransforms()

    const settled = Math.abs(swipe.x - swipe.target) < SETTLE_EPSILON && Math.abs(swipe.v) < SETTLE_EPSILON * 10
    if (!settled) {
      swipe.raf = requestAnimationFrame(step)
    } else {
      swipe.x = swipe.target
      applyTransforms()
      onSpringSettled()
    }
  }

  swipe.raf = requestAnimationFrame(step)
}

function onSpringSettled() {
  if (swipe.pendingDirection !== 0) {
    const newIndex = activeWorkIndex.value - swipe.pendingDirection
    const newWork = works.value[newIndex]
    if (newWork) {
      activeWork.value = newWork
      activeImageIndex.value = 0
    }
  }

  // Сброс в состояние покоя без визуального скачка — соседние слайды уже
  // предзагружены (всегда смонтированы), поэтому смены src не видно.
  swipe.x = 0
  swipe.v = 0
  swipe.target = 0
  swipe.pendingDirection = 0
  applyTransforms()
}

// Применяет transform/opacity к DOM-слоям напрямую — вызывается на каждом
// кадре жеста/пружины. Единственное место, где считается визуальный вид.
function applyTransforms() {
  const width = swipe.width || 1
  const x = swipe.x
  const t = clamp(x / width, -1, 1) // -1 = полностью ушли к next, +1 = к prev

  // Текущий (центральный) слайд — лёгкое уменьшение и затухание по мере ухода
  // ("Previous image gently fades while shrinking")
  const currentScale = interpolate(Math.abs(t), 0, 1, 1, 0.94)
  const currentOpacity = interpolate(Math.abs(t), 0, 1, 1, 0.85)
  setLayer(slideCurrentEl.value, x, currentScale, currentOpacity)
  setLayer(bgCurrentEl.value, x * 0.4, currentScale, currentOpacity)

  // Слайд, который раскрывается (prev — тянем вправо, next — тянем влево):
  // масштаб 0.96 → 1.0, непрозрачность едва заметно 0.9 → 1
  const revealScale = interpolate(Math.abs(t), 0, 1, 0.96, 1)
  const revealOpacity = interpolate(Math.abs(t), 0, 1, 0.9, 1)

  if (slidePrevEl.value) {
    setLayer(slidePrevEl.value, x - width, revealScale, x > 0 ? revealOpacity : 0)
  }
  if (bgPrevEl.value) {
    setLayer(bgPrevEl.value, (x - width) * 0.4, revealScale, x > 0 ? revealOpacity : 0)
  }

  if (slideNextEl.value) {
    setLayer(slideNextEl.value, x + width, revealScale, x < 0 ? revealOpacity : 0)
  }
  if (bgNextEl.value) {
    setLayer(bgNextEl.value, (x + width) * 0.4, revealScale, x < 0 ? revealOpacity : 0)
  }
}

function setLayer(el, translateX, scale, opacity) {
  if (!el) return
  // translate3d форсирует отдельный composite-слой в браузере — анимация
  // transform/opacity идёт на GPU, без пересчёта layout/paint на каждый кадр.
  el.style.transform = `translate3d(${translateX}px, 0, 0) scale(${scale})`
  el.style.opacity = String(opacity)
}

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

  // Сбрасываем свайп в состояние покоя и ждём, пока смонтируются refs
  // нового экземпляра модалки (destroyOnClose пересоздаёт DOM при каждом открытии)
  cancelAnimationFrame(swipe.raf)
  swipe.dragging = false
  swipe.x = 0
  swipe.v = 0
  swipe.target = 0
  swipe.pendingDirection = 0

  nextTick(() => {
    swipe.width = viewerEl.value?.clientWidth || 1
    applyTransforms()
  })
}

onMounted(async () => {
  handleScroll()
  window.addEventListener('scroll', handleScroll, { passive: true })

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

  await nextTick()
  setupRevealAnimations()
})

// 👉 плавное появление обложки и карточек работ при прокрутке
let revealObserver = null

function setupRevealAnimations() {
  revealObserver?.disconnect()

  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view')
        revealObserver.unobserve(entry.target)
      }
    })
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' })

  document.querySelectorAll('.reveal-on-scroll').forEach(el => revealObserver.observe(el))
}

onBeforeUnmount(() => {
  revealObserver?.disconnect()
  cancelAnimationFrame(swipe.raf)
  window.removeEventListener('scroll', handleScroll)
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
  top: 11px;
  right: 20px;
  z-index: 61;
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

/* Имя артиста — фиксированная плашка вверху слева, всегда поверх контента */
.artist-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 60;
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 76px 0 64px;
  border-bottom: 1px solid transparent;
  background: transparent;
  color: #ffffff;
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.5), 0 1px 4px rgba(0, 0, 0, 0.4);
  font-family: 'Cormorant Garamond', serif;
  font-size: 25px;
  font-weight: 600;
  letter-spacing: 0.10em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: none;
  transition: background 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, text-shadow 0.3s ease;
}

/* После прокрутки — обычный фон лендинга вместо прозрачного поверх hero */
.artist-bar.scrolled {
  border-bottom: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-title);
  text-shadow: none;
  box-shadow: var(--shadow);
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

/* ==== Hero ====
   Фон зафиксирован во весь экран (position: fixed), поэтому не прокручивается
   вместе со страницей — контент ниже (.page-content) непрозрачный и при
   прокрутке визуально "накрывает" его. */
.hero {
  position: relative;
  min-height: 52vh;
  display: flex;
  align-items: flex-end;
  background: var(--bg-soft);
}

.hero.no-image {
  min-height: 38vh;
}

.hero-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  background-size: cover;
  background-position: center;
  filter: blur(1px) brightness(0.58) saturate(1.1);
}

.landing.light .hero-bg {
  /* Затемняем так же сильно, как в тёмной теме — белый текст должен
     одинаково хорошо читаться независимо от переключателя темы */
  filter: blur(1px) brightness(0.72) saturate(1.05);
}

.hero-overlay {
  position: fixed;
  inset: 0;
  z-index: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0.55) 55%, var(--hero-overlay-to) 100%);
}

.hero-content {
  /* Отдельная, более контрастная палитра текста именно для hero — он
     лежит поверх фотографии, а не поверх плоского фона страницы, поэтому
     обычные --text-title/--text-muted (рассчитанные на ровный фон) тут
     недостаточно контрастны. Оттенки остаются в той же тёплой золотисто-
     кремовой гамме, просто ярче/светлее для этого конкретного места. */
  --hero-eyebrow-color: #f0dfae;
  --hero-title-color: #ffffff;
  --hero-body-color: rgba(255, 255, 255, 0.88);
  --hero-meta-color: rgba(255, 255, 255, 0.72);

  position: relative;
  z-index: 1;
  max-width: 900px;
  margin: 0 auto;
  padding: 96px 32px 48px;
  width: 100%;
  box-sizing: border-box;
  text-align: center;
}

/* Фон hero теперь одинаково затемнён в обеих темах, поэтому белый текст
   читается одинаково хорошо и в светлой теме — отдельный тёмный вариант
   цвета больше не нужен */

/* Контент под hero — непрозрачный, стоит выше зафиксированного фона */
.page-content {
  position: relative;
  z-index: 2;
  background: var(--bg);
}

/* Плавное появление работ при прокрутке — лёгкий масштаб
   вместе со сдвигом даёт "премиальное", музейное ощущение движения,
   а не плоский fade. Длинная пологая кривая (ease-out-expo) вместо
   резкого easing — для "extremely smooth" интерполяции. */
.reveal-on-scroll {
  opacity: 0;
  transform: translateY(36px) scale(0.97);
  transition:
    opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1),
    transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: opacity, transform;
}

.reveal-on-scroll.in-view {
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* Само изображение внутри карточки масштабируется чуть сильнее —
   двухслойное движение (контейнер + картинка) делает переход более
   объёмным, а не однородным. Анимируем только transform: opacity
   изображения по-прежнему управляется его собственным hover-правилом
   (.art-card:hover .art-image), которое не должно замедляться. */
.reveal-on-scroll .art-image {
  transition: transform 1.4s cubic-bezier(0.16, 1, 0.3, 1);
  transform: scale(1.05);
}

.reveal-on-scroll.in-view .art-image {
  transform: scale(1);
}

/* Заголовок hero — плавное появление при загрузке страницы */
@keyframes heroFadeUp {
  from {
    opacity: 0;
    transform: translateY(22px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero-eyebrow,
.hero-title,
.hero-description,
.hero-meta {
  opacity: 0;
  animation: heroFadeUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  /* Фон hero теперь одинаково затемнён в обеих темах, поэтому одна и та
     же тёмная тень одинаково хорошо держит контраст под белым текстом
     и в тёмной, и в светлой теме. */
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.5), 0 1px 4px rgba(0, 0, 0, 0.4);
}

.hero-eyebrow {
  font-size: 17px;
  letter-spacing: 0.3em;
  color: var(--hero-eyebrow-color);
  margin-bottom: 20px;
  font-weight: 600;
  animation-delay: 0.05s;
}

.hero-title {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 600;
  font-size: clamp(60px, 11vw, 96px);
  line-height: 1.08;
  margin: 0 0 20px;
  color: var(--hero-title-color);
  animation-delay: 0.15s;
}

.hero-description {
  font-size: 18px;
  line-height: 1.7;
  color: var(--hero-body-color);
  max-width: 620px;
  margin: 0 auto 22px;
  animation-delay: 0.3s;
}

.hero-meta {
  font-size: 15px;
  letter-spacing: 0.12em;
  color: var(--hero-meta-color);
  text-transform: uppercase;
  font-weight: 500;
  animation-delay: 0.45s;
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

/* Editorial single-column layout: одна работа за раз, во всю ширину,
   без обрезки — как в каталоге частного показа */
.gallery-grid {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.art-card {
  width: 100%;
  max-width: 580px;
  cursor: pointer;
  padding: 64px 0;
  border-bottom: 1px solid var(--border-soft);
}

.art-card:first-child {
  padding-top: 0;
}

.art-card:last-child {
  border-bottom: none;
}

.art-image-wrap {
  position: relative;
  width: 100%;
  background: var(--card-bg);
}

.art-image {
  display: block;
  width: 100%;
  height: auto;
  max-height: 78vh;
  object-fit: contain;
  margin: 0 auto;
  background: var(--card-bg);
  transition: opacity 0.25s ease;
}

.art-card:hover .art-image {
  opacity: 0.92;
}

.art-placeholder {
  width: 100%;
  height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42px;
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
  left: 10px;
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
  padding: 24px 0 0;
  text-align: center;
}

.art-name {
  font-family: 'Cormorant Garamond', serif;
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 6px;
  color: var(--text-title);
}

.art-technique {
  font-size: 13px;
  color: var(--text-faint);
  margin: 0 0 8px;
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
  overflow: hidden;
}

/* ==== Свайп-вьювер между работами ==== */
.swipe-viewer {
  position: relative;
  width: 100%;
  height: 480px;
  touch-action: pan-y; /* горизонтальный жест забираем себе, вертикальный скролл страницы не блокируем */
  user-select: none;
  cursor: grab;
}

.swipe-viewer:active {
  cursor: grabbing;
}

/* Параллакс-фон — размытые, увеличенные копии тех же изображений,
   двигаются медленнее переднего плана (коэффициент 0.4 в JS) */
.swipe-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.swipe-bg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(24px) brightness(0.7) saturate(1.05);
  transform: scale(1.2); /* запас на размытие, чтобы не было видно краёв */
}

/* Передний план — три слоя друг поверх друга, позиционируются через
   transform: translate3d в JS (см. applyTransforms) */
.swipe-slide {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  will-change: transform, opacity;
  -webkit-user-drag: none;
}

.swipe-image {
  width: 100%;
  height: 100%;
  object-fit: contain; /* сохраняем пропорции изображения — без обрезки, но заполняем всю область просмотра */
  border-radius: 6px;
  pointer-events: none;
  -webkit-user-drag: none;
}

/* Кроссфейд текстовых деталей при смене работы */
.details-fade-enter-active,
.details-fade-leave-active {
  transition: opacity 0.25s ease;
}

.details-fade-enter-from,
.details-fade-leave-to {
  opacity: 0;
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
  position: relative;
  padding: 40px 36px;
  color: var(--text-body);
  overflow-y: auto;
  max-height: 560px;
}

/* Тот же уровень по высоте, что и кнопка закрытия модалки (top: 14px) */
.status-badge-top {
  position: absolute;
  top: 0px;
  left: 30px;
  right: auto;
}

.work-modal-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 30px;
  font-weight: 600;
  margin: 44px 0 20px;
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
    top: 9px;
    right: 14px;
    width: 38px;
    height: 38px;
  }

  .artist-bar {
    height: 56px;
    padding: 0 60px 0 16px;
    font-size: 15px;
  }

  .hero-content {
    padding: 64px 20px 36px;
  }

  .gallery-wrap {
    padding: 40px 18px 24px;
  }

  .art-card {
    padding: 40px 0;
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
