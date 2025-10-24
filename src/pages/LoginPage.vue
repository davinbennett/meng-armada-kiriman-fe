<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabaseClient'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('')
const password = ref('')
const errorMsg = ref('')

onMounted(async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
        router.push('/dashboard')
    }
})

async function login() {
    errorMsg.value = ''
    const email = `${username.value}@dummy.internal`

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: password.value,
    })

    if (error) {
        errorMsg.value = 'Username atau password salah'
        return
    }

    // ---- SIMPAN USERID ----
    const userId = data.user?.id
    if (userId) {
        localStorage.setItem('user_id', userId)
    }

    // sukses → redirect
    router.push('/dashboard')
}
</script>


<template>
    <div style="max-width: 300px; margin: auto; padding-top: 80px">
        <h2>Login</h2>

        <input v-model="username" placeholder="Username" />
        <input v-model="password" placeholder="Password" type="password" />

        <button @click="login">Login</button>

        <p style="color: red">{{ errorMsg }}</p>
    </div>
</template>
