/**
 * Daybreak brand colours as hex, for the few surfaces that can't read CSS
 * variables: the viewport theme-color, the web manifest, the generated
 * Open Graph image, and the icon. Kept in step with the OKLCH tokens in
 * src/app/globals.css (converted from them; comments name the token).
 */
export const BRAND_COLORS = {
  /** --background, light (oklch 0.968 0.008 80). */
  paper: "#f7f4ef",
  /** --background, dark (oklch 0.185 0.012 262). */
  paperDark: "#101318",
  /** --card, light (oklch 0.988 0.004 80). */
  surface: "#fcfbf8",
  /** --foreground, light (oklch 0.25 0.02 260). */
  ink: "#1c222b",
  /** --muted-foreground, light (oklch 0.48 0.02 260). */
  inkMuted: "#575e69",
  /** --brand, light (oklch 0.5 0.13 255) — dusk blue. */
  brand: "#2863ab",
  /** --coral, light (oklch 0.55 0.14 38). */
  coral: "#b44e2e",
} as const;
