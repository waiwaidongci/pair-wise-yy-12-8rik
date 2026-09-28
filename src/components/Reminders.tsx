import { useMemo } from "react";
import type { Horse } from "../types";
import { HOOF_LABEL, isProblemAssessment } from "../constants";
import { formatCN, isPendingReview, latestVisit, reviewBadge } from "../utils";

/** 复查提醒：按复查日期先后排列，逾期与今日优先 */
export function Reminders({
  horses,
  onOpen,
  onReview,
}: {
  horses: Horse[];
  onOpen: (horse: Horse) => void;
  onReview: (horse: Horse) => void;
}) {
  const pending = useMemo(
    () =>
      horses
        .filter(isPendingReview)
        .sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate)),
    [horses],
  );

  const overdueCount = pending.filter(
    (h) => reviewBadge(h.nextReviewDate).tone === "overdue",
  ).length;
  const todayCount = pending.filter(
    (h) => reviewBadge(h.nextReviewDate).tone === "today",
  ).length;

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>复查提醒 · 按日期先后排列</p>
          <h2>待复查马匹</h2>
        </div>
        <div className="reminder-summary">
          {overdueCount > 0 && <span className="badge badge-overdue">逾期 {overdueCount}</span>}
          {todayCount > 0 && <span className="badge badge-today">今日 {todayCount}</span>}
          <span className="muted">共 {pending.length} 匹</span>
        </div>
      </div>

      {pending.length === 0 ? (
        <p className="empty-hint">当前没有安排复查的马匹。</p>
      ) : (
        <ul className="reminder-list">
          {pending.map((horse) => {
            const last = latestVisit(horse);
            const badge = reviewBadge(horse.nextReviewDate);
            const problemHooves = last
              ? (["LF", "RF", "LH", "RH"] as const).filter((p) =>
                  isProblemAssessment(last.hooves[p].assessment),
                )
              : [];
            return (
              <li key={horse.id} className={`reminder-item tone-${badge.tone}`}>
                <div className="reminder-main">
                  <div className="reminder-date">
                    <strong>{formatCN(horse.nextReviewDate)}</strong>
                    <span className={`badge badge-${badge.tone}`}>{badge.text}</span>
                  </div>
                  <div className="reminder-info">
                    <h3>
                      <button type="button" className="link-button" onClick={() => onOpen(horse)}>
                        {horse.code}
                        {horse.name && <span className="horse-name"> · {horse.name}</span>}
                      </button>
                      {last?.abnormalGait && <span className="tag tag-danger">异常步态</span>}
                    </h3>
                    <p>{last ? last.gaitIssue : "—"}</p>
                    {problemHooves.length > 0 && (
                      <p className="muted">
                        问题蹄位：
                        {problemHooves.map((p) => HOOF_LABEL[p]).join("、")}
                      </p>
                    )}
                    {last?.abnormalGait && (
                      <p className="muted">复查时先核对上次评估，录入变化后方可结束复查。</p>
                    )}
                  </div>
                </div>
                <button type="button" className="primary" onClick={() => onReview(horse)}>
                  开始复查
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
