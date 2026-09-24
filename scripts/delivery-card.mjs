/**
 * delivery-card.mjs — Extract the trailing delivery card from a skill output.
 *
 * Every skill ends its output with a card framed by ━ separator lines:
 *
 *   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ← top bar
 *   ✅ mc-brand · 品牌策略完成         ← title (exactly one line)
 *   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ← header bar
 *   📁 文件：…                         ← body (any number of lines)
 *   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ← bottom bar
 *
 * Bars are matched as whole lines. A substring regex like /━{5,}[\s\S]*?━{5,}/
 * lets a single 29-char bar match itself (5 + 24 chars), which reduced every
 * real card to one separator line.
 *
 * The card is the LAST one in the document, so example cards earlier in the
 * body are never echoed. Its start is the top bar of the last
 * "bar / one title line / bar" header that closes before the bottom bar;
 * a two-bar block (bar / text / bar) is accepted as a degenerate card.
 */

const BAR_LINE = /^\s*━{5,}\s*$/;

export function extractDeliveryCard(content) {
  const lines = String(content ?? "").split("\n");
  const bars = [];
  lines.forEach((line, i) => {
    if (BAR_LINE.test(line)) bars.push(i);
  });
  if (bars.length < 2) return null;

  const bottom = bars[bars.length - 1];
  let start = bars[bars.length - 2];

  // Look for the header (top bar, single title line, header bar) whose header
  // bar sits before the bottom bar — that marks where the last card begins.
  for (let k = bars.length - 2; k >= 1; k -= 1) {
    const headerBar = bars[k];
    const topBar = bars[k - 1];
    if (headerBar - topBar === 2 && lines[topBar + 1].trim() !== "") {
      start = topBar;
      break;
    }
  }

  return lines.slice(start, bottom + 1).join("\n").trim();
}
