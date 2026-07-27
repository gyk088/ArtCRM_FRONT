<template>
  <div class="bio-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">Мои биографии</h2>
        <p class="page-subtitle">
          {{ bioList.length ? `${bioList.length} ${pluralize(bioList.length)}` : 'Пока нет ни одной биографии' }}
        </p>
      </div>
      <a-button type="primary" class="add-btn" @click="openAddPage">
        <template #icon>
          <PlusOutlined />
        </template>
        Добавить биографию
      </a-button>
    </div>

    <div class="bio-body">
      <div v-if="bioList.length" class="bio-toolbar">
        <a-input
          v-model:value="search"
          class="search-input"
          placeholder="Поиск по названию или тексту"
          allow-clear
        >
          <template #prefix>
            <SearchOutlined style="color: var(--text-faint)" />
          </template>
        </a-input>
      </div>

      <div v-if="filteredList.length" class="bio-grid">
        <div v-for="bio in filteredList" :key="bio.id" class="bio-card" @click="openEditPage(bio)">
          <div class="bio-card-header">
            <div class="bio-icon">
              <FileTextOutlined />
            </div>
            <h3 class="bio-title">{{ bio.title || 'Без названия' }}</h3>
          </div>

          <p class="bio-text">{{ plainText(bio.text) }}</p>

          <div class="bio-footer">
            <span class="bio-meta">{{ wordCount(bio.text) }} слов</span>
            <div class="bio-actions">
              <button
                class="icon-btn"
                title="Скачать PDF"
                :disabled="pdfLoadingId === bio.id"
                @click.stop="handleDownloadPdf(bio)"
              >
                <LoadingOutlined v-if="pdfLoadingId === bio.id" spin />
                <DownloadOutlined v-else />
              </button>
              <button class="icon-btn" title="Редактировать" @click.stop="openEditPage(bio)">
                <EditOutlined />
              </button>
              <a-popconfirm
                title="Удалить эту биографию?"
                ok-text="Да"
                cancel-text="Нет"
                @confirm="deleteBio(bio.id)"
              >
                <button class="icon-btn icon-btn-danger" title="Удалить" @click.stop>
                  <DeleteOutlined />
                </button>
              </a-popconfirm>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="bioList.length" class="empty-state">
        <SearchOutlined class="empty-icon" />
        <p class="empty-title">Ничего не найдено</p>
        <p class="empty-subtitle">Попробуйте изменить запрос поиска</p>
      </div>

      <div v-else class="empty-state">
        <FileTextOutlined class="empty-icon" />
        <p class="empty-title">Биографий пока нет</p>
        <p class="empty-subtitle">Добавьте первую биографию, чтобы использовать её в работах и профиле</p>
        <a-button type="primary" class="add-btn" @click="openAddPage">
          <template #icon>
            <PlusOutlined />
          </template>
          Добавить биографию
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  LoadingOutlined,
  FileTextOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue';
import { useBio } from '@/stores/bio.js';
import { downloadBioPdf } from '@/utils/bioPdf.js';
import { htmlToPlainText } from '@/utils/richText.js';

const router = useRouter();
const bioStore = useBio();
const bioList = computed(() => bioStore.bioList);
const search = ref('');

const filteredList = computed(() => {
  const query = search.value.trim().toLowerCase();
  if (!query) return bioList.value;
  return bioList.value.filter(bio =>
    bio.title?.toLowerCase().includes(query) || plainText(bio.text).toLowerCase().includes(query)
  );
});

function pluralize(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'биография';
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'биографии';
  return 'биографий';
}

function plainText(text) {
  return htmlToPlainText(text);
}

function wordCount(text) {
  const plain = htmlToPlainText(text).trim();
  return plain ? plain.split(/\s+/).length : 0;
}

function openAddPage() {
  router.push('/home/bio/new');
}

function openEditPage(bio) {
  router.push(`/home/bio/${bio.id}`);
}

function deleteBio(id) {
  bioStore.removeBio(id);
  message.success('Биография удалена');
}

const pdfLoadingId = ref(null);
async function handleDownloadPdf(bio) {
  pdfLoadingId.value = bio.id;
  try {
    await downloadBioPdf(bio);
  } finally {
    pdfLoadingId.value = null;
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

.bio-page {
  --bg: #f7f5f0;
  --bg-elevated: #ffffff;
  --card-bg: #efece4;
  --text-title: #211f1a;
  --text-body: #2c2a25;
  --text-muted: #5a564c;
  --text-faint: #7c7669;
  --accent: #8a6d2f;
  --accent-strong: #6f581f;
  --border: rgba(0, 0, 0, 0.1);
  --border-soft: rgba(0, 0, 0, 0.07);

  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg);
  color: var(--text-body);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.page-header {
  flex-shrink: 0;
  padding: 20px 24px 10px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 26px;
  font-weight: 600;
  color: var(--text-title);
  margin: 0 0 4px;
}

.page-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--text-faint);
}

.add-btn {
  background-color: var(--accent);
  border-color: var(--accent);
  color: #fff;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.add-btn:hover {
  border-color: var(--accent-strong) !important;
  background-color: var(--accent-strong) !important;
  color: #fff !important;
}

.bio-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 24px 24px;
}

.bio-toolbar {
  margin-bottom: 16px;
}

.search-input {
  max-width: 360px;
  background: var(--bg-elevated);
  border-color: var(--border);
}

.search-input:hover {
  border-color: var(--accent);
}

.bio-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(auto, 1fr));
  gap: 20px;
}

.bio-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  display: flex;
  flex-direction: column;
}

.bio-card:hover {
  border-color: var(--accent);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.bio-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.bio-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
}

.bio-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-title);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bio-text {
  flex: 1;
  min-height: 60px;
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.bio-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid var(--border-soft);
}

.bio-meta {
  font-size: 12px;
  color: var(--text-faint);
}

.bio-actions {
  display: flex;
  gap: 4px;
}

.icon-btn {
  border: none;
  background: none;
  color: var(--text-faint);
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.icon-btn:hover {
  background: var(--card-bg);
  color: var(--accent);
}

.icon-btn-danger:hover {
  background: rgba(180, 60, 60, 0.1);
  color: #b43c3c;
}

/* === Пустое состояние === */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 60px 20px;
  background: var(--bg-elevated);
  border: 1px dashed var(--border);
  border-radius: 12px;
}

.empty-icon {
  font-size: 32px;
  color: var(--text-faint);
  margin-bottom: 12px;
}

.empty-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-title);
  margin: 0 0 4px;
}

.empty-subtitle {
  font-size: 13px;
  color: var(--text-faint);
  margin: 0 0 16px;
  max-width: 320px;
}

/* === Кастомный скролл === */
.bio-body::-webkit-scrollbar {
  width: 6px;
}

.bio-body::-webkit-scrollbar-track {
  background: var(--card-bg);
  border-radius: 4px;
}

.bio-body::-webkit-scrollbar-thumb {
  background: rgba(138, 109, 47, 0.35);
  border-radius: 4px;
}

.bio-body::-webkit-scrollbar-thumb:hover {
  background: var(--accent);
}

@media (max-width: 700px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .add-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
