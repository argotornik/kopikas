// Display names for the two people on the board. The owner is "you" on the
// owner's screens; the partner's name is configuration, so the code carries
// no one's name. NEXT_PUBLIC because the client bundle needs it too.
export const PARTNER_NAME = process.env.NEXT_PUBLIC_PARTNER_NAME?.trim() || "Partner";
