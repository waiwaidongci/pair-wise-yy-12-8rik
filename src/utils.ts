import type { HoofMap, HoofPosition, Horse, Visit } from "./types";
import { isProblemAssessment } from "./constants";

/** 本地时区的日期输入框值：YYYY-MM-DD */
export function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayInput(): string {
  return toDateInput(new Date());
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toDateInput(d);
}

/** b - a 的天数差（按本地日期，忽略时分秒） */
export function dayDiff(a: string, b: string): number {
  const da = new Date(a + "T00:00:00").getTime();
  const db = new Date(b + "T00:00:00").getTime();
  return Math.round((db - da) / 86_400_000);
}

/** 距今天数：负数表示已过期 */
export function daysFromToday(dateStr: string): number {
  return dayDiff(todayInput(), dateStr);
}

export function formatCN(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 复查相对提示，如“已逾期 3 天”“今天复查”“6 天后” */
export function reviewBadge(dateStr: string): { text: string; tone: "overdue" | "today" | "soon" | "later" } {
  const d = daysFromToday(dateStr);
  if (d < 0) return { text: `已逾期 ${-d} 天`, tone: "overdue" };
  if (d === 0) return { text: "今天复查", tone: "today" };
  if (d <= 7) return { text: `${d} 天后`, tone: "soon" };
  return { text: `${d} 天后`, tone: "later" };
}

export function latestVisit(horse: Horse): Visit | undefined {
  return horse.visits.length > 0 ? horse.visits[horse.visits.length - 1] : undefined;
}

/** 马匹是否在“待复查”范围（有复查日期即纳入，逾期优先） */
export function isPendingReview(horse: Horse): boolean {
  return horse.nextReviewDate !== "" && horse.visits.length > 0;
}

type Axis = "front" | "hind";

/** 步态问题文本中是否提到前/后蹄 */
function gaitMentionsAxis(gait: string, axis: Axis): boolean {
  const text = gait;
  if (axis === "front") return /前蹄|前肢|前腿/.test(text);
  return /后蹄|后肢|后腿/.test(text);
}

/** 最近一次修蹄中，前蹄或后蹄是否存在问题（步态提及或评估非“正常”） */
export function axisHasIssue(horse: Horse, axis: Axis): boolean {
  const visit = latestVisit(horse);
  if (!visit) return false;
  const positions: HoofPosition[] = axis === "front" ? ["LF", "RF"] : ["LH", "RH"];
  const hoofProblem = positions.some((p) => isProblemAssessment(visit.hooves[p].assessment));
  return hoofProblem || gaitMentionsAxis(visit.gaitIssue, axis) || visit.abnormalGait;
}

export interface HoofChange {
  position: HoofPosition;
  from?: string;
  to: string;
  changed: boolean;
}

/** 对比两次修蹄之间各蹄位的蹄铁类型变化（更换蹄铁留档用） */
export function shoeChanges(prev: HoofMap | undefined, next: HoofMap): HoofChange[] {
  const order: HoofPosition[] = ["LF", "RF", "LH", "RH"];
  return order.map((position) => {
    const to = next[position].shoeType;
    const from = prev?.[position].shoeType;
    return { position, from, to, changed: from !== undefined && from !== to };
  });
}

/** 读取图片文件并压缩为不超过 maxSize 的 JPEG dataURL */
export function fileToResizedDataUrl(file: File, maxSize = 720): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("照片读取失败"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("照片解析失败"));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("当前浏览器不支持照片处理"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
