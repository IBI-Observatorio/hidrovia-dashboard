import { describe, it, expect } from "vitest";
import { destinoSeguro } from "@/app/api/auth/route";

describe("destinoSeguro — anti open-redirect", () => {
  it("aceita caminhos internos", () => {
    expect(destinoSeguro("/radar")).toBe("/radar");
    expect(destinoSeguro("/monitor")).toBe("/monitor");
  });
  it("rejeita URL externa e protocol-relative → /monitor", () => {
    expect(destinoSeguro("https://evil.com")).toBe("/monitor");
    expect(destinoSeguro("//evil.com")).toBe("/monitor");
    expect(destinoSeguro("http://x")).toBe("/monitor");
  });
  it("null → default /monitor", () => {
    expect(destinoSeguro(null)).toBe("/monitor");
  });
});
