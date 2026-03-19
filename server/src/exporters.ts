import type { WorkflowRun, WorkflowStep } from "./types.js";

type ExportMode = "summary" | "full";

const PLATFORM_ASSET_LABELS = {
  xiaohongshu_note: "小红书笔记卡",
  douyin_script: "抖音脚本卡",
  wechat_article: "微信长文框架",
  weibo_post: "微博内容卡",
  bilibili_video: "B站测评/种草卡",
  private_domain: "私域承接方案",
  generic_asset: "平台适配资产"
} as const;

function formatSeconds(value: number): string {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function renderStep(step: WorkflowStep): string {
  const overtime = step.overtimeSeconds > 0 ? `（超时 +${step.overtimeSeconds}s）` : "";
  const skills = step.skillsUsed.length > 0 ? ` / Skills：${step.skillsUsed.join(", ")}` : "";
  return [
    `[${formatSeconds(step.startedAtSecond)} - ${formatSeconds(step.endedAtSecond)}] ${step.roleName} / ${step.stageName} / ${step.outputTitle}${overtime}${skills}`,
    step.content
  ].join("\n");
}

export function exportJson(run: WorkflowRun): string {
  return JSON.stringify(run, null, 2);
}

export function exportMarkdown(run: WorkflowRun, mode: ExportMode): string {
  const lines: string[] = [];

  lines.push(`# 营销作战工作流报告`);
  lines.push("");
  lines.push(`- 工作流 ID：${run.id}`);
  lines.push(`- 创建时间：${run.createdAt}`);
  lines.push(`- 项目名称：${run.campaign.projectName}`);
  lines.push(`- 产品/服务：${run.campaign.productName}`);
  lines.push(`- 模板：${run.templateName}`);
  lines.push(`- 主平台：${run.campaign.primaryPlatform}`);
  lines.push(`- 总时长（实际）：${run.totalActualSeconds}s`);
  lines.push(`- 总超时：${run.totalOvertimeSeconds}s`);
  lines.push("");

  lines.push(`## 作战看板`);
  lines.push("");
  lines.push(`- 总步骤：${run.board.totalSteps}`);
  lines.push(`- 已完成步骤：${run.board.completedSteps}`);
  lines.push(`- 已完成阶段：${run.board.completedStages}`);
  lines.push(`- 阻塞门禁：${run.board.gateBlockers}`);
  lines.push(`- 产物数量：${run.board.outputCount}`);
  lines.push(`- 当前建议：${run.board.recommendedFocus}`);
  lines.push("");

  lines.push("## 团队编制");
  lines.push("");
  for (const member of run.team) {
    lines.push(
      `- ${member.displayName} / ${member.lane} / ${member.enabled ? "启用" : "停用"} / 关联 skills ${member.skillCount} 个：${member.responsibility}`
    );
  }
  lines.push("");

  lines.push(`## 项目背景`);
  lines.push("");
  lines.push(`- 目标：${run.campaign.objective}`);
  lines.push(`- 目标人群：${run.campaign.targetAudience}`);
  lines.push(`- 活动窗口：${run.campaign.campaignWindow}`);
  lines.push(`- 重点区域：${run.campaign.regionFocus}`);
  lines.push(`- 品牌调性：${run.campaign.brandTone}`);
  lines.push(`- 核心卖点：${run.campaign.productProofPoints.join(" / ") || "暂无"}`);
  lines.push(
    `- 结构化竞品：${
      (run.campaign.competitorEntries ?? [])
        .map((item) => `${item.competitor}/${item.platform}/${item.messageAngle}`)
        .join("；") || "暂无"
    }`
  );
  lines.push(`- 预算范围：${run.campaign.budgetRange}`);
  lines.push(`- KPI：${run.campaign.kpis}`);
  lines.push(`- 风险边界：${run.campaign.riskNotes || "暂无"}`);
  lines.push(`- 输出要求：${run.campaign.deliverableSpec}`);
  lines.push("");

  lines.push(`## 审核结论`);
  lines.push("");
  lines.push(`- 就绪分：${run.review.readinessScore}`);
  lines.push(`- 风险等级：${run.review.riskLevel}`);
  lines.push(`- 品牌审校：${run.review.brandStatus}`);
  lines.push(`- 合规审查：${run.review.complianceStatus}`);
  lines.push(`- 总结：${run.review.overallVerdict}`);
  lines.push("");

  lines.push("### 审核门禁");
  for (const gate of run.gates) {
    lines.push(
      `- ${gate.label}：${gate.status}${gate.blocking ? "（阻塞）" : ""}，${gate.summary}`
    );
  }
  lines.push("");

  lines.push("### 亮点");
  for (const item of run.review.highlights) {
    lines.push(`- ${item}`);
  }
  lines.push("");

  lines.push("### 风险与修改项");
  for (const finding of run.review.findings) {
    lines.push(
      `- [${finding.severity}] ${finding.title}（责任角色：${finding.ownerRoleId}）${finding.detail}`
    );
  }
  lines.push("");

  lines.push("### 下一步动作");
  for (const item of run.review.nextActions) {
    lines.push(`- ${item}`);
  }
  lines.push("");

  lines.push("## 核心交付");
  lines.push("");
  lines.push("### 策略摘要");
  lines.push(run.deliverables.strategySummary);
  lines.push("");

  lines.push("### 人群洞察");
  for (const item of run.deliverables.audienceInsights) {
    lines.push(`- ${item}`);
  }
  lines.push("");

  lines.push("### 竞品洞察");
  for (const item of run.deliverables.competitorInsights) {
    lines.push(
      `- [${item.category}] ${item.competitor}：动作=${item.move}；影响=${item.implication}；应对=${item.response}`
    );
  }
  lines.push("");

  lines.push("### 平台打法卡");
  for (const item of run.deliverables.platformPlaybooks) {
    lines.push(`- ${item.platform}：${item.positioning}`);
    lines.push(`  内容支柱：${item.contentPillars.join(" / ")}`);
    lines.push(`  分发动作：${item.distributionMoves.join(" / ")}`);
    lines.push(`  监测重点：${item.measurementFocus.join(" / ")}`);
  }
  lines.push("");

  lines.push("### 平台专用资产卡");
  for (const item of run.deliverables.platformAssets ?? []) {
    lines.push(`- ${item.platform} / ${item.assetType}：${item.title}`);
    lines.push(`  钩子：${item.hook}`);
    lines.push(`  结构：${item.structure.join(" / ")}`);
    lines.push(`  CTA：${item.cta}`);
    lines.push(`  备注：${item.notes}`);
  }
  lines.push("");

  lines.push("### 内容矩阵");
  for (const item of run.deliverables.contentMatrix) {
    lines.push(
      `- ${item.platform} / ${item.format}：角度=${item.angle}；钩子=${item.hook}；CTA=${item.cta}`
    );
  }
  lines.push("");

  lines.push("### 内容资产");
  for (const asset of run.deliverables.contentAssets) {
    lines.push(`- ${asset.title} / ${asset.platform}：${asset.summary}`);
  }
  lines.push("");

  lines.push("### 资产看板");
  for (const artifact of run.artifacts) {
    lines.push(
      `- ${artifact.title} / ${artifact.kind} / ${artifact.status} / ${artifact.ownerRoleName}：${artifact.summary}`
    );
  }
  lines.push("");

  lines.push("### 渠道动作");
  for (const item of run.deliverables.channelActions) {
    lines.push(`- ${item}`);
  }
  lines.push("");

  lines.push("### 监测计划");
  for (const item of run.deliverables.measurementPlan) {
    lines.push(`- ${item}`);
  }
  lines.push("");

  lines.push("### 知识沉淀");
  for (const item of run.deliverables.knowledgeCards) {
    lines.push(`- ${item}`);
  }
  lines.push("");

  if (mode === "summary") {
    lines.push("## 精选执行轨迹（前 6 步）");
    lines.push("");
    for (const step of run.timeline.slice(0, 6)) {
      lines.push(renderStep(step));
      lines.push("");
    }
    return lines.join("\n");
  }

  lines.push("## 完整执行轨迹");
  lines.push("");
  for (const stage of run.stages) {
    lines.push(`### ${stage.name}`);
    lines.push(`- 阶段说明：${stage.description}`);
    lines.push(`- 分配时长：${stage.allocatedSeconds}s，实际：${stage.actualSeconds}s，超时：${stage.overtimeSeconds}s`);
    lines.push("");

    for (const step of stage.steps) {
      lines.push(renderStep(step));
      lines.push("");
    }
  }

  if (run.warnings.length > 0) {
    lines.push("## 运行提示");
    lines.push("");
    for (const warning of run.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  return lines.join("\n");
}

export function exportPlatformAssetsJson(run: WorkflowRun): string {
  return JSON.stringify(
    {
      workflowId: run.id,
      createdAt: run.createdAt,
      campaign: {
        projectName: run.campaign.projectName,
        productName: run.campaign.productName,
        objective: run.campaign.objective,
        primaryPlatform: run.campaign.primaryPlatform,
        secondaryPlatforms: run.campaign.secondaryPlatforms
      },
      platformAssets: run.deliverables.platformAssets,
      platformPlaybooks: run.deliverables.platformPlaybooks,
      contentMatrix: run.deliverables.contentMatrix,
      competitorInsights: run.deliverables.competitorInsights
    },
    null,
    2
  );
}

export function exportPlatformAssetsMarkdown(run: WorkflowRun): string {
  const lines: string[] = [];

  lines.push("# 平台专用资产包");
  lines.push("");
  lines.push(`- 工作流 ID：${run.id}`);
  lines.push(`- 创建时间：${run.createdAt}`);
  lines.push(`- 项目名称：${run.campaign.projectName}`);
  lines.push(`- 产品/服务：${run.campaign.productName}`);
  lines.push(`- 主平台：${run.campaign.primaryPlatform}`);
  lines.push(`- 次平台：${run.campaign.secondaryPlatforms.join(" / ") || "暂无"}`);
  lines.push(`- 目标：${run.campaign.objective}`);
  lines.push(`- 目标人群：${run.campaign.targetAudience}`);
  lines.push(`- 品牌调性：${run.campaign.brandTone}`);
  lines.push(`- 核心卖点：${run.campaign.productProofPoints.join(" / ") || "暂无"}`);
  lines.push("");

  for (const asset of run.deliverables.platformAssets) {
    const playbook = run.deliverables.platformPlaybooks.find(
      (item) => item.platform === asset.platform
    );
    const matrix = run.deliverables.contentMatrix.filter(
      (item) => item.platform === asset.platform
    );

    lines.push(`## ${asset.platform} · ${PLATFORM_ASSET_LABELS[asset.assetType]}`);
    lines.push("");
    lines.push(`- 标题：${asset.title}`);
    lines.push(`- 钩子：${asset.hook}`);
    lines.push(`- CTA：${asset.cta}`);
    lines.push(`- 备注：${asset.notes}`);
    lines.push("");

    lines.push("### 结构");
    for (const item of asset.structure) {
      lines.push(`- ${item}`);
    }
    lines.push("");

    if (playbook) {
      lines.push("### 平台打法");
      lines.push(`- 定位：${playbook.positioning}`);
      lines.push(`- 内容支柱：${playbook.contentPillars.join(" / ")}`);
      lines.push(`- 分发动作：${playbook.distributionMoves.join(" / ")}`);
      lines.push(`- 监测重点：${playbook.measurementFocus.join(" / ")}`);
      lines.push("");
    }

    if (matrix.length > 0) {
      lines.push("### 内容矩阵建议");
      for (const item of matrix) {
        lines.push(
          `- ${item.format}：角度=${item.angle}；钩子=${item.hook}；CTA=${item.cta}`
        );
      }
      lines.push("");
    }
  }

  if (run.deliverables.competitorInsights.length > 0) {
    lines.push("## 竞品应对摘要");
    lines.push("");
    for (const item of run.deliverables.competitorInsights) {
      lines.push(`- [${item.category}] ${item.competitor}：${item.response}`);
    }
  }

  return lines.join("\n");
}

function findPlatformAssetBundle(run: WorkflowRun, platform: string) {
  const asset = run.deliverables.platformAssets.find((item) => item.platform === platform);
  if (!asset) {
    throw new Error(`Platform asset not found: ${platform}`);
  }

  return {
    asset,
    playbook: run.deliverables.platformPlaybooks.find((item) => item.platform === platform),
    matrix: run.deliverables.contentMatrix.filter((item) => item.platform === platform),
    competitorInsights: run.deliverables.competitorInsights.slice(0, 3)
  };
}

export function exportPlatformAssetOnepagerMarkdown(
  run: WorkflowRun,
  platform: string
): string {
  const { asset, playbook, matrix, competitorInsights } = findPlatformAssetBundle(run, platform);
  const lines: string[] = [];

  lines.push(`# ${platform} 执行单页`);
  lines.push("");
  lines.push(`- 项目名称：${run.campaign.projectName}`);
  lines.push(`- 产品/服务：${run.campaign.productName}`);
  lines.push(`- 目标：${run.campaign.objective}`);
  lines.push(`- 人群：${run.campaign.targetAudience}`);
  lines.push(`- 品牌调性：${run.campaign.brandTone}`);
  lines.push(`- 资产类型：${PLATFORM_ASSET_LABELS[asset.assetType]}`);
  lines.push("");

  lines.push("## 核心钩子");
  lines.push(asset.hook);
  lines.push("");

  lines.push("## 结构");
  for (const item of asset.structure) {
    lines.push(`- ${item}`);
  }
  lines.push("");

  lines.push("## CTA");
  lines.push(`- ${asset.cta}`);
  lines.push("");

  lines.push("## 执行备注");
  lines.push(`- ${asset.notes}`);
  lines.push(`- 渠道约束：${run.campaign.channelConstraints || "暂无"}`);
  lines.push(`- 风险边界：${run.campaign.riskNotes || "暂无"}`);
  lines.push("");

  if (playbook) {
    lines.push("## 平台打法");
    lines.push(`- 定位：${playbook.positioning}`);
    lines.push(`- 内容支柱：${playbook.contentPillars.join(" / ")}`);
    lines.push(`- 分发动作：${playbook.distributionMoves.join(" / ")}`);
    lines.push(`- 监测重点：${playbook.measurementFocus.join(" / ")}`);
    lines.push("");
  }

  if (matrix.length > 0) {
    lines.push("## 内容矩阵");
    for (const item of matrix) {
      lines.push(`- ${item.format}：${item.angle}`);
      lines.push(`  钩子：${item.hook}`);
      lines.push(`  CTA：${item.cta}`);
    }
    lines.push("");
  }

  if (competitorInsights.length > 0) {
    lines.push("## 竞品提醒");
    for (const item of competitorInsights) {
      lines.push(`- [${item.category}] ${item.competitor}：${item.response}`);
    }
  }

  return lines.join("\n");
}

function lineWidth(char: string): number {
  return /^[\x00-\x7F]$/.test(char) ? 0.58 : 1;
}

function wrapLine(line: string, maxWidth = 42): string[] {
  if (!line) {
    return [""];
  }

  const wrapped: string[] = [];
  let current = "";
  let width = 0;

  for (const char of line) {
    const w = lineWidth(char);
    if (width + w > maxWidth) {
      wrapped.push(current);
      current = char;
      width = w;
      continue;
    }

    current += char;
    width += w;
  }

  if (current) {
    wrapped.push(current);
  }

  return wrapped;
}

function encodeUtf16beHex(text: string): string {
  const le = Buffer.from(text, "utf16le");
  const be = Buffer.alloc(le.length + 2);
  be[0] = 0xfe;
  be[1] = 0xff;

  for (let index = 0; index < le.length; index += 2) {
    be[index + 2] = le[index + 1] ?? 0;
    be[index + 3] = le[index] ?? 0;
  }

  return be.toString("hex").toUpperCase();
}

function buildPdfFromLines(lines: string[]): Buffer {
  const pageWidth = 595;
  const pageHeight = 842;
  const marginLeft = 44;
  const marginTop = 52;
  const lineHeight = 14;
  const maxLinesPerPage = Math.floor((pageHeight - marginTop * 2) / lineHeight);

  const logicalLines = lines.flatMap((line) => wrapLine(line));
  const pages: string[][] = [];

  for (let index = 0; index < logicalLines.length; index += maxLinesPerPage) {
    pages.push(logicalLines.slice(index, index + maxLinesPerPage));
  }

  if (pages.length === 0) {
    pages.push(["(空文档)"]);
  }

  const objects = new Map<number, string>();
  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");

  const pageObjectIds: number[] = [];

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    const pageObjectId = 5 + pageIndex * 2;
    const contentObjectId = 6 + pageIndex * 2;
    pageObjectIds.push(pageObjectId);

    const pageLines = pages[pageIndex] ?? [];
    const y = pageHeight - marginTop;
    const commands = ["BT", "/F1 11 Tf", `1 0 0 1 ${marginLeft} ${y} Tm`];

    pageLines.forEach((line, lineIndex) => {
      if (lineIndex > 0) {
        commands.push(`0 -${lineHeight} Td`);
      }
      commands.push(`<${encodeUtf16beHex(line)}> Tj`);
    });

    commands.push("ET");
    const stream = commands.join("\n");
    objects.set(
      contentObjectId,
      `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`
    );
    objects.set(
      pageObjectId,
      [
        "<< /Type /Page",
        "/Parent 2 0 R",
        `/MediaBox [0 0 ${pageWidth} ${pageHeight}]`,
        "/Resources << /Font << /F1 3 0 R >> >>",
        `/Contents ${contentObjectId} 0 R`,
        ">>"
      ].join("\n")
    );
  }

  objects.set(
    2,
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`
  );

  objects.set(
    3,
    [
      "<< /Type /Font",
      "/Subtype /Type0",
      "/BaseFont /STSong-Light",
      "/Encoding /UniGB-UCS2-H",
      "/DescendantFonts [4 0 R]",
      ">>"
    ].join("\n")
  );

  objects.set(
    4,
    [
      "<< /Type /Font",
      "/Subtype /CIDFontType0",
      "/BaseFont /STSong-Light",
      "/CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 4 >>",
      ">>"
    ].join("\n")
  );

  let pdf = "%PDF-1.4\n";
  const offsets = new Map<number, number>();

  for (const [id, body] of [...objects.entries()].sort((a, b) => a[0] - b[0])) {
    offsets.set(id, Buffer.byteLength(pdf, "utf8"));
    pdf += `${id} 0 obj\n${body}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  const maxId = Math.max(...objects.keys());
  pdf += `xref\n0 ${maxId + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let id = 1; id <= maxId; id += 1) {
    const offset = offsets.get(id) ?? 0;
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

export function exportPdf(run: WorkflowRun, mode: ExportMode): Buffer {
  const markdown = exportMarkdown(run, mode);
  return buildPdfFromLines(markdown.split("\n"));
}

export function exportPlatformAssetsPdf(run: WorkflowRun): Buffer {
  const markdown = exportPlatformAssetsMarkdown(run);
  return buildPdfFromLines(markdown.split("\n"));
}

export function exportPlatformAssetOnepagerPdf(
  run: WorkflowRun,
  platform: string
): Buffer {
  const markdown = exportPlatformAssetOnepagerMarkdown(run, platform);
  return buildPdfFromLines(markdown.split("\n"));
}
