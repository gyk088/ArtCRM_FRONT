<!-- src/layouts/HomeLayout.vue -->
<template>
  <a-layout style="min-height: 100vh">
    <!-- Боковое меню -->
    <a-layout-sider collapsible v-model:collapsed="collapsed">
      <div class="logo">My App</div>
      <a-menu
        theme="dark"
        mode="inline"
        :selectedKeys="[selectedKey]"
        @click="onMenuClick"
      >
        <a-menu-item key="dashboard" icon="dashboard">Панель</a-menu-item>
        <a-menu-item key="settings" icon="setting">Настройки</a-menu-item>
      </a-menu>
    </a-layout-sider>

    <!-- Контент -->
    <a-layout>
      <a-layout-header style="background: #fff; padding: 0 16px">
        <h3>Главная страница</h3>
      </a-layout-header>

      <a-layout-content style="margin: 16px">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const collapsed = ref(false);
const router = useRouter();

const selectedKey = ref(router.currentRoute.value.name);
router.afterEach((to) => (selectedKey.value = to.name));

function onMenuClick({ key }) {
  router.push({ name: key });
}
</script>

<style scoped>
.logo {
  height: 64px;
  margin: 16px;
  color: white;
  font-size: 20px;
  text-align: center;
}
</style>
