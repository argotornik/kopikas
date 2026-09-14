import type { Db, Tx } from "./types";
import { DEFAULT_CATEGORIES } from "./engine";

// Deterministic mock data: July + August 2026, one everyday account.
// Replaced by the real LHV sync later — same shapes.
const IBAN = "EE00MOCK0000000001";

let n = 0;
const tx = (date: string, amount: number, counterparty: string, description = ""): Tx => ({
  id: `mock-${String(++n).padStart(3, "0")}`,
  date,
  amount,
  currency: "EUR",
  counterparty,
  description,
  iban: IBAN,
});

export function seedDb(): Db {
  n = 0;
  const transactions: Tx[] = [
    // July
    tx("2026-07-01", -12.99, "NETFLIX.COM", "Netflix subscription"),
    tx("2026-07-02", -43.17, "Rimi Eesti Food AS", "Card payment"),
    tx("2026-07-03", -10.99, "Spotify AB", "Spotify Premium"),
    tx("2026-07-05", -300.0, "Lightyear Europe AS", "Deposit"),
    tx("2026-07-06", -8.5, "BOLT.EU/O/2607", "Ride"),
    tx("2026-07-08", -61.4, "Selver AS", "Card payment"),
    tx("2026-07-10", -27.8, "Uue Maailma Kohvik", "Card payment"),
    tx("2026-07-12", -18.6, "Wolt Eesti OU", "Order 8817"),
    tx("2026-07-14", -29.9, "Telia Eesti AS", "Mobile 5512907"),
    tx("2026-07-16", -9.2, "Apotheka", "Card payment"),
    tx("2026-07-18", -52.33, "Coop Eesti", "Card payment"),
    tx("2026-07-20", -47.6, "Eesti Energia AS", "Electricity 07/2026"),
    tx("2026-07-22", -34.0, "Vapiano Tallinn", "Card payment"),
    tx("2026-07-24", -6.9, "BOLT.EU/O/2407", "Ride"),
    tx("2026-07-26", -38.75, "Rimi Eesti Food AS", "Card payment"),
    tx("2026-07-28", -89.0, "Zone Media OU", "Domain + hosting yearly"),
    tx("2026-07-31", 2650.0, "Tööandja OÜ", "Salary 07/2026"),
    // August
    tx("2026-08-01", -14.99, "NETFLIX.COM", "Netflix subscription"),
    tx("2026-08-02", -55.12, "Rimi Eesti Food AS", "Card payment"),
    tx("2026-08-03", -10.99, "Spotify AB", "Spotify Premium"),
    tx("2026-08-05", -300.0, "Lightyear Europe AS", "Deposit"),
    tx("2026-08-06", -12.3, "BOLT.EU/O/0608", "Ride"),
    tx("2026-08-08", -49.86, "Selver AS", "Card payment"),
    tx("2026-08-10", 23.45, "Mari Tamm", "poole peale"),
    tx("2026-08-11", -21.4, "Wolt Eesti OU", "Order 9204"),
    tx("2026-08-14", -29.9, "Telia Eesti AS", "Mobile 5512907"),
    tx("2026-08-15", -2.99, "APPLE.COM/BILL", "iCloud 50GB"),
    tx("2026-08-17", -44.2, "Coop Eesti", "Card payment"),
    tx("2026-08-19", -66.0, "Kaubamaja AS", "Card payment"),
    tx("2026-08-20", -51.9, "Eesti Energia AS", "Electricity 08/2026"),
    tx("2026-08-22", -31.6, "Uue Maailma Kohvik", "Card payment"),
    tx("2026-08-24", -7.8, "BOLT.EU/O/2408", "Ride"),
    tx("2026-08-25", -11.99, "PAYPAL *NORDVPN", "Subscription payment"),
    tx("2026-08-27", -36.44, "Rimi Eesti Food AS", "Card payment"),
    tx("2026-08-28", -58.9, "Prisma Peremarket", "Card payment"),
    tx("2026-08-29", 2650.0, "Tööandja OÜ", "Salary 08/2026"),
    tx("2026-08-29", -27.4, "Vapiano Tallinn", "Card payment"),
  ];

  const mkRule = (i: number, match: string, category: string) => ({
    id: `rule-${i}`,
    match,
    category,
    createdAt: "2026-07-01T00:00:00Z",
  });

  return {
    categories: [...DEFAULT_CATEGORIES],
    transactions,
    rules: [
      mkRule(1, "rimi", "Groceries"),
      mkRule(2, "selver", "Groceries"),
      mkRule(3, "coop", "Groceries"),
      mkRule(4, "prisma", "Groceries"),
      mkRule(5, "bolt.eu", "Transport"),
      mkRule(6, "wolt", "Eating out"),
      mkRule(7, "kohvik", "Eating out"),
      mkRule(8, "vapiano", "Eating out"),
      mkRule(9, "telia", "Utilities"),
      mkRule(10, "eesti energia", "Utilities"),
      mkRule(11, "apotheka", "Health"),
      mkRule(12, "spotify", "Subscriptions"),
      mkRule(13, "lightyear", "Savings"),
      mkRule(14, "kaubamaja", "Shopping"),
    ],
    overrides: [],
    shares: [],
    settlements: [],
    subscriptions: [
      {
        id: "sub-1",
        name: "Spotify",
        match: "spotify",
        expectedAmount: 10.99,
        cadence: "monthly",
        active: true,
        createdAt: "2026-07-03T00:00:00Z",
      },
    ],
    merchants: [],
    snapshots: [
      { id: "snap-0a", total: 8140.0, holdings: [], at: "2026-05-16T18:00:00Z" },
      { id: "snap-0b", total: 8655.3, holdings: [], at: "2026-06-14T18:00:00Z" },
      { id: "snap-0c", total: 8990.1, holdings: [], at: "2026-07-12T18:00:00Z" },
      {
        id: "snap-1",
        total: 9314.55,
        holdings: [
          { name: "VWCE", pct: 70 },
          { name: "MMF EUR", pct: 25 },
        ],
        at: "2026-08-12T18:00:00Z",
      },
    ],
  };
}

// Mock account balances (the real build reads these from GET /accounts).
export const MOCK_BALANCES = { everyday: 1842.16, savings: 6200.0 };
