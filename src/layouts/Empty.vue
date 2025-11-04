<!-- src/layouts/EmptyLayout.vue -->
<template>
  <div class="empty-layout">
    <router-view />
  </div>
</template>

<script setup>
// Никаких компонентов, просто контейнер
</script>

<style scoped>
.empty-layout {
  min-height: 100vh;
  min-width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1e1e1e; /* фон Art Studio */
}
</style>
