// Display names for the two people on the board. Each person is "you" on
// their own screens; the other's name is configuration, so the code carries no
// one's name. NEXT_PUBLIC because the client bundle needs them too.
export const OWNER_NAME = process.env.NEXT_PUBLIC_OWNER_NAME?.trim() || "Owner";
export const PARTNER_NAME = process.env.NEXT_PUBLIC_PARTNER_NAME?.trim() || "Partner";
