<!-- src/layouts/HomeLayout.vue -->
<template>
  <a-layout style="min-height: 100vh">
    <!-- Боковое меню -->
    <a-layout-sider :width="260" collapsible v-model:collapsed="collapsed" class="custom-sider">
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

    <!-- Контент -->
    <a-layout>
      <a-layout-content style="margin: 16px">
        <router-view />
      </a-layout-content>
    </a-layout>

    <a-drawer
      v-model:open="isFilesModalOpen"
      title="Файлы"
      placement="right"
      width="600px"
    >
      <FileUploader :remove="true" />
    </a-drawer>
  </a-layout>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { Modal, message } from "ant-design-vue";
import FileUploader from "@/components/FileUploader.vue"
import apiClient from "@/services/api.js";
import { logout, getUser } from "@/services/auth.js";
import { ROLES } from "@/services/const";
import {
  PictureOutlined,
  UserOutlined,
  FileTextOutlined,
  LinkOutlined,
  AppstoreOutlined,
  InboxOutlined,
  LogoutOutlined,
  IdcardOutlined,
  TeamOutlined
} from '@ant-design/icons-vue'

const collapsed = ref(false);
const router = useRouter();
const logoutLoading = ref(false);
const isArtist = computed(() => getUser()?.role === ROLES.ARTIST);
const isSuperAdmin = computed(() => getUser()?.role === ROLES.SUPER_ADMIN);

const selectedKey = ref(router.currentRoute.value.name);
router.afterEach((to) => (selectedKey.value = to.name));

const isFilesModalOpen = ref(false)

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
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

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
</style>
