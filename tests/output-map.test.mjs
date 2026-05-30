import { test } from "node:test";
import assert from "node:assert/strict";
import { checkOutputMap } from "../scripts/check-output-map.mjs";

test("mc-review reverse-map is consistent with mc-cmo routing table", () => {
  const { ok, conflicts } = checkOutputMap();
  assert.equal(ok, true, "drift detected:\n" + conflicts.join("\n"));
});

test("cmo routing table still exposes all 28 skill routes after merge", () => {
  const { dispatch } = checkOutputMap();
  assert.equal(
    Object.keys(dispatch).length,
    28,
    "routing rows lost during merge: " + Object.keys(dispatch).sort().join(" "),
  );
});
