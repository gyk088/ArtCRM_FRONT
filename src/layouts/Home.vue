<!-- src/layouts/HomeLayout.vue -->
<template>
  <a-layout style="min-height: 100vh">
    <!-- Боковое меню -->
    <a-layout-sider :width="260" collapsible v-model:collapsed="collapsed">
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
// 👉 импорт компонента загрузки
import FileUploader from "@/components/FileUploader.vue"
import {
  PictureOutlined,
  UserOutlined,
  FileTextOutlined,
  LinkOutlined,
  AppstoreOutlined,
  InboxOutlined
} from '@ant-design/icons-vue'

const test = (file) => {
  console.log("Выбран файл", file)
  isFilesModalOpen.value = false
}

const collapsed = ref(false);
const router = useRouter();

const selectedKey = ref(router.currentRoute.value.name);
router.afterEach((to) => (selectedKey.value = to.name));
// 🔥 состояние модалки
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
</script>

<style scoped>
.header {
  background: #fff;
  padding: 0 16px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
}

.logo {
  cursor: pointer; 
  height: 64px;
  margin: 16px;
  color: white;
  font-size: 20px;
  text-align: center;
}
</style>
