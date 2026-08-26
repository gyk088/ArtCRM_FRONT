import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { ROLES } from '@/services/const'
import { Layout } from 'ant-design-vue'
import Home from '@/layouts/Home.vue';
import { getToken, getUser } from '@/services/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: () => (getToken() ? '/home' : '/auth'),
    },
    {
      path: '/auth',
      name: 'auth',
      component: () => import('@/pages/Auth/index.vue'),
      meta: {
        title: 'Вход в личный кабинет',
        layout: 'empty',
      }
    },
    {
      path: '/home',
      name: 'home',
      component: Home,
      redirect: '/home/dashboard',
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
      }, {
          path: '/home/bio/:id',
          name: 'edit-bio',
          component: () => import('@/pages/EditBio/index.vue'),
          meta: { title: 'Редактировать биографию' },
        },{
          path: 'workspace',
          name: 'workspace',
          component: () => import('@/pages/WorkSpace/index.vue'),
        meta: {
            title: '<Рабочее пространство>',
            hiddenRoles: [ROLES.ARTIST],
          },
      },{
        path: 'cv',
        name: 'cv',
        component: () => import('@/pages/CV/index.vue'),
        meta: {
            title: '<Резюме>',
          },
      }, {
          path: '/home/cv/:id',
          name: 'edit-cv',
          component: () => import('@/pages/EditCV/index.vue'),
          meta: { title: 'Редактировать резюме' },
        },{
        path: 'collection',
        name: 'collection',
        component: () => import('@/pages/CollectionList/index.vue'),
        meta: {
            title: '<Мои ссылки>',
          },
      }, {
          path: '/home/collection/:id',
          name: 'edit-collection',
          component: () => import('@/pages/Collection/index.vue'),
          meta: { title: 'Редактировать ссылку' },
        }, {
        path: 'profile',
        name: 'profile',
        component: () => import('@/pages/UserConfig/index.vue'),
        meta: {
            title: 'Профиль',
          },
      }, {
        path: 'admin',
        name: 'admin-panel',
        component: () => import('@/pages/AdminPanel/index.vue'),
        meta: {
            title: 'Админ-панель',
            hiddenRoles: [ROLES.GALLERY, ROLES.MANAGER, ROLES.ARTIST],
          },
      },
    ],
    },
    {
      path: '/collection/:id',
      name: 'collection-landing',
      component: () => import('@/pages/CollectionLanding/index.vue'),
      meta: {
        title: 'Ссылка',
        layout: 'public',
      },
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

router.beforeEach((to) => {
  const isAuthenticated = !!getToken()

  if (to.path.startsWith('/home') && !isAuthenticated) {
    return '/auth'
  }

  if (to.path === '/auth' && isAuthenticated && !to.query.token) {
    return '/home'
  }

  if (to.meta?.hiddenRoles?.length && isAuthenticated) {
    const role = getUser()?.role
    if (to.meta.hiddenRoles.includes(role)) {
      return '/home'
    }
  }
})

export default router
