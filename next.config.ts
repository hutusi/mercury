import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` appends a managed block to AGENTS.md when it detects a coding
  // agent. AGENTS.md here is hand-curated project guidance; keep it that way.
  agentRules: false,
};

export default nextConfig;
