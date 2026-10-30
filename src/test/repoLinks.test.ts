import { describe, expect, it } from "vitest";
import { extractRepos } from "@/lib/repoLinks";

describe("extractRepos", () => {
  it("finds owner/repo from many URL shapes, deduplicated case-insensitively", () => {
    const text = `
      Code: https://github.com/zingolabs/zaino and https://github.com/ZingoLabs/Zaino/pull/12.
      Clone git@github.com:zcash/librustzcash.git or https://github.com/zcash/librustzcash.git
      See https://github.com/zcash/zips/blob/main/zips/zip-0311.rst, https://github.com/foo/bar-baz.
    `;
    expect(extractRepos(text)).toEqual(["zingolabs/zaino", "zcash/librustzcash", "zcash/zips", "foo/bar-baz"]);
  });

  it("ignores the grant program repos and GitHub's own pages", () => {
    expect(
      extractRepos(
        "https://github.com/ZcashCommunityGrants/zcashcommunitygrants/issues/1 https://github.com/orgs/zcash/people https://github.com/sponsors/alice https://github.com/user-attachments/files/123/doc.pdf https://github.com/advisories/GHSA-x"
      )
    ).toEqual([]);
  });
});
