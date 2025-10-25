import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'
import vSelect from 'vue-select'
import 'vue-select/dist/vue-select.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.component('v-select', vSelect)
app.mount('#app')
