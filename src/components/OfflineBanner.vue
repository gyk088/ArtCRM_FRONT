<template>
  <transition name="ob-fade">
    <div v-if="!network.online" class="offline-banner" role="status">
      <WifiOutlined class="ob-icon" />
      <span>
        <b>Нет интернета.</b>
        <template v-if="network.fromCache">
          Показаны сохранённые данные<template v-if="cachedText"> (обновлены {{ cachedText }})</template>.
        </template>
        <template v-else>Открываются только сохранённые на этом устройстве данные.</template>
        Изменения работ, контактов, заметок, продаж и ссылок сохранятся на этом устройстве
        и отправятся, когда появится интернет.
      </span>
    </div>
  </transition>
</template>

<script setup>
// Плашка «нет интернета»: что показано и почему нельзя сохранить
import { computed } from 'vue'
import { WifiOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { network } from '@/offline/network.js'

const cachedText = computed(() => {
  if (!network.cachedAt) return ''
  const d = dayjs(network.cachedAt)
  return d.isSame(dayjs(), 'day') ? `сегодня в ${d.format('HH:mm')}` : d.format('DD.MM.YYYY HH:mm')
})
</script>

<style scoped>
.offline-banner {
  position: fixed;
  left: 50%;
  bottom: 16px;
  z-index: 2000;
  transform: translateX(-50%);
  display: flex;
  align-items: flex-start;
  gap: 8px;
  max-width: calc(100vw - 32px);
  width: max-content;
  padding: 10px 14px;
  font-size: 13px;
  line-height: 1.45;
  color: #f4efe2;
  background: #2b2924;
  border: 1px solid #8a6d2f;
  border-radius: 10px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25);
}

.ob-icon {
  margin-top: 3px;
  color: #e2c67f;
}

.ob-fade-enter-active,
.ob-fade-leave-active {
  transition: opacity 0.2s ease;
}

.ob-fade-enter-from,
.ob-fade-leave-to {
  opacity: 0;
}
</style>
