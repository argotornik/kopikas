import { stripPeriod } from "./utils.ts";
import { matches } from "./engine.ts";
import { merchantFromDescription } from "./lhv.ts";
import type { Merchant, Tx } from "./types";

// Known merchants: match token → favicon domain, display name. Conservative by
// design: a wrong logo is worse than a letter, so we only answer when
// confident — a known merchant, or an explicit domain token in the string.
const MERCHANTS: [pattern: string, domain: string, name: string][] = [
  ["spotify", "spotify.com", "Spotify"],
  ["netflix", "netflix.com", "Netflix"],
  ["nordvpn", "nordvpn.com", "NordVPN"],
  ["patreon", "patreon.com", "Patreon"],
  ["google one", "one.google.com", "Google One"],
  ["google", "google.com", "Google"],
  ["icloud", "icloud.com", "iCloud"],
  ["infuse", "firecore.com", "Infuse"],
  ["instagram", "instagram.com", "Instagram"],
  ["rni pro", "rnifilms.com", "RNI Films"],
  ["rni films", "rnifilms.com", "RNI Films"],
  ["r o o n", "roon.app", "Roon"],
  ["roonlabs", "roon.app", "Roon"],
  ["bend", "bendapp.com", "Bend"],
  ["headspace", "headspace.com", "Headspace"],
  ["kaardi", "lhv.ee", "Kaardi kuutasu"],
  ["apple", "apple.com", "Apple"],
  ["wolt", "wolt.com", "Wolt"],
  ["bolt", "bolt.eu", "Bolt"],
  ["telia", "telia.ee", "Telia"],
  ["rimi", "rimi.ee", "Rimi"],
  ["selver", "selver.ee", "Selver"],
  ["coop", "coop.ee", "Coop"],
  ["prisma", "prismamarket.ee", "Prisma"],
  ["maxima", "maxima.ee", "Maxima"],
  ["gr. tk.", "grossitoidukaubad.ee", "Grossi"],
  ["grossi", "grossitoidukaubad.ee", "Grossi"],
  ["delice", "delice.ee", "Delice"],
  ["circle k", "circlek.ee", "Circle K"],
  ["alexela", "alexela.ee", "Alexela"],
  ["olerex", "olerex.ee", "Olerex"],
  ["lightyear", "lightyear.com", "Lightyear"],
  ["kaubamaja", "kaubamaja.ee", "Kaubamaja"],
  ["apotheka", "apotheka.ee", "Apotheka"],
  ["eesti energia", "energia.ee", "Eesti Energia"],
  ["vapiano", "vapiano.ee", "Vapiano"],
];

const DOMAIN_TOKEN = /([a-z0-9-]+\.(?:com|eu|ee|net|org|io|co|app|fi|de|se|uk))\b/;

// Company-form and other abbreviations that stay upper-case when a shouting
// bank string is title-cased.
const KEEP_UPPER = /(?<![\p{L}\p{N}])(AS|OÜ|OU|SIA|UAB|AB|OY|LHV|SEB|ATM|EU|USA|UK|VAT)(?![\p{L}\p{N}])/giu;

function known(s: string) {
  const lower = s.toLowerCase();
  return MERCHANTS.find(([pattern]) => lower.includes(pattern));
}

// A trailing reference in parentheses — "(laenuleping nr EAL-2025…)". LHV cuts
// counterparty names at 60 characters, so the closing paren may be missing.
const TRAILING_REFERENCE = /\s*\([^()]*\d[^()]*\)?\s*$/;

// What a rule should match on when this transaction is filed with "always".
// Known merchants use their match token, which by construction sits in the
// bank string; anything else is the counterparty with the per-charge noise
// (card-payment prefix, billing period, trailing reference) cut off. Each
// candidate is checked against the transaction itself, so a rule is never
// taught that would not even match the charge it came from.
export function rulePattern(tx: Tx): string {
  const idOnly = !/\p{L}/u.test(tx.counterparty);
  const hit = known(tx.counterparty) ?? (idOnly ? known(tx.description) : undefined);
  const merchant = merchantFromDescription(tx.counterparty) ?? tx.counterparty;
  const trimmed = stripPeriod(merchant.replace(/^PAYPAL\s*\*\s*/i, "").replace(TRAILING_REFERENCE, "")).trim();
  const candidates = [hit?.[0], trimmed.toLowerCase(), merchant.trim().toLowerCase()];
  return candidates.find((c): c is string => !!c && matches(tx, c)) ?? tx.counterparty.trim().toLowerCase();
}

// Bank strings shout: "VIIMSI DELICE ISETEENI", "PAYPAL *PATREON INC M".
// Title-case them only when they have no lower-case at all, so mixed-case
// names ("MON*Natty") stay as the merchant wrote them. A trailing reference
// in parentheses — "(laenuleping nr EAL-2025…)" — is bookkeeping, not name.
function tidy(raw: string): string {
  let s = stripPeriod(raw.trim()) || raw.trim();
  s = s.replace(/^PAYPAL\s*\*\s*/i, "").replace(TRAILING_REFERENCE, "") || s;
  s = s.replace(/\s*\(\.\.\d{3,4}\)\s*/, " ").trim(); // card tail: "Kaardi (..3696) kuutasu"
  if (/\p{Ll}/u.test(s)) return s;
  return s
    .replace(/\p{Lu}{2,}/gu, (w) => w.charAt(0) + w.slice(1).toLowerCase())
    .replace(KEEP_UPPER, (w) => w.toUpperCase());
}

// Who the merchant is, from the counterparty and, when the counterparty is
// just a merchant id ("3902611"), from the statement description that names
// the place. Returns a favicon domain (or null) and a statement-legible name.
export function identifyMerchant(counterparty: string, description = ""): { domain: string | null; name: string } {
  const hit = known(counterparty) ?? (!/\p{L}/u.test(counterparty) ? known(description) : undefined);
  if (hit) return { domain: hit[1], name: hit[2] };
  const m = counterparty.toLowerCase().match(DOMAIN_TOKEN);
  return { domain: m ? m[1] : null, name: tidy(counterparty) };
}

// Who the merchant is on this board: the owner's own identity when one of
// theirs matches (newest wins, like rules), the built-in table otherwise.
export function merchantOf(
  tx: Tx,
  merchants: Merchant[]
): { name: string; domain: string | null; emoji: string | null; match: string | null } {
  const own = merchants.findLast((m) => matches(tx, m.match));
  if (own) return { name: own.name, domain: own.domain ?? null, emoji: own.emoji ?? null, match: own.match };
  return { ...identifyMerchant(tx.counterparty, tx.description), emoji: null, match: null };
}

export function guessDomain(counterparty: string): string | null {
  return identifyMerchant(counterparty).domain;
}

export function displayName(counterparty: string, description = ""): string {
  return identifyMerchant(counterparty, description).name;
}

// Subscriptions carry a name someone already chose ("Instagram Meta Verified",
// "Infuse Pro"): keep it, minus card tails and billing periods. Only a raw
// bank string — no lower-case at all — gets the full merchant treatment.
export function subscriptionLabel(name: string): string {
  return /\p{Ll}/u.test(name) ? tidy(name) : displayName(name);
}
