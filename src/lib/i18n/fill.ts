/**
 * Interpolate `{name}` placeholders in a dictionary string:
 * fill("第 {i} 站，共 {n} 站", { i: 2, n: 4 }) → "第 2 站，共 4 站".
 * Dictionaries stay plain strings (the Dictionary type is DeepString), so
 * word order can differ per locale. Unknown placeholders are left visible.
 */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
