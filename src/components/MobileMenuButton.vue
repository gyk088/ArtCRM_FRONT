<template>
  <button class="mobile-menu-btn" type="button" @click="menu.open = true" aria-label="Открыть меню">
    <MenuOutlined />
  </button>
</template>

<script setup>
import { MenuOutlined } from '@ant-design/icons-vue'
import { useMobileMenu } from '@/stores/mobileMenu.js'

const menu = useMobileMenu()
</script>

<style scoped>
.mobile-menu-btn {
  display: none;
}

@media (max-width: 768px) {
  .mobile-menu-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    margin-right: 10px;
    background: transparent;
    border: 1px solid var(--border, rgba(0, 0, 0, 0.15));
    border-radius: 8px;
    color: inherit;
    font-size: 15px;
    line-height: 1;
    cursor: pointer;
  }

  .mobile-menu-btn:hover {
    border-color: var(--accent, #8a6d2f);
    color: var(--accent, #8a6d2f);
  }
}
</style>
