<template>
  <div class="collection-page">
    <div class="collection-header">
      <h3>Мои Коллекции</h3>
      <a-button type="primary" @click="openEditPage">Создать коллекцию</a-button>
    </div>

    <div class="collection-grid">
      <a-card
        v-for="collection in collectionList"
        :key="collection.id"
        class="collection-card"
        :title="collection.name"
        hoverable
        @click="openEditPage(collection)"
      >
        <p class="collection-text">{{ collection.description }}</p>
        <div class="collection-actions">
          <a-popconfirm
            title="Удалить коллекцию?"
            ok-text="Да"
            cancel-text="Нет"
            @confirm.stop="deleteСollection(collection.id)"
          >
            <a-button type="link" danger @click.stop>Удалить</a-button> 
          </a-popconfirm>
        </div>
      </a-card>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { useRouter } from 'vue-router'

// === 1. Загружаем из localStorage при старте ===
const collectionList = ref([]);
const router = useRouter()

onMounted(() => {
  const saved = localStorage.getItem('collectionList');
  if (saved) collectionList.value = JSON.parse(saved);
});

// === 2. Следим за изменениями и сохраняем ===
watch(collectionList, (newList) => {
  localStorage.setItem('collectionList', JSON.stringify(newList));
}, { deep: true });

const openEditPage = (collection) => {
  if (collection && collection.id) {
    router.push({ name: 'edit-collection', params: { id: collection.id } })
  } else {
    router.push({ name: 'edit-collection', params: { id: 'new' } })
  }
}

function deleteСollection(id) {
  collectionList.value = collectionList.value.filter(b => b.id !== id);
}
</script>

<style scoped>
.collection-page {
  padding: 16px;
  background: #fff;
  border-radius: 12px;
}
.collection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 18px;
}
.collection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.collection-text {
  min-height: 80px;
  margin-bottom: 12px;
}
.collection-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>