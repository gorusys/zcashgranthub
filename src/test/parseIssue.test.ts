import { describe, expect, it } from "vitest";
import { forumLink, labelToStatus } from "@/lib/parseIssue";

describe("grant forum link", () => {
  it("skips the code-of-conduct template link and prefers the proposal thread", () => {
    const body =
      "- [x] I agree to the [ZCG code of conduct](https://forum.zcashcommunity.com/t/zcg-code-of-conduct/41787)\n" +
      "Forum: https://forum.zcashcommunity.com/t/grant-application-foo/58103.";
    expect(forumLink(body)).toBe("https://forum.zcashcommunity.com/t/grant-application-foo/58103");
    expect(forumLink("see https://forum.zcashcommunity.com/t/zcg-code-of-conduct/41787")).toBe(
      "https://forum.zcashcommunity.com/c/grants/33"
    );
    const template =
      "https://forum.zcashcommunity.com/t/zcg-communication-guidelines/44284 " +
      "https://forum.zcashcommunity.com/t/about-the-retroactive-grants-category/52106 " +
      "https://forum.zcashcommunity.com/t/44284 ";
    expect(forumLink(template + "https://forum.zcashcommunity.com/t/my-proposal/58000")).toBe(
      "https://forum.zcashcommunity.com/t/my-proposal/58000"
    );
    expect(forumLink("", [{ body: "Thread: https://forum.zcashcommunity.com/t/bar/123" }])).toBe(
      "https://forum.zcashcommunity.com/t/bar/123"
    );
  });
});

describe("ZCG status from labels", () => {
  const l = (...names: string[]) => names.map((name) => ({ name }));
  it("only treats closed issues as completed when they were funded", () => {
    expect(labelToStatus(l("📋 Grant Application", "✅ Grant Approved", "✔️ Grant Complete"), "closed")).toBe("COMPLETED");
    expect(labelToStatus(l("📋 Grant Application", "👀 Ready For ZCG Review"), "closed")).toBe("WITHDRAWN");
    expect(labelToStatus(l("❌ Grant Declined"), "closed")).toBe("REJECTED");
    expect(labelToStatus(l("✅ Startup Payment Completed"), "open")).toBe("ACTIVE");
  });
});
