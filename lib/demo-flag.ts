// The public demo: a made-up household, kept in each visitor's browser, no sign-in and no bank.
// Set NEXT_PUBLIC_KOPIKAS_DEMO=1 on its own deployment; it is off everywhere else. Its own module,
// so the pages can ask without taking the demo's data along.
export const DEMO = process.env.NEXT_PUBLIC_KOPIKAS_DEMO === "1";
