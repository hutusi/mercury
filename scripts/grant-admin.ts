// Bootstrap/administer the admin role: `bun run admin:grant <email> [--revoke]`.
// Role promotion deliberately has no UI (the first admin can't have an admin
// session, and self-service role edits are a footgun — ADR 0025), so this
// script writes user.role directly. It targets whatever DATABASE_URL points at;
// run it against prod only deliberately.
import { Pool } from "pg";

async function main() {
  const args = process.argv.slice(2);
  const revoke = args.includes("--revoke");
  const email = args.find((a) => !a.startsWith("--"));
  if (!email) {
    console.error("Usage: bun run admin:grant <email> [--revoke]");
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL must be set");

  const pool = new Pool({ connectionString });
  try {
    // null (not 'user') on revoke: null already means the plugin's defaultRole.
    const role = revoke ? null : "admin";
    const result = await pool.query(
      'update "user" set role = $1, updated_at = now() where email = $2 returning id, name',
      [role, email],
    );
    if (result.rowCount === 0) {
      console.error(`No user found with email ${email}`);
      process.exit(1);
    }
    const { id, name } = result.rows[0] as { id: string; name: string };
    console.log(`${revoke ? "Revoked admin from" : "Granted admin to"} ${name} (${id}).`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("admin:grant failed:", error);
  process.exit(1);
});
