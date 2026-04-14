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

            <a-menu-item key="workspace">
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

    <a-modal
      v-model:open="isFilesModalOpen"
      title="Файлы"
      :footer="null"
      width="600px"
    >
      <FileUploader :remove="true" :select="true" @select="test"/>
    </a-modal>
  </a-layout>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { Modal, message } from "ant-design-vue";
import FileUploader from "@/components/FileUploader.vue"
import apiClient from "@/services/api.js";
import { logout } from "@/services/auth.js"; 
import {
  PictureOutlined,
  UserOutlined,
  FileTextOutlined,
  LinkOutlined,
  AppstoreOutlined,
  InboxOutlined,
  LogoutOutlined
} from '@ant-design/icons-vue'

const test = (file) => {
  console.log("Выбран файл", file)
  isFilesModalOpen.value = false
}

const collapsed = ref(false);
const router = useRouter();
const logoutLoading = ref(false);

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
.custom-sider {
  height: 100vh;
  display: flex;
  flex-direction: column;
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
  color: white;
  font-size: 20px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.logo:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Кнопка выхода - всегда внизу */
.logout-wrapper {
  padding: 20px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: auto;
}

.logout-btn {
  width: 100%;
  color: #ff4d4f !important;
  background: rgba(255, 77, 79, 0.1);
  border: 1px solid #ff4d4f;
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
  background: #ff4d4f !important;
  color: white !important;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(255, 77, 79, 0.3);
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
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.sidebar-top::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

.sidebar-top::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>
