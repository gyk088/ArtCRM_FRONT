<template>
  <div class="bio-page">
    <div class="bio-header">
      <h3>Мои биографии</h3>
      <a-button type="primary" @click="openAddModal">Добавить</a-button>
    </div>

    <div class="bio-grid">
      <a-card
        v-for="bio in bioList"
        :key="bio.id"
        class="bio-card"
        :title="bio.title"
        hoverable
        @click="openEditModal(bio)"
      >
        <p class="bio-text">{{ bio.text }}</p>
        <div class="bio-actions">
          <!-- <a-button type="link" @click="openEditModal(bio)">Редактировать</a-button> -->
          <a-popconfirm
            title="Удалить биографию?"
            ok-text="Да"
            cancel-text="Нет"
            @confirm.stop="deleteBio(bio.id)"
          >
            <a-button type="link" danger @click.stop>Удалить</a-button> 
          </a-popconfirm>
        </div>
      </a-card>
    </div>

    <a-modal
      v-model:open="isModalOpen"
      :title="isEditing ? 'Редактировать биографию' : 'Добавить биографию'"
      width="800px"
      centered
      @ok="saveBio"
      @cancel="closeModal"
    >
      <a-input
        v-model:value="editedBio.title"
        placeholder="Введите название"
        style="margin-bottom: 12px"
      />
      <a-textarea
        v-model:value="editedBio.text"
        placeholder="Введите текст биографии"
        :rows="10"
      />
    </a-modal>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { message } from 'ant-design-vue';

// === 1. Загружаем из localStorage при старте ===
const bioList = ref([]);

onMounted(() => {
  const saved = localStorage.getItem('bioList');
  if (saved) bioList.value = JSON.parse(saved);
});

// === 2. Следим за изменениями и сохраняем ===
watch(bioList, (newList) => {
  localStorage.setItem('bioList', JSON.stringify(newList));
}, { deep: true });

const isModalOpen = ref(false);
const isEditing = ref(false);
const editedBio = ref({ id: null, title: '', text: '' });

function openAddModal() {
  isEditing.value = false;
  editedBio.value = { id: null, title: '', text: '' };
  isModalOpen.value = true;
}

function openEditModal(bio) {
  isEditing.value = true;
  editedBio.value = { ...bio };
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
}

function saveBio() {
    if (!editedBio.value.title.trim() || !editedBio.value.text.trim()) {
    message.warning('Пожалуйста, заполните все поля перед сохранением.');
    return;
  }
  if (isEditing.value) {
    const index = bioList.value.findIndex(b => b.id === editedBio.value.id);
    if (index !== -1) bioList.value[index] = { ...editedBio.value };
  } else {
    bioList.value.push({
      ...editedBio.value,
      id: Date.now(),
    });
  }
  isModalOpen.value = false;
}

function deleteBio(id) {
  bioList.value = bioList.value.filter(b => b.id !== id);
}
</script>

<style scoped>
.bio-page {
  padding: 16px;
  background: #fff;
  border-radius: 12px;
}
.bio-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.bio-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.bio-text {
  min-height: 80px;
  margin-bottom: 12px;
}
.bio-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>