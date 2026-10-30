import { describe, expect, it } from "vitest";
import { forumLink } from "@/lib/parseIssue";

describe("grant forum link", () => {
  it("skips the code-of-conduct template link and prefers the proposal thread", () => {
    const body =
      "- [x] I agree to the [ZCG code of conduct](https://forum.zcashcommunity.com/t/zcg-code-of-conduct/41787)\n" +
      "Forum: https://forum.zcashcommunity.com/t/grant-application-foo/58103.";
    expect(forumLink(body)).toBe("https://forum.zcashcommunity.com/t/grant-application-foo/58103");
    expect(forumLink("see https://forum.zcashcommunity.com/t/zcg-code-of-conduct/41787")).toBe(
      "https://forum.zcashcommunity.com/c/grants/33"
    );
    expect(forumLink("", [{ body: "Thread: https://forum.zcashcommunity.com/t/bar/123" }])).toBe(
      "https://forum.zcashcommunity.com/t/bar/123"
    );
  });
});
