import type {
  HoofPos,
  HoofGroup,
  HoofRecord,
  Horse,
  SessionDraft,
  TrimmingSession,
} from "./types";

export const STORAGE_KEY = "farrier-archive-v1";

export const HOOF_ORDER: HoofPos[] = ["LF", "RF", "LH", "RH"];

export const HOOF_LABEL: Record<HoofPos, string> = {
  LF: "左前蹄",
  RF: "右前蹄",
  LH: "左后蹄",
  RH: "右后蹄",
};

export const HOOF_GROUP: Record<HoofPos, HoofGroup> = {
  LF: "front",
  RF: "front",
  LH: "hind",
  RH: "hind",
};

export const SHOE_TYPES = [
  "标准钢蹄铁",
  "铝蹄铁",
  "塑料蹄铁",
  "加护蹄垫",
  "矫正蹄铁",
  "无蹄铁（裸蹄修整）",
];

export const NAIL_PRESETS = [
  "内侧2钉·外侧3钉",
  "内侧3钉·外侧3钉",
  "内侧3钉·外侧4钉",
  "外侧避让裂纹（2钉）",
  "掌侧加钉固定",
];

export const HOOF_SHAPE_PRESETS = [
  "正常",
  "外侧磨耗偏重",
  "内侧磨耗偏重",
  "蹄壁裂纹",
  "蹄叉退化",
  "蹄底扁平",
  "高蹄（延蹄）",
];

// ---------- 日期工具 ----------

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 距今天数：负数表示已过期 */
export function daysUntil(dateStr: string): number {
  const now = new Date(todayStr() + "T00:00:00").getTime();
  const target = new Date(dateStr + "T00:00:00").getTime();
  return Math.round((target - now) / 86400000);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

// ---------- 记录工具 ----------

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyHoofRecord(): HoofRecord {
  return {
    gaitIssue: "",
    hoofShape: "",
    shoeType: "",
    nailPositions: "",
    photoNote: "",
    photo: null,
    shoeChanged: true,
  };
}

export function emptyDraft(): SessionDraft {
  const date = todayStr();
  return {
    date,
    nextReviewDate: addDays(date, 42),
    abnormalGait: false,
    gaitSummary: "",
    hooves: {
      LF: emptyHoofRecord(),
      RF: emptyHoofRecord(),
      LH: emptyHoofRecord(),
      RH: emptyHoofRecord(),
    },
  };
}

export function emptyChanges(): Record<HoofPos, string> {
  return { LF: "", RF: "", LH: "", RH: "" };
}

/**
 * 归档校验：一次修蹄必须四蹄都记录完整。
 * 要求：蹄形评估、蹄铁类型、钉位都填写；步态问题未标记异常时可以填“无”。
 */
export function findIncompleteHooves(draft: SessionDraft): HoofPos[] {
  const missing: HoofPos[] = [];
  for (const pos of HOOF_ORDER) {
    const h = draft.hooves[pos];
    if (!h.hoofShape.trim() || !h.shoeType.trim() || !h.nailPositions.trim()) {
      missing.push(pos);
    }
    if (draft.abnormalGait && !h.gaitIssue.trim()) {
      missing.push(pos);
    }
  }
  return Array.from(new Set(missing));
}

/** 某蹄位是否“有问题”（用于前蹄 / 后蹄筛选与列表标识） */
export function hasIssue(text: string | undefined): boolean {
  if (!text) return false;
  const t = text.trim();
  return t !== "" && t !== "无" && t !== "无异常" && t !== "正常";
}

export function latestSession(horse: Horse): TrimmingSession | undefined {
  return horse.sessions.length > 0
    ? horse.sessions[horse.sessions.length - 1]
    : undefined;
}

/** 当前待复查的修蹄：最近一次修蹄未复查 */
export function pendingSession(horse: Horse): TrimmingSession | undefined {
  const s = latestSession(horse);
  return s && !s.review ? s : undefined;
}

/** 马匹当前是否处于异常步态状态（最近一次修蹄被标记且复查未确认恢复） */
export function isCurrentlyAbnormal(horse: Horse): boolean {
  const s = latestSession(horse);
  if (!s || !s.abnormalGait) return false;
  if (!s.review) return true;
  return !s.review.resolved;
}

export function sortByCode(horses: Horse[]): Horse[] {
  return [...horses].sort((a, b) =>
    a.code.localeCompare(b.code, "zh-Hans-CN", { numeric: true }),
  );
}

// ---------- localStorage ----------

export function loadHorses(): Horse[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Horse[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // 存档损坏时回退到示例数据
  }
  const seed = buildSeedData();
  persistHorses(seed);
  return seed;
}

export function persistHorses(horses: Horse[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(horses));
}

// ---------- 示例数据 ----------

function makeHoof(partial: Partial<HoofRecord>): HoofRecord {
  return { ...emptyHoofRecord(), ...partial };
}

function buildSeedData(): Horse[] {
  const today = todayStr();

  const h18: Horse = {
    id: uid(),
    code: "HORSE-18",
    name: "疾风",
    category: "运动马",
    createdAt: today,
    sessions: [
      {
        id: uid(),
        date: addDays(today, -30),
        nextReviewDate: addDays(today, -16),
        abnormalGait: true,
        gaitSummary: "右前肢运步外展，疑为外侧壁磨耗代偿",
        hooves: {
          LF: makeHoof({
            gaitIssue: "轻微点头跛行",
            hoofShape: "正常",
            shoeType: "铝蹄铁",
            nailPositions: "内侧2钉·外侧3钉",
            photoNote: "落铁时内侧有轻微压痕",
            shoeChanged: true,
          }),
          RF: makeHoof({
            gaitIssue: "右前蹄外侧磨耗，落地外展",
            hoofShape: "外侧磨耗偏重",
            shoeType: "矫正蹄铁",
            nailPositions: "外侧避让裂纹（2钉）",
            photoNote: "外侧壁短缩，已拍照留档，复查重点",
            shoeChanged: true,
          }),
          LH: makeHoof({
            gaitIssue: "无",
            hoofShape: "正常",
            shoeType: "标准钢蹄铁",
            nailPositions: "内侧3钉·外侧3钉",
            shoeChanged: true,
          }),
          RH: makeHoof({
            gaitIssue: "无",
            hoofShape: "正常",
            shoeType: "标准钢蹄铁",
            nailPositions: "内侧3钉·外侧3钉",
            shoeChanged: true,
          }),
        },
        review: null,
      },
    ],
  };

  const h27: Horse = {
    id: uid(),
    code: "HORSE-27",
    name: "铁柱",
    category: "运动马",
    createdAt: today,
    sessions: [
      {
        id: uid(),
        date: addDays(today, -12),
        nextReviewDate: addDays(today, 2),
        abnormalGait: false,
        gaitSummary: "步态正常，后蹄裂纹防护观察中",
        hooves: {
          LF: makeHoof({
            gaitIssue: "无",
            hoofShape: "正常",
            shoeType: "标准钢蹄铁",
            nailPositions: "内侧3钉·外侧3钉",
            shoeChanged: true,
          }),
          RF: makeHoof({
            gaitIssue: "无",
            hoofShape: "正常",
            shoeType: "标准钢蹄铁",
            nailPositions: "内侧3钉·外侧3钉",
            shoeChanged: true,
          }),
          LH: makeHoof({
            gaitIssue: "无",
            hoofShape: "蹄壁裂纹",
            shoeType: "加护蹄垫",
            nailPositions: "掌侧加钉固定",
            photoNote: "裂纹长约2cm，加护蹄垫减压，复查时拍照对比",
            shoeChanged: true,
          }),
          RH: makeHoof({
            gaitIssue: "无",
            hoofShape: "正常",
            shoeType: "加护蹄垫",
            nailPositions: "掌侧加钉固定",
            photoNote: "对称加装护垫",
            shoeChanged: true,
          }),
        },
        review: null,
      },
    ],
  };

  const h31: Horse = {
    id: uid(),
    code: "HORSE-31",
    name: "云溪",
    category: "休养马",
    createdAt: today,
    sessions: [
      {
        id: uid(),
        date: addDays(today, -55),
        nextReviewDate: addDays(today, -40),
        abnormalGait: true,
        gaitSummary: "步态轻微不稳，双前肢运步拘谨",
        hooves: {
          LF: makeHoof({
            gaitIssue: "运步拘谨，前伸不足",
            hoofShape: "高蹄（延蹄）",
            shoeType: "标准钢蹄铁",
            nailPositions: "内侧2钉·外侧3钉",
            shoeChanged: true,
          }),
          RF: makeHoof({
            gaitIssue: "运步拘谨，前伸不足",
            hoofShape: "高蹄（延蹄）",
            shoeType: "标准钢蹄铁",
            nailPositions: "内侧2钉·外侧3钉",
            shoeChanged: true,
          }),
          LH: makeHoof({
            gaitIssue: "无",
            hoofShape: "正常",
            shoeType: "标准钢蹄铁",
            nailPositions: "内侧3钉·外侧3钉",
            shoeChanged: true,
          }),
          RH: makeHoof({
            gaitIssue: "无",
            hoofShape: "正常",
            shoeType: "标准钢蹄铁",
            nailPositions: "内侧3钉·外侧3钉",
            shoeChanged: true,
          }),
        },
        review: {
          date: addDays(today, -41),
          changes: {
            LF: "修蹄角度后前伸改善，拘谨减轻",
            RF: "修蹄角度后前伸改善，拘谨减轻",
            LH: "无变化",
            RH: "无变化",
          },
          resolved: false,
          note: "仍有轻微不稳，转入休养并安排再次修蹄",
        },
      },
      {
        id: uid(),
        date: addDays(today, -40),
        nextReviewDate: addDays(today, 5),
        abnormalGait: true,
        gaitSummary: "复查后仍不稳，继续休养观察",
        hooves: {
          LF: makeHoof({
            gaitIssue: "前伸改善但仍有轻微拘谨",
            hoofShape: "高蹄（延蹄），角度已调整",
            shoeType: "塑料蹄铁",
            nailPositions: "内侧2钉·外侧3钉",
            photoNote: "更换塑料蹄铁减轻负重",
            shoeChanged: true,
          }),
          RF: makeHoof({
            gaitIssue: "前伸改善但仍有轻微拘谨",
            hoofShape: "高蹄（延蹄），角度已调整",
            shoeType: "塑料蹄铁",
            nailPositions: "内侧2钉·外侧3钉",
            photoNote: "更换塑料蹄铁减轻负重",
            shoeChanged: true,
          }),
          LH: makeHoof({
            gaitIssue: "无",
            hoofShape: "正常",
            shoeType: "无蹄铁（裸蹄修整）",
            nailPositions: "无钉（裸蹄）",
            shoeChanged: false,
          }),
          RH: makeHoof({
            gaitIssue: "无",
            hoofShape: "正常",
            shoeType: "无蹄铁（裸蹄修整）",
            nailPositions: "无钉（裸蹄）",
            shoeChanged: false,
          }),
        },
        review: null,
      },
    ],
  };

  return [h18, h27, h31];
}
