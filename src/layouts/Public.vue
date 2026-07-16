<!-- src/layouts/Public.vue -->
<template>
  <div class="public-layout">
    <router-view />
  </div>
</template>

<script setup>
// Простой контейнер без сайдбара и без центрирования — для публичных страниц
</script>

<style scoped>
.public-layout {
  min-height: 100vh;
  width: 100%;
}
</style>
