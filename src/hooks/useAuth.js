import { supabase } from '../supabaseClient.js'
import { ref } from 'vue'

export const user = ref(null)

export async function checkSession() {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
        user.value = data.session.user
        return true
    }
    return false
}
