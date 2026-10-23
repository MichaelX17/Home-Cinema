import { describe, it, expect } from "vitest";
import { OPTIONS as uploadOptions } from "@/app/api/upload/route";
import { OPTIONS as mediaOptions } from "@/app/api/media/route";

describe("cross-PC upload access", () => {
  it("allows remote upload preflight requests from local network devices", async () => {
    const response = await uploadOptions(
      new Request("http://192.168.0.20:3000/api/upload", {
        method: "OPTIONS",
        headers: {
          Origin: "http://192.168.0.20:3000",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "content-type, x-file-name, x-upload-id",
        },
      })
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain("x-file-name");
  });

  it("allows remote media API preflight requests", async () => {
    const response = await mediaOptions(
      new Request("http://192.168.0.20:3000/api/media", {
        method: "OPTIONS",
        headers: {
          Origin: "http://192.168.0.20:3000",
          "Access-Control-Request-Method": "GET",
          "Access-Control-Request-Headers": "authorization, content-type",
        },
      })
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("GET");
  });
});
