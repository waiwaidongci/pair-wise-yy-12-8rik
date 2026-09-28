import type { HoofMap, HoofPosition, HoofRecord } from "./types";

/** 蹄位元数据：label 名称、axis 前后、short 简称 */
export const HOOF_POSITIONS: {
  key: HoofPosition;
  label: string;
  short: string;
  axis: "front" | "hind";
}[] = [
  { key: "LF", label: "左前蹄", short: "LF", axis: "front" },
  { key: "RF", label: "右前蹄", short: "RF", axis: "front" },
  { key: "LH", label: "左后蹄", short: "LH", axis: "hind" },
  { key: "RH", label: "右后蹄", short: "RH", axis: "hind" },
];

export const HOOF_LABEL: Record<HoofPosition, string> = {
  LF: "左前蹄",
  RF: "右前蹄",
  LH: "左后蹄",
  RH: "右后蹄",
};

export const AXIS_LABEL = { front: "前蹄", hind: "后蹄" } as const;

export const SHOE_TYPES = [
  "普通铁蹄铁",
  "铝蹄铁",
  "加护蹄垫",
  "防滑蹄铁",
  "矫正蹄铁",
  "树脂蹄铁",
  "无蹄铁（裸蹄修整）",
];

export const ASSESSMENTS = [
  "正常",
  "外侧磨耗",
  "内侧磨耗",
  "蹄裂",
  "白线病",
  "蹄底淤血",
  "蹄叉腐疽",
  "蹄壁缺损",
  "角度异常",
];

/** 评估中除“正常”外均视为问题评估，用于前蹄/后蹄筛选与提示 */
export function isProblemAssessment(assessment: string): boolean {
  return assessment.trim() !== "" && assessment !== "正常";
}

export const NAIL_PRESETS = [
  "标准六钉（前3后3）",
  "外侧加钉（4外2内）",
  "内侧加钉（2外4内）",
  "前蹄七钉（4外3内）",
  "后蹄八钉（4外4内）",
  "减少钉位（4钉固定）",
  "无钉（裸蹄修整）",
];

/** 步态问题快捷短语 */
export const GAIT_CHIPS = [
  "行走正常",
  "右前蹄外侧磨耗",
  "左前蹄点步",
  "后蹄裂纹",
  "步态轻微不稳",
  "右后肢运步受限",
  "转弯僵硬",
];

export const HORSE_CATEGORIES = ["运动马", "休养马"] as const;

/** 常规复查间隔（天） */
export const REVIEW_INTERVAL_DAYS = 42;

export function emptyHoof(): HoofRecord {
  return { assessment: "", shoeType: "", nails: "", photoNote: "" };
}

export function emptyHoofMap(): HoofMap {
  return { LF: emptyHoof(), RF: emptyHoof(), LH: emptyHoof(), RH: emptyHoof() };
}
