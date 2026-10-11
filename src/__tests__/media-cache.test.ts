import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { get, set, invalidate, invalidateAll, CATALOG_CACHE_KEY } from "@/lib/media-cache";

describe("media-cache", () => {
  beforeEach(() => {
    invalidateAll();
    vi.useFakeTimers({ toFixed: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for missing keys", () => {
    expect(get("nonexistent")).toBeNull();
  });

  it("returns the stored value for existing keys", () => {
    set("test-key", { hello: "world" });
    expect(get("test-key")).toEqual({ hello: "world" });
  });

  it("returns null after TTL expires", () => {
    set("test-key", "value", 1000);
    expect(get("test-key")).toBe("value");

    vi.advanceTimersByTime(1001);
    expect(get("test-key")).toBeNull();
  });

  it("uses default TTL of 30 seconds", () => {
    set("test-key", "value");
    expect(get("test-key")).toBe("value");

    vi.advanceTimersByTime(29_999);
    expect(get("test-key")).toBe("value");

    vi.advanceTimersByTime(2);
    expect(get("test-key")).toBeNull();
  });

  it("invalidates a specific key", () => {
    set("test-key", "value");
    expect(get("test-key")).toBe("value");

    invalidate("test-key");
    expect(get("test-key")).toBeNull();
  });

  it("invalidates all keys", () => {
    set("key-1", "value-1");
    set("key-2", "value-2");
    invalidateAll();
    expect(get("key-1")).toBeNull();
    expect(get("key-2")).toBeNull();
  });

  it("CATALOG_CACHE_KEY is a stable string", () => {
    expect(CATALOG_CACHE_KEY).toBe("media:catalog");
  });
});