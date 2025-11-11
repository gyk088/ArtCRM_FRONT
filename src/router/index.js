import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { ROLES } from '@/services/const'
import { Layout } from 'ant-design-vue'
import Home from '@/layouts/Home.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/auth',
      name: 'auth',
      component: () => import('@/pages/Auth/index.vue'),
      meta: {
        title: 'Вход в личный кабинет',
        layout: 'empty',
        roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN]
      }
    },
    {
      path: '/home',
      name: 'home',
      component: Home,
      children: [
      {
        path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/pages/UserPictures/index.vue'),
          meta: {
            title: 'Главная таблица',
          },
        }, {
          path: '/home/edit/:id',
          name: 'edit-work',
          component: () => import('@/pages/EditWork/index.vue'),
          meta: { title: 'Редактировать работу' },
        }, {
          path: 'bio',
          name: 'bio',
          component: () => import('@/pages/Bio/index.vue'),
        meta: {
            title: '<Биография>',
          },
      },{
        path: 'cv',
        name: 'cv',
        component: () => import('@/pages/CV/index.vue'),
        meta: {
            title: '<Резюме>',
          },
      },{
        path: 'collection',
        name: 'collection',
        component: () => import('@/pages/CollectionList/index.vue'),
        meta: {
            title: '<Мои коллекции>',
          },
      }, {
          path: '/home/collection/:id',
          name: 'edit-collection',
          component: () => import('@/pages/Collection/index.vue'),
          meta: { title: 'Редактировать коллекцию' },
        },
    ],
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
  ],
})

export default router
