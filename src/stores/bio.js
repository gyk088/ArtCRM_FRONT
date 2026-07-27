import { defineStore } from 'pinia'

const STORAGE_KEY = 'bioList'

function loadFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch (e) {
    console.error('Error loading bio list:', e)
    return []
  }
}

function persist(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export const useBio = defineStore('bio', {
  state: () => ({
    bioList: loadFromStorage(),
  }),

  getters: {
    getBioById: (state) => (id) => state.bioList.find(b => String(b.id) === String(id)),
    totalBio: (state) => state.bioList.length,
  },

  actions: {
    addBio({ title, text }) {
      const bio = {
        id: Date.now(),
        title,
        text,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      this.bioList.push(bio)
      persist(this.bioList)
      return bio
    },

    updateBio(id, { title, text }) {
      const index = this.bioList.findIndex(b => String(b.id) === String(id))
      if (index === -1) return null
      this.bioList[index] = {
        ...this.bioList[index],
        title,
        text,
        updatedAt: new Date().toISOString(),
      }
      persist(this.bioList)
      return this.bioList[index]
    },

    removeBio(id) {
      this.bioList = this.bioList.filter(b => String(b.id) !== String(id))
      persist(this.bioList)
    },
  },
})
