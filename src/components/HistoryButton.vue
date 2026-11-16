<template>
  <a-tooltip :title="iconOnly ? 'История изменений' : ''">
    <a-button :size="size" class="history-btn" @click="open = true">
      <template #icon><HistoryOutlined /></template>
      <template v-if="!iconOnly">История</template>
    </a-button>
  </a-tooltip>

  <a-drawer
    v-model:open="open"
    :title="title"
    placement="right"
    :width="isMobile ? '100%' : '440px'"
    root-class-name="history-drawer"
    destroy-on-close
  >
    <a-spin :spinning="loading">
      <div v-if="!loading && !items.length" class="hd-empty">
        Изменений пока нет.
        <div class="hd-empty-hint">История ведётся с момента обновления системы — более ранние правки в неё не попали.</div>
      </div>
      <ol v-else class="hd-list">
        <li v-for="item in items" :key="item.id" class="hd-item">
          <span class="hd-dot" :style="{ background: ACTION_COLORS[item.action] || '#c9b88a' }" />
          <div class="hd-body">
            <div class="hd-line">
              <b>{{ actorName(item.actor) }}</b> {{ actionText(item.action) }}
            </div>
            <div class="hd-when">{{ formatWhen(item.ctime) }}</div>
          </div>
        </li>
      </ol>
    </a-spin>
  </a-drawer>
</template>

<script setup>
// Кнопка «История» в карточке: кто и когда создавал / менял / удалял запись
import { ref, watch } from 'vue'
import { HistoryOutlined } from '@ant-design/icons-vue'
import { useHistory } from '@/stores/history.js'
import { useIsMobile } from '@/composables/useIsMobile.js'
import { actionText, actorName, formatWhen, ACTION_COLORS } from '@/utils/history.js'

const props = defineProps({
  // art | collection | exhibition | report | contact | artist | portfolio | note | task | board
  type: { type: String, required: true },
  id: { type: String, default: null },
  title: { type: String, default: 'История изменений' },
  size: { type: String, default: 'middle' },
  iconOnly: { type: Boolean, default: false },
})

const store = useHistory()
const { isMobile } = useIsMobile()
const open = ref(false)
const loading = ref(false)
const items = ref([])

watch(open, async (isOpen) => {
  if (!isOpen || !props.id) return
  loading.value = true
  try {
    items.value = (await store.getEntityHistory(props.type, props.id)) || []
  } finally {
    loading.value = false
  }
})
</script>

<style>
/* drawer телепортируется в body — стили не scoped */
.history-drawer .hd-empty {
  padding: 32px 4px;
  text-align: center;
  color: #7c7669;
}

.history-drawer .hd-empty-hint {
  margin-top: 8px;
  font-size: 12px;
}

.history-drawer .hd-list {
  list-style: none;
  margin: 0;
  padding: 0 0 0 6px;
  border-left: 2px solid #ece6d8;
}

.history-drawer .hd-item {
  position: relative;
  display: flex;
  gap: 10px;
  padding: 0 0 18px 14px;
}

.history-drawer .hd-dot {
  position: absolute;
  left: -7px;
  top: 5px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px #e2dac6;
}

.history-drawer .hd-line {
  font-size: 14px;
  color: #2c2a25;
  line-height: 1.4;
}

.history-drawer .hd-line b {
  font-weight: 600;
  color: #211f1a;
}

.history-drawer .hd-when {
  margin-top: 2px;
  font-size: 12px;
  color: #7c7669;
}
</style>
