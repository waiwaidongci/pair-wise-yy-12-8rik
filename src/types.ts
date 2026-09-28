/** 四个蹄位：左前 / 右前 / 左后 / 右后 */
export type HoofPosition = "LF" | "RF" | "LH" | "RH";

/** 单个蹄位的一次修蹄记录 */
export interface HoofRecord {
  /** 蹄形评估 */
  assessment: string;
  /** 蹄铁类型 */
  shoeType: string;
  /** 钉位 */
  nails: string;
  /** 照片备注 */
  photoNote: string;
  /** 照片（压缩后的 dataURL，可选） */
  photoDataUrl?: string;
}

export type HoofMap = Record<HoofPosition, HoofRecord>;

/** 一次修蹄 / 复查归档（四蹄完整） */
export interface Visit {
  id: string;
  /** 修蹄日期 YYYY-MM-DD */
  date: string;
  /** 步态问题 */
  gaitIssue: string;
  /** 本次是否标记异常步态 */
  abnormalGait: boolean;
  /** 复查时录入的本次变化（仅复查归档时可能有） */
  gaitChange?: string;
  /** 本次整体备注 */
  note?: string;
  hooves: HoofMap;
  createdAt: number;
}

/** 马匹档案 */
export interface Horse {
  id: string;
  /** 马匹编号 */
  code: string;
  /** 马名（辅助识别） */
  name: string;
  /** 马匹类别 */
  category: "运动马" | "休养马";
  /** 下次复查日期 YYYY-MM-DD */
  nextReviewDate: string;
  /** 历 visits 按时间升序保存，最后一条为最近一次 */
  visits: Visit[];
  createdAt: number;
}
