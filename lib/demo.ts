import type { Db, Rule, Settlement, Share, Snapshot, Subscription, Tx } from "./types";
import type { LhvAccount } from "./lhv";
import { DEFAULT_CATEGORIES, SAVINGS, SUBSCRIPTIONS } from "./engine.ts";

// The public demo's household (lib/demo-flag.ts says when it is on): made up, and the same for
// every visitor until they change it in their own browser.

const EVERYDAY = "EE00DEMO0000000001";
const SAVINGS_IBAN = "EE00DEMO0000000002";

export const DEMO_ACCOUNTS: LhvAccount[] = [
  { iban: EVERYDAY, name: "Everyday", currency: "EUR", balance: 2134.58 },
  { iban: SAVINGS_IBAN, name: "Savings", currency: "EUR", balance: 6820.0 },
];

// The only favicons the demo's server fetches: the shops in its own data.
export const DEMO_DOMAINS = new Set([
  "spotify.com", "netflix.com", "icloud.com", "apple.com", "google.com", "wolt.com", "bolt.eu", "telia.ee", "rimi.ee",
  "selver.ee", "coop.ee", "prismamarket.ee", "circlek.ee", "lightyear.com", "kaubamaja.ee", "apotheka.ee", "energia.ee",
  "vapiano.ee", "lhv.ee", "ikea.com", "zooplus.ee", "tallinnavesi.ee", "1password.com", "apollo.ee", "benu.ee",
]);

// The same numbers on every visit and on both sides of the page (the server draws the first
// board, the browser makes the changes), so the randomness is seeded, never Math.random.
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// About thirteen months of a two-person household, dated from `today` back. A charge has a day of
// its month; in the month under way, the days so far hold the start of the month (never fewer
// than twelve days' worth), so the board is never bare on the 2nd.
export function demoDb(today = new Date()): Db {
  const rnd = seeded(20261102);
  const between = (a: number, b: number) => Math.round((a + (b - a) * rnd()) * 100) / 100;
  const y = today.getUTCFullYear(), m = today.getUTCMonth(), d = today.getUTCDate();
  const transactions: Tx[] = [];
  const iso = (ago: number, day: number) => {
    const first = new Date(Date.UTC(y, m - ago, 1));
    const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    let dd = Math.min(day, last);
    if (ago === 0) {
      const span = Math.max(d, 12);
      if (dd > span) return null;
      dd = Math.max(1, Math.ceil((dd * d) / span));
    }
    return `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  };
  const addOn = (date: string, amount: number, counterparty: string, description = "Card payment") => {
    const tx: Tx = { id: `demo-${String(transactions.length + 1).padStart(4, "0")}`, date, amount, currency: "EUR", counterparty, description, iban: EVERYDAY };
    transactions.push(tx);
    return tx;
  };
  const add = (ago: number, day: number, amount: number, counterparty: string, description = "Card payment") => {
    const date = iso(ago, day);
    return date ? addOn(date, amount, counterparty, description) : null;
  };
  const monthName = (ago: number) => new Date(Date.UTC(y, m - ago, 1)).toISOString().slice(0, 7).split("-").reverse().join("/");

  // What the bank sends every month, filed by rules the household taught long ago.
  for (let ago = 12; ago >= 0; ago--) {
    const winter = [0, 1, 2, 10, 11].includes(new Date(Date.UTC(y, m - ago, 1)).getUTCMonth()) ? 1 : 0;
    add(ago, 28, 2890, "Tööandja OÜ", `Palk ${monthName(ago)}`);
    add(ago, 6, -300, "Lightyear Europe AS", "Deposit");
    add(ago, 15, -Math.round((212 - (12 - ago) * 0.9) * 100) / 100, "AS LHV Pank", "Kodulaen intress 0442817");
    for (const day of [2, 9, 16, 23, 29]) add(ago, day, -between(21, 68), "Rimi Eesti Food AS");
    for (const day of [5, 19]) add(ago, day, -between(18, 54), "Selver AS");
    add(ago, 12, -between(35, 82), "Prisma Peremarket AS");
    add(ago, 21, -between(9, 31), "Coop Eesti");
    for (const day of [3, 17, 25]) add(ago, day, -between(15, 29), "Wolt Eesti OÜ", `Order ${4100 + Math.floor(rnd() * 5000)}`);
    if (ago % 2 === 0) add(ago, 11, -between(24, 41), "Vapiano Tallinn");
    for (const day of [4, 13, 27]) add(ago, day, -between(4.5, 13.9), `BOLT.EU/O/${String(day).padStart(2, "0")}${String(((m - ago) % 12 + 12) % 12 + 1).padStart(2, "0")}`, "Ride");
    if (ago % 2 === 1) add(ago, 10, -between(44, 63), "Circle K Eesti AS", "Kütus");
    add(ago, 20, -Math.round((between(41, 52) + winter * between(28, 44)) * 100) / 100, "Eesti Energia AS", `Elekter ${monthName(ago)}`);
    add(ago, 14, -24.9, "Telia Eesti AS", "Mobiil ja internet 5512907");
    add(ago, 18, -between(19, 27), "AS Tallinna Vesi", `Vesi ${monthName(ago)}`);
    if (ago % 3 === 1) add(ago, 24, -between(38, 164), "IKEA Eesti OÜ");
    if (ago % 3 !== 2) add(ago, 7, -between(6, 24), "Apotheka");
    add(ago, 16, -between(32, 47), "Zooplus SE", "Kassitoit");
    if (ago % 2 === 0) add(ago, 22, -between(39, 118), "Kaubamaja AS");
    if (ago % 4 === 3) add(ago, 26, -40, "Sularahaautomaat", "Sularaha väljavõtt");
    // Subscriptions. Netflix went up two months ago; YouTube stopped three months ago.
    add(ago, 5, ago <= 2 ? -13.99 : -12.99, "NETFLIX.COM", "Netflix subscription");
    add(ago, 12, -0.99, "APPLE.COM/BILL", "iCloud+ 50GB");
    if (ago > 3) add(ago, 9, -13.99, "GOOGLE *YouTube Premium", "Subscription payment");
  }
  add(10, 3, -35.88, "1PASSWORD", "1Password Families yearly");
  // Spotify counts back from today, 26 days and then every 30, so it is always due in four days.
  for (let k = 11; k >= 0; k--) addOn(new Date(today.getTime() - (26 + 30 * k) * 86400000).toISOString().slice(0, 10), -11.99, "Spotify AB", "Spotify Premium");

  // The loose change: shops nobody has taught Kopikas yet. The dry cleaner has five, two of them
  // this month, so Always files a handful at once; its newest is the newest of all (the latest day,
  // the last made), so it leads the phone's queue.
  const loose: [ago: number, day: number, amount: number, counterparty: string, description?: string][] = [
    [0, 2, -6.8, "Kohvik Komeet"],
    [0, 8, -12.4, "Kohvik Komeet"],
    [1, 6, -9.9, "Kohvik Komeet"],
    [1, 24, -14.2, "Kohvik Komeet"],
    [0, 5, -21.95, "Rahva Raamat AS"],
    [2, 19, -16.5, "Rahva Raamat AS"],
    [0, 7, -8.4, "Benu Apteek"],
    [1, 11, -15.2, "Benu Apteek"],
    [3, 4, -6.3, "Benu Apteek"],
    [0, 11, -26, "Tallinna Loomaaed", "Piletid 2 täiskasvanut"],
    [3, 20, -18, "Pesumaja Puhas OÜ"],
    [2, 9, -31, "Pesumaja Puhas OÜ"],
    [1, 14, -18, "Pesumaja Puhas OÜ"],
    [0, 3, -18, "Pesumaja Puhas OÜ"],
    [0, 12, -24.5, "Pesumaja Puhas OÜ"],
  ];
  for (const [ago, day, amount, who, what] of loose) add(ago, day, amount, who, what);

  // Pooleks: the groceries and the electricity are halved, and Mari paid for the theatre and a
  // weekend's shopping herself. She paid the tab off five weeks ago.
  const at = (date: string) => `${date}T09:00:00.000Z`;
  const shares: Share[] = [];
  const recent = transactions.filter((t) => t.date >= (iso(2, 1) ?? ""));
  for (const t of recent.filter((t) => /Rimi|Selver|Eesti Energia/.test(t.counterparty)))
    shares.push({ id: `demo-share-${t.id}`, paidBy: "owner", txId: t.id, partnerShare: 0.5, createdAt: at(t.date) });
  const theatre = iso(1, 13)!, market = iso(2, 22)!;
  shares.push(
    { id: "demo-share-theatre", paidBy: "partner", manual: { date: theatre, description: "Vanemuise piletid", amount: 52, category: "Other" }, partnerShare: 0.5, createdAt: at(theatre) },
    { id: "demo-share-market", paidBy: "partner", manual: { date: market, description: "Balti jaama turg", amount: 37.8, category: "Groceries" }, partnerShare: 0.5, createdAt: at(market) }
  );
  const repaid = iso(1, Math.max(1, d - 4))!;
  const repayment = add(1, Math.max(1, d - 4), 146.3, "Mari Tamm", "Pooleks");
  const settlements: Settlement[] = [
    { id: "demo-stl-1", amount: 146.3, date: repaid, txId: repayment?.id, recordedBy: "partner" },
  ];

  const rule = (match: string, category: string): Rule => ({ id: `demo-rule-${match.replace(/\W+/g, "-")}`, match, category, createdAt: at(iso(12, 1)!) });
  const rules = [
    rule("lightyear", SAVINGS),
    rule("kodulaen", "Mortgage"),
    rule("rimi", "Groceries"),
    rule("selver", "Groceries"),
    rule("prisma", "Groceries"),
    rule("coop", "Groceries"),
    rule("wolt", "Eating out"),
    rule("vapiano", "Eating out"),
    rule("bolt.eu", "Transport"),
    rule("circle k", "Transport"),
    rule("eesti energia", "Utilities"),
    rule("telia", "Utilities"),
    rule("tallinna vesi", "Utilities"),
    rule("ikea", "Home"),
    rule("apotheka", "Health"),
    rule("zooplus", "Pets"),
    rule("kaubamaja", "Shopping"),
    rule("sularaha", "Cash"),
    rule("netflix", SUBSCRIPTIONS),
    rule("spotify", SUBSCRIPTIONS),
    rule("apple.com/bill", SUBSCRIPTIONS),
    rule("youtube", SUBSCRIPTIONS),
    rule("1password", SUBSCRIPTIONS),
  ];

  const subscription = (o: Partial<Subscription> & Pick<Subscription, "name" | "match" | "expectedAmount">): Subscription => ({
    id: `demo-sub-${o.match.replace(/\W+/g, "-")}`,
    cadence: "monthly",
    active: true,
    createdAt: at(iso(12, 1)!),
    ...o,
  });
  const subscriptions = [
    subscription({ name: "Netflix", match: "netflix", expectedAmount: 12.99 }),
    subscription({ name: "Spotify", match: "spotify", expectedAmount: 11.99 }),
    subscription({ name: "iCloud+", match: "apple.com/bill", expectedAmount: 0.99, matchAmount: true }),
    subscription({ name: "YouTube Premium", match: "youtube", expectedAmount: 13.99 }),
    subscription({ name: "1Password", match: "1password", expectedAmount: 35.88, cadence: "yearly" }),
  ];

  // Two pots of investments: Lightyear, entered by hand, and LHV's, read by the sync.
  const snapshots: Snapshot[] = [];
  for (let ago = 12; ago >= 0; ago--) {
    const date = iso(ago, 12) ?? iso(ago, 1)!;
    const grown = 12 - ago;
    snapshots.push(
      { id: `demo-snap-ly-${ago}`, source: "lightyear", total: Math.round((7480 + grown * 318 + grown * grown * 4.2) * 100) / 100, holdings: [{ name: "VWCE", pct: 80 }, { name: "MMF EUR", pct: 20 }], at: at(date) },
      { id: `demo-snap-lhv-${ago}`, source: "lhv", total: Math.round((2950 + grown * 41.5) * 100) / 100, holdings: [], at: at(date), auto: true }
    );
  }

  const budgets: Record<string, number> = { Groceries: 450, "Eating out": 160, Transport: 60, Shopping: 120 };
  return {
    categories: DEFAULT_CATEGORIES.map((name) => (budgets[name] ? { name, budget: budgets[name] } : { name })),
    transactions,
    rules,
    overrides: [],
    shares,
    shareRules: [{ id: "demo-srule-rimi", match: "rimi", partnerShare: 0.5, createdAt: at(iso(2, 1)!) }],
    settlements,
    subscriptions,
    merchants: [
      { id: "demo-mer-ikea", match: "ikea", name: "IKEA", domain: "ikea.com", createdAt: at(iso(12, 1)!) },
      { id: "demo-mer-zooplus", match: "zooplus", name: "Zooplus", domain: "zooplus.ee", createdAt: at(iso(12, 1)!) },
      { id: "demo-mer-vesi", match: "tallinna vesi", name: "Tallinna Vesi", domain: "tallinnavesi.ee", createdAt: at(iso(12, 1)!) },
      { id: "demo-mer-1password", match: "1password", name: "1Password", domain: "1password.com", createdAt: at(iso(12, 1)!) },
      { id: "demo-mer-youtube", match: "youtube", name: "YouTube Premium", domain: "google.com", createdAt: at(iso(12, 1)!) },
      { id: "demo-mer-lhv", match: "kodulaen", name: "LHV home loan", domain: "lhv.ee", createdAt: at(iso(12, 1)!) },
    ],
    snapshots,
  };
}
