// Do the kit's colour variables still hold the code's values? Each variable's code syntax says which
// code token it copies; CODE holds the code's values (gen-calls.mjs drift reads them from globals.css and
// painted.tsx), a theme pair where light and dark differ. Read-only: it reports, it changes nothing.
const vars = await figma.variables.getLocalVariablesAsync("COLOR");
const hex = (c) => "#" + ["r", "g", "b"].map((k) => Math.round(c[k] * 255).toString(16).padStart(2, "0")).join("");
const drift = [], unknown = [], unnamed = [], used = new Set();
let checked = 0;
for (const v of vars) {
  const web = v.codeSyntax?.WEB;
  if (!web) { unnamed.push(v.name); continue; }
  let want = CODE[web];
  if (want && typeof want === "object") want = want[v.name.startsWith("dark/") ? "dark" : "light"];
  if (!want) { unknown.push(`${v.name}: ${web}`); continue; }
  used.add(web);
  checked++;
  const value = Object.values(v.valuesByMode)[0];
  const have = value?.type === "VARIABLE_ALIAS" ? "an alias" : hex(value);
  if (have.toLowerCase() !== want.toLowerCase()) drift.push(`${v.name} (${web}): Figma ${have}, code ${want.toLowerCase()}`);
}
// globals.css colours no variable copies: new tokens to add, or states (hover) the kit leaves out.
const notInFigma = Object.keys(CODE).filter((k) => k.startsWith("var(--color-") && !used.has(k));
const result = { inStep: !drift.length && !unknown.length && !unnamed.length, checked, drift, unknown, unnamed, notInFigma };
