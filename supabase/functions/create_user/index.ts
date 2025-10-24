
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { encryptText } from "./crypto.ts";
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
    // optional: verify token and ensure caller is ADMIN
    if (!token) return new Response(JSON.stringify({ error: 'missing token' }), { status: 401 });

    // Verify token and check role: call supabase Admin to get user
    const { data: callerUser, error: callerErr } = await supabase.auth.getUser(token);
    if (callerErr || !callerUser?.user) {
      return new Response(JSON.stringify({ error: 'invalid token' }), { status: 401 });
    }
    const callerId = callerUser.user.id;
    // ensure caller is ADMIN: query users table
    const { data: callerRow } = await supabase
      .from('users')
      .select('role')
      .eq('auth_user_id', callerId)
      .single();
    if (!callerRow || callerRow.role !== 'ADMIN') {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
    }

    const body = await req.json();
    const { username, password, role } = body;
    if (!username || !password || !role) {
      return new Response(JSON.stringify({ error: 'username, password, role required' }), { status: 400 });
    }

    const email = `${username}@dummy.internal`;

    // create user in Supabase Auth using service role
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (authErr) {
      return new Response(JSON.stringify({ error: authErr.message }), { status: 400 });
    }

    const userId = authData.user.id;

    // encrypt password
    const encrypted = await encryptText(password, ENCRYPTION_KEY);

    // insert app user record
    const { error: insertErr } = await supabase
      .from('users')
      .insert([{ auth_user_id: userId, username, role, password_encrypted: encrypted }]);

    if (insertErr) {
      // try cleanup: delete auth user
      await supabase.auth.admin.deleteUser(userId).catch(() => { });
      return new Response(JSON.stringify({ error: insertErr.message }), { status: 500 });
    }

    await supabase.from('records').insert([{
      created_by: callerId,
      action: 'ADD',
      target_type: 'USER',
      target_id: null,
      meta: { username, role }
    }]);

    return new Response(JSON.stringify({ success: true, username, role }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});