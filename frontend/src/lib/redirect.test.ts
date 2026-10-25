import { describe, expect, it } from "vitest";
import { authLinkError, authLinkTarget, safeNext } from "./redirect";

describe("safeNext", () => {
  it("keeps same-site paths only", () => {
    expect(safeNext("/programs")).toBe("/programs");
    expect(safeNext("//evil.com")).toBeNull();
    expect(safeNext("https://evil.com")).toBeNull();
  });
});

describe("authLinkTarget", () => {
  const at = (href: string) => authLinkTarget(new URL(href))?.toString() ?? null;

  it("forwards a code that landed on the Site URL to the callback", () => {
    expect(at("http://localhost:3000/?code=abc")).toBe(
      "http://localhost:3000/auth/callback?code=abc",
    );
    expect(at("http://localhost:3000/?token_hash=t&type=signup")).toBe(
      "http://localhost:3000/auth/callback?token_hash=t&type=signup",
    );
  });

  it("returns to the page the link landed on", () => {
    expect(at("http://localhost:3000/programs?code=abc")).toBe(
      "http://localhost:3000/auth/callback?code=abc&next=%2Fprograms",
    );
  });

  it("sends a failed link to the login page with its error", () => {
    expect(at("http://localhost:3000/?error=access_denied&error_code=otp_expired")).toBe(
      "http://localhost:3000/login?error=access_denied&error_code=otp_expired",
    );
    expect(at("http://localhost:3000/login?error_code=otp_expired")).toBeNull();
  });

  it("leaves the callback and ordinary pages alone", () => {
    expect(at("http://localhost:3000/auth/callback?code=abc")).toBeNull();
    expect(at("http://localhost:3000/?x=1")).toBeNull();
  });
});

describe("authLinkError", () => {
  it("explains an expired link", () => {
    expect(authLinkError("#error=access_denied&error_code=otp_expired")).toMatch(/έληξε/);
    expect(authLinkError("#error=server_error")).toMatch(/έγκυρος/);
    expect(authLinkError("?error=access_denied&error_code=otp_expired")).toMatch(/έληξε/);
    expect(authLinkError("")).toBeNull();
    expect(authLinkError("?mode=signup")).toBeNull();
  });
});
