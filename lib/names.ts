// Display names for the two people on the board. Each person is "you" on
// their own screens; the other's name is configuration, so the code carries no
// one's name. NEXT_PUBLIC because the client bundle needs them too.
import { DEMO } from "./demo-flag";

export const OWNER_NAME = process.env.NEXT_PUBLIC_OWNER_NAME?.trim() || "Owner";
// The demo's made-up household splits with Mari, who sends the repayments in its data.
export const PARTNER_NAME = process.env.NEXT_PUBLIC_PARTNER_NAME?.trim() || (DEMO ? "Mari" : "Partner");
