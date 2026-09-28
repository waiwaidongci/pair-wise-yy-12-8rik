// 修蹄档案的核心数据模型

/** 蹄位：左前 / 右前 / 左后 / 右后 */
export type HoofPos = "LF" | "RF" | "LH" | "RH";

export type HoofGroup = "front" | "hind";

export interface Photo {
  name: string;
  dataUrl: string;
}

/** 单个蹄位的一次修蹄记录 */
export interface HoofRecord {
  /** 步态问题（该蹄位） */
  gaitIssue: string;
  /** 蹄形评估 */
  hoofShape: string;
  /** 蹄铁类型 */
  shoeType: string;
  /** 钉位 */
  nailPositions: string;
  /** 照片备注（文字） */
  photoNote: string;
  /** 现场照片（压缩后存档） */
  photo: Photo | null;
  /** 本次是否更换了蹄铁 */
  shoeChanged: boolean;
}

/** 复查结论 */
export interface ReviewRecord {
  /** 复查日期 */
  date: string;
  /** 四蹄本次变化（异常步态马匹必须逐蹄录入） */
  changes: Record<HoofPos, string>;
  /** 异常步态是否已恢复正常 */
  resolved: boolean;
  /** 复查备注 */
  note: string;
}

/** 一次修蹄（一次归档必须包含完整四蹄） */
export interface TrimmingSession {
  id: string;
  /** 修蹄日期 */
  date: string;
  /** 下次复查日期 */
  nextReviewDate: string;
  /** 本次是否标记异常步态 */
  abnormalGait: boolean;
  /** 整体步态问题描述 */
  gaitSummary: string;
  /** 四个蹄位的记录 */
  hooves: Record<HoofPos, HoofRecord>;
  /** 复查记录，未复查为 null */
  review: ReviewRecord | null;
}

export type HorseCategory = "运动马" | "休养马";

export interface Horse {
  id: string;
  /** 马匹编号 */
  code: string;
  name: string;
  category: HorseCategory;
  createdAt: string;
  /** 历次修蹄，按时间正序 */
  sessions: TrimmingSession[];
}

/** 新建修蹄表单提交的数据 */
export interface SessionDraft {
  date: string;
  nextReviewDate: string;
  abnormalGait: boolean;
  gaitSummary: string;
  hooves: Record<HoofPos, HoofRecord>;
}

export interface NewSessionPayload extends SessionDraft {
  horseId: string;
  newHorse?: {
    code: string;
    name: string;
    category: HorseCategory;
  };
}

export interface ReviewDraft {
  date: string;
  changes: Record<HoofPos, string>;
  resolved: boolean;
  note: string;
}
