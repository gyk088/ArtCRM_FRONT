// stores/userPicturesFilters.js
// Хранит состояние фильтров страницы "Мои работы" (UserPictures),
// чтобы они не сбрасывались при переходе на другую страницу и обратно.
import { defineStore } from 'pinia'

export const useUserPicturesFilters = defineStore('user-pictures-filters', {
  state: () => ({
    // Мультивыбор — каждый фильтр теперь массив id (пустой массив = фильтр не применён)
    artist: [],
    location: [],
    seria: [],
    media: [],
    status: [],
    priceFrom: null,
    priceTo: null,
    nameSearch: '',
  }),
})
