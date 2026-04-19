import { describe, it, expect } from "vitest";

describe("sanity check", () => {
  it("matematica basica funciona", () => {
    expect(1 + 1).toBe(2);
  });

  it("strings concatenan", () => {
    expect("Air" + "PDF").toBe("AirPDF");
  });
});
