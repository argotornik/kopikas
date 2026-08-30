// Merchant → domain guessing for favicons. Conservative by design: a wrong
// logo is worse than a letter avatar, so we only answer when confident —
// a known merchant, or an explicit domain token in the counterparty string.
const OVERRIDES: [string, string][] = [
  ["spotify", "spotify.com"],
  ["netflix", "netflix.com"],
  ["nordvpn", "nordvpn.com"],
  ["apple", "apple.com"],
  ["wolt", "wolt.com"],
  ["bolt", "bolt.eu"],
  ["telia", "telia.ee"],
  ["rimi", "rimi.ee"],
  ["selver", "selver.ee"],
  ["coop", "coop.ee"],
  ["prisma", "prismamarket.ee"],
  ["lightyear", "lightyear.com"],
  ["kaubamaja", "kaubamaja.ee"],
  ["apotheka", "apotheka.ee"],
  ["eesti energia", "energia.ee"],
  ["vapiano", "vapiano.ee"],
];

const DOMAIN_TOKEN = /([a-z0-9-]+\.(?:com|eu|ee|net|org|io|co|app|fi|de|se|uk))\b/;

export function guessDomain(counterparty: string): string | null {
  const s = counterparty.toLowerCase();
  for (const [pattern, domain] of OVERRIDES) {
    if (s.includes(pattern)) return domain;
  }
  const m = s.match(DOMAIN_TOKEN);
  return m ? m[1] : null;
}
