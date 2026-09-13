import { describe, expect, it } from "vitest";
import { normalizeOmanMsisdn, isValidOmanMsisdn, formatMsisdnForDisplay, InvalidMsisdnError } from "@/lib/msisdn";

describe("normalizeOmanMsisdn", () => {
  it("passes through a well-formed +968 number", () => {
    expect(normalizeOmanMsisdn("+96890000000")).toBe("+96890000000");
  });

  it("normalizes a bare 8-digit local number", () => {
    expect(normalizeOmanMsisdn("90000000")).toBe("+96890000000");
  });

  it("normalizes a 968-prefixed number without plus", () => {
    expect(normalizeOmanMsisdn("96890000000")).toBe("+96890000000");
  });

  it("normalizes a 00968-prefixed number", () => {
    expect(normalizeOmanMsisdn("0096890000000")).toBe("+96890000000");
  });

  it("strips spaces and formatting characters", () => {
    expect(normalizeOmanMsisdn("+968 9000 0000")).toBe("+96890000000");
  });

  it("rejects a number that is too short", () => {
    expect(() => normalizeOmanMsisdn("12345")).toThrow(InvalidMsisdnError);
  });

  it("rejects a number with an invalid leading digit", () => {
    expect(() => normalizeOmanMsisdn("+96850000000")).toThrow(InvalidMsisdnError);
  });

  it("rejects non-numeric input", () => {
    expect(() => normalizeOmanMsisdn("not-a-number")).toThrow(InvalidMsisdnError);
  });

  it("does not hard-code a single accepted number", () => {
    expect(normalizeOmanMsisdn("+96871234567")).toBe("+96871234567");
    expect(normalizeOmanMsisdn("+96899876543")).toBe("+96899876543");
  });
});

describe("isValidOmanMsisdn", () => {
  it("returns true/false instead of throwing", () => {
    expect(isValidOmanMsisdn("+96890000000")).toBe(true);
    expect(isValidOmanMsisdn("123")).toBe(false);
  });
});

describe("formatMsisdnForDisplay", () => {
  it("inserts spaces for readability", () => {
    expect(formatMsisdnForDisplay("+96890000000")).toBe("+968 9000 0000");
  });
});
