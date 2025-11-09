<template>
  <div class="cv-page">
    <div class="cv-header">
      <h3>Мои резюме</h3>
      <a-button type="primary" @click="openAddModal">Добавить</a-button>
    </div>

    <div class="cv-grid">
      <a-card
        v-for="cv in cvList"
        :key="cv.id"
        class="cv-card"
        :title="cv.title"
        hoverable
        @click="openEditModal(cv)"
      >
        <p class="cv-text">{{ cv.text }}</p>
        <div class="cv-actions">
          <!-- <a-button type="link" @click="openEditModal(cv)">Редактировать</a-button> -->
          <a-popconfirm
            title="Удалить резюме?"
            ok-text="Да"
            cancel-text="Нет"
            @confirm="deleteCv(cv.id)"
          >
            <a-button type="link" danger>Удалить</a-button>
          </a-popconfirm>
        </div>
      </a-card>
    </div>

    <a-modal
      v-model:open="isModalOpen"
      :title="isEditing ? 'Редактировать резюме' : 'Добавить резюме'"
      width="800px"
      centered
      @ok="saveCv"
      @cancel="closeModal"
    >
      <a-input
        v-model:value="editedCv.title"
        placeholder="Введите название"
        style="margin-bottom: 12px"
      />
      <a-textarea
        v-model:value="editedCv.text"
        placeholder="Введите текст резюме"
        :rows="10"
      />
    </a-modal>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { message } from 'ant-design-vue';

// === 1. Загружаем из localStorage при старте ===
const cvList = ref([]);

onMounted(() => {
  const saved = localStorage.getItem('cvList');
  if (saved) cvList.value = JSON.parse(saved);
});

// === 2. Следим за изменениями и сохраняем ===
watch(cvList, (newList) => {
  localStorage.setItem('cvList', JSON.stringify(newList));
}, { deep: true });

const isModalOpen = ref(false);
const isEditing = ref(false);
const editedCv = ref({ id: null, title: '', text: '' });

function openAddModal() {
  isEditing.value = false;
  editedCv.value = { id: null, title: '', text: '' };
  isModalOpen.value = true;
}

function openEditModal(cv) {
  isEditing.value = true;
  editedCv.value = { ...cv };
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
}

function saveCv() {
        if (!editedCv.value.title.trim() || !editedCv.value.text.trim()) {
    message.warning('Пожалуйста, заполните все поля перед сохранением.');
    return;
  }
  if (isEditing.value) {
    const index = cvList.value.findIndex(b => b.id === editedCv.value.id);
    if (index !== -1) cvList.value[index] = { ...editedCv.value };
  } else {
    cvList.value.push({
      ...editedCv.value,
      id: Date.now(),
    });
  }
  isModalOpen.value = false;
}

function deleteCv(id) {
  cvList.value = cvList.value.filter(b => b.id !== id);
}
</script>

<style scoped>
.cv-page {
  padding: 16px;
  background: #fff;
  border-radius: 12px;
}
.cv-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.cv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.cv-text {
  min-height: 80px;
  margin-bottom: 12px;
}
.cv-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>