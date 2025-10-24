import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../pages/LoginPage.vue'
import DashboardPage from '../pages/DashboardPage.vue'
import ArmadaPage from '../pages/ArmadaPage.vue'
import StokMasukPage from '../pages/StokMasukPage.vue'
import HistoryPage from '../pages/HistoryPage.vue'
import UsersPage from '../pages/UsersPage.vue'
import { supabase } from '../supabaseClient.js'

const routes = [
    { path: '/', redirect: '/login' },
    { path: '/login', component: LoginPage },

    { path: '/dashboard', component: DashboardPage, meta: { requiresAuth: true } },
    { path: '/armada', component: ArmadaPage, meta: { requiresAuth: true } },
    { path: '/stok-masuk', component: StokMasukPage, meta: { requiresAuth: true } },
    { path: '/history', component: HistoryPage, meta: { requiresAuth: true } },
    { path: '/users', component: UsersPage, meta: { requiresAuth: true } },
]


const router = createRouter({
    history: createWebHistory(),
    routes,
})

// Guard — kalau belum login, paksa ke /login
router.beforeEach(async (to) => {
    if (!to.meta.requiresAuth) return true

    const { data } = await supabase.auth.getSession()
    if (!data.session) return '/login'
    return true
})

export default router
