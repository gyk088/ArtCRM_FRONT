import { defineStore } from 'pinia'

const STORAGE_KEY = 'cvList'

function loadFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch (e) {
    console.error('Error loading CV list:', e)
    return []
  }
}

function persist(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export const useCv = defineStore('cv', {
  state: () => ({
    cvList: loadFromStorage(),
  }),

  getters: {
    getCvById: (state) => (id) => state.cvList.find(c => String(c.id) === String(id)),
    totalCv: (state) => state.cvList.length,
  },

  actions: {
    addCv({ title, text }) {
      const cv = {
        id: Date.now(),
        title,
        text,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      this.cvList.push(cv)
      persist(this.cvList)
      return cv
    },

    updateCv(id, { title, text }) {
      const index = this.cvList.findIndex(c => String(c.id) === String(id))
      if (index === -1) return null
      this.cvList[index] = {
        ...this.cvList[index],
        title,
        text,
        updatedAt: new Date().toISOString(),
      }
      persist(this.cvList)
      return this.cvList[index]
    },

    removeCv(id) {
      this.cvList = this.cvList.filter(c => String(c.id) !== String(id))
      persist(this.cvList)
    },
  },
})
