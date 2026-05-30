import { test } from "node:test";
import assert from "node:assert/strict";
import { checkOutputMap } from "../scripts/check-output-map.mjs";

test("mc-review reverse-map is consistent with mc-dispatch routing table", () => {
  const { ok, conflicts } = checkOutputMap();
  assert.equal(ok, true, "drift detected:\n" + conflicts.join("\n"));
});
