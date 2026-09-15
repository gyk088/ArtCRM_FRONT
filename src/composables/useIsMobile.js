// composables/useIsMobile.js
// Единая точка определения мобильного брейкпоинта для JS-логики
// (переключение таблица/карточки, полноэкранное меню и т.д.).
// Для чисто визуальных правок используйте @media (max-width: 768px) в CSS.
import { ref, onMounted, onUnmounted } from 'vue'

export const MOBILE_BREAKPOINT = 768

export function useIsMobile(breakpoint = MOBILE_BREAKPOINT) {
  const isMobile = ref(typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false)

  const update = () => {
    isMobile.value = window.innerWidth <= breakpoint
  }

  onMounted(() => window.addEventListener('resize', update))
  onUnmounted(() => window.removeEventListener('resize', update))

  return { isMobile }
}
