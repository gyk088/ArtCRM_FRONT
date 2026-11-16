<template>
  <div class="ap">
    <div class="ap-top">
      <p class="ap-hint">
        Портфолио собирается из анкеты, выставок, проектов и работ художника. Его можно выгрузить в PDF
        (альбомный A4) или отправить ссылкой.
      </p>
      <a-button type="primary" :loading="creating" @click="create"><PlusOutlined /> Создать портфолио</a-button>
    </div>

    <a-spin :spinning="loading && !list.length">
      <div v-if="!loading && !list.length" class="ap-empty">Портфолио пока нет</div>
      <div v-else class="ap-grid">
        <div v-for="p in list" :key="p.id" class="ap-card" @click="open(p)">
          <div class="ap-cover">
            <img v-if="p.cover" v-thumb="p.cover" alt="" />
            <span v-else class="ap-cover-empty"><BookOutlined /></span>
            <span class="ap-badge" :class="{ 'ap-badge-off': !p.is_public }">{{ p.is_public ? 'по ссылке' : 'скрыто' }}</span>
          </div>
          <div class="ap-body">
            <div class="ap-title">{{ p.title }}</div>
            <div class="ap-sub">
              {{ p.sections_count }} {{ plural(p.sections_count, ['проект', 'проекта', 'проектов']) }} ·
              {{ p.works_count }} {{ plural(p.works_count, ['работа', 'работы', 'работ']) }}
              <template v-if="p.views"> · просмотров {{ p.views }}</template>
            </div>
            <div class="ap-sub">изменено {{ formatDateTime(p.utime) }}</div>
          </div>
          <div class="ap-actions" @click.stop>
            <a-tooltip title="Редактировать"><button class="ap-btn" @click="open(p)"><EditOutlined /></button></a-tooltip>
            <a-tooltip title="Скачать PDF">
              <button class="ap-btn" :disabled="pdfId === p.id" @click="pdf(p)">
                <LoadingOutlined v-if="pdfId === p.id" /><FilePdfOutlined v-else />
              </button>
            </a-tooltip>
            <a-tooltip :title="p.is_public ? 'Скопировать ссылку' : 'Ссылка выключена в настройках портфолио'">
              <button class="ap-btn" :disabled="!p.is_public" @click="copyPortfolioLink(p.id)"><LinkOutlined /></button>
            </a-tooltip>
            <a-popconfirm title="Удалить портфолио?" ok-text="Удалить" cancel-text="Отмена" @confirm="remove(p)">
              <button class="ap-btn ap-btn-danger"><DeleteOutlined /></button>
            </a-popconfirm>
          </div>
        </div>
      </div>
    </a-spin>
  </div>
</template>

<script setup>
// Вкладка «Портфолио» в карточке художника
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  PlusOutlined, BookOutlined, EditOutlined, FilePdfOutlined, LinkOutlined, DeleteOutlined, LoadingOutlined,
} from '@ant-design/icons-vue'
import { usePortfolio, copyPortfolioLink } from '@/stores/portfolio.js'
import { downloadPortfolioPdf } from '@/utils/portfolioPdf.js'
import { formatDateTime } from '@/utils/tasks.js'

const props = defineProps({
  artistId: { type: String, required: true },
})
const emit = defineEmits(['count'])

const router = useRouter()
const store = usePortfolio()
const list = ref([])
const loading = ref(false)
const creating = ref(false)
const pdfId = ref(null)

const plural = (n, [one, few, many]) => {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

async function load() {
  loading.value = true
  try {
    const data = await store.listByArtist(props.artistId)
    if (data) {
      list.value = data
      emit('count', data.length)
    }
  } finally {
    loading.value = false
  }
}
onMounted(load)

const open = (p) => router.push({ name: 'portfolio', params: { id: p.id } })

async function create() {
  creating.value = true
  try {
    const created = await store.create({ artist_id: props.artistId })
    if (created) router.push({ name: 'portfolio', params: { id: created.id } })
  } finally {
    creating.value = false
  }
}

async function pdf(p) {
  pdfId.value = p.id
  try {
    const full = await store.get(p.id)
    if (full && !full.notFound) await downloadPortfolioPdf(full)
  } finally {
    pdfId.value = null
  }
}

async function remove(p) {
  if (await store.remove(p.id)) {
    message.success('Портфолио удалено')
    load()
  }
}
</script>

<style scoped>
.ap-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 20px;
  margin-bottom: 16px;
}

.ap-hint {
  margin: 0;
  max-width: 640px;
  font-size: 13px;
  color: var(--text-faint, #7c7669);
}

.ap-empty {
  padding: 40px 0;
  text-align: center;
  color: var(--text-faint, #7c7669);
}

.ap-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.ap-card {
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated, #fff);
  border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.ap-card:hover {
  border-color: var(--accent, #8a6d2f);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
}

.ap-cover {
  position: relative;
  aspect-ratio: 297 / 210;
  background: var(--card-bg, #efece4);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.ap-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ap-cover-empty {
  font-size: 32px;
  color: var(--text-dim, #a29c8c);
}

.ap-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #2f8a35;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 999px;
}

.ap-badge-off {
  color: var(--text-faint, #7c7669);
}

.ap-body {
  padding: 10px 12px 6px;
}

.ap-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 19px;
  font-weight: 600;
  color: var(--text-title, #211f1a);
}

.ap-sub {
  font-size: 12px;
  color: var(--text-faint, #7c7669);
}

.ap-actions {
  display: flex;
  gap: 6px;
  padding: 8px 12px 12px;
  margin-top: auto;
}

.ap-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
  border-radius: 8px;
  background: transparent;
  color: var(--accent, #8a6d2f);
  cursor: pointer;
}

.ap-btn:hover:not(:disabled) {
  border-color: var(--accent, #8a6d2f);
}

.ap-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.ap-btn-danger {
  color: #b43c3c;
}
</style>
