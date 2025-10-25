<template>
    <Layout>
        <div class="layout">
            <Sidebar />
            <main class="content">
                <h1>History Records</h1>

                <div class="table-wrapper">
                    <table class="table-history">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Username</th>
                                <th>Role</th>
                                <th>Action</th>
                                <th>Type</th>
                                <th>Time</th>
                                <th v-if="role === 'ADMIN' || role === 'OPERATOR'">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="r in pagedRecords" :key="r.id">
                                <td>{{ r.id }}</td>
                                <td>{{ r.created_by_name }}</td>
                                <td>{{ r.created_by_role }}</td>
                                <td>{{ actionLabel(r.action_type) }}</td>
                                <td>{{ typeLabel(r.type) }}</td>
                                <td>{{ formatDate(r.created_at) }}</td>
                                <td v-if="role === 'ADMIN' || role === 'OPERATOR'">
                                    <button class="delete-btn" @click="deleteRecord(r.id)">Hapus</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="pagination">
                    <button @click="prevPage" :disabled="page === 1">Prev</button>
                    <span>{{ page }} / {{ totalPage }}</span>
                    <button @click="nextPage" :disabled="page === totalPage">Next</button>
                </div>


                <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
                <p v-if="successMsg" class="success-msg">{{ successMsg }}</p>
            </main>
        </div>
    </Layout>
</template>


<script setup>
import Layout from '@/layouts/Layout.vue'
import { onMounted, ref, onUnmounted, computed } from 'vue'
import { useRecordsStore } from '@/stores/recordsStore'


const store = useRecordsStore()
const errorMsg = ref('')
const successMsg = ref('')
const page = ref(1)
const limit = 20
const role = ref('')
import { supabase } from '../supabaseClient'

let isAlive = true

onMounted(async () => {
    const { data } = await supabase.auth.getSession()
    const user = data.session?.user
    if (!user) return

    // Ambil username & role dari tabel users
    const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('auth_user_id', user.id)
        .single()

    role.value = userData?.role || 'Unknown'

    if (isAlive) {
        await store.loadRecords()
    }
})

onUnmounted(() => {
    isAlive = false
})

const totalPage = computed(() => {
    return Math.ceil(store.records.length / limit)
})


const pagedRecords = computed(() => {
    const start = (page.value - 1) * limit
    const end = start + limit
    return store.records.slice(start, end)
})

function nextPage() {
    if (page.value < totalPage.value) page.value++
}

function prevPage() {
    if (page.value > 1) page.value--
}

// delete record
async function deleteRecord(id) {
    if (!confirm('Yakin ingin menghapus record ini?')) return
    const err = await store.deleteRecord(id)
    if (err) errorMsg.value = 'Gagal menghapus'
    else {
        successMsg.value = 'Berhasil hapus'
        setTimeout(() => successMsg.value = '', 2000)
    }
}

// helper
function actionLabel(type) {
    switch (type) {
        case 1: return 'ADD'
        case 2: return 'UPDATE'
        case 3: return 'DELETE'
        default: return 'Unknown'
    }
}

function typeLabel(type) {
    switch (type) {
        case 1: return 'ARMADA'
        case 2: return 'KIRIMAN'
        default: return 'Unknown'
    }
}

function formatDate(date) {
    if (!date) return ''
    const d = new Date(date)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')} | ${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`
}
</script>


<style scoped>
.pagination {
    display: flex;
    gap: 10%;
    align-items: center;
    width: 100%;
    justify-content: center;
}

/* The items within the .pagination div will be pushed to the edges with equal space between them. */
.content {
    padding: 16px;
}

.table-wrapper {
    overflow-x: auto;
}

.table-history {
    width: 100%;
    border-collapse: collapse;
}

.table-history th,
.table-history td {
    border: 1px solid #ddd;
    padding: 10px;
    text-align: left;
    white-space: nowrap;
}

.table-history th {
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

.error-msg {
    color: #ff4d4f;
    margin-top: 12px;
}

.success-msg {
    color: #28a745;
    margin-top: 12px;
}

/* responsive font dan table scroll */
@media(max-width:768px) {

    .table-history th,
    .table-history td {
        font-size: 0.75rem;
        padding: 6px;
    }

    button.delete-btn {
        padding: 4px 8px;
        font-size: 0.75rem;
    }
}
</style>
