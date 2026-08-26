<template>
  <div class="ws-panel">
    <div class="ws-panel-header">
      <span class="ws-panel-title">{{ title }}</span>
      <a-tooltip title="Добавить блок">
        <button class="ws-add-btn" @click="$emit('add')">
          <PlusOutlined />
        </button>
      </a-tooltip>
    </div>

    <div class="ws-panel-content">
      <a-empty v-if="!items.length" description="Пока нет блоков" class="ws-empty">
        <a-button type="primary" size="small" @click="$emit('add')">Добавить блок</a-button>
      </a-empty>

      <div v-for="item in items" :key="item.id" class="ws-block">
        <div class="ws-block-header">
          <span class="ws-block-type">
            <FileTextOutlined v-if="item.type === 'text'" />
            <TableOutlined v-else-if="item.type === 'table'" />
            <LinkOutlined v-else-if="item.type === 'links'" />
            {{ typeLabel(item.type) }}
          </span>
          <button class="ws-remove-btn" title="Удалить блок" @click="$emit('remove', item.id)">
            <DeleteOutlined />
          </button>
        </div>

        <!-- Текстовый блок — редактор как в резюме (CV) -->
        <WorkspaceTextBlock
          v-if="item.type === 'text'"
          v-model="item.value"
          :placeholder="item.placeholder || 'Введите текст...'"
        />

        <!-- Табличка -->
        <div v-else-if="item.type === 'table'" class="ws-table">
          <a-table :columns="tableColumns" :data-source="item.data" :pagination="false" size="small" />
          <a-button type="dashed" block class="ws-add-row-btn" @click="$emit('add-table-row', item)">
            <PlusOutlined /> Добавить строку
          </a-button>
        </div>

        <!-- Мои ссылки -->
        <div v-else-if="item.type === 'links'" class="ws-links">
          <div class="ws-links-toolbar">
            <a-button type="primary" size="small" @click="$emit('create-link')">
              <PlusOutlined /> Создать ссылку
            </a-button>
          </div>

          <div v-if="item.collections && item.collections.length" class="ws-collection-grid">
            <a-card
              v-for="collection in item.collections"
              :key="collection.id"
              class="ws-collection-card"
              :title="collection.name"
              hoverable
              @click="$emit('open-collection', collection)"
            >
              <p class="ws-collection-text">{{ collection.description }}</p>
              <div class="ws-collection-actions">
                <a-button size="small" class="ws-copy-btn" @click.stop="$emit('copy-link', collection)">
                  <template #icon><CopyOutlined /></template>
                  Копировать
                </a-button>
                <a-popconfirm
                  title="Удалить ссылку?"
                  ok-text="Да"
                  cancel-text="Нет"
                  @confirm.stop="$emit('delete-link', item, collection.id)"
                >
                  <button class="ws-delete-collection-btn" title="Удалить" @click.stop>
                    <DeleteOutlined />
                  </button>
                </a-popconfirm>
              </div>
            </a-card>
          </div>

          <a-empty v-else description="Нет созданных ссылок" class="ws-empty-inline">
            <a-button type="primary" size="small" @click="$emit('create-link')">Создать ссылку</a-button>
          </a-empty>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  PlusOutlined,
  DeleteOutlined,
  FileTextOutlined,
  TableOutlined,
  LinkOutlined,
  CopyOutlined
} from '@ant-design/icons-vue'
import WorkspaceTextBlock from './WorkspaceTextBlock.vue'

defineProps({
  title: { type: String, required: true },
  items: { type: Array, default: () => [] },
  tableColumns: { type: Array, default: () => [] }
})

defineEmits(['add', 'remove', 'add-table-row', 'create-link', 'open-collection', 'copy-link', 'delete-link'])

const typeLabel = (type) => {
  if (type === 'text') return 'Текст'
  if (type === 'table') return 'Таблица'
  if (type === 'links') return 'Мои ссылки'
  return ''
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

.ws-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.ws-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-soft);
}

.ws-panel-title {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 600;
  font-size: 16px;
  color: var(--text-title);
}

.ws-add-btn {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--accent);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s ease;
}

.ws-add-btn:hover {
  background: var(--accent-tint);
  color: var(--accent-strong);
}

.ws-panel-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ws-empty {
  margin: 32px 0;
}

.ws-empty :deep(.ant-empty-description) {
  color: var(--text-faint);
}

.ws-block {
  background: var(--bg);
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  padding: 12px;
}

.ws-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.ws-block-type {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.ws-remove-btn {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--text-dim);
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s ease;
}

.ws-block:hover .ws-remove-btn {
  opacity: 1;
}

.ws-remove-btn:hover {
  background: var(--danger-tint);
  color: var(--danger);
}

/* Табличка */
.ws-table :deep(.ant-table) {
  font-size: 12px;
}

.ws-add-row-btn {
  margin-top: 8px;
  border-color: var(--accent);
  color: var(--accent);
}

.ws-add-row-btn:hover {
  border-color: var(--accent-strong) !important;
  color: var(--accent-strong) !important;
}

/* Ссылки */
.ws-links-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.ws-collection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.ws-collection-card {
  cursor: pointer;
  transition: all 0.2s ease;
  border-color: var(--border) !important;
}

.ws-collection-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  border-color: var(--accent) !important;
}

.ws-collection-card :deep(.ant-card-head) {
  border-bottom: 1px solid var(--border-soft);
  min-height: auto;
  padding: 8px 12px;
}

.ws-collection-card :deep(.ant-card-head-title) {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 600;
  font-size: 15px;
  color: var(--text-title);
  white-space: normal;
}

.ws-collection-card :deep(.ant-card-body) {
  padding: 10px 12px;
}

.ws-collection-text {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
  margin: 0 0 10px;
  line-height: 1.5;
  font-size: 12px;
  min-height: 52px;
  color: var(--text-faint);
}

.ws-collection-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  border-top: 1px solid var(--border-soft);
  padding-top: 8px;
}

.ws-copy-btn {
  border-color: var(--border) !important;
  color: var(--accent) !important;
  font-size: 11px !important;
}

.ws-copy-btn:hover {
  border-color: var(--accent) !important;
  background: var(--accent-tint) !important;
}

.ws-delete-collection-btn {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--text-dim);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.ws-delete-collection-btn:hover {
  background: var(--danger-tint);
  color: var(--danger);
}

.ws-empty-inline {
  margin: 24px 0;
}

.ws-empty-inline :deep(.ant-empty-description) {
  color: var(--text-faint);
}

/* Скролл панели */
.ws-panel-content::-webkit-scrollbar {
  width: 6px;
}

.ws-panel-content::-webkit-scrollbar-track {
  background: var(--card-bg);
  border-radius: 4px;
}

.ws-panel-content::-webkit-scrollbar-thumb {
  background: rgba(138, 109, 47, 0.35);
  border-radius: 4px;
}

.ws-panel-content::-webkit-scrollbar-thumb:hover {
  background: var(--accent);
}
</style>
