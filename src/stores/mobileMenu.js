// stores/mobileMenu.js
// Общее состояние мобильного полноэкранного меню: открывается кнопкой,
// которая живёт на каждой странице (см. components/MobileMenuButton.vue),
// а сам оверлей меню рендерится в layouts/Home.vue.
import { defineStore } from 'pinia'

export const useMobileMenu = defineStore('mobile-menu', {
  state: () => ({
    open: false,
  }),
})
