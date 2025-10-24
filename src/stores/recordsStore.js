// /src/stores/recordsStore.js
import { defineStore } from 'pinia'
import { supabase } from '../supabaseClient.js'
import { ref } from "vue";

export const useRecordsStore = defineStore("records", () => {
    const records = ref([]);
    const loading = ref(false);
    const errorMsg = ref("");

    async function loadRecords() {
        if (records.value.length > 0) return; // <-- biar tidak fetch lagi

        console.log("gg");

        loading.value = true;
        const { data, error } = await supabase
            .from("records")
            .select(`
                id,
                created_by,
                action_type,
                type,
                created_at,
                users:created_by (username, role)
            `)
            .order("created_at", { ascending: true });

        loading.value = false;

        if (error) {
            errorMsg.value = "Gagal memuat records";
            return;
        }

        records.value = data.map((d) => ({
            ...d,
            created_by_name: d.users?.username || "Unknown",
            created_by_role: d.users?.role || "Unknown",
        }));
    }

    async function deleteRecord(id) {
        const { error } = await supabase.from("records").delete().eq("id", id);
        if (!error) {
            records.value = records.value.filter((r) => r.id !== id);
        }
    }

    return {
        records,
        loading,
        errorMsg,
        loadRecords,
        deleteRecord,
    };
});
