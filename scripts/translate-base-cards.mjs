import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const catalogPath = new URL("../app/data/smashup-bases.json", import.meta.url);
const delimiter = "[[@@SPLIT@@]]";
const proxy = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY ?? "http://127.0.0.1:7892";

const manualText = {
  "base-sheep-1": "此基地牌打出后，每名玩家可以将其一个随从移动到此处。若在设置期间打出此基地牌，将其替换并洗回基地牌组。",
  "base-world-champs-1": "在你的回合中首次在此处打出随从后，你可以打出一张额外战术，或抽一张牌。",
  "base-ghosts-2": "玩家不能在此基地打出战术。",
  "base-magical-girls-2": "在此基地计分前，每名玩家消灭其在此基地上的所有随从和战术，但各保留其中一张牌。",
  "base-backtimers-2": "在此基地计分后，获胜者可以在其位于此处的一名随从或一张战术上放置两个停滞标记。",
  "base-wraithrustlers-2": "获胜者在其下个回合可以打出一张额外战术或一个额外随从。",
  "base-adolescent-epic-geckos-1": "当你在一个回合中打出第二张战术后，你可以在此处的一名随从上放置一个 +1 战斗力标记。",
  "base-adolescent-epic-geckos-2": "每回合首次在此处打出随从后，你可以打出一张额外战术。",
  "base-rulers-of-the-cosmos-1": "你可以不进行常规战术打出，改为从你的牌组顶打出一张“打出到随从上”的战术，并将其打出到此处的一名随从上。",
  "base-rulers-of-the-cosmos-2": "每回合一次，当一张战术被打出到或转移到此处的一名随从上后，你可以在该随从上放置一个 +1 战斗力标记。",
  "base-fairies-2": "当你将一张战术打出到此处的一名随从上后，抽一张牌。",
  "base-cyborg-apes-2": "在此基地计分后，获胜者可以将任意数量打出到此处随从上的战术移回其手上。",
  "base-clerics-1": "2 个不死怪兽。每回合首次在此处打出随从后，选择“随从”或“战术”；将你弃牌堆中该类型的一张随机牌洗入你的牌组。",
  "base-thieves-2": "1 个怪兽。在此基地计分前，此处的每名玩家亮出其手牌。亮出战术最多的玩家各可以消灭此处的一名随从。",
  "base-miskatonic-university-1": "每回合一次，在你于此处打出随从后，你可以抽两张疯狂牌；或从手上弃掉一张疯狂牌，以打出一张额外战术。",
  "base-anansi-tales-2": "在你的回合中，你可以打出一张额外战术，在此基地牌上放置一个标记。此基地的临界点每有一个此标记便减少 2。",
  "base-ancient-incas-1": "此基地上的每张战术使其临界点减少 3。",
  "base-zombies-1": "在此基地计分后，获胜者弃掉其所有手牌并抽五张牌。",
  "base-zombies-2": "当此基地计分时，每名玩家在此处每有一名随从便获得 1 VP。",
  "base-time-travelers-2": "在此基地计分后（替换前），获胜者可以将基地弃牌堆中的一张基地牌放到基地牌组顶。",
  "base-grimms-fairy-tales-1": "在此基地计分前，每名玩家可以选择此处两名力量相同的随从；它们获得 +2 力量直到回合结束。",
  "base-steampunks-1": "在此基地计分后，获胜者可以将其弃牌堆中的一张战术加入手上。",
  "base-vikings-1": "每回合首次在此处打出随从后，你可以展示另一名玩家牌组顶牌。若它是一张战术或力量为 3 或以下的随从，将其加入你的手上；否则放回原处。",
  "base-thieves-1": "3 个怪兽。在此基地计分后，此处的玩家可以抽一张宝藏牌，或从手上弃掉价值等于其 VP 奖励的宝藏以获得 1 VP。",
  "base-aliens-2": "在此基地计分后，获胜者可以将其一名力量为 3 或以下的随从从此处移回其拥有者的手上。",
  "base-shapeshifters-1": "每回合一次，当你在此处打出随从后，你可以从牌组中搜索该随从的一张副本，展示并加入你的手上，然后洗牌。",
  "base-clowns-1": "每回合首次在此处打出随从后，你可以将弃牌堆中的一张随机战术加入你的手上。",
  "base-luchadors-2": "每回合首次在此处打出随从后，你可以将弃牌堆中的一张随机战术加入你的手上。",
  "base-grimms-fairy-tales-2": "每回合一次，当你在此处打出随从后，你可以从牌组中搜索一名力量为 3 或以下的随从，并加入你的手上。",
};

function normalizeTranslation(value) {
  return value
    .replace(/画(一|两|二|三|四|五|六|七|八|九|十|\d+)?张卡/g, (_, count = "一") => `抽${count}张牌`)
    .replace(/抽(一|两|二|三|四|五|六|七|八|九|十|\d+)?张卡/g, (_, count = "一") => `抽${count}张牌`)
    .replace(/卡片/g, "牌")
    .replace(/功率计数器|力量计数器|力量指示物|能量计数器|能量指示物/g, "战斗力标记")
    .replace(/指示物|计数器/g, "标记")
    .replace(/爪牙|仆从|奴才|小兵|部下/g, "随从")
    .replace(/怪物/g, "怪兽")
    .replace(/抓\s*(一|两|二|三|四|五|六|七|八|九|十|\d+)?\s*张牌/g, (_, count = "一") => `抽${count}张牌`)
    .replace(/你的手中/g, "你的手上")
    .replace(/他们的手中/g, "他们的手上")
    .replace(/手中的/g, "手上的")
    .replace(/这个基地/g, "此基地")
    .replace(/该基地/g, "此基地")
    .replace(/在在此基地/g, "在此基地")
    .replace(/在此在此基地/g, "在此基地")
    .replace(/(此|这|该)?个?基础分数之前|(此|这|该)?个?基本分数之前|(此|这|该)?基础得分之前|基地得分之前/g, "在此基地计分前")
    .replace(/(此|这|该)?个?基础分数之后|(此|这|该)?个?基本分数之后|(此|这|该)?基础得分之后|基地得分之后/g, "在此基地计分后")
    .replace(/基地得分前/g, "基地计分前")
    .replace(/基地得分后/g, "基地计分后")
    .replace(/基地得分时/g, "基地计分时")
    .replace(/基础牌组|基本牌组/g, "基地牌库")
    .replace(/基础牌|基本牌/g, "基地牌")
    .replace(/该基数/g, "此基地")
    .replace(/(此|这|该)基地的断点/g, "此基地的临界点")
    .replace(/断点/g, "临界点")
    .replace(/标准动作/g, "标准战术")
    .replace(/额外动作/g, "额外战术")
    .replace(/随机动作/g, "随机战术")
    .replace(/动作/g, "战术")
    .replace(/执行(一个|一张)战术/g, "打出一张战术")
    .replace(/执行(一个)?额外的?战术/g, "打出一张额外战术")
    .replace(/进行(一个)?额外的?战术/g, "打出一张额外战术")
    .replace(/一个随机标准战术/g, "一张随机战术")
    .replace(/一个随机战术/g, "一张随机战术")
    .replace(/一个标准战术/g, "一张标准战术")
    .replace(/一个额外战术/g, "一张额外战术")
    .replace(/扮演/g, "打出")
    .replace(/玩(一张|一个|你的|这张)/g, "打出$1")
    .replace(/玩完后/g, "打出后")
    .replace(/设置期间播放/g, "在设置期间打出")
    .replace(/（没有能力）/g, "（无能力）")
    .replace(/摧毁一个随从|摧毁此随从|破坏一个随从|破坏此随从/g, (match) => match.replace(/摧毁|破坏/, "消灭"))
    .replace(/在在此基地/g, "在此基地")
    .replace(/在此在此基地/g, "在此基地")
    .replace(/在在设置期间/g, "在设置期间")
    .replace(/行动/g, "战术")
    .replace(/进行(一次|一个)?额外的?战术/g, "打出一张额外战术")
    .replace(/进行一个战术/g, "打出一张战术")
    .replace(/进行第二个战术/g, "打出第二张战术")
    .replace(/执行标准战术/g, "打出一张标准战术")
    .replace(/执行的战术/g, "打出的战术")
    .replace(/每执行一次操作/g, "每打出一张战术")
    .replace(/额外使用一个(?=随从|力量)/g, "额外打出一个")
    .replace(/使用一个随从/g, "打出一个随从")
    .replace(/使用随从/g, "打出随从")
    .replace(/在此基础得分后/g, "在此基地计分后")
    .replace(/当此基础得分时/g, "当此基地计分时")
    .replace(/基础弃牌堆/g, "基地弃牌堆")
    .replace(/基础甲板/g, "基地牌组")
    .replace(/基地得分/g, "基地计分")
    .replace(/套牌/g, "牌组")
    .replace(/\s+/g, " ")
    .trim();
}

async function translate(input) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const { stdout } = await execFileAsync("curl.exe", [
        "--fail", "--silent", "--show-error", "--connect-timeout", "8", "--max-time", "30",
        "--proxy", proxy,
        "-G", "https://translate.googleapis.com/translate_a/single",
        "--data-urlencode", "client=gtx",
        "--data-urlencode", "sl=en",
        "--data-urlencode", "tl=zh-CN",
        "--data-urlencode", "dt=t",
        "--data-urlencode", `q=${input}`,
      ], { windowsHide: true, maxBuffer: 1024 * 1024 });
      const payload = JSON.parse(stdout);
      const value = payload?.[0]?.map((segment) => segment?.[0] ?? "").join("").trim();
      if (!value) throw new Error("empty translation response");
      return value;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const failures = [];
let cursor = 0;

function translateErrata(value) {
  if (value === "No" || value === "None") return "无";
  if (value === "Not stated") return "未注明";
  if (value === "Yes/No") return "待确认";
  if (/^Yes\s*\(Functional - capped at once per turn\)$/i.test(value)) return "有（功能性：每回合限一次）";
  if (/^Yes,?\s*Functional$/i.test(value)) return "有（功能性）";
  if (/^Yes,?\s*Wording$/i.test(value)) return "有（措辞）";
  if (/^Yes,?\s*functional$/i.test(value)) return "有（功能性）";
  if (value === "Yes, Functional (changed to once per turn)") return "有（功能性：改为每回合一次）";
  if (value === "Yes, Functional (now once per turn)") return "有（功能性：现为每回合一次）";
  if (value === "Yes, Functional (minor, change of timing and specifies \"minion or action\")") return "有（功能性：微调时机，并明确为“随从或战术”）";
  if (value === "Yes, Wording (timing)") return "有（措辞：时机）";
  if (value === "Yes, Functional (now only checks printed power)") return "有（功能性：现仅检查印制力量）";
  if (value === "Yes, Wording (clarified that it's optional)") return "有（措辞：明确为可选）";
  if (value === "Yes, Functional (changed to \"printed power\" from \"power\")") return "有（功能性：将“力量”改为“印制力量”）";
  return normalizeTranslation(value
    .replace(/^Yes,?\s*/i, "有：")
    .replace(/^Yes\s*\(/i, "有（")
    .replace(/^Yes$/i, "有")
    .replace(/Functional/gi, "功能性")
    .replace(/Wording/gi, "措辞")
    .replace(/changed to once per turn/gi, "改为每回合一次"));
}

for (const base of catalog.bases) {
  const errataMatch = base.text.match(/\s+Errata\?\s*(.+)$/i);
  if (errataMatch) {
    base.text = base.text.slice(0, errataMatch.index).trim();
    base.errata = errataMatch[1].trim();
  }
  base.errataZh = translateErrata(base.errata);
}

if (process.argv.includes("--postprocess-only")) {
  for (const base of catalog.bases) {
    if (base.nameZh) base.nameZh = normalizeTranslation(base.nameZh);
    if (base.textZh) base.textZh = manualText[base.id] ?? normalizeTranslation(base.textZh);
  }
  catalog.translation = {
    language: "zh-CN",
    translatedAt: new Date().toISOString(),
    failures: [],
  };
  await writeFile(catalogPath, JSON.stringify(catalog, null, 2) + "\n", "utf8");
  console.log(`[base-zh] postprocessed ${catalog.bases.length}/${catalog.bases.length}`);
  process.exit(0);
}

async function worker() {
  while (cursor < catalog.bases.length) {
    const index = cursor++;
    const base = catalog.bases[index];
    try {
      const translated = await translate(`${base.name}\n${delimiter}\n${base.text}`);
      const [nameZh, textZh] = translated.split(/\[\[\@\@[\s\S]*?\@\@\]\]/).map((value) => normalizeTranslation(value));
      if (!nameZh || !textZh) throw new Error(`translation delimiter missing: ${translated}`);
      base.nameZh = nameZh;
      base.textZh = manualText[base.id] ?? textZh;
      process.stdout.write(`\\r[base-zh] ${index + 1}/${catalog.bases.length}`);
    } catch (error) {
      failures.push({ id: base.id, reason: error instanceof Error ? error.message : String(error) });
      process.stderr.write(`\\n[base-zh] failed ${base.id}\\n`);
    }
  }
}

await Promise.all(Array.from({ length: 3 }, worker));
catalog.translation = {
  language: "zh-CN",
  translatedAt: new Date().toISOString(),
  failures,
};
await writeFile(catalogPath, JSON.stringify(catalog, null, 2) + "\n", "utf8");
console.log(`\\n[base-zh] translated ${catalog.bases.length - failures.length}/${catalog.bases.length}`);
if (failures.length) console.error(JSON.stringify(failures, null, 2));
