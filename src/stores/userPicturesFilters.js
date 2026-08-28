// stores/userPicturesFilters.js
// Хранит состояние фильтров страницы "Мои работы" (UserPictures),
// чтобы они не сбрасывались при переходе на другую страницу и обратно.
import { defineStore } from 'pinia'

export const useUserPicturesFilters = defineStore('user-pictures-filters', {
  state: () => ({
    artist: null,
    location: null,
    seria: null,
    media: null,
    status: null,
    priceFrom: null,
    priceTo: null,
  }),
})
