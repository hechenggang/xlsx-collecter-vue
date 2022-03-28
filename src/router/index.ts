import { createRouter, createWebHashHistory } from 'vue-router'
import UserView from '../views/UserView.vue'
import SheetView from '../views/SheetView.vue'

const router = createRouter({
  // history: createWebHistory(import.meta.env.BASE_URL),
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'user',
      component: UserView
    },
    {
      path: '/sheet',
      name: 'sheet',
      component: SheetView
    }
  ]
})

export default router
