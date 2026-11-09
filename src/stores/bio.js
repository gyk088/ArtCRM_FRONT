import { defineStore } from 'pinia'
import { createTextDocumentActions } from '@/stores/textDocumentStore.js'

const actions = createTextDocumentActions({
  endpoint: '/api/v1/bio',
  legacyKey: 'bioList',
  listKey: 'bioList',
  texts: {
    loadError: 'Не удалось загрузить биографии',
    saveError: 'Не удалось сохранить биографию',
    deleteError: 'Не удалось удалить биографию',
    importError: 'Не удалось перенести сохранённые в браузере биографии на сервер',
  },
})

export const useBio = defineStore('bio', {
  state: () => ({
    bioList: [],
    loading: false,
    loaded: false,
    _pending: null,
  }),

  getters: {
    getBioById: (state) => (id) => state.bioList.find(b => String(b.id) === String(id)),
    totalBio: (state) => state.bioList.length,
  },

  actions: {
    fetchBioList: actions.fetchList,
    fetchBio: actions.fetchOne,
    addBio: actions.add,
    updateBio: actions.update,
    removeBio: actions.remove,
  },
})
