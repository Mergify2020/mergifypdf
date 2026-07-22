import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppHeaderBrand from "./AppHeaderBrand";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));

vi.mock("next/navigation", () => ({ usePathname }));
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.ComponentProps<"a">) => (
    <a href={String(href)} data-next-link="true" {...props}>{children}</a>
  ),
}));
vi.mock("next/image", () => ({
  default: ({ priority: _priority, ...props }: React.ComponentProps<"img"> & { priority?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt ?? ""} {...props} />
  ),
}));

describe("AppHeaderBrand navigation", () => {
  beforeEach(() => usePathname.mockReturnValue("/studio"));

  it("uses the Next client-routing link when leaving Studio", () => {
    render(<AppHeaderBrand href="/projects/all" />);
    const link = screen.getByRole("link", { name: "Back to dashboard" });
    expect(link).toHaveAttribute("href", "/projects/all");
    expect(link).toHaveAttribute("data-next-link", "true");
  });
});
