/** Verify Pages API bundles load when deployed without .next/package.json. Run after next build. */
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const staging = await mkdtemp(path.join(tmpdir(), "grants-api-runtime-"));
try {
  await writeFile(path.join(staging, "package.json"), await readFile(path.join(root, "package.json")));
  await mkdir(path.join(staging, ".next/server/pages"), { recursive: true });
  await cp(path.join(root, ".next/server/chunks"), path.join(staging, ".next/server/chunks"), { recursive: true });
  await cp(path.join(root, ".next/server/pages/api"), path.join(staging, ".next/server/pages/api"), { recursive: true });
  await symlink(path.join(root, "node_modules"), path.join(staging, "node_modules"), "dir");
  // Disable Node's newer require(ESM) support to match the production launcher failure.
  const probe = spawnSync(process.execPath, ["--no-experimental-require-module", "-e", `
    const assert = require("node:assert/strict");
    (async () => {
      for (const route of ["grants", "forum/community-grants-topics", "chain/tip"]) {
        const api = require("./.next/server/pages/api/" + route + ".js");
        assert.equal(typeof api.default, "function");
        const response = {
          code: null, body: null,
          setHeader() {},
          status(code) { this.code = code; return this; },
          json(body) { this.body = body; return this; },
        };
        await api.default({ method: "POST" }, response);
        assert.equal(response.code, 405);
        assert.deepEqual(response.body, { error: "Method not allowed" });
        console.log(route + ": CommonJS launcher loaded handler; returned JSON 405");
      }
    })().catch((error) => { console.error(error); process.exitCode = 1; });
  `], { cwd: staging, encoding: "utf8" });
  process.stdout.write(probe.stdout ?? "");
  process.stderr.write(probe.stderr ?? "");
  if (probe.error) throw probe.error;
  if (probe.status !== 0) process.exitCode = probe.status ?? 1;
} finally {
  await rm(staging, { recursive: true, force: true });
}
