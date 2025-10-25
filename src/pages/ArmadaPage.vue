<template>
    <Layout>

        <div v-if="errorMsg" class="alert alert-error">{{ errorMsg }}</div>
        <div v-if="successMsg" class="alert alert-success">{{ successMsg }}</div>


        <div class="armada-page">
            <h2>Data Armada</h2>

            <form @submit.prevent="addArmada" class="form-armada">
                <div class="form-group">
                    <label>Nopol</label>
                    <input v-model="nopol" placeholder="Nopol" />
                </div>
                <div class="form-group">
                    <label>Panjang</label>
                    <input type="number" v-model.number="panjang" placeholder="Panjang" min="0" step="1" />
                </div>

                <div class="form-group">
                    <label>Lebar</label>
                    <input type="number" v-model.number="lebar" placeholder="Lebar" min="0" step="1" />
                </div>

                <div class="form-group">
                    <label>Tinggi</label>
                    <input type="number" v-model.number="tinggi" placeholder="Tinggi" min="0" step="1" />
                </div>

                <button v-if="role === 'ADMIN' || role === 'OPERATOR'" type="submit">Tambah Armada</button>
            </form>

            <div class="table-wrapper">
                <table class="table-armada">
                    <thead>
                        <tr>
                            <th>Nopol</th>
                            <th>Panjang</th>
                            <th>Lebar</th>
                            <th>Tinggi</th>
                            <th>Waktu Input</th>
                            <th v-if="role === 'ADMIN' || role === 'OPERATOR'">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="a in armadas" :key="a.id">
                            <td>{{ a.nopol }}</td>
                            <td>{{ a.panjang }}</td>
                            <td>{{ a.lebar }}</td>
                            <td>{{ a.tinggi }}</td>
                            <td>{{ formatDate(a.created_at) }}</td>
                            <td v-if="role === 'ADMIN' || role === 'OPERATOR'">
                                <button class="delete-btn" @click="confirmDelete(a.id)">Hapus</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

        </div>
    </Layout>
</template>

<script setup>
import Layout from '@/layouts/Layout.vue'
import { ref, onMounted } from 'vue'
import { supabase } from '../supabaseClient'

const armadas = ref([])
const role = ref('')

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

    loadArmadas()
})

async function confirmDelete(id) {
    const confirmed = window.confirm('Apakah Anda yakin ingin menghapus armada ini?');
    if (confirmed) {
        await deleteArmada(id);
    }
}


function formatDate(dt) {
    const d = new Date(dt)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const MM = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${hh}:${mm}:${ss} | ${dd}-${MM}-${yyyy}`
}


async function loadArmadas() {
    const { data, error } = await supabase
        .from('armada')
        .select('*')
        .order('created_at', { ascending: false })

    if (!error) armadas.value = data
}

const nopol = ref('')
const panjang = ref(0)
const lebar = ref(0)
const tinggi = ref(0)
const errorMsg = ref('')
const successMsg = ref('')

async function addArmada() {
    errorMsg.value = ''
    successMsg.value = ''

    if (!nopol.value) {
        errorMsg.value = 'Nopol wajib diisi'
        setTimeout(() => errorMsg.value = '', 2000)
        return
    }


    const { data: existing } = await supabase
        .from('armada')
        .select('id')
        .eq('nopol', nopol.value)
        .maybeSingle()

    if (existing) {
        errorMsg.value = 'Nopol sudah terdaftar'
        setTimeout(() => errorMsg.value = '', 2000)

        return
    }

    const { error: insertErr } = await supabase.from('armada').insert({
        nopol: nopol.value,
        panjang: panjang.value,
        lebar: lebar.value,
        tinggi: tinggi.value,
    })

    if (insertErr) {
        errorMsg.value = 'Gagal menyimpan'
        setTimeout(() => errorMsg.value = '', 2000)
        return
    }

    const userId = localStorage.getItem('user_id')

    await supabase.from("records").insert({
        created_by: userId,
        action_type: 1, // DELETE
        type: 1,        // ARMADA
    });


    successMsg.value = 'Armada berhasil ditambahkan'
    setTimeout(() => successMsg.value = '', 2000)

    await loadArmadas()

    nopol.value = ''
    panjang.value = 0
    lebar.value = 0
    tinggi.value = 0
}

async function deleteArmada(id) {
    try {
        // 1) Hapus dari DB
        const { error: delErr } = await supabase
            .from("armada")
            .delete()
            .eq("id", id);

        if (delErr) {
            errorMsg.value = "Gagal menghapus armada";
            return;
        }

        // 2) Hapus dari state lokal
        armadas.value = armadas.value.filter(a => a.id !== id);

        const userId = localStorage.getItem('user_id')

        // 3) Insert ke tabel records
        await supabase.from("records").insert({
            created_by: userId,
            action_type: 3, // DELETE
            type: 1,        // ARMADA
        });


        successMsg.value = "Armada berhasil dihapus";
        setTimeout(() => successMsg.value = '', 2000);

    } catch (err) {
        console.error(err);
        errorMsg.value = 'Terjadi kesalahan saat menghapus';
        setTimeout(() => errorMsg.value = '', 2000);
    }
}

</script>

<style scoped>
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

.armada-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 16px;
    width: 100%;
}

/* --- FORM GRID DESKTOP --- */
.form-armada {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    margin-bottom: 24px;
}

.form-armada button {
    grid-column: span 2;
}

/* --- TABLE WRAPPER --- */
.table-wrapper {
    width: 100%;
    overflow-x: auto;
}

.table-armada {
    width: 100%;
    border-collapse: collapse;
}

.table-armada th,
.table-armada td {
    padding: 12px;
    border: 1px solid #ddd;
    text-align: left;
}

.table-armada th {
    background-color: #f5f5f5;
    font-weight: 600;
}

/* --- TEXT & ELEMENT DEFAULT --- */
input,
button {
    font-size: 1rem;
    padding: 10px;
}

button {
    min-height: 44px;
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

/* Error Alert */
.alert-error {
    background-color: #ff4d4f;
    color: white;
}

/* Success Alert */
.alert-success {
    background-color: #52c41a;
    color: white;
}

body,
input,
button,
table,
th,
td,
label,
h1,
h2,
h3,
p {
    font-family: 'Arial', sans-serif;
    font-size: 16px;
    /* default desktop */
}

/* =================================================
    ===== RESPONSIVE FOR MOBILE < 768PX =====
================================================= */
@media (max-width: 768px) {

    body,
    input,
    button,
    table,
    th,
    td,
    label,
    h1,
    h2,
    h3,
    p {
        font-size: clamp(12px, 2vw, 16px);
        /* 12px = minimum, 2vw = responsive, 16px = maximum */
    }

    .armada-page {
        padding: 8px;
    }

    .armada-page h2 {
        font-size: 1.25rem;
    }

    .form-armada {
        grid-template-columns: 1fr;
    }

    .form-armada {
        grid-template-columns: 1fr;
        gap: 12px;
    }

    .form-group {
        flex: 1 1 100%;
    }

    input,
    button {
        padding: 8px;
    }

    .table-armada th,
    .table-armada td {
        white-space: normal;
        word-break: break-word;
    }

    .alert {
        font-size: 0.9rem;
        padding: 10px 14px;
    }

}
</style>