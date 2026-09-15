<!-- src/layouts/HomeLayout.vue -->
<template>
  <div v-if="impersonating" class="impersonation-banner">
    <span class="impersonation-text">Вы вошли как <strong>{{ impersonatedName }}</strong> ({{ impersonatedRoleLabel }})</span>
    <a-button size="small" class="impersonation-btn" :loading="stoppingImpersonation" @click="handleStopImpersonation">
      Вернуться к администратору
    </a-button>
  </div>

  <a-layout style="min-height: 100vh" :class="{ 'with-impersonation-banner': impersonating }">
    <!-- Боковое меню (десктоп) -->
    <a-layout-sider :width="260" collapsible v-model:collapsed="collapsed" class="custom-sider desktop-sider">
      <div class="sidebar-content">
        <div class="sidebar-top">
          <div class="logo" @click="toggleCollapsed">ART CRM</div>
          <a-menu theme="dark" mode="inline" :selectedKeys="[selectedKey]" @click="onMenuClick">
            <a-menu-item key="dashboard">
              <PictureOutlined />
              <span>Мои работы</span>
            </a-menu-item>

            <a-menu-item key="collection">
              <LinkOutlined />
              <span>Мои Ссылки</span>
            </a-menu-item>

            <a-menu-item key="exhibition">
              <BankOutlined />
              <span>Мои Выставки</span>
            </a-menu-item>

            <a-menu-item v-if="!isArtist" key="workspace">
              <AppstoreOutlined />
              <span>Рабочее Пространство</span>
            </a-menu-item>

            <a-menu-item key="bio">
              <UserOutlined />
              <span>Биография</span>
            </a-menu-item>

            <a-menu-item key="cv">
              <FileTextOutlined />
              <span>Резюме</span>
            </a-menu-item>

            <a-menu-item key="files">
              <InboxOutlined />
              <span>Файлы</span>
            </a-menu-item>

            <a-menu-item key="reference">
              <BookOutlined />
              <span>Справочник</span>
            </a-menu-item>

            <a-menu-item key="contacts">
              <ContactsOutlined />
              <span>Контакты</span>
            </a-menu-item>

            <a-menu-item key="profile">
              <IdcardOutlined />
              <span>Профиль</span>
            </a-menu-item>

            <a-menu-item v-if="isSuperAdmin" key="admin-panel">
              <TeamOutlined />
              <span>Админ-панель</span>
            </a-menu-item>
          </a-menu>
        </div>

        <!-- Кнопка выхода внизу -->
        <div class="logout-wrapper">
          <a-button
            type="text"
            class="logout-btn"
            @click="handleLogout"
            :loading="logoutLoading"
          >
            <template #icon>
              <LogoutOutlined />
            </template>
            <span v-if="!collapsed">Выйти</span>
          </a-button>
        </div>
      </div>
    </a-layout-sider>

    <!-- Полноэкранное меню (мобильные). Обычный Teleport, а не a-drawer:
         содержимое остаётся литеральной разметкой нашего компонента и
         честно получает scoped-атрибут, в отличие от внутренней разметки
         antd-компонентов (см. .preview-drawer в UserPictures — там
         :deep() до содержимого телепортированного a-drawer не достаёт). -->
    <Teleport to="body">
      <div v-if="mobileMenuOpen" class="custom-sider mobile-menu-overlay">
        <div class="mobile-menu-header">
          <div class="logo">ART CRM</div>
        </div>
        <div class="mobile-menu-body">
          <a-menu theme="dark" mode="inline" :selectedKeys="[selectedKey]" @click="onMobileMenuClick">
            <a-menu-item key="dashboard">
              <PictureOutlined />
              <span>Мои работы</span>
            </a-menu-item>

            <a-menu-item key="collection">
              <LinkOutlined />
              <span>Мои Ссылки</span>
            </a-menu-item>

            <a-menu-item key="exhibition">
              <BankOutlined />
              <span>Мои Выставки</span>
            </a-menu-item>

            <a-menu-item v-if="!isArtist" key="workspace">
              <AppstoreOutlined />
              <span>Рабочее Пространство</span>
            </a-menu-item>

            <a-menu-item key="bio">
              <UserOutlined />
              <span>Биография</span>
            </a-menu-item>

            <a-menu-item key="cv">
              <FileTextOutlined />
              <span>Резюме</span>
            </a-menu-item>

            <a-menu-item key="files">
              <InboxOutlined />
              <span>Файлы</span>
            </a-menu-item>

            <a-menu-item key="reference">
              <BookOutlined />
              <span>Справочник</span>
            </a-menu-item>

            <a-menu-item key="contacts">
              <ContactsOutlined />
              <span>Контакты</span>
            </a-menu-item>

            <a-menu-item key="profile">
              <IdcardOutlined />
              <span>Профиль</span>
            </a-menu-item>

            <a-menu-item v-if="isSuperAdmin" key="admin-panel">
              <TeamOutlined />
              <span>Админ-панель</span>
            </a-menu-item>
          </a-menu>
        </div>

        <!-- Сканирование QR-кода — над девайдером и кнопкой выхода -->
        <div class="qr-scan-wrapper">
          <a-button class="qr-scan-btn" @click="handleScanQr">
            <template #icon>
              <QrcodeOutlined />
            </template>
            <span>Сканировать QR код</span>
          </a-button>
        </div>

        <!-- Кнопка выхода внизу -->
        <div class="logout-wrapper">
          <a-button
            type="text"
            class="logout-btn"
            @click="handleLogout"
            :loading="logoutLoading"
          >
            <template #icon>
              <LogoutOutlined />
            </template>
            <span>Выйти</span>
          </a-button>
        </div>
      </div>
    </Teleport>

    <!-- Контент -->
    <a-layout class="content-layout">
      <a-layout-content class="content-area">
        <router-view v-slot="{ Component }">
          <transition
            name="mobile-nav"
            :leave-active-class="skipLeaveAnimation ? 'mobile-nav-leave-skip' : 'mobile-nav-leave-active'"
            @after-enter="onMobileNavEnter"
          >
            <component :is="Component" class="mobile-nav-page" :class="{ 'mobile-nav-menu-reveal': isMenuRevealed }" />
          </transition>
        </router-view>
      </a-layout-content>
    </a-layout>

    <a-drawer
      v-model:open="isFilesModalOpen"
      title="Файлы"
      placement="right"
      :width="filesDrawerWidth"
    >
      <FileUploader :remove="true" />
    </a-drawer>

    <QrScannerModal v-model:open="isQrScannerOpen" save-as-contact />
  </a-layout>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { Modal, message } from "ant-design-vue";
import FileUploader from "@/components/FileUploader.vue"
import QrScannerModal from "@/components/QrScannerModal.vue"
import apiClient from "@/services/api.js";
import { logout, getUser, isImpersonating } from "@/services/auth.js";
import { useAdmin } from "@/stores/admin.js";
import { useMobileMenu } from "@/stores/mobileMenu.js";
import { ROLES, TEXT_ROLES } from "@/services/const";
import { useIsMobile } from "@/composables/useIsMobile.js";
import {
  PictureOutlined,
  UserOutlined,
  FileTextOutlined,
  LinkOutlined,
  AppstoreOutlined,
  InboxOutlined,
  LogoutOutlined,
  IdcardOutlined,
  TeamOutlined,
  BookOutlined,
  BankOutlined,
  QrcodeOutlined,
  ContactsOutlined
} from '@ant-design/icons-vue'

const collapsed = ref(false);
// Открывается кнопкой MobileMenuButton, которая лежит на каждой странице
// рядом с заголовком — состояние общее через Pinia, чтобы страница и layout
// (где рендерится сам оверлей меню) видели один и тот же флаг.
const { open: mobileMenuOpen } = storeToRefs(useMobileMenu());
const { isMobile } = useIsMobile();
const filesDrawerWidth = computed(() => (isMobile.value ? '100%' : '600px'));
const router = useRouter();
const logoutLoading = ref(false);
const isArtist = computed(() => getUser()?.role === ROLES.ARTIST);
const isSuperAdmin = computed(() => getUser()?.role === ROLES.SUPER_ADMIN);

// === Баннер имперсонации (вход под пользователем из админ-панели) ===
const adminStore = useAdmin();
const impersonating = ref(isImpersonating());
const impersonatedName = computed(() => {
  const user = getUser();
  return [user?.name, user?.surname].filter(Boolean).join(' ') || user?.email || '';
});
const impersonatedRoleLabel = computed(() => {
  const role = getUser()?.role;
  return TEXT_ROLES[role] || role;
});

const stoppingImpersonation = ref(false);
async function handleStopImpersonation() {
  stoppingImpersonation.value = true;
  await adminStore.stopImpersonation();
  window.location.href = '/home/admin';
}

const selectedKey = ref(router.currentRoute.value.name);
router.afterEach((to) => (selectedKey.value = to.name));

const isFilesModalOpen = ref(false)
const isQrScannerOpen = ref(false)

// Отдельный флаг "текущий экран уехал вправо, открывая меню" — НЕ то же
// самое, что mobileMenuOpen (тот держится true всю дорогу навигации, чтобы
// меню не пропадало раньше времени под уже открывшейся новой страницей).
// Если вешать сдвиг прямо на mobileMenuOpen, то уже ВЪЕХАВШАЯ новая
// страница тоже подхватывает класс "уехать" (mobileMenuOpen ещё true) и,
// как только доиграет анимация входа, тут же дёргается обратно вправо —
// это и был баг "открывается будто дважды". isMenuRevealed включается
// только на переходе false→true (свежее открытие гамбургером) и сразу
// гасится в начале любого клика по пункту меню — до того, как стартует
// переход на новую страницу.
const isMenuRevealed = ref(false)
watch(mobileMenuOpen, (isOpen, wasOpen) => {
  if (isOpen && !wasOpen) {
    isMenuRevealed.value = true
  } else if (!isOpen) {
    isMenuRevealed.value = false
  }
})

// Если экран открывает меню кликом по пункту в тот момент, когда он уже
// "уехал" (isMenuRevealed) — он и так невидим (translateX 100%). У обычной
// leave-анимации (.mobile-nav-leave-active) keyframes жёстко стартуют с
// translateX(0) независимо от текущего положения элемента, так что она бы
// на долю секунды вернула уже скрытый экран на место и тут же увела снова —
// это и был баг "предыдущий экран промаргивает". Для этого конкретного
// случая подменяем leave-класс на no-op — скрытому экрану анимация не
// нужна, он просто убирается.
const skipLeaveAnimation = ref(false)

const toggleCollapsed = () => {
  collapsed.value = !collapsed.value
}

function onMenuClick({ key }) {
  if (key === "files") {
    isFilesModalOpen.value = true
    return
  }
  router.push({ name: key });
}

function onMobileMenuClick({ key }) {
  skipLeaveAnimation.value = isMenuRevealed.value
  isMenuRevealed.value = false

  // "Файлы" открывает drawer, а не новый экран — переход не произойдёт,
  // после-enter хук транзишена не сработает, поэтому закрываем меню сразу.
  // Так же и с повторным кликом на уже открытую страницу — навигации не
  // будет, ждать закрытия после неё бессмысленно.
  if (key === "files" || key === selectedKey.value) {
    mobileMenuOpen.value = false
  }
  onMenuClick({ key })
}

// Мобильное меню закрывается только после того, как новый экран
// полностью наедет на него — тогда он открывается "поверх" меню, а не
// меню резко пропадает, обнажая страницу под собой.
function onMobileNavEnter() {
  mobileMenuOpen.value = false
  skipLeaveAnimation.value = false
}

function handleScanQr() {
  mobileMenuOpen.value = false
  isQrScannerOpen.value = true
}

// Прогреваем чанки всех экранов меню заранее (в фоне, лениво). Экраны
// лежат за динамическими import() — первый переход на ещё не открывавшийся
// в этой сессии экран ждёт загрузку чанка по сети, и на мобильных из-за
// этой паузы анимация выезда выглядит как "завис, потом появился" вместо
// плавного слайда. Последующие переходы на тот же экран уже из кэша и
// анимируются нормально — этим и объясняется "иногда".
onMounted(() => {
  const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 300))
  idle(() => {
    router.getRoutes().forEach((route) => {
      const loader = route.components?.default
      if (typeof loader === 'function') {
        loader().catch(() => {})
      }
    })
  })
})

// Функция выхода
const handleLogout = () => {
  Modal.confirm({
    title: 'Выход из системы',
    content: 'Вы уверены, что хотите выйти?',
    okText: 'Да, выйти',
    cancelText: 'Отмена',
    onOk: async () => {
      logoutLoading.value = true;
      try {
        await apiClient.post('/api/v1/auth/logout');
      } catch (error) {
        console.error('Logout API error:', error);
      } finally {
        logout();
        message.success('Вы успешно вышли из системы');
        window.location.href = '/auth';
        logoutLoading.value = false;
      }
    }
  });
}
</script>

<style scoped>

.impersonation-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1100;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 0 16px;
  background: #6f581f;
  color: #fff;
  font-size: 13px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
  /* На узких экранах текст+кнопка в одну строку без переноса вылезали за
     пределы viewport — а т.к. баннер fixed и висит на всех страницах, это
     тянуло за собой горизонтальный скролл всего документа. Текст обрезаем
     многоточием, кнопку никогда не сжимаем. */
  overflow: hidden;
}

.impersonation-text {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: right;
}

.impersonation-btn {
  flex: 0 0 auto;
}

.with-impersonation-banner {
  padding-top: 44px;
}

.custom-sider {
  --bg: #0f0f11;
  --bg-elevated: #17161a;
  --text-title: #fbfaf7;
  --text-body: #e7e4dd;
  --text-faint: #8f8c84;
  --accent: #c8b789;
  --accent-strong: #d8c896;
  --border: rgba(255, 255, 255, 0.08);

  position: sticky;
  top: 0;
  align-self: flex-start;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.custom-sider :deep(.ant-layout-sider-children) {
  background: var(--bg);
}

.custom-sider :deep(.ant-menu-dark) {
  background: transparent;
  color: var(--text-body);
}

.custom-sider :deep(.ant-menu-dark .ant-menu-item) {
  color: var(--text-body);
  margin: 4px 12px;
  width: calc(100% - 24px);
  border-radius: 8px;
}

.custom-sider :deep(.ant-menu-dark .ant-menu-item .anticon) {
  color: var(--text-faint);
  transition: color 0.2s ease;
}

.custom-sider :deep(.ant-menu-dark .ant-menu-item-selected) {
  background: rgba(200, 183, 137, 0.14) !important;
  color: var(--accent-strong) !important;
}

.custom-sider :deep(.ant-menu-dark .ant-menu-item-selected .anticon) {
  color: var(--accent-strong);
}

.custom-sider :deep(.ant-menu-dark .ant-menu-item:hover) {
  background: rgba(255, 255, 255, 0.05) !important;
  color: var(--accent) !important;
}

.custom-sider :deep(.ant-menu-dark .ant-menu-item:hover .anticon) {
  color: var(--accent);
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sidebar-top {
  flex: 1;
  overflow-y: auto;
}

.logo {
  cursor: pointer;
  height: 64px;
  margin: 16px;
  color: var(--text-title);
  font-family: 'Cormorant Garamond', serif;
  font-weight: 600;
  font-size: 24px;
  letter-spacing: 0.06em;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.logo:hover {
  border-color: var(--accent);
  color: var(--accent-strong);
}

/* Сканировать QR код — только мобильное меню, над девайдером */
.qr-scan-wrapper {
  padding: 0 16px 12px;
}

.qr-scan-btn {
  width: 100%;
  color: #17161a !important;
  background: var(--accent);
  border: 1px solid var(--accent);
  border-radius: 8px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  transition: all 0.3s ease;
}

.qr-scan-btn:hover {
  background: var(--accent-strong) !important;
  border-color: var(--accent-strong) !important;
  color: #17161a !important;
}

.qr-scan-btn .anticon {
  font-size: 16px;
}

/* Кнопка выхода - всегда внизу */
.logout-wrapper {
  padding: 20px 16px;
  border-top: 1px solid var(--border);
  margin-top: auto;
}

.logout-btn {
  width: 100%;
  color: #f09090 !important;
  background: rgba(240, 144, 144, 0.08);
  border: 1px solid rgba(240, 144, 144, 0.4);
  border-radius: 8px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;
  font-size: 14px;
}

.logout-btn:hover {
  background: #f09090 !important;
  color: #17161a !important;
  border-color: #f09090;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(240, 144, 144, 0.25);
}

.logout-btn .anticon {
  font-size: 16px;
}

/* Стили для свернутого меню */
.custom-sider.ant-layout-sider-collapsed .logout-wrapper {
  padding: 20px 8px;
}

.custom-sider.ant-layout-sider-collapsed .logout-btn {
  padding: 0;
  justify-content: center;
}

/* Стили для скролла меню */
.sidebar-top::-webkit-scrollbar {
  width: 4px;
}

.sidebar-top::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
}

.sidebar-top::-webkit-scrollbar-thumb {
  background: rgba(200, 183, 137, 0.35);
  border-radius: 4px;
}

.sidebar-top::-webkit-scrollbar-thumb:hover {
  background: rgba(200, 183, 137, 0.55);
}

.content-layout {
  min-width: 0;
}

.content-area {
  margin: 16px;
  position: relative;
  overflow-x: hidden;
}

/* === Полноэкранное мобильное меню === */
.mobile-menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  overflow-y: auto;
}

.mobile-menu-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
}

.mobile-menu-header .logo {
  flex: 1;
  margin: 0;
  cursor: default;
}

.mobile-menu-body {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 12px;
}

@media (max-width: 768px) {
  .desktop-sider {
    display: none !important;
  }

  .content-area {
    margin: 12px;
    /* Стабильная высота контейнера на время перехода: уезжающая страница
       временно выпадает из потока (position:absolute), и без этого высота
       .content-area на миг прыгает то к высоте старой страницы, то к
       высоте новой — экран будто "сначала растягивается на всю высоту". */
    min-height: calc(100vh - 24px);
  }
}
</style>

<!--
  Классы transition (.mobile-nav-*) вешаются Vue не на разметку этого
  компонента, а на корневой элемент ЧУЖОГО компонента — той страницы,
  которую в данный момент открывает router-view. Это другой SFC со своим
  scope id, поэтому scoped-стили (даже :deep()) сюда не попадут — та же
  причина, по которой стили для .preview-drawer / .mobile-menu-drawer
  вынесены в отдельный нескоуп-блок. Здесь то же самое.

  .mobile-nav-menu-reveal вешается не через Vue transition, а обычным
  :class на текущую (не меняющуюся) страницу, когда открыто мобильное
  меню без перехода на новый экран: страница уезжает вправо и открывает
  меню, которое всегда лежит статично под ней (без собственной анимации
  входа). Использует обычный CSS transition (а не keyframes-animation),
  чтобы снятие класса (например, пункт "Файлы" закрывает меню без
  перехода на новый экран) плавно уезжало обратно, а не дёргалось
  мгновенно — transition сам анимирует оба направления.
  Правило объявлено ДО .mobile-nav-enter-active/-leave-active: если оба
  класса окажутся на одном элементе (клик по пункту меню в момент, когда
  экран ещё "уехал" от открытого меню), победить должны именно
  enter/leave — их keyframes-анимация по спецификации перекрывает любой
  transition того же свойства, так что конфликта не будет.
-->
<style>
@media (max-width: 768px) {
  .mobile-nav-page {
    /* У самой страницы (не только у .content-area) должна быть минимальная
       высота на весь экран — иначе её непрозрачный фон заканчивается там,
       где кончается её собственный контент, а ниже, до конца .content-area,
       просвечивает меню, лежащее под ней (видно как раз над кнопками
       "Сканировать"/"Выйти" внизу меню). */
    min-height: calc(100vh - 24px);
    transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .mobile-nav-menu-reveal {
    position: relative;
    z-index: 1210;
    transform: translateX(100%);
  }

  .mobile-nav-enter-active {
    position: relative;
    /* Выше .mobile-menu-overlay (1200) и выше уезжающей страницы (1250) —
       новая страница должна наезжать поверх них, а не прятаться под ними. */
    z-index: 1300;
    animation: mobile-nav-slide-in 0.45s cubic-bezier(0.22, 1, 0.36, 1);
    /* Без этого на iOS/мобильном Safari анимация transform иногда идёт
       без аппаратного ускорения — браузер перерисовывает элемент кадр за
       кадром вместо композитинга слоем, из-за чего уезжающая страница
       позади видимо "промаргивает". will-change + backface-visibility
       заставляют браузер держать элемент на отдельном GPU-слое. */
    will-change: transform;
    backface-visibility: hidden;
  }

  .mobile-nav-leave-active {
    /* absolute — чтобы на время анимации уезжающая страница не участвовала
       в потоке рядом с уже вставленной новой (иначе они встанут в столбик).
       Важно: НЕ inset:0 — это растянуло/обрезало бы страницу по высоте
       входящей (у неё другая высота), из-за чего контент "рвался" по
       диагонали. Высота остаётся собственной, естественной. */
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    z-index: 1250;
    animation: mobile-nav-slide-out 0.45s cubic-bezier(0.22, 1, 0.36, 1);
    will-change: transform;
    backface-visibility: hidden;
  }

  /* Для экрана, который уходит уже будучи скрытым (см. skipLeaveAnimation
     в Home.vue) — без анимации, без transition/animation тут Vue уберёт
     элемент сразу же, без прыжка обратно в видимую область. */
  .mobile-nav-leave-skip {
    display: none;
  }
}

@keyframes mobile-nav-slide-in {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

@keyframes mobile-nav-slide-out {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(100%);
  }
}
</style>
