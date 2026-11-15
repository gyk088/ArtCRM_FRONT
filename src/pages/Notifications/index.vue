<template>
  <div class="notifications-page">
    <div class="page-header">
      <div>
        <div class="page-header-top">
          <MobileMenuButton />
          <h2 class="page-title">Уведомления</h2>
        </div>
        <p class="page-subtitle">
          {{ store.unreadCount ? `Непрочитанных: ${store.unreadCount}` : 'Все прочитаны' }}
        </p>
      </div>
      <a-button v-if="store.unreadCount" @click="store.markRead()">
        <template #icon><CheckOutlined /></template>
        Прочитать все
      </a-button>
    </div>

    <a-spin :spinning="store.loading && !store.list.length">
      <div v-if="store.list.length" class="notif-list">
        <div
          v-for="n in store.list"
          :key="n.id"
          class="notif"
          :class="{ unread: !n.is_read, clickable: !!n.link }"
          @click="store.open(n)"
        >
          <div class="notif-icon"><ProjectOutlined v-if="n.type === 'task_assigned'" /><BellOutlined v-else /></div>
          <div class="notif-body">
            <div class="notif-title">{{ n.title }}</div>
            <div v-if="n.body" class="notif-text">{{ n.body }}</div>
            <div class="notif-time">{{ formatDateTime(n.ctime) }}</div>
          </div>
          <div class="notif-actions" @click.stop>
            <button v-if="!n.is_read" type="button" class="icon-btn" title="Отметить прочитанным" @click="store.markRead([n.id])"><CheckOutlined /></button>
            <button type="button" class="icon-btn" title="Удалить" @click="store.remove(n.id)"><DeleteOutlined /></button>
          </div>
        </div>
      </div>
      <div v-else-if="!store.loading" class="empty-state">
        <BellOutlined class="empty-icon" />
        <p class="empty-title">Уведомлений пока нет</p>
        <p class="empty-subtitle">Здесь появятся, например, задачи, которые вам назначили коллеги.</p>
      </div>
    </a-spin>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { BellOutlined, CheckOutlined, DeleteOutlined, ProjectOutlined } from '@ant-design/icons-vue'
import MobileMenuButton from '@/components/MobileMenuButton.vue'
import { useNotifications } from '@/stores/notifications.js'

const store = useNotifications()
onMounted(() => {
  store.getList()
  store.refreshUnread()
})

function formatDateTime(value) {
  return value
    ? new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : ''
}
</script>

<style scoped>
.notifications-page {
  min-height: 100vh;
  background: #f7f5f0;
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.page-header-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-title {
  margin: 0;
  font-size: 22px;
  color: #211f1a;
}

.page-subtitle {
  margin: 4px 0 0;
  color: #5a564c;
}

.notif-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 820px;
}

.notif {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 10px;
}

.notif.clickable {
  cursor: pointer;
}

.notif.clickable:hover {
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.06);
}

.notif.unread {
  border-left: 3px solid #8a6d2f;
  background: #fffdf8;
}

.notif-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #efece4;
  color: #8a6d2f;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notif-body {
  flex: 1;
  min-width: 0;
}

.notif-title {
  color: #211f1a;
}

.notif.unread .notif-title {
  font-weight: 600;
}

.notif-text {
  font-size: 13px;
  color: #5a564c;
  margin-top: 2px;
}

.notif-time {
  font-size: 12px;
  color: #7c7669;
  margin-top: 4px;
}

.notif-actions {
  display: flex;
  gap: 2px;
}

.icon-btn {
  border: none;
  background: none;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  cursor: pointer;
  color: #7c7669;
}

.icon-btn:hover {
  background: #f1ede4;
  color: #211f1a;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.07);
  max-width: 820px;
}

.empty-icon {
  font-size: 40px;
  color: #8a6d2f;
}

.empty-title {
  font-size: 17px;
  font-weight: 600;
  margin: 12px 0 4px;
}

.empty-subtitle {
  color: #5a564c;
  margin: 0;
}

@media (max-width: 600px) {
  .notifications-page {
    padding: 16px;
  }
}
</style>
