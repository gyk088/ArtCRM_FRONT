// stores/tableStore.js
import { defineStore } from 'pinia';
import { reactive } from 'vue';

export const useTableStore = defineStore('table', () => {
  // реактивный массив для таблицы
  const data = reactive([]);

  // функция для добавления новой строки
  const addRow = (row) => {
    data.push(row);
  };

  return { data, addRow };
});