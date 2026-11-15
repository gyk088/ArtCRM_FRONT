<template>
  <button class="mobile-menu-btn" type="button" @click="menu.open = true" aria-label="Открыть меню">
    <MenuOutlined />
    <!-- есть непрочитанные уведомления -->
    <span v-if="notifications.unreadCount" class="mobile-menu-dot" />
  </button>
</template>

<script setup>
import { MenuOutlined } from '@ant-design/icons-vue'
import { useMobileMenu } from '@/stores/mobileMenu.js'
import { useNotifications } from '@/stores/notifications.js'

const menu = useMobileMenu()
const notifications = useNotifications()
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

.mobile-menu-btn {
  position: relative;
}

.mobile-menu-dot {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #d92d20;
  border: 2px solid #fff;
}
</style>
