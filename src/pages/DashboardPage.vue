<template>
    <Layout>
        <div class="layout">
            <Sidebar />
            <main class="content">
                <h1>Dashboard</h1>

                <div class="dashboard-cards">
                    <div class="card">
                        <h3>Total Kiriman Masuk Keseluruhan</h3>
                        <p>{{ totalKiriman }}</p>
                    </div>
                    <div class="card">
                        <h3>Total Volume Keseluruhan</h3>
                        <p>{{ totalVolume.toFixed(2) }} m³</p>
                    </div>
                    <div class="card">
                        <h3>Total Ritase</h3>
                        <p>{{ totalRitase }}</p>
                    </div>
                    <div class="card">
                        <h3>Rekap Kiriman Hari Ini</h3>
                        <p>{{ totalHariIni }}</p>
                    </div>
                    <div class="card">
                        <h3>Jumlah Volume Hari Ini</h3>
                        <p>{{ totalVolumeHariIni }}</p>
                    </div>
                </div>

                <div class="table-wrapper">
                    <h2>10 Kiriman Terbaru</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Nopol</th>
                                <th>Supplier</th>
                                <th>P (cm)</th>
                                <th>L (cm)</th>
                                <th>T (cm)</th>
                                <th>Plus (cm)</th>
                                <th>Volume (m³)</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="k in kirimanTerbaru" :key="k.id">
                                <td>{{ k.armada.nopol }}</td>
                                <td>{{ k.supplier }}</td>
                                <td>{{ k.armada.panjang }}</td>
                                <td>{{ k.armada.lebar }}</td>
                                <td>{{ k.armada.tinggi }}</td>
                                <td>{{ k.plus }}</td>
                                <td>{{ (k.volume).toFixed(2) }}</td>
                                <td>{{ formatDate(k.created_at) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

            </main>
        </div>
    </Layout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Layout from '@/layouts/Layout.vue'
import { supabase } from '../supabaseClient'

const totalKiriman = ref(0)
const totalVolume = ref(0)
const totalRitase = ref(0)
const totalHariIni = ref(0)
const totalVolumeHariIni = ref(0)
const kirimanTerbaru = ref([])

onMounted(async () => {
    // Total kiriman s/d hari ini
    const { count: totalCount } = await supabase
        .from('kiriman')
        .select('*', { count: 'exact', head: true })
    totalKiriman.value = totalCount || 0

    // Total volume
    const { data: volData } = await supabase
        .from('kiriman')
        .select('volume')
    totalVolume.value = volData?.reduce((sum, row) => sum + (row.volume || 0), 0) || 0

    // Total ritase (jumlah armada)
    const { count: armadaCount } = await supabase
        .from('armada')
        .select('*', { count: 'exact', head: true })
    totalRitase.value = armadaCount || 0

    // Rekap hari ini
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { data: hariIniData } = await supabase
        .from('kiriman')
        .select('*')
        .gte('created_at', today.toISOString())
    totalHariIni.value = hariIniData?.length || 0

    // Total volume hari ini
    totalVolumeHariIni.value = hariIniData?.reduce((sum, k) => sum + (k.volume || 0), 0) || 0

    // 10 kiriman terbaru
    const { data: latest } = await supabase
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
        .limit(10)
    kirimanTerbaru.value = latest || []
})

function formatDate(date) {
    if (!date) return ''
    const d = new Date(date)
    return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()} | ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}
</script>

<style scoped>
.content {
    padding: 16px;
}

.dashboard-cards {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 24px;
}

.card {
    flex: 1 1 200px;
    padding: 16px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: #f5f5f5;
    text-align: center;
}

.table-wrapper {
    overflow-x: auto;
}

table {
    width: 100%;
    border-collapse: collapse;
}

th,
td {
    padding: 10px;
    border: 1px solid #ddd;
    text-align: left;
    white-space: nowrap;
}

th {
    background: #f5f5f5;
    font-weight: 600;
}

/* responsive untuk mobile */
@media(max-width:768px) {
    .content {
        padding: 8px;
        /* lebih kecil dari desktop */
    }

    .dashboard-cards {
        flex-direction: column;
        gap: 12px;
    }

    .card {
        flex: 1 1 auto;
        /* hapus minimal 200px */
        width: 100%;
        /* card ambil full width container */
        padding: 10px;
        /* lebih ramping */
        font-size: 0.85rem;
        /* lebih kecil */
    }

    table th,
    table td {
        font-size: 0.7rem;
        /* tabel lebih ringkas */
        padding: 4px 6px;
    }
}
</style>
