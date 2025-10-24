<template>
    <div class="layout">
        <Sidebar />
        <main class="content">
            <slot />
        </main>
    </div>
</template>

<script setup>
import Sidebar from '../components/Sidebar.vue'
</script>

<style scoped>
.layout {
    display: flex;
    min-height: 100vh;
    background-color: #fefefe;
}

.content {
    flex: 1;
    padding: 20px;
}
@media (max-width: 768px) {
    .content {
        margin-top: 60px;
        /* sesuaikan tinggi sidebar navbar */
    }
}
</style>
