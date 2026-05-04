import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supa = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supa.auth.admin.listUsers();
if (error) {
  console.error("listUsers error:", error.message, error);
  process.exit(1);
}

console.log(`Found ${data.users.length} user(s):`);
for (const u of data.users) {
  const status = u.email_confirmed_at ? "✓ confirmed" : "✗ unconfirmed";
  console.log(` - ${u.email}  (${status})  id=${u.id}`);

  if (!u.email_confirmed_at) {
    const r = await supa.auth.admin.updateUserById(u.id, { email_confirm: true });
    if (r.error) console.error("   ! confirm failed:", r.error.message);
    else console.log("   → confirmed now");
  }
}

console.log("Done.");
process.exit(0);
