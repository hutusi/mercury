// Bootstrap/administer the admin role: `bun run admin:grant <email> [--revoke]`.
// Role promotion deliberately has no UI (the first admin can't have an admin
// session, and self-service role edits are a footgun — ADR 0025), so this
// script writes user.role directly. It targets whatever DATABASE_URL points at;
// run it against prod only deliberately.
import { Pool } from "pg";

const USAGE = "Usage: bun run admin:grant <email> [--revoke]";

/**
 * Strict by design: a mistyped flag (e.g. --revkoe) must fail loudly, not
 * silently fall through to the grant path.
 */
function parseArgs(argv: string[]): { email: string; revoke: boolean } {
  let email: string | null = null;
  let revoke = false;
  for (const arg of argv) {
    if (arg === "--revoke") {
      revoke = true;
    } else if (arg.startsWith("-")) {
      console.error(`Unknown flag: ${arg}\n${USAGE}`);
      process.exit(1);
    } else if (email === null) {
      email = arg;
    } else {
      console.error(`Unexpected argument: ${arg}\n${USAGE}`);
      process.exit(1);
    }
  }
  if (!email) {
    console.error(USAGE);
    process.exit(1);
  }
  return { email, revoke };
}

async function main() {
  const { email, revoke } = parseArgs(process.argv.slice(2));

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
