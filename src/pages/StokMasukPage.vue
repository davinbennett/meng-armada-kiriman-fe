<template>
    <Layout>
        <div class="stok-page">
            <div class="page-header">
                <h2>Stok Masuk / Kiriman</h2>
                <button class="export-btn" @click="exportExcel">Export</button>
            </div>


            <!-- FILTER -->
            <div class="filter">
                <div class="filter-item">
                    <label>Per Tanggal:</label>
                    <input type="date" v-model="filterDate" @change="loadKiriman" />
                </div>
                <div class="filter-item">
                    <label>Search:</label>
                    <input type="text" v-model="searchTerm" placeholder="Nopol / Supplier" @input="filterTable" />
                </div>
            </div>


            <!-- FORM INPUT -->
            <div v-if="role === 'ADMIN' || role === 'OPERATOR'">
                <h3 class="form-title">Tambah Data Stok</h3>
                <form @submit.prevent="addKiriman" class="form-stok">
                    <div class="form-group">
                        <label>Nopol</label>
                        <v-select v-model="selectedNopol" :options="filteredArmadas" label="nopol" :reduce="a => a.id"
                            @search="val => search = val" placeholder="Pilih / Cari Nopol" />
                    </div>

                    <div class="form-group">
                        <label>Plus (cm)</label>
                        <input type="number" v-model.number="plus" min="0" />
                    </div>

                    <div class="form-group">
                        <label>Supplier</label>
                        <input type="text" v-model="supplier" required />
                    </div>

                    <button type="submit">Simpan & Print</button>
                </form>
            </div>

            <!-- TOAST -->
            <div v-if="errorMsg" class="toast error">{{ errorMsg }}</div>
            <div v-if="successMsg" class="toast success">{{ successMsg }}</div>

            <!-- TABLE -->
            <div class="table-wrapper">
                <table class="table-stok" ref="stokTable">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Supplier</th>
                            <th>Nopol</th>
                            <th>P (cm)</th>
                            <th>L (cm)</th>
                            <th>T (cm)</th>
                            <th>Plus (cm)</th>
                            <th>Volume (m³)</th>
                            <th>Total Print</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="k in filteredKiriman" :key="k.id">
                            <td>{{ formatDate(k.created_at) }}</td>
                            <td>{{ k.supplier }}</td>
                            <td>{{ k.armada.nopol }}</td>
                            <td>{{ k.armada.panjang }}</td>
                            <td>{{ k.armada.lebar }}</td>
                            <td>{{ k.armada.tinggi }}</td>
                            <td>{{ k.plus }}</td>
                            <td>{{ k.volume }}</td>
                            <td>{{ k.total_print }}</td>
                            <td>
                                <div class="action-buttons">
                                    <button @click="printRow(k)">Print</button>
                                    <button v-if="role === 'ADMIN' || role === 'OPERATOR'" class="delete-btn"
                                        @click="deleteKiriman(k.id)">Hapus</button>
                                </div>
                            </td>

                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="totals">
                <p>Total Data: {{ filteredKiriman.length }}</p>
                <p>Total Volume: {{ totalVolume }}</p>
            </div>
        </div>
    </Layout>
</template>

<script setup>
import Layout from '@/layouts/Layout.vue'
import { ref, onMounted, computed, watch } from 'vue'
import { supabase } from '../supabaseClient'
import { jsPDF } from "jspdf" // npm install jspdf
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'

const stokTable = ref(null)

function exportExcel() {
    // 1) Ambil DOM tabel
    const wb = XLSX.utils.table_to_book(stokTable.value, { sheet: 'Kiriman' })

    // 2) Konversi ke file Excel
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })

    // 3) Simpan file
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    const today = new Date().toISOString().split('T')[0] // yyyy-mm-dd
    saveAs(blob, `kiriman_${today}.xlsx`)
}

// STATE
const armadas = ref([])
const kiriman = ref([])
const filteredKiriman = ref([])
const filterDate = ref('')
const searchTerm = ref('')
const role = ref('')
const search = ref("")

// FORM STATE
const selectedNopol = ref('')
const plus = ref(0)
const supplier = ref('')

// TOAST
const errorMsg = ref('')
const successMsg = ref('')

const filteredArmadas = computed(() => {
    // filter berdasarkan input search
    const f = armadas.value.filter(a =>
        a.nopol.toLowerCase().includes(search.value.toLowerCase())
    )
    // limit 10 hasil pertama
    return f.slice(0, 10)
})

// USER ID (ambil dari session supabase)
let currentUserId = null
onMounted(async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) currentUserId = data.session.user.id

    const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('auth_user_id', currentUserId)
        .single()

    role.value = userData?.role || 'Unknown'
    await loadArmadas()
    await loadKiriman()
})

// LOAD ARMADA
async function loadArmadas() {
    const { data, error } = await supabase.from('armada').select('*').order('created_at', { ascending: false })
    if (!error) armadas.value = data
}

// LOAD KIRIMAN
async function loadKiriman() {
    let query = supabase
        .from('kiriman')
        .select(`
            id,
            supplier,
            plus,
            volume,
            total_print,
            created_at,
            armada:armada_id (
                id,
                nopol,
                panjang,
                lebar,
                tinggi
            )
        `)
        .order('created_at', { ascending: false })

    if (filterDate.value) {
        const start = `${filterDate.value}T00:00:00Z`
        const end = `${filterDate.value}T23:59:59Z`
        query = query.gte('created_at', start).lte('created_at', end)
    }

    const { data, error } = await query

    if (!error) {
        kiriman.value = data
        filterTable()
    }
}


let debounceTimeout = null

watch(searchTerm, (newVal) => {
    clearTimeout(debounceTimeout)
    debounceTimeout = setTimeout(() => {
        console.log("S");

        loadKiriman()
    }, 1000) // tunggu 500ms setelah user berhenti mengetik
})

// Watch filterDate langsung panggil loadKiriman
watch(filterDate, () => {
    loadKiriman()
})


// FILTER TABLE
function filterTable() {
    if (!searchTerm.value) {
        filteredKiriman.value = kiriman.value
        return
    }

    const term = searchTerm.value.toLowerCase()
    filteredKiriman.value = kiriman.value.filter(k =>
        k.supplier.toLowerCase().includes(term) ||
        k.armada.nopol.toLowerCase().includes(term)
    )
}

// TOTAL VOLUME
const totalVolume = computed(() => filteredKiriman.value.reduce((sum, k) => sum + k.volume, 0))

// FORMAT DATE
function formatDate(dt) {
    const d = new Date(dt)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')} | ${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`
}

// ADD KIRIMAN
async function addKiriman() {
    if (!selectedNopol.value || !supplier.value) {
        errorMsg.value = "Nopol & Supplier wajib diisi"
        setTimeout(() => errorMsg.value = '', 2000)
        return
    }

    // Ambil dimensi armada
    const arm = armadas.value.find(a => a.id === selectedNopol.value)
    if (!arm) {
        errorMsg.value = "Armada tidak ditemukan"
        setTimeout(() => errorMsg.value = '', 2000)
        return
    }

    const tinggiTotal = arm.tinggi + plus.value
    const volume = (arm.panjang * arm.lebar * tinggiTotal) / 1000000 // dalam m3

    // Insert DB
    const { data, error } = await supabase.from('kiriman').insert({
        armada_id: selectedNopol.value,
        supplier: supplier.value,
        plus: plus.value,
        volume: volume,
        total_print: 1, // langsung 1 karena akan di-print
    })

    if (error) {
        errorMsg.value = "Gagal menyimpan kiriman"
        setTimeout(() => errorMsg.value = '', 2000)
        return
    }

    // Insert ke records
    await supabase.from('records').insert({
        created_by: currentUserId,
        action_type: 1, // ADD
        type: 2,        // KIRIMAN
    })

    successMsg.value = "Berhasil disimpan"
    setTimeout(() => successMsg.value = '', 2000)

    // Reset form
    selectedNopol.value = ''
    plus.value = 0
    supplier.value = ''

    await loadKiriman()
}

// DELETE KIRIMAN
async function deleteKiriman(id) {
    if (!confirm("Yakin ingin menghapus kiriman?")) return

    const { error } = await supabase.from('kiriman').delete().eq('id', id)
    if (error) {
        errorMsg.value = "Gagal menghapus"
        setTimeout(() => errorMsg.value = '', 2000)
        return
    }

    // Insert ke records
    await supabase.from('records').insert({
        created_by: currentUserId,
        action_type: 3, // DELETE
        type: 2,        // KIRIMAN
    })

    successMsg.value = "Berhasil dihapus"
    setTimeout(() => successMsg.value = '', 2000)
    await loadKiriman()
}

// PRINT PER ROW
async function printRow(row) {
    const doc = new jsPDF()
    doc.text(`Kiriman Nopol: ${row.nopol}`, 10, 10)
    doc.text(`Supplier: ${row.supplier}`, 10, 20)
    doc.text(`P: ${row.panjang} | L: ${row.lebar} | T: ${row.tinggi} | Plus: ${row.plus}`, 10, 30)
    doc.text(`Volume: ${row.volume}`, 10, 40)
    doc.save(`kiriman_${row.nopol}.pdf`)

    // Increment total print
    await supabase.from('stok_masuk').update({
        total_print: row.total_print + 1
    }).eq('id', row.id)

    await loadKiriman()
}
</script>

<style scoped>
.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.page-header h2 {
    font-size: 1.5rem;
}

.export-btn {
    padding: 6px 12px;
    font-size: 0.9rem;
    background-color: #36996f;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.export-btn:hover {
    background-color: #2b7a55;
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

.stok-page {
    max-width: 1200px;
    margin: auto;
    padding: 16px;
    box-sizing: border-box;
}

/* FILTER jadi satu row */
.filter {
    display: flex;
    flex-direction: row;
    gap: 12px;
    align-items: flex-end;
    flex-wrap: wrap;
    margin-bottom: 16px;
}

.filter-item {
    display: flex;
    flex-direction: column;
    flex: 1 1 150px;
    /* bisa mengecil sampai 150px */
}

.filter-item label {
    font-weight: 500;
    margin-bottom: 4px;
}

.filter-item input,
.filter-item select {
    padding: 6px;
    font-size: 1rem;
    width: 100%;
    box-sizing: border-box;
}

/* FORM TITLE */
.form-title {
    margin-bottom: 12px;
    font-size: 1.25rem;
    font-weight: 600;
}

/* FORM GRID DESKTOP */
.form-stok {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 16px;
}

.form-stok button {
    grid-column: span 3;
    padding: 8px;
    font-size: 1rem;
}

.form-stok button:hover {
    background: #36996f;
}

/* --- TABEL --- */
.table-wrapper {
    width: 100%;
    overflow-x: auto;
}

.table-stok {
    border-collapse: collapse;
    width: max-content;
    /* tabel mengikuti isi, jangan paksa 100% */
    min-width: 100%;
    /* tetap stretch minimal container */
}

.table-stok th,
.table-stok td {
    padding: 12px;
    border: 1px solid #ddd;
    text-align: left;
    white-space: nowrap;
    /* tetap scroll horizontal */
}

.table-stok th {
    background: #f5f5f5;
    font-weight: 600;
}

.toast {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 18px;
    border-radius: 6px;
    font-weight: 500;
    z-index: 9999;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.toast.error {
    background: #ff4d4f;
    color: white;
}

.toast.success {
    background: #52c41a;
    color: white;
}

.action-buttons {
    display: flex;
    gap: 8px;
    /* jarak antar button */
}

/* RESPONSIVE */
@media (max-width: 768px) {
    .filter {
        flex-wrap: wrap;
        gap: 8px;
    }

    .form-stok {
        grid-template-columns: 1fr;
        gap: 8px;
    }

    .form-stok button {
        grid-column: span 1;
    }

    input,
    select,
    button {
        font-size: 0.85rem;
        /* bisa lebih kecil */
        padding: 4px;
    }

    .table-stok th,
    .table-stok td {
        font-size: 0.75rem;
        padding: 6px;
    }
}
</style>
