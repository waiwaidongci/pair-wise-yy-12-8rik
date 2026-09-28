import { useMemo, useState } from "react";
import type { HoofGroup, HoofPos, Horse } from "../types";
import {
  HOOF_GROUP,
  HOOF_LABEL,
  HOOF_ORDER,
  daysUntil,
  formatDate,
  hasIssue,
  isCurrentlyAbnormal,
  pendingSession,
} from "../data";

interface Props {
  horse: Horse;
  onBack: () => void;
  onAddSession: () => void;
  onReview: () => void;
}

type HoofFilter = "all" | HoofGroup;

export default function HorseDetail({
  horse,
  onBack,
  onAddSession,
  onReview,
}: Props) {
  const [filter, setFilter] = useState<HoofFilter>("all");
  const [showPhoto, setShowPhoto] = useState<HoofPos | null>(null);

  const pending = pendingSession(horse);
  const abnormal = isCurrentlyAbnormal(horse);
  const sessionsDesc = useMemo(
    () => [...horse.sessions].reverse(),
    [horse.sessions],
  );
  const totalSessions = horse.sessions.length;

  // 蹄铁更换流水（每次更换蹄铁都留档）
  const changeLog = useMemo(() => {
    const log: {
      key: string;
      sessionIndex: number;
      date: string;
      pos: HoofPos;
      type: string;
      nails: string;
      note: string;
      hasPhoto: boolean;
    }[] = [];
    horse.sessions.forEach((s, i) => {
      for (const pos of HOOF_ORDER) {
        const h = s.hooves[pos];
        if (h.shoeChanged) {
          log.push({
            key: `${s.id}-${pos}`,
            sessionIndex: i + 1,
            date: s.date,
            pos,
            type: h.shoeType,
            nails: h.nailPositions,
            note: h.photoNote,
            hasPhoto: !!h.photo,
          });
        }
      }
    });
    return log.reverse();
  }, [horse.sessions]);

  const visibleHooves = (pos: HoofPos) =>
    filter === "all" || HOOF_GROUP[pos] === filter;

  return (
    <div className="detail">
      <button className="back-btn" onClick={onBack}>
        ← 返回马匹列表
      </button>

      <section className="panel detail-head">
        <div>
          <p>马匹档案</p>
          <h2>
            {horse.code}
            <span className="horse-name">{horse.name}</span>
            <span className="tag">{horse.category}</span>
            {abnormal ? <span className="tag tag-warn">异常步态</span> : null}
          </h2>
          <small>
            建档 {formatDate(horse.createdAt)} · 共 {totalSessions} 次修蹄记录
            {pending ? (
              <span
                className={
                  "pending-dot " +
                  (daysUntil(pending.nextReviewDate) < 0 ? "overdue" : "")
                }
              >
                · 待复查：{formatDate(pending.nextReviewDate)}
              </span>
            ) : null}
          </small>
        </div>
        <div className="detail-actions">
          {pending ? (
            <button className="primary" onClick={onReview}>
              复查
            </button>
          ) : null}
          <button onClick={onAddSession}>登记新一次修蹄</button>
        </div>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>蹄铁更换流水</p>
            <h2>类型 · 钉位 · 备注完整历史</h2>
          </div>
        </div>
        {changeLog.length === 0 ? (
          <p className="empty">暂无更换蹄铁的记录。</p>
        ) : (
          <div className="table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>修蹄日期</th>
                  <th>蹄位</th>
                  <th>蹄铁类型</th>
                  <th>钉位</th>
                  <th>备注</th>
                </tr>
              </thead>
              <tbody>
                {changeLog.map((row) => (
                  <tr key={row.key}>
                    <td>
                      {formatDate(row.date)}
                      <small>第{row.sessionIndex}次</small>
                    </td>
                    <td>{HOOF_LABEL[row.pos]}</td>
                    <td>{row.type}</td>
                    <td>{row.nails}</td>
                    <td>
                      {row.note || "—"}
                      {row.hasPhoto ? " 📷" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>历次修蹄与复查</p>
            <h2>四蹄对比记录</h2>
          </div>
          <div className="seg">
            {(["all", "front", "hind"] as const).map((f) => (
              <button
                key={f}
                className={filter === f ? "active" : ""}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "全部蹄位" : f === "front" ? "前蹄" : "后蹄"}
              </button>
            ))}
          </div>
        </div>

        <div className="session-timeline">
          {sessionsDesc.map((s, idx) => {
            const seq = totalSessions - idx;
            const due = daysUntil(s.nextReviewDate);
            return (
              <article key={s.id} className="session-card">
                <header className="session-head">
                  <div>
                    <h3>
                      第 {seq} 次修蹄 · {formatDate(s.date)}
                    </h3>
                    <small>下次复查：{formatDate(s.nextReviewDate)}</small>
                  </div>
                  <div className="badge-row">
                    {s.abnormalGait ? (
                      <span className="tag tag-warn">异常步态</span>
                    ) : (
                      <span className="tag tag-ok">步态正常</span>
                    )}
                    {s.review ? (
                      <span className="tag tag-ok">
                        已于 {formatDate(s.review.date)} 复查
                      </span>
                    ) : (
                      <span
                        className={
                          "tag " + (due < 0 ? "tag-danger" : "tag-pending")
                        }
                      >
                        {due < 0
                          ? `复查逾期 ${-due} 天`
                          : due === 0
                            ? "今日复查"
                            : `${due} 天后复查`}
                      </span>
                    )}
                  </div>
                </header>

                {s.gaitSummary ? (
                  <p className="gait-summary">整体步态：{s.gaitSummary}</p>
                ) : null}

                <div className="hoof-compare">
                  {HOOF_ORDER.filter(visibleHooves).map((pos) => {
                    const h = s.hooves[pos];
                    return (
                      <div key={pos} className="hoof-compare-item">
                        <h4>
                          <span
                            className={`tag tag-${HOOF_GROUP[pos]}`}
                          >
                            {HOOF_GROUP[pos] === "front" ? "前" : "后"}
                          </span>
                          {HOOF_LABEL[pos]}
                          {h.shoeChanged ? (
                            <span className="changed-flag">已换铁</span>
                          ) : (
                            <span className="unchanged-flag">未换铁</span>
                          )}
                          {hasIssue(h.gaitIssue) ? (
                            <span className="tag tag-warn">步态问题</span>
                          ) : null}
                        </h4>
                        <dl>
                          <dt>步态问题</dt>
                          <dd>{h.gaitIssue || "—"}</dd>
                          <dt>蹄形评估</dt>
                          <dd>{h.hoofShape}</dd>
                          <dt>蹄铁类型</dt>
                          <dd>{h.shoeType}</dd>
                          <dt>钉位</dt>
                          <dd>{h.nailPositions}</dd>
                          <dt>照片备注</dt>
                          <dd>
                            {h.photoNote || "—"}
                            {h.photo ? (
                              <button
                                type="button"
                                className="link-btn"
                                onClick={() => setShowPhoto(pos)}
                              >
                                查看照片 📷
                              </button>
                            ) : null}
                          </dd>
                        </dl>
                        {h.photo && showPhoto === pos ? (
                          <img
                            className="inline-photo"
                            src={h.photo.dataUrl}
                            alt={h.photo.name}
                            onClick={() => setShowPhoto(null)}
                            title="点击收起"
                          />
                        ) : null}
                        {s.review ? (
                          <div className="change-line">
                            <b>复查变化：</b>
                            {s.review.changes[pos] || "—"}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {s.review ? (
                  <div className="review-block">
                    <h4>复查结论（{formatDate(s.review.date)}）</h4>
                    {s.abnormalGait ? (
                      <span
                        className={
                          "tag " +
                          (s.review.resolved ? "tag-ok" : "tag-warn")
                        }
                      >
                        {s.review.resolved
                          ? "步态已恢复正常"
                          : "异常步态仍在跟踪"}
                      </span>
                    ) : null}
                    {s.review.note ? <p>{s.review.note}</p> : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
