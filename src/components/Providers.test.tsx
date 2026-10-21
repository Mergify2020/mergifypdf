import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Providers from "./Providers";

const sessionProviderSpy = vi.fn();

vi.mock("next-auth/react", () => ({
  SessionProvider: (props: { children: React.ReactNode; refetchOnWindowFocus: boolean; refetchInterval: number }) => {
    sessionProviderSpy(props);
    return <>{props.children}</>;
  },
}));
vi.mock("@/components/AuthStateSync", () => ({ default: () => null }));
vi.mock("@/components/PostHogInit", () => ({ default: () => null }));
vi.mock("@/components/PostHogIdentify", () => ({ default: () => null }));
vi.mock("@/components/ProjectEntryLoadingHost", () => ({ default: () => null }));
vi.mock("@/components/ThemePreferenceSync", () => ({ default: () => null }));

describe("Providers", () => {
  it("does not refetch the session whenever the window regains focus", () => {
    render(<Providers><span>content</span></Providers>);
    expect(screen.getByText("content")).toBeVisible();
    expect(sessionProviderSpy).toHaveBeenCalledWith(expect.objectContaining({
      refetchOnWindowFocus: false,
      refetchInterval: 0,
    }));
  });
});
