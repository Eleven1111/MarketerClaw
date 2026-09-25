import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Producer skills (livestream scripts, posters, community SOPs, AIGC prompts)
// once recommended practices that mc-review is supposed to block: invented
// "XXX 人下单" counts, "涨回原价" urgency, off-platform diversion in
// 小红书/抖音 comments, AI-generated skincare "after" shots. mc-review only
// catches them after the fact, so the templates themselves must not teach them.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = join(ROOT, "skills");

// A line that states the rule as a prohibition is a counter-example, not advice.
const NEGATION = /不得|不要|不能|禁止|不写|❌/;

export const BANNED = [
  { re: /已经\s*X+\s*人下单/, unless: /后台/, why: "sales count must be read from the live backend, never invented (直播电商监督管理办法第三十二、三十四条)" },
  { re: /(涨回|恢复)原价/, why: "reference price and 'back to original price' urgency (明码标价和禁止价格欺诈规定)" },
  { re: /(\d+|X)\s*天见效/, why: "efficacy promise without evidence (广告法第二十八条)" },
  { re: /^\s*\|\s*小红书[^|\n]*\|[^|\n]*(评论|私信|加微)/, why: "小红书 bans diverting users off-platform via comments/DMs (交易导流违规管理细则)" },
  { re: /^\s*\|\s*抖音[^|\n]*\|[^\n]*加微/, why: "抖音 bans inducing off-platform trade (诱导站外交易)" },
  { re: /(评价|晒单)[^\n]*积分(?![^\n]*好评)/, why: "review rewards must not be conditioned on positive ratings (网络反不正当竞争暂行规定第九条)" },
  { re: /glowing radiant skin|smooth morphing transition/i, why: "AI-generated efficacy 'after' shots are fabricated results (ai-content.md)" },
  { re: /\d+% 的受访用户/, why: "concrete survey numbers in templates get copied as fabricated data (广告法第十一条)" },
];

// Script templates look like `· 标签："台词"（注释）`. When the banned phrase is
// in the quoted line itself, only the quote decides: a caveat in the trailing
// note must not excuse a line the host would still say word for word.
const SPEECH = /[：:]\**\s*["“]([^"”]*)["”]/;

export function violations(text, banned = BANNED) {
  const found = [];
  text.split("\n").forEach((line, i) => {
    const speech = line.match(SPEECH)?.[1];
    for (const { re, unless, why } of banned) {
      if (!re.test(line)) continue;
      const scope = speech && re.test(speech) ? speech : line;
      if (NEGATION.test(scope) || (unless && unless.test(scope))) continue;
      found.push(`L${i + 1}: ${line.trim().slice(0, 70)} — ${why}`);
    }
  });
  return found;
}

function producerSkills() {
  return readdirSync(SKILLS)
    .filter((d) => d.startsWith("mc-") && d !== "mc-review")
    .map((d) => [d, readFileSync(join(SKILLS, d, "SKILL.md"), "utf-8")]);
}

test("no producer skill teaches a practice mc-review blocks", () => {
  const skills = producerSkills();
  assert.ok(skills.length >= 25, `expected >= 25 producer skills, found ${skills.length}`);
  const all = skills.flatMap(([d, text]) => violations(text).map((v) => `${d} ${v}`));
  assert.deepEqual(all, []);
});

test("compliance guard sections stay in the producer skills", () => {
  const required = {
    "mc-livestream": ["话术红线", "直播电商监督管理办法", "前 7 日内最低成交价"],
    "mc-poster": ["合规底线", "前 7 日内最低成交价", "广告法第四十六条"],
    "mc-community": ["平台导流红线", "交易导流违规管理细则", "不得以好评"],
    "mc-aigc": ["合规底线", "人工智能生成合成内容标识办法", "AI 标识："],
    "mc-kol": ["互联网广告管理办法第九条"],
  };
  for (const [skill, phrases] of Object.entries(required)) {
    const text = readFileSync(join(SKILLS, skill, "SKILL.md"), "utf-8");
    for (const p of phrases) assert.ok(text.includes(p), `${skill} lost "${p}"`);
  }
});

test("the scanner flags advice and lets prohibitions through", () => {
  assert.equal(violations('· 从众引导："已经 XXX 人下单了，库存还剩 XX"').length, 1);
  assert.equal(violations('· 从众引导："后台显示已经 XXX 人下单了"').length, 0);
  assert.equal(violations('· 从众引导："已经 XXX 人下单了"（不得预估）').length, 1);
  assert.equal(violations('| 限时紧迫型 | 稀缺 | "今晚X点涨回原价" | 大促 |').length, 1);
  assert.equal(violations("- 限时承诺：说恢复原价，下播后就不能同价再卖").length, 0);
  assert.equal(violations("| 小红书直播 | 口播+评论区引导 | 入群 | 3-10% |").length, 1);
  assert.equal(violations("| 小红书直播 | 口播引导加入站内群聊 | 入群 | 3-10% |").length, 0);
  assert.equal(violations("| 评价/晒单 | {X 积分} | 鼓励 UGC |").length, 1);
  assert.equal(violations("| 评价/晒单 | {X 积分} | 不得以好评为条件 |").length, 0);
});
