import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { decryptText } from "./crypto.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const ENCRYPTION_KEY = Deno.env.get("ENCRYPTION_KEY");
if (!ENCRYPTION_KEY) {
  throw new Error("Missing ENCRYPTION_KEY env");
}

Deno.serve(async (req) => {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return new Response(JSON.stringify({ error: 'missing token' }), { status: 401 });

    const { data: callerUser, error: callerErr } = await supabase.auth.getUser(token);
    if (callerErr || !callerUser?.user) {
      return new Response(JSON.stringify({ error: 'invalid token' }), { status: 401 });
    }
    const callerId = callerUser.user.id;

    // ensure caller is ADMIN
    const { data: callerRow } = await supabase
      .from('users')
      .select('role')
      .eq('auth_user_id', callerId)
      .single();
    if (!callerRow || callerRow.role !== 'ADMIN') {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
    }

    const body = await req.json();
    const { username } = body;
    if (!username) return new Response(JSON.stringify({ error: 'username required' }), { status: 400 });

    const { data } = await supabase
      .from('users')
      .select('id, username, password_encrypted')
      .eq('username', username)
      .single();

    if (!data) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });

    const decrypted = await decryptText(data.password_encrypted, ENCRYPTION_KEY);

    // log the action
    await supabase.from('records').insert([{
      created_by: callerId,
      action: 'VIEW_PASSWORD',
      target_type: 'USER',
      target_id: data.id,
      meta: { username }
    }]);

    return new Response(JSON.stringify({ username: data.username, password: decrypted }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});