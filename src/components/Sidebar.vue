<template>
    <aside class="sidebar">
        <ul>
            <li><router-link to="/dashboard">Dashboard</router-link></li>
            <li><router-link to="/armada">Armada</router-link></li>
            <li><router-link to="/stok-masuk">Stok In</router-link></li>
            <li><router-link to="/history">Histori</router-link></li>
            <li><router-link to="/users">Akun</router-link></li>
        </ul>
    </aside>
</template>

<script setup>
</script>

<style scoped>
.sidebar {
    width: 200px;
    background: #2c3e50;
    color: white;
    height: 100vh;
    padding: 20px;
}

.sidebar ul {
    list-style: none;
    padding: 0;
}

.sidebar li {
    margin: 15px 0;
}

.sidebar a {
    color: white;
    text-decoration: none;
}

.sidebar a.router-link-active {
    font-weight: bold;
    color: #42b983;
}

/* ============================
        MOBILE MODE
============================ */
@media (max-width: 768px) {
    .sidebar {
        width: 100%;
        height: auto;
        padding: 10px;
        position: fixed;
        top: 0;
        left: 0;
        z-index: 999;
    }

    .sidebar ul {
        display: flex;
        justify-content: space-around;
        align-items: center;
    }

    .sidebar li {
        margin: 0;
    }

    .sidebar a {
        font-size: 0.9rem;
        padding: 8px;
        display: block;
    }
}
</style>
