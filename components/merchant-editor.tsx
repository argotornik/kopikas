"use client";

import { useState } from "react";
import { MerchantIcon } from "@/components/merchant-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Fields = { name: string; domain: string; emoji: string };

// The merchant being edited, as the row that opened the dialog knows it: a
// ledger tile (target by transaction) or a subscription row (by subscription).
export type MerchantSubject = {
  key: string; // re-keys the form so each opening starts from its own row
  name: string;
  domain: string | null;
  emoji: string | null;
  pattern: string; // what the identity will apply to
  custom: boolean; // an identity of the owner's already covers it
  target: { txId: string } | { subId: string };
};

// How a merchant reads on the board: the name, the site its favicon comes
// from, an emoji for when there is none. Opened from an avatar.
export function MerchantEditor({
  subject,
  onClose,
  onSave,
  onReset,
}: {
  subject: MerchantSubject | null;
  onClose: () => void;
  onSave: (fields: Fields) => Promise<string | null>; // null = saved, otherwise the reason
  onReset: () => Promise<string | null>;
}) {
  return (
    <Dialog open={!!subject} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        {subject && <MerchantForm key={subject.key} tx={subject} onClose={onClose} onSave={onSave} onReset={onReset} />}
      </DialogContent>
    </Dialog>
  );
}

function MerchantForm({
  tx,
  onClose,
  onSave,
  onReset,
}: {
  tx: MerchantSubject;
  onClose: () => void;
  onSave: (fields: Fields) => Promise<string | null>;
  onReset: () => Promise<string | null>;
}) {
  const [name, setName] = useState(tx.name);
  const [domain, setDomain] = useState(tx.domain ?? "");
  const [emoji, setEmoji] = useState(tx.emoji ?? "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // What the avatar will look like, as typed. The site is tidied the way the
  // server does it, so the preview fetches the same favicon.
  const previewDomain = domain.trim().toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/^www\./, "").split(/[/?#:]/)[0];
  const finish = async (work: () => Promise<string | null>) => {
    setBusy(true);
    const e = await work();
    setBusy(false);
    if (e) setErr(e);
    else onClose();
  };
  return (
    <>
      <DialogHeader>
        <DialogTitle>Name and icon</DialogTitle>
        <DialogDescription>
          Applies to every charge matching <code className="rounded bg-muted px-1 py-0.5 text-xs">{tx.pattern}</code>.
        </DialogDescription>
      </DialogHeader>
      <div className="flex items-start gap-3">
        <MerchantIcon
          key={`${previewDomain}|${emoji}|${name}`}
          name={name || tx.name}
          domain={previewDomain || null}
          emoji={emoji || null}
          className="mt-1 size-9"
        />
        <div className="grid flex-1 gap-2">
          <Input
            placeholder="Name on the board"
            aria-label="Name on the board"
            name="merchant-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <Input
            placeholder="Website for the favicon, e.g. delice.ee (optional)"
            aria-label="Website for the favicon"
            name="merchant-domain"
            inputMode="url"
            autoCapitalize="none"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
          <Input
            placeholder="Emoji when there is no website (optional)"
            aria-label="Emoji"
            name="merchant-emoji"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
          />
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>
      </div>
      <DialogFooter className="sm:justify-between">
        {tx.custom ? (
          <Button variant="ghost" disabled={busy} onClick={() => void finish(onReset)}>
            Use default
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy || !name.trim()} onClick={() => void finish(() => onSave({ name, domain, emoji }))}>
            Save
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
