import { stripPeriod } from "./utils";

// Known merchants: match token → favicon domain, display name. Conservative by
// design: a wrong logo is worse than a letter, so we only answer when
// confident — a known merchant, or an explicit domain token in the string.
const MERCHANTS: [pattern: string, domain: string, name: string][] = [
  ["spotify", "spotify.com", "Spotify"],
  ["netflix", "netflix.com", "Netflix"],
  ["nordvpn", "nordvpn.com", "NordVPN"],
  ["patreon", "patreon.com", "Patreon"],
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

// Bank strings shout: "VIIMSI DELICE ISETEENI", "PAYPAL *PATREON INC M".
// Title-case them only when they have no lower-case at all, so mixed-case
// names ("MON*Natty") stay as the merchant wrote them.
function tidy(raw: string): string {
  let s = stripPeriod(raw.trim()) || raw.trim();
  s = s.replace(/^PAYPAL\s*\*\s*/i, "");
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

export function guessDomain(counterparty: string): string | null {
  return identifyMerchant(counterparty).domain;
}

export function displayName(counterparty: string, description = ""): string {
  return identifyMerchant(counterparty, description).name;
}
