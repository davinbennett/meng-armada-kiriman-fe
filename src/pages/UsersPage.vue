<template>
    <Layout>
        <div class="layout">
            <Sidebar />

            <!-- ALERT FLOATING -->
            <div v-if="errorMsg" class="alert alert-error">{{ errorMsg }}</div>
            <div v-if="successMsg" class="alert alert-success">{{ successMsg }}</div>

            <main class="content">
                <div class="header-bar">
                    <div>
                        <h1>AKUN</h1>
                        <p class="user-info">
                            username: {{ username }}
                        </p>
                        <p class="user-info">
                            role: {{ role }}
                        </p>
                    </div>

                    <button class="logout-btn" @click="logout">
                        Logout
                    </button>
                </div>

                <div v-if="role === 'ADMIN' || role === 'OPERATOR'">
                    <h3>Daftar Akun Yang Tersedia</h3>
                    <div class="table-wrapper">
                        <table class="table-users">
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Role</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="u in usersList" :key="u.auth_user_id">
                                    <td>{{ u.username }}</td>
                                    <td>{{ u.role }}</td>
                                    <td>
                                        <button class="delete-btn" @click="deleteUser(u.auth_user_id)">
                                            Hapus
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div>
                        <button @click="showModal = true">Tambah User</button>

                        <div v-if="showModal" class="modal">
                            <h3>Tambah User</h3>
                            <input v-model="newUsername" placeholder="Username" />
                            <input v-model="newPassword" placeholder="Password" type="password" />
                            <select v-model="newRole">
                                <option value="" disabled>Pilih Role</option>
                                <option value="ADMIN">ADMIN</option>
                                <option value="OPERATOR">OPERATOR</option>
                                <option value="VIEWER">VIEWER</option>
                            </select>

                            <button @click="addUser">Simpan</button>
                            <button @click="showModal = false">Batal</button>

                        </div>
                    </div>
                </div>

                <p v-else>Anda tidak memiliki akses untuk melihat daftar user.</p>

                <router-view />
            </main>
        </div>
    </Layout>
</template>

<script setup>
import Layout from '@/layouts/Layout.vue'
import { ref, onMounted } from 'vue'
import { supabase } from '@/supabaseClient'
import { useRouter } from 'vue-router'

const showModal = ref(false)
const newUsername = ref('')
const newPassword = ref('')
const newRole = ref('')
const router = useRouter()
const username = ref('')
const role = ref('')
const usersList = ref([])
const errorMsg = ref('')
const successMsg = ref('')

// Ambil session & info user saat ini
onMounted(async () => {
    const { data } = await supabase.auth.getSession()
    const user = data.session?.user
    if (!user) return

    // Ambil username & role dari tabel users
    const { data: userData } = await supabase
        .from('users')
        .select('username, role')
        .eq('auth_user_id', user.id)
        .single()

    username.value = userData?.username || 'Unknown'
    role.value = userData?.role || 'Unknown'

    if (role.value === 'ADMIN' || role.value === 'OPERATOR') {
        loadUsers()
    }
})


async function addUser() {
    if (!newUsername.value || !newPassword.value) {
        errorMsg.value = 'Username & password harus diisi'
        return
    }

    try {
        const res = await fetch('http://103.27.206.183/create-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: newUsername.value,
                password: newPassword.value,
                role: newRole.value
            })
        })

        const data = await res.json()

        if (!res.ok) {
            errorMsg.value = data.error || 'Gagal membuat user'
            return
        }

        usersList.value.push(data.user)
        successMsg.value = 'User berhasil dibuat'
        showModal.value = false
        newUsername.value = ''
        newPassword.value = ''
        newRole.value = ''
        setTimeout(() => successMsg.value = '', 2500)
    } catch (err) {
        errorMsg.value = 'Gagal membuat user: ' + err.message
        setTimeout(() => errorMsg.value = '', 2500)
    }
}

// Load semua users
async function loadUsers() {
    const { data: sessionData } = await supabase.auth.getSession()
    const currentUserId = sessionData.session?.user?.id
    const { data: users, error } = await supabase
        .from('users')
        .select('auth_user_id, username, role')
        .neq('auth_user_id', currentUserId)
    if (error) {
        errorMsg.value = 'Gagal memuat data user'
        return
    }
    usersList.value = users || []
}

// Delete user
async function deleteUser(userId) {
    if (!confirm('Yakin ingin menghapus user ini?')) return

    try {
        const res = await fetch('http://103.27.206.183/delete-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)

        successMsg.value = 'User berhasil dihapus'
        // refresh user list
        loadUsers()
        setTimeout(() => successMsg.value = '', 2500)
    } catch (err) {
        errorMsg.value = 'Gagal menghapus user: ' + err.message
        setTimeout(() => errorMsg.value = '', 2500)
    }
}

// Logout
async function logout() {
    await supabase.auth.signOut()
    sessionStorage.clear()
    localStorage.clear()
    router.push('/login')
}
</script>

<style scoped>
.content {
    padding: 16px;
}

.header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.user-info {
    font-weight: 500;
    margin-left: 12px;
}

.table-wrapper {
    overflow-x: auto;
}

.table-users {
    width: 100%;
    border-collapse: collapse;
}

.table-users th,
.table-users td {
    border: 1px solid #ddd;
    padding: 10px;
    text-align: left;
}

.table-users th {
    background: #f5f5f5;
    font-weight: 600;
}

button.delete-btn {
    background-color: #ff4d4f;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
}

button.delete-btn:hover {
    background-color: #d9363e;
}

.logout-btn {
    background: #e74c3c;
    color: white;
    border: none;
    padding: 8px 14px;
    border-radius: 4px;
    cursor: pointer;
}

.logout-btn:hover {
    background: #c0392b;
}

.alert {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 20px;
    border-radius: 6px;
    font-weight: 500;
    z-index: 9999;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    max-width: 90%;
    min-width: 70%;
    text-align: center;
    word-wrap: break-word;
}

.alert-error {
    background-color: #ff4d4f;
    color: white;
}

.alert-success {
    background-color: #52c41a;
    color: white;
}

/* modal overlay */
.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

/* modal content */
.modal {
    background: rgba(43, 43, 43, 0.649);
    padding: 24px;
    border-radius: 8px;
    width: 100%;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    gap: 12px;
    /* jarak antar elemen vertikal */
}

.modal h3 {
    margin: 0;
    text-align: center;
    color: white;
}

/* form inputs & select */
.modal input,
.modal select {
    padding: 10px;
    border-radius: 4px;
    border: 1px solid #ccc;
    width: 100%;
    box-sizing: border-box;
}

/* tombol di modal */
.modal button {
    padding: 10px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
}

.modal button:nth-of-type(1) {
    background-color: #28a745;
    /* simpan */
    color: white;
}

.modal button:nth-of-type(1):hover {
    background-color: #218838;
}

.modal button:nth-of-type(2) {
    background-color: #dc3545;
    /* batal */
    color: white;
}

.modal button:nth-of-type(2):hover {
    background-color: #c82333;
}

/* pesan error & success */
.modal p {
    margin: 0;
    text-align: center;
}

.modal p.error {
    color: #ff4d4f;
}

.modal p.success {
    color: #28a745;
}
/* responsive */
@media (max-width: 768px) {
    .modal {
        padding: 16px;
        max-width: 90%;
    }

    .modal input,
    .modal select,
    .modal button {
        font-size: 0.9rem;
        padding: 8px;
    }

    .content {
        padding: 8px;
    }

    .table-users th,
    .table-users td {
        font-size: 0.75rem;
        padding: 4px 6px;
    }

    button.delete-btn,
    .logout-btn {
        font-size: 0.7rem;
        padding: 4px 8px;
    }
}
</style>