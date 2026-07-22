import { resolveRuntimeEnvironment } from "@/lib/runtimeEnvironment";

type ServerEventProps = Record<string, unknown>;

function getPostHogHost(): string | null {
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();
  if (!host) return null;
  return host.replace(/\/+$/, "");
}

function getPostHogProjectKey(): string | null {
  const serverKey = process.env.POSTHOG_PROJECT_API_KEY?.trim();
  if (serverKey) return serverKey;
  const publicKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  return publicKey || null;
}

export async function captureServerEvent(params: {
  distinctId: string;
  event: string;
  properties?: ServerEventProps;
}): Promise<void> {
  if (resolveRuntimeEnvironment() !== "production") return;

  const host = getPostHogHost();
  const apiKey = getPostHogProjectKey();
  if (!host || !apiKey) return;

  const payload = {
    api_key: apiKey,
    event: params.event,
    properties: {
      distinct_id: params.distinctId,
      ...params.properties,
    },
    timestamp: new Date().toISOString(),
  };

  try {
    await fetch(`${host}/capture/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (error) {
    console.error("[posthog] Server event capture failed", error);
  }
}
