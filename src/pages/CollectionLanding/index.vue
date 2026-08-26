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

    <!-- ==== Ссылка не найдена ==== -->
    <div v-else-if="!collection" class="state-screen">
      <div class="not-found">
        <div class="not-found-icon">✦</div>
        <h1>Ссылка не найдена</h1>
        <p>Ссылка недействительна или ссылка была удалена.</p>
      </div>
    </div>

    <!-- ==== Лендинг ссылки ==== -->
    <div v-else class="collection-landing">

      <!-- Hero — фон зафиксирован во весь экран, пока не появится контент -->
      <header class="hero" :class="{ 'no-image': !coverImage }">
        <div v-if="coverImage" class="hero-bg" :style="{ backgroundImage: `url(${coverImage})` }"></div>
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <!-- <div class="hero-eyebrow">ART CRM · ССЫЛКА</div> -->
          <h1 class="hero-title">{{ collection.name || 'Без названия' }}</h1>
          <div v-if="collection.description" class="hero-description" v-html="collection.description"></div>
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
            <a-empty description="В этой ссылке пока нет работ" />
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
              </div>
              <div class="art-info">
                <p v-if="work.artist_name" class="art-artist">{{ work.artist_name }}</p>
                <p class="art-title">
                  {{ work.name || 'Без названия' }}<template v-if="work.year && isFieldVisible('year')">, {{ work.year }}</template>
                </p>
                <p v-if="work.technique && isFieldVisible('technique')" class="art-detail">{{ work.technique }}</p>
                <p v-if="work.size && isFieldVisible('size')" class="art-detail">{{ work.size }}</p>
                <p v-if="work.status_name && isFieldVisible('status')" class="art-detail">{{ work.status_name }}</p>
                <p v-if="work.price && isFieldVisible('price')" class="art-price">{{ formatPrice(work.price) }}</p>
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

    <!-- ==== Полноэкранный просмотр работы ==== -->
    <div v-if="viewerOpen && activeWork" class="work-modal" :class="theme">
      <button class="viewer-close-btn" aria-label="Закрыть" @click="closeViewer">
        <CloseOutlined />
      </button>

      <button v-if="prevWork" class="viewer-nav-btn viewer-nav-prev" aria-label="Предыдущая работа" @click="goToPrev">
        <LeftOutlined />
      </button>
      <button v-if="nextWork" class="viewer-nav-btn viewer-nav-next" aria-label="Следующая работа" @click="goToNext">
        <RightOutlined />
      </button>

      <div class="work-modal-content" :class="{ 'info-hidden': infoHidden }">
        <div class="work-modal-image">

          <!--
            Свайп-вьювер между работами.
            Три слоя переднего плана (prev / current / next) всегда смонтированы
            одновременно — переключение происходит через transform/opacity, а не
            через v-if/пересоздание DOM, поэтому изображения соседних работ уже
            предзагружены и не мигают при переходе.
          -->
          <div
            class="swipe-viewer"
            :class="{ zoomed: zoomLevel > 1 }"
            ref="viewerEl"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          >
            <!-- Передний план -->
            <div class="swipe-slide" ref="slidePrevEl" v-if="prevWork">
              <img :src="workImage(prevWork)" :alt="prevWork.name" class="swipe-image" />
            </div>

            <div class="swipe-slide swipe-slide-current" ref="slideCurrentEl">
              <img v-if="activeImage" :src="activeImage" :alt="activeWork.name" class="swipe-image" :style="currentImageStyle" />
              <div v-else class="art-placeholder large">
                <PictureOutlined />
              </div>
            </div>

            <div class="swipe-slide" ref="slideNextEl" v-if="nextWork">
              <img :src="workImage(nextWork)" :alt="nextWork.name" class="swipe-image" />
            </div>
          </div>

          <!-- Место под превью зарезервировано всегда (даже без доп. фото) —
               иначе высота картинки увеличивалась бы для работ без превью -->
          <div class="thumb-row">
            <template v-if="thumbnails.length > 1">
              <button
                v-for="(thumb, idx) in thumbnails"
                :key="thumb.url + idx"
                class="thumb-btn"
                :class="{ active: idx === activeImageIndex }"
                @click="activeImageIndex = idx"
              >
                <img :src="thumb.url" :alt="`${activeWork.name} ${idx + 1}`" />
              </button>
            </template>
          </div>
        </div>

        <div class="work-modal-details-wrap" :class="{ collapsed: infoHidden }">
          <transition name="details-fade" mode="out-in">
            <div class="work-modal-details" :key="activeWork.id">
              <p v-if="activeWork.artist_name" class="work-modal-artist">{{ activeWork.artist_name }}</p>
              <h2 class="work-modal-title">
                {{ activeWork.name || 'Без названия' }}<template v-if="activeWork.year && isFieldVisible('year')">, {{ activeWork.year }}</template>
              </h2>

              <dl class="detail-list">
                <div v-if="activeWork.technique && isFieldVisible('technique')" class="detail-row">
                  <dt>Техника</dt>
                  <dd>{{ activeWork.technique }}</dd>
                </div>
                <div v-if="activeWork.size && isFieldVisible('size')" class="detail-row">
                  <dt>Размер</dt>
                  <dd>{{ activeWork.size }}</dd>
                </div>
                <div v-if="activeWork.seria_name && isFieldVisible('seria')" class="detail-row">
                  <dt>Серия</dt>
                  <dd>{{ activeWork.seria_name }}</dd>
                </div>
                <div v-if="activeWork.media_name && isFieldVisible('media')" class="detail-row">
                  <dt>Медиа</dt>
                  <dd>{{ activeWork.media_name }}</dd>
                </div>
                <div v-if="activeWork.location_name && isFieldVisible('location')" class="detail-row">
                  <dt>Локация</dt>
                  <dd>{{ activeWork.location_name }}</dd>
                </div>
              </dl>

              <span v-if="activeWork.status_name && isFieldVisible('status')" class="work-status-text">
                {{ activeWork.status_name }}
              </span>
              <p v-if="activeWork.description" class="work-description">{{ activeWork.description }}</p>

              <div v-if="activeWork.price && isFieldVisible('price')" class="work-price">
                {{ formatPrice(activeWork.price) }}
              </div>

              <div class="details-divider"></div>
            </div>
          </transition>
        </div>
      </div>

      <!-- Тулбар зафиксирован справа, под панелью информации — виден и когда
           панель свёрнута, поэтому кнопки всегда доступны -->
      <div class="viewer-toolbar">
        <a-tooltip :title="infoHidden ? 'Показать информацию' : 'Скрыть информацию'">
          <button class="viewer-toolbar-btn" @click="infoHidden = !infoHidden">
            <transition name="icon-swap" mode="out-in">
              <EyeInvisibleOutlined v-if="!infoHidden" key="hide" />
              <EyeOutlined v-else key="show" />
            </transition>
          </button>
        </a-tooltip>
        <a-tooltip :title="isMaxZoom ? 'Сбросить увеличение' : 'Увеличить картинку'">
          <button class="viewer-toolbar-btn" @click="cycleZoom">
            <transition name="icon-swap" mode="out-in">
              <ZoomOutOutlined v-if="isMaxZoom" key="out" />
              <ZoomInOutlined v-else key="in" />
            </transition>
          </button>
        </a-tooltip>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import {
  PictureOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  CloseOutlined,
  LeftOutlined,
  RightOutlined
} from '@ant-design/icons-vue'
import { useCollection } from '@/stores/collection.js'

const route = useRoute()

const collectionStore = useCollection()

const loading = ref(true)
const collection = ref(null)
const works = ref([])

const viewerOpen = ref(false)
const activeWork = ref(null)
const activeImageIndex = ref(0)
const infoHidden = ref(false)

// --- увеличение картинки: циклический зум (кнопка) + перетаскивание, когда увеличено ---
const ZOOM_LEVELS = [1, 1.5, 2, 3]
const zoomLevel = ref(1)
const pan = reactive({ x: 0, y: 0 })
// reactive — currentImageStyle должен реагировать на panDrag.active (курсор/transition)
const panDrag = reactive({ active: false, pointerId: null, startX: 0, startY: 0, startPanX: 0, startPanY: 0 })

// Пока можно увеличивать дальше — показываем «+», на последнем уровне
// следующий клик сбрасывает зум, поэтому показываем «-»
const isMaxZoom = computed(() => zoomLevel.value === ZOOM_LEVELS[ZOOM_LEVELS.length - 1])

const currentImageStyle = computed(() => {
  if (zoomLevel.value <= 1) return {}
  const style = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel.value})`,
    cursor: panDrag.active ? 'grabbing' : 'grab'
  }
  // Во время самого перетаскивания transition должен быть выключен — иначе
  // палец/курсор будет обгонять картинку (транзишен «догоняет» с задержкой)
  if (panDrag.active) style.transition = 'none'
  return style
})

function cycleZoom() {
  const idx = ZOOM_LEVELS.indexOf(zoomLevel.value)
  zoomLevel.value = ZOOM_LEVELS[(idx + 1) % ZOOM_LEVELS.length]
  pan.x = 0
  pan.y = 0
}

function resetZoom() {
  zoomLevel.value = 1
  pan.x = 0
  pan.y = 0
}

// Не даём утащить увеличенную картинку за пределы, где она перестаёт
// перекрывать рамку вьювера
function clampPan() {
  if (!viewerEl.value) return
  const maxX = (viewerEl.value.clientWidth * (zoomLevel.value - 1)) / 2
  const maxY = (viewerEl.value.clientHeight * (zoomLevel.value - 1)) / 2
  pan.x = clamp(pan.x, -maxX, maxX)
  pan.y = clamp(pan.y, -maxY, maxY)
}

// Полноэкранный просмотрщик — закрытие по Escape и блокировка скролла страницы под ним
function handleViewerKeydown(event) {
  if (event.key === 'Escape') closeViewer()
}

watch(viewerOpen, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
  if (isOpen) {
    window.addEventListener('keydown', handleViewerKeydown)
  } else {
    window.removeEventListener('keydown', handleViewerKeydown)
  }
})

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

const artistName = computed(() => collection.value?.artistOrGallery || '')

const heroImage = computed(() => {
  const withAvatar = works.value.find(w => w.avatar?.url)
  return withAvatar?.avatar?.url || ''
})

// 👉 обложка ссылки — приоритет у обложки, заданной на экране редактирования
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
const RUBBER_BAND_FACTOR = 0.55       // сопротивление при попытке уйти за пределы ссылки
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

// "Резиновое" сопротивление на краях ссылки (первая/последняя работа) —
// чем дальше тянут, тем меньше реальное смещение, как в iOS UIScrollView.
function rubberBand(delta, width) {
  const sign = delta < 0 ? -1 : 1
  const abs = Math.abs(delta)
  return sign * (width * RUBBER_BAND_FACTOR * (1 - 1 / (abs / width + 1)))
}

// --- кнопки «вперёд»/«назад» — переиспользуют ту же пружину, что и свайп ---

function goToPrev() {
  if (!prevWork.value || swipe.dragging) return
  cancelAnimationFrame(swipe.raf)
  swipe.width = viewerEl.value?.clientWidth || 1
  swipe.pendingDirection = 1
  swipe.target = swipe.width
  swipe.v = 0
  runSpring()
}

function goToNext() {
  if (!nextWork.value || swipe.dragging) return
  cancelAnimationFrame(swipe.raf)
  swipe.width = viewerEl.value?.clientWidth || 1
  swipe.pendingDirection = -1
  swipe.target = -swipe.width
  swipe.v = 0
  runSpring()
}

// --- обработчики жеста (Pointer Events — единый API для мыши/тача/пера) ---

function onPointerDown(event) {
  if (!activeWork.value) return

  // Картинка увеличена — тащим саму картинку, а не переключаем работы
  if (zoomLevel.value > 1) {
    panDrag.active = true
    panDrag.pointerId = event.pointerId
    panDrag.startX = event.clientX
    panDrag.startY = event.clientY
    panDrag.startPanX = pan.x
    panDrag.startPanY = pan.y
    viewerEl.value?.setPointerCapture(event.pointerId)
    return
  }

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
  if (panDrag.active) {
    if (event.pointerId !== panDrag.pointerId) return
    pan.x = panDrag.startPanX + (event.clientX - panDrag.startX)
    pan.y = panDrag.startPanY + (event.clientY - panDrag.startY)
    clampPan()
    return
  }

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
  if (panDrag.active) {
    if (event.pointerId !== panDrag.pointerId) return
    panDrag.active = false
    viewerEl.value?.releasePointerCapture(event.pointerId)
    return
  }

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
      resetZoom()
    }
  }

  // Сброс в состояние покоя без визуального скачка — соседние слайды уже
  // предзагружены (всегда смонтированы), поэтому смены src не видно.
  swipe.x = 0
  swipe.v = 0
  swipe.target = 0
  swipe.pendingDirection = 0

  // Если у нового activeWork появился слайд, которого не было (например,
  // мы были на последней работе — v-if="nextWork" ничего не рендерил),
  // Vue создаёт его в DOM асинхронно. Без nextTick() applyTransforms()
  // выполнится до появления элемента и не выставит ему transform — на миг
  // (или до следующего кадра) он рендерится без него, то есть поверх
  // текущего слайда, во весь экран — и перекрывает картинку неправильной.
  nextTick(() => {
    applyTransforms()
  })
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

  // Слайд, который раскрывается (prev — тянем вправо, next — тянем влево):
  // масштаб 0.96 → 1.0, непрозрачность едва заметно 0.9 → 1
  const revealScale = interpolate(Math.abs(t), 0, 1, 0.96, 1)
  const revealOpacity = interpolate(Math.abs(t), 0, 1, 0.9, 1)

  if (slidePrevEl.value) {
    setLayer(slidePrevEl.value, x - width, revealScale, x > 0 ? revealOpacity : 0)
  }

  if (slideNextEl.value) {
    setLayer(slideNextEl.value, x + width, revealScale, x < 0 ? revealOpacity : 0)
  }
}

function setLayer(el, translateX, scale, opacity) {
  if (!el) return
  // translate3d форсирует отдельный composite-слой в браузере — анимация
  // transform/opacity идёт на GPU, без пересчёта layout/paint на каждый кадр.
  el.style.transform = `translate3d(${translateX}px, 0, 0) scale(${scale})`
  el.style.opacity = String(opacity)
}

// Публичная ссылка отдаёт работы уже с резолвленными именами справочников
// (status_name/seria_name/media_name/location_name) — отдельный зритель
// не может смотреть их через свои же авторизованные справочники, т.к.
// он, как правило, не совпадает с владельцем ссылки.
// Настройки отображения полей задаются в редакторе коллекции (Collection/index.vue).
// Если настройка не задана (старые коллекции без этого поля) — считаем поле видимым.
function isFieldVisible(key) {
  const visibleFields = collection.value?.visibleFields
  return !visibleFields || visibleFields[key] !== false
}

function formatPrice(price) {
  const num = Number(price)
  if (Number.isNaN(num)) return price
  return new Intl.NumberFormat('ru-RU').format(num) + ' ₽'
}

function closeViewer() {
  viewerOpen.value = false
}

function openViewer(work) {
  activeWork.value = work
  activeImageIndex.value = 0
  viewerOpen.value = true
  infoHidden.value = false
  resetZoom()

  // Сбрасываем свайп в состояние покоя и ждём, пока смонтируются refs
  // нового экземпляра просмотрщика (v-if пересоздаёт DOM при каждом открытии)
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
    const found = await collectionStore.getPublicCollection(route.params.id)

    if (!found) {
      collection.value = null
      return
    }
    collection.value = found
    works.value = found.works || []
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
  window.removeEventListener('keydown', handleViewerKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&display=swap');

@font-face {
  font-family: 'Default Sans';
  src: url('@/assets/fonts/DefaultSans-Regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

.landing {
  --bg: #0f0f11;
  --bg-soft: radial-gradient(circle at 30% 20%, #24222a 0%, #0f0f11 70%);
  --bg-elevated: #16151a;
  --bg-image: #0c0c0e;
  --card-bg: #1b1a1e;
  --text-title: #fbfaf7;
  --text-body: #f5f3ee;
  --text-muted: #d8d5cd;
  --text-faint: #aeaba1;
  --text-dim: #858175;
  --text-label: #9a9689;
  --accent: #c8b789;
  --accent-strong: #d8c896;
  --border: rgba(255, 255, 255, 0.14);
  --border-soft: rgba(255, 255, 255, 0.12);
  --shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  --shadow-hover: 0 14px 32px rgba(0, 0, 0, 0.5);
  --status-available-bg: #2f9e46;
  --status-available-fg: #ffffff;
  --status-available-border: rgba(0, 0, 0, 0.18);
  --status-sold-bg: #d64545;
  --status-sold-fg: #ffffff;
  --status-sold-border: rgba(0, 0, 0, 0.18);
  --status-default-bg: #8a6d2f;
  --status-default-fg: #ffffff;
  --status-default-border: rgba(0, 0, 0, 0.18);

  min-height: 100vh;
  background: var(--bg);
  color: var(--text-body);
  font-family: 'Default Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  transition: background 0.3s ease, color 0.3s ease;
}

.landing.light {
  --bg: #ffffff;
  --bg-soft: radial-gradient(circle at 30% 20%, #ffffff 0%, #ffffff 70%);
  --bg-elevated: #ffffff;
  --bg-image: #efece4;
  --card-bg: #efece4;
  --text-title: #1a1814;
  --text-body: #242219;
  --text-muted: #4a463c;
  --text-faint: #665f50;
  --text-dim: #8f8874;
  --text-label: #766f5e;
  --accent: #8a6d2f;
  --accent-strong: #6f581f;
  --border: rgba(0, 0, 0, 0.14);
  --border-soft: rgba(0, 0, 0, 0.12);
  --shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  --shadow-hover: 0 14px 32px rgba(0, 0, 0, 0.16);
  --status-available-bg: #2f9e46;
  --status-available-fg: #ffffff;
  --status-available-border: rgba(0, 0, 0, 0.18);
  --status-sold-bg: #d64545;
  --status-sold-fg: #ffffff;
  --status-sold-border: rgba(0, 0, 0, 0.18);
  --status-default-bg: #8a6d2f;
  --status-default-fg: #ffffff;
  --status-default-border: rgba(0, 0, 0, 0.18);
}

/* Стили модалки просмотра работы (.work-modal и всё, что внутри неё)
   вынесены в отдельный НЕскоуп-блок <style> в конце файла — см. комментарий
   там. Ant Design телепортирует модалку из дерева этого компонента, из-за
   чего scoped-стили (в т.ч. CSS-переменные темы) до неё не доходят. */

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

/* Имя артиста — фиксированная плашка вверху слева, всегда поверх контента.
   Сам фон вынесен в ::before (см. ниже), чтобы анимировать его отдельно
   от высоты самой плашки. */
.artist-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 60;
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 20%;
  border-bottom: 1px solid #ffffff;
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
  transition: height 1.5s cubic-bezier(0.16, 1, 0.3, 1),
    color 1.5s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 1.5s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 1.5s cubic-bezier(0.16, 1, 0.3, 1),
    text-shadow 1.5s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Заливка фона плашки — только плавное появление/исчезание по прозрачности */
.artist-bar::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--bg-elevated);
  opacity: 0;
  transition: opacity 1.5s cubic-bezier(0.16, 1, 0.3, 1);
}

/* После прокрутки — белый фон и чуть меньшая высота плашки;
   при возврате наверх (фон снова прозрачный) высота возвращается к исходной */
.artist-bar.scrolled {
  height: 56px;
  border-bottom: 1px solid #d9d9d9;
  color: var(--text-title);
  text-shadow: none;
  box-shadow: var(--shadow);
}

.artist-bar.scrolled::before {
  opacity: 1;
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
  /* Фиксированная (не min-) высота — контент должен помещаться строго в
     границах картинки, а не растягивать секцию дальше её высоты */
  height: 48vh;
  display: flex;
  align-items: flex-end;
  background: var(--bg-soft);
  overflow: hidden;
}

.hero.no-image {
  height: 38vh;
}

.hero-bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 48vh;
  z-index: 0;
  background-size: cover;
  background-position: center 20%;
  filter: blur(1px) brightness(0.68) saturate(1.1);
}

.landing.light .hero-bg {
  /* Затемняем так же сильно, как в тёмной теме — белый текст должен
     одинаково хорошо читаться независимо от переключателя темы */
  filter: blur(1px) brightness(0.88) saturate(1.05);
}

/* Затемнение строго по границам самой картинки (0-48vh) и ни пикселем
   дальше — под картинкой сразу обычный фон страницы, без градиента/шва */
.hero-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 48vh;
  z-index: 0;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.25) 0%,
    rgba(0, 0, 0, 0.42) 30%,
    rgba(0, 0, 0, 0.42) 100%
  );
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
  max-width: 1200px;
  margin: 0 auto;
  padding: 96px 32px 48px;
  width: 100%;
  max-height: 100%;
  box-sizing: border-box;
  text-align: center;
  /* Заголовок и мета (ФИО) — фиксированного размера, описание — гибкое
     и при нехватке места сжимается вместо того, чтобы растянуть секцию */
  display: flex;
  flex-direction: column;
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
  flex-shrink: 0;
  font-family: 'Cormorant Garamond', serif;
  font-weight: 600;
  font-size: clamp(40px, 6vw, 60px);
  line-height: 1.08;
  margin: 0 0 20px;
  color: var(--hero-title-color);
  animation-delay: 0.15s;
}

/* Единственный гибкий элемент внутри .hero-content: сжимается вместо того,
   чтобы растянуть hero выше высоты картинки, и скроллится сам по себе,
   если после сжатия текст всё равно не помещается — без видимого скроллбара */
.hero-description {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  font-size: 18px;
  font-style: italic;
  font-weight: 300;
  line-height: 1.7;
  color: #ffffff;
  max-width: 1100px;
  margin: 0 auto 22px;
  animation-delay: 0.3s;
}

.hero-description::-webkit-scrollbar {
  display: none;
}

/* Текст из редактора может содержать <strong>/<b> — принудительно убираем
   жирность и там тоже, раз весь блок должен быть не жирным */
.hero-description :deep(strong),
.hero-description :deep(b) {
  font-weight: 300;
}

.hero-description :deep(p) {
  margin: 0 0 12px;
}

.hero-description :deep(p:last-child) {
  margin-bottom: 0;
}

.hero-description :deep(ul),
.hero-description :deep(ol) {
  margin: 0 0 12px;
  padding-left: 22px;
  text-align: left;
}

.hero-description :deep(blockquote) {
  margin: 0 0 12px;
  padding-left: 14px;
  border-left: 3px solid currentColor;
  opacity: 0.85;
}

.hero-meta {
  flex-shrink: 0;
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

/* На компьютере гарантируем минимум 3 видимые строки описания
   (18px * 1.7 line-height ≈ 30.6px на строку) и лёгкий отступ перед ФИО */
@media (min-width: 761px) {
  .hero-description {
    min-height: 92px;
  }

  .hero-meta {
    margin-top: 8px;
  }
}

/* ==== Gallery ==== */
.gallery-wrap {
  max-width: 1100px;
  margin: 0 auto;
  padding: 56px 32px 40px;
}

.empty-state {
  padding: 80px 0;
  display: flex;
  justify-content: center;
}

/* Сетка: 3 работы в ряд */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 48px 20px;
}

.art-card {
  width: 90%;
  margin: 0 auto;
  cursor: pointer;
}

.art-image-wrap {
  position: relative;
  width: 90%;
  aspect-ratio: 4 / 5;
  margin: 0 auto;
  background: var(--bg);
}

.art-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: var(--bg);
  transition: opacity 0.25s ease;
}

.art-card:hover .art-image {
  opacity: 0.92;
}

.art-placeholder {
  width: 100%;
  aspect-ratio: 4 / 5;
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

.art-info {
  padding: 24px 0 0;
  text-align: center;
  font-style: italic;
  color: var(--text-title);
}

.art-artist {
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 2px;
}

.art-title {
  font-size: 13px;
  font-weight: 400;
  margin: 0 0 4px;
}

.art-detail {
  font-size: 13px;
  margin: 0 0 2px;
}

.art-price {
  font-size: 13px;
  font-weight: 400;
  margin: 4px 0 0;
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

/* ==== Адаптив ==== */
@media (max-width: 900px) {
  .gallery-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 32px 20px;
  }
}

@media (max-width: 560px) {
  .gallery-grid {
    grid-template-columns: 1fr;
    justify-items: center;
  }

  .art-card {
    max-width: 360px;
  }
}

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

  .landing-footer {
    padding: 20px 20px 32px;
    flex-direction: column;
    gap: 6px;
    text-align: center;
  }
}
</style>

<!--
  Ant Design Vue's a-modal (просмотр работы) рендерит своё DOM-дерево
  через Teleport, вынося его из дерева .landing — даже с :get-container="false"
  узлы модалки не получают scoped data-v-* атрибут этого компонента, поэтому
  scoped-стили (и, что важнее, CSS-переменные темы) до них не докатываются:
  без этого блока текст оставался тёмным на тёмном фоне в dark-теме.
  Тот же приём уже используется для другой модалки в Collection/index.vue.
-->
<style>
.work-modal {
  --bg-elevated: #16151a;
  --bg-image: #0c0c0e;
  --card-bg: #1b1a1e;
  --text-title: #fbfaf7;
  --text-body: #f5f3ee;
  --text-muted: #d8d5cd;
  --text-faint: #aeaba1;
  --text-dim: #858175;
  --text-label: #9a9689;
  --accent: #c8b789;
  --accent-strong: #d8c896;
  --border: rgba(255, 255, 255, 0.14);
  --border-soft: rgba(255, 255, 255, 0.12);
  --status-available-bg: #2f9e46;
  --status-available-fg: #ffffff;
  --status-available-border: rgba(0, 0, 0, 0.18);
  --status-sold-bg: #d64545;
  --status-sold-fg: #ffffff;
  --status-sold-border: rgba(0, 0, 0, 0.18);
  --status-default-bg: #8a6d2f;
  --status-default-fg: #ffffff;
  --status-default-border: rgba(0, 0, 0, 0.18);
}

.work-modal.light {
  --bg-elevated: #ffffff;
  --bg-image: #efece4;
  --card-bg: #efece4;
  --text-title: #1a1814;
  --text-body: #242219;
  --text-muted: #4a463c;
  --text-faint: #665f50;
  --text-dim: #8f8874;
  --text-label: #766f5e;
  --accent: #8a6d2f;
  --accent-strong: #6f581f;
  --border: rgba(0, 0, 0, 0.14);
  --border-soft: rgba(0, 0, 0, 0.12);
  --status-available-bg: #2f9e46;
  --status-available-fg: #ffffff;
  --status-available-border: rgba(0, 0, 0, 0.18);
  --status-sold-bg: #d64545;
  --status-sold-fg: #ffffff;
  --status-sold-border: rgba(0, 0, 0, 0.18);
  --status-default-bg: #8a6d2f;
  --status-default-fg: #ffffff;
  --status-default-border: rgba(0, 0, 0, 0.18);
}

.work-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: var(--bg-elevated);
}

.viewer-close-btn {
  position: fixed;
  top: 18px;
  right: 24px;
  z-index: 1001;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-muted);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.viewer-close-btn:hover {
  background: var(--border-soft);
  color: var(--text-title);
}

/* Стрелки «предыдущая/следующая работа» — та же навигация, что и свайп */
.viewer-nav-btn {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1001;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: var(--bg-elevated);
  color: var(--text-body);
  font-size: 20px;
  cursor: pointer;
  box-shadow: var(--shadow);
  transition: background 0.15s ease, color 0.15s ease;
}

.viewer-nav-btn:hover {
  color: var(--accent);
}

.viewer-nav-prev {
  left: 24px;
}

.viewer-nav-next {
  right: 24px;
}

/* Тулбар справа внизу, под панелью информации — виден и когда она свёрнута */
.viewer-toolbar {
  position: fixed;
  bottom: 28px;
  right: 36px;
  z-index: 1001;
  display: flex;
  gap: 12px;
}

.viewer-toolbar-btn {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--bg-elevated);
  color: var(--text-body);
  font-size: 24px;
  cursor: pointer;
  box-shadow: var(--shadow);
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.viewer-toolbar-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.work-modal-content {
  display: flex;
  height: 100%;
}

.work-modal-image {
  background: var(--bg-elevated);
  display: flex;
  flex: 0 0 50%;
  width: 50%;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  overflow: hidden;
  /* Ширина колонки не меняется (без пересчёта раскладки на каждый кадр) —
     сдвиг к центру экрана делается через transform: скользит плавно, а не «растёт» */
  transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Информация скрыта — картинка скользит к центру экрана.
   translateX(50%) от 50%-ширины колонки = сдвиг на 25% всей ширины экрана,
   ровно столько, чтобы центр колонки (25%) совпал с центром экрана (50%). */
.work-modal-content.info-hidden .work-modal-image {
  transform: translateX(50%);
}

/* Обёртка колонки с информацией — сама колонка не сжимается (без reflow),
   а плавно уезжает за правый край экрана через transform + fade */
.work-modal-details-wrap {
  flex: 0 0 50%;
  width: 50%;
  max-width: 50%;
  opacity: 1;
  overflow: hidden;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
}

.work-modal-details-wrap.collapsed {
  transform: translateX(100%);
  opacity: 0;
}

/* ==== Свайп-вьювер между работами ==== */
.swipe-viewer {
  position: relative;
  width: 100%;
  flex: 1;
  min-height: 0;
  touch-action: pan-y;
  user-select: none;
  cursor: grab;
}

.swipe-viewer:active {
  cursor: grabbing;
}

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
  object-fit: contain;
  border-radius: 6px;
  pointer-events: none;
  transition: transform 0.25s ease;
  -webkit-user-drag: none;
}

/* Масштаб и перетаскивание увеличенной картинки задаются инлайн-стилем
   (currentImageStyle) — там нужны непрерывные числовые значения pan/zoom,
   а не фиксированные CSS-классы */
.swipe-viewer.zoomed {
  cursor: grab;
}

.details-fade-enter-active,
.details-fade-leave-active {
  transition: opacity 0.25s ease;
}

.details-fade-enter-from,
.details-fade-leave-to {
  opacity: 0;
}

/* Смена иконки на кнопках тулбара — лёгкий поворот + масштаб вместо
   мгновенной подмены */
.icon-swap-enter-active,
.icon-swap-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.icon-swap-enter-from {
  opacity: 0;
  transform: scale(0.6) rotate(-45deg);
}

.icon-swap-leave-to {
  opacity: 0;
  transform: scale(0.6) rotate(45deg);
}

/* Высота зарезервирована всегда (min-height, а не только max-height) —
   рендерится независимо от наличия превью (см. шаблон), поэтому картинка
   не увеличивается по высоте для работ без доп. фото. flex-shrink: 0 и
   nowrap+overflow-x — чтобы у работ с большим числом фото строка не
   переносилась на 2+ ряда и не «отъедала» высоту у самой картинки. */
.thumb-row {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  margin-top: 14px;
  min-height: 56px;
  max-height: 56px;
  overflow-x: auto;
  overflow-y: hidden;
  flex-wrap: nowrap;
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
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 40px 36px 40px 24px;
  color: var(--text-body);
  background: var(--bg-elevated);
  font-style: italic;
  overflow-y: auto;
  height: 100%;
}

/* Статус — просто неприметный курсивный текст рядом с описанием,
   без цветного бейджа (в отличие от карточки в галерее) */
.work-status-text {
  display: block;
  font-style: italic;
  font-size: 13px;
  color: var(--text-dim);
  margin: 0 0 4px;
}

.work-modal-artist {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-title);
  margin: 44px 0 4px;
}

.work-modal-title {
  font-style: italic;
  font-size: 15px;
  font-weight: 400;
  margin: 0 0 12px;
  color: var(--text-title);
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0 0 10px;
}

.detail-row {
  padding: 0;
  font-size: 14px;
}

/* Подписи (Техника/Размер/…) не показываем — только значения, как в макете */
.detail-row dt {
  display: none;
}

.detail-row dd {
  margin: 0;
  color: var(--text-title);
  font-weight: 400;
  text-align: left;
}

.work-description {
  font-size: 14px;
  line-height: 1.75;
  color: var(--text-title);
  white-space: pre-wrap;
}

.work-price {
  margin-top: 10px;
  font-size: 14px;
  font-weight: 400;
  color: var(--text-title);
}

.details-divider {
  width: 140px;
  height: 1px;
  margin-top: 28px;
  background: var(--border);
}

@media (max-width: 760px) {
  .work-modal {
    overflow-y: auto;
  }

  .work-modal-content {
    flex-direction: column;
    height: auto;
    min-height: 100%;
  }

  .work-modal-image {
    width: 100%;
    flex: none;
    height: auto;
    /* Убираем десктопный нижний паддинг — иначе между превью и текстом
       остаётся большой зазор ещё до собственного отступа панели информации */
    padding: 24px 16px 4px;
  }

  /* На мобильном картинка не двигается по горизонтали — сброс десктопного сдвига */
  .work-modal-content.info-hidden .work-modal-image {
    transform: none;
  }

  .swipe-viewer {
    height: 60vh;
    flex: none;
  }

  /* На мобильном колонка стоит друг под другом — схлопываем по высоте, а не по ширине/сдвигу */
  .work-modal-details-wrap {
    width: auto;
    max-width: none;
    height: auto;
    transform: none;
    transition: max-height 0.7s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
    max-height: 2000px;
  }

  .work-modal-details-wrap.collapsed {
    width: auto;
    transform: none;
    max-height: 0;
  }

  .work-modal-details {
    height: auto;
    padding: 0 22px 32px;
    /* Скруглённые верхние углы у панели с текстом — картинка выше остаётся
       на весь экран, скругляется только эта панель */
    border-radius: 20px 20px 0 0;
  }

  /* Десктопный отступ сверху (44px) рассчитан на вертикальное центрирование
     панели — на мобильном текст должен идти сразу под превью */
  .work-modal-artist {
    margin-top: 4px;
  }

  .viewer-toolbar {
    right: 22px;
    bottom: 22px;
  }

  /* Белый непрозрачный круг поверх угла картинки, а не прозрачная кнопка
     над всем экраном */
  .viewer-close-btn {
    top: 12px;
    right: 16px;
    background: #ffffff;
    color: #1a1814;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  }
}
</style>
