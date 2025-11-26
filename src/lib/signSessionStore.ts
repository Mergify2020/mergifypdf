type SignSession = {
  id: string;
  signatureDataUrl?: string;
  name?: string;
  createdAt: number;
  updatedAt: number;
};

const signSessionStore = new Map<string, SignSession>();

export function createSignSession() {
  const id = crypto.randomUUID();
  const session: SignSession = { id, createdAt: Date.now(), updatedAt: Date.now() };
  signSessionStore.set(id, session);
  return session;
}

export function getSignSession(id: string) {
  return signSessionStore.get(id) ?? null;
}

export function updateSignSession(id: string, data: { signatureDataUrl?: string; name?: string }) {
  const existing = signSessionStore.get(id);
  if (!existing) return null;
  const next: SignSession = {
    ...existing,
    ...data,
    updatedAt: Date.now(),
  };
  signSessionStore.set(id, next);
  return next;
}
