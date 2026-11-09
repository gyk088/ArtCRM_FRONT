import { defineStore } from 'pinia'
import { createTextDocumentActions } from '@/stores/textDocumentStore.js'

const actions = createTextDocumentActions({
  endpoint: '/api/v1/cv',
  legacyKey: 'cvList',
  listKey: 'cvList',
  texts: {
    loadError: 'Не удалось загрузить резюме',
    saveError: 'Не удалось сохранить резюме',
    deleteError: 'Не удалось удалить резюме',
    importError: 'Не удалось перенести сохранённые в браузере резюме на сервер',
  },
})

export const useCv = defineStore('cv', {
  state: () => ({
    cvList: [],
    loading: false,
    loaded: false,
    _pending: null,
  }),

  getters: {
    getCvById: (state) => (id) => state.cvList.find(c => String(c.id) === String(id)),
    totalCv: (state) => state.cvList.length,
  },

  actions: {
    fetchCvList: actions.fetchList,
    fetchCv: actions.fetchOne,
    addCv: actions.add,
    updateCv: actions.update,
    removeCv: actions.remove,
  },
})
