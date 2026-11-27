<template>
  <!-- Плашка-счётчик: изменения, сделанные без интернета -->
  <button
    v-if="syncState.items.length"
    type="button"
    class="sync-chip"
    :class="{ 'sync-chip-problem': problems.length, 'sync-chip-raised': !online }"
    @click="open = true"
  >
    <SyncOutlined v-if="syncState.syncing" spin />
    <WarningOutlined v-else-if="problems.length" />
    <CloudUploadOutlined v-else />
    <span v-if="syncState.syncing">Отправляю изменения…</span>
    <span v-else-if="problems.length">Не отправлено: {{ problems.length }}</span>
    <span v-else>Ждут отправки: {{ pending.length }}</span>
  </button>

  <a-drawer
    v-model:open="open"
    title="Изменения без интернета"
    placement="right"
    :width="isMobile ? '100%' : '460px'"
    root-class-name="sync-drawer"
  >
    <p class="sd-hint">
      Изменения, сделанные без сети, хранятся на этом устройстве и отправляются на сервер,
      как только появится интернет. Если запись тем временем поменял кто-то другой, здесь
      можно решить, чья версия останется.
    </p>

    <div class="sd-actions">
      <a-button type="primary" size="small" :loading="syncState.syncing" :disabled="!online || !pending.length" @click="syncNow()">
        Отправить сейчас
      </a-button>
      <span v-if="!online" class="sd-offline">нет интернета — отправятся автоматически</span>
    </div>

    <a-empty v-if="!syncState.items.length" description="Все изменения отправлены" />

    <div v-for="item in syncState.items" :key="item.id" class="sd-item" :class="`sd-${item.status}`">
      <div class="sd-head">
        <span class="sd-label">{{ item.label }}</span>
        <span v-if="item.title" class="sd-title">«{{ item.title }}»</span>
      </div>
      <div class="sd-meta">
        {{ formatWhen(item.createdAt) }} ·
        <span class="sd-status">{{ STATUS[item.status] }}</span>
      </div>
      <div v-if="item.error" class="sd-reason">{{ item.error }}</div>

      <div class="sd-buttons">
        <template v-if="item.status === 'conflict'">
          <a-popconfirm title="Записать вашу версию поверх изменений на сервере?" ok-text="Да" cancel-text="Нет" @confirm="keepMine(item.id)">
            <a-button size="small" type="primary">Оставить моё</a-button>
          </a-popconfirm>
          <a-popconfirm title="Отменить ваше изменение? Останется версия с сервера." ok-text="Да" cancel-text="Нет" @confirm="discardItem(item.id)">
            <a-button size="small">Взять с сервера</a-button>
          </a-popconfirm>
        </template>
        <template v-else-if="item.status === 'error'">
          <a-button size="small" type="primary" :disabled="!online" @click="retryItem(item.id)">Повторить</a-button>
          <a-popconfirm title="Отменить это изменение?" ok-text="Да" cancel-text="Нет" @confirm="discardItem(item.id)">
            <a-button size="small">Отменить</a-button>
          </a-popconfirm>
        </template>
        <a-popconfirm v-else title="Отменить это изменение? На сервер оно не попадёт." ok-text="Да" cancel-text="Нет" @confirm="discardItem(item.id)">
          <a-button size="small" type="text" danger>Отменить</a-button>
        </a-popconfirm>
      </div>
    </div>
  </a-drawer>
</template>

<script setup>
// Очередь изменений, сделанных без интернета: счётчик, отправка,
// конфликты и ошибки синхронизации (см. src/offline/sync.js)
import { computed, h, onBeforeUnmount, onMounted, ref } from 'vue'
import { notification, Button } from 'ant-design-vue'
import { SyncOutlined, WarningOutlined, CloudUploadOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { syncState, syncNow, refreshOutbox, keepMine, retryItem, discardItem, onSynced } from '@/offline/sync.js'
import { network } from '@/offline/network.js'
import { useIsMobile } from '@/composables/useIsMobile.js'

const { isMobile } = useIsMobile()
const open = ref(false)
const online = computed(() => network.online && navigator.onLine)
const pending = computed(() => syncState.items.filter(i => i.status === 'pending'))
const problems = computed(() => syncState.items.filter(i => i.status !== 'pending'))

const STATUS = { pending: 'ждёт отправки', conflict: 'конфликт', error: 'ошибка' }
const formatWhen = (t) => {
  const d = dayjs(t)
  return d.isSame(dayjs(), 'day') ? `сегодня в ${d.format('HH:mm')}` : d.format('DD.MM.YYYY HH:mm')
}

// новое изменение в очереди: обновить счётчик; сеть есть (был обрыв) — сразу отправить
const onQueued = () => refreshOutbox().then(() => { if (navigator.onLine) syncNow() })

let off = null
onMounted(() => {
  window.addEventListener('artcrm-outbox-changed', onQueued)
  off = onSynced(({ sent, failed }) => {
    if (sent) {
      const key = 'sync-done'
      notification.success({
        key,
        message: `Изменения отправлены: ${sent}`,
        description: 'Обновите страницу, чтобы увидеть данные с сервера.',
        duration: 8,
        btn: () => h(Button, { size: 'small', type: 'primary', onClick: () => window.location.reload() }, () => 'Обновить'),
      })
    }
    if (failed) {
      const key = 'sync-failed'
      notification.warning({
        key,
        message: `Не удалось отправить: ${failed}`,
        description: 'Посмотрите причину и решите, что с ними сделать.',
        duration: 0,
        btn: () => h(Button, { size: 'small', onClick: () => { notification.close(key); open.value = true } }, () => 'Посмотреть'),
      })
    }
  })
})
onBeforeUnmount(() => {
  window.removeEventListener('artcrm-outbox-changed', onQueued)
  off?.()
})
</script>

<style scoped>
.sync-chip {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2001;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #6f581f;
  background: #f6f1e4;
  border: 1px solid #8a6d2f;
  border-radius: 999px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  cursor: pointer;
}

.sync-chip-raised {
  /* без сети внизу плашка «Нет интернета» — поднимаемся над ней */
  bottom: 84px;
}

.sync-chip-problem {
  color: #9b2c1f;
  background: #fbecea;
  border-color: #c0392b;
}
</style>

<style>
/* drawer телепортируется в body — стили не scoped */
.sync-drawer .sd-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: #5a564c;
}

.sync-drawer .sd-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.sync-drawer .sd-actions .ant-btn-primary,
.sync-drawer .sd-actions .ant-btn-primary:disabled,
.sync-drawer .sd-actions .ant-btn-primary:disabled:hover {
  color: #fff;
  background: #8a6d2f;
  border-color: #8a6d2f;
}

.sync-drawer .sd-actions .ant-btn-primary:disabled {
  opacity: 0.5;
}

.sync-drawer .sd-offline {
  font-size: 12px;
  color: #7c7669;
}

.sync-drawer .sd-item {
  padding: 10px 12px;
  margin-bottom: 8px;
  border: 1px solid #ece6d8;
  border-left: 3px solid #c9b88a;
  border-radius: 8px;
  background: #fff;
}

.sync-drawer .sd-conflict,
.sync-drawer .sd-error {
  border-left-color: #c0392b;
}

.sync-drawer .sd-head {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 14px;
}

.sync-drawer .sd-label {
  font-weight: 600;
  color: #211f1a;
}

.sync-drawer .sd-title {
  color: #5a564c;
}

.sync-drawer .sd-meta {
  margin-top: 2px;
  font-size: 12px;
  color: #7c7669;
}

.sync-drawer .sd-conflict .sd-status,
.sync-drawer .sd-error .sd-status {
  color: #c0392b;
  font-weight: 600;
}

.sync-drawer .sd-reason {
  margin-top: 6px;
  font-size: 13px;
  color: #9b2c1f;
}

.sync-drawer .sd-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
</style>
