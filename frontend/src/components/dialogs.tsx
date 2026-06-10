'use client';

import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

/**
 * Promise-based modal dialogs that replace the browser's window.prompt/confirm.
 * Mount <DialogHost /> once near the app root, then call promptDialog()/confirmDialog()
 * from anywhere and await the result.
 */

type PromptRequest = {
  kind: 'prompt';
  title: string;
  label?: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  resolve: (value: string | null) => void;
};

type ConfirmRequest = {
  kind: 'confirm';
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  resolve: (value: boolean) => void;
};

type DialogRequest = PromptRequest | ConfirmRequest;

let current: DialogRequest | null = null;
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

export function promptDialog(opts: {
  title: string;
  label?: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
}): Promise<string | null> {
  return new Promise((resolve) => {
    current = { kind: 'prompt', ...opts, resolve };
    emit();
  });
}

export function confirmDialog(opts: {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    current = { kind: 'confirm', ...opts, resolve };
    emit();
  });
}

/** Single host that renders whichever dialog is currently requested. */
export function DialogHost() {
  const [req, setReq] = useState<DialogRequest | null>(current);

  useEffect(() => {
    const update = () => setReq(current);
    listeners.add(update);
    update();
    return () => {
      listeners.delete(update);
    };
  }, []);

  if (!req) return null;

  function close(result: string | null | boolean) {
    const r = req;
    current = null;
    emit();
    // resolve after clearing so the modal unmounts cleanly
    if (r?.kind === 'prompt') r.resolve(result as string | null);
    else if (r?.kind === 'confirm') r.resolve(result as boolean);
  }

  if (req.kind === 'prompt') {
    return <PromptBody req={req} onClose={close} />;
  }
  return <ConfirmBody req={req} onClose={close} />;
}

function PromptBody({ req, onClose }: { req: PromptRequest; onClose: (v: string | null) => void }) {
  const [value, setValue] = useState(req.defaultValue ?? '');

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const v = value.trim();
    onClose(v ? v : null);
  }

  return (
    <Modal title={req.title} onClose={() => onClose(null)} width={440}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {req.message && <p className="text-sm text-muted-foreground">{req.message}</p>}
        {req.label && <Label htmlFor="prompt-dialog-input">{req.label}</Label>}
        <Input
          id="prompt-dialog-input"
          autoFocus
          value={value}
          placeholder={req.placeholder}
          onChange={(e) => setValue(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
        />
        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onClose(null)}>
            Cancel
          </Button>
          <Button type="submit" disabled={!value.trim()}>
            {req.confirmLabel ?? 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ConfirmBody({ req, onClose }: { req: ConfirmRequest; onClose: (v: boolean) => void }) {
  return (
    <Modal title={req.title} onClose={() => onClose(false)} width={440}>
      <div className="flex flex-col gap-4">
        {req.message && <p className="text-sm text-muted-foreground">{req.message}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onClose(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={req.danger ? 'destructive' : 'default'}
            autoFocus
            onClick={() => onClose(true)}
          >
            {req.confirmLabel ?? 'Confirm'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
