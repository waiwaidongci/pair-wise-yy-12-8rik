import type { HoofMap, HoofRecord, Horse, Visit } from "./types";
import { REVIEW_INTERVAL_DAYS } from "./constants";
import { addDays } from "./utils";

function hoof(
  assessment: string,
  shoeType: string,
  nails: string,
  photoNote = "",
): HoofRecord {
  return { assessment, shoeType, nails, photoNote };
}

function visit(
  id: string,
  date: string,
  gaitIssue: string,
  abnormalGait: boolean,
  hooves: HoofMap,
  note?: string,
  gaitChange?: string,
): Visit {
  return {
    id,
    date,
    gaitIssue,
    abnormalGait,
    hooves,
    note,
    gaitChange,
    createdAt: new Date(date + "T10:00:00").getTime(),
  };
}

export function buildSeedHorses(): Horse[] {
  const v1Date = "2026-06-25";
  const v2Date = "2026-08-09";

  const horse18: Horse = {
    id: "horse-18",
    code: "HORSE-18",
    name: "疾风",
    category: "运动马",
    nextReviewDate: addDays(v2Date, 42), // 2026-09-20，已逾期
    createdAt: new Date(v1Date + "T09:00:00").getTime(),
    visits: [
      visit(
        "visit-18-1",
        v1Date,
        "行走正常",
        false,
        {
          LF: hoof("正常", "普通铁蹄铁", "标准六钉（前3后3）"),
          RF: hoof("正常", "普通铁蹄铁", "标准六钉（前3后3）"),
          LH: hoof("正常", "普通铁蹄铁", "标准六钉（前3后3）"),
          RH: hoof("正常", "普通铁蹄铁", "标准六钉（前3后3）"),
        },
        "季度常规修蹄，四蹄角度均衡。",
      ),
      visit(
        "visit-18-2",
        v2Date,
        "右前蹄外侧磨耗",
        false,
        {
          LF: hoof("正常", "普通铁蹄铁", "标准六钉（前3后3）"),
          RF: hoof("外侧磨耗", "铝蹄铁", "外侧加钉（4外2内）", "外侧蹄壁磨耗约3mm，已拍照留档，复查角度"),
          LH: hoof("正常", "普通铁蹄铁", "标准六钉（前3后3）"),
          RH: hoof("正常", "普通铁蹄铁", "标准六钉（前3后3）"),
        },
        "右前换铝蹄铁减轻负重，外侧加钉。",
      ),
    ],
  };

  const v3Date = "2026-07-12";
  const v4Date = "2026-08-17";

  const horse27: Horse = {
    id: "horse-27",
    code: "HORSE-27",
    name: "栗子",
    category: "休养马",
    nextReviewDate: addDays(v4Date, REVIEW_INTERVAL_DAYS), // 2026-09-28，今天
    createdAt: new Date(v3Date + "T09:00:00").getTime(),
    visits: [
      visit(
        "visit-27-1",
        v3Date,
        "后蹄裂纹",
        false,
        {
          LF: hoof("正常", "普通铁蹄铁", "标准六钉（前3后3）"),
          RF: hoof("正常", "普通铁蹄铁", "标准六钉（前3后3）"),
          LH: hoof("蹄裂", "加护蹄垫", "减少钉位（4钉固定）", "左后外侧蹄裂约2cm"),
          RH: hoof("正常", "普通铁蹄铁", "标准六钉（前3后3）"),
        },
        "左后蹄裂纹，加装护蹄垫休养。",
      ),
      visit(
        "visit-27-2",
        v4Date,
        "后蹄裂纹恢复中，运步尚可",
        false,
        {
          LF: hoof("正常", "无蹄铁（裸蹄修整）", "无钉（裸蹄修整）"),
          RF: hoof("正常", "无蹄铁（裸蹄修整）", "无钉（裸蹄修整）"),
          LH: hoof("蹄裂", "加护蹄垫", "减少钉位（4钉固定）", "裂纹未扩展，护蹄垫继续使用"),
          RH: hoof("蹄裂", "加护蹄垫", "减少钉位（4钉固定）", "右后新发现浅裂纹，同步加垫"),
        },
        "休养期前蹄裸蹄修整，后蹄继续护蹄垫。",
      ),
    ],
  };

  const v5Date = "2026-07-20";
  const v6Date = "2026-08-24";

  const horse31: Horse = {
    id: "horse-31",
    code: "HORSE-31",
    name: "银霜",
    category: "运动马",
    nextReviewDate: addDays(v6Date, REVIEW_INTERVAL_DAYS), // 2026-10-05，待复查
    createdAt: new Date(v5Date + "T09:00:00").getTime(),
    visits: [
      visit(
        "visit-31-1",
        v5Date,
        "行走正常",
        false,
        {
          LF: hoof("正常", "铝蹄铁", "标准六钉（前3后3）"),
          RF: hoof("正常", "铝蹄铁", "标准六钉（前3后3）"),
          LH: hoof("正常", "铝蹄铁", "标准六钉（前3后3）"),
          RH: hoof("正常", "铝蹄铁", "标准六钉（前3后3）"),
        },
      ),
      visit(
        "visit-31-2",
        v6Date,
        "步态轻微不稳，左转时明显",
        true,
        {
          LF: hoof("角度异常", "矫正蹄铁", "外侧加钉（4外2内）", "左前蹄角度偏陡，拍照给教练复核"),
          RF: hoof("正常", "铝蹄铁", "标准六钉（前3后3）"),
          LH: hoof("正常", "铝蹄铁", "标准六钉（前3后3）"),
          RH: hoof("正常", "铝蹄铁", "标准六钉（前3后3）"),
        },
        "已标记异常步态，需教练复核，复查时先评估变化。",
      ),
    ],
  };

  return [horse18, horse27, horse31];
}
