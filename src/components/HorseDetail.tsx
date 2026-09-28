import { useState } from "react";
import type { Horse } from "../types";
import {
  HOOF_LABEL,
  HOOF_POSITIONS,
  isProblemAssessment,
} from "../constants";
import {
  formatCN,
  latestVisit,
  reviewBadge,
  shoeChanges,
} from "../utils";
import { useStore } from "../store";
import { VisitForm } from "./VisitForm";

type FormMode = "new" | "review";

export function HorseDetail({
  horse,
  onBack,
}: {
  horse: Horse;
  onBack: () => void;
}) {
  const { deleteVisit } = useStore();
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const last = latestVisit(horse);
  const badge = horse.nextReviewDate ? reviewBadge(horse.nextReviewDate) : null;
  const // 历次记录降序展示
    visitsDesc = [...horse.visits].reverse();

  // 蹄铁更换历史：相邻两次记录之间类型发生变化的蹄位
  const changeHistory = horse.visits
    .slice(1)
    .flatMap((visit, idx) => {
      const prevVisit = horse.visits[idx];
      return shoeChanges(prevVisit.hooves, visit.hooves)
        .filter((c) => c.changed)
        .map((c) => ({ visit, from: c.from ?? "", to: c.to, position: c.position }));
    })
    .reverse();

  if (formMode) {
    return (
      <VisitForm
        horse={horse}
        mode={formMode}
        onDone={onBack}
        onCancel={() => setFormMode(null)}
      />
    );
  }

  return (
    <div className="detail">
      <section className="panel">
        <div className="heading detail-heading">
          <div>
            <button type="button" className="back-link" onClick={onBack}>
              ← 返回马匹列表
            </button>
            <h2 className="detail-title">
              {horse.code} <span className="horse-name">{horse.name}</span>
              <span className="tag tag-neutral">{horse.category}</span>
              {last?.abnormalGait && <span className="tag tag-danger">异常步态</span>}
            </h2>
            <p className="detail-meta">
              建档 {formatCN(new Date(horse.createdAt).toISOString().slice(0, 10))} · 共{" "}
              {horse.visits.length} 次修蹄归档
            </p>
          </div>
          <div className="detail-actions">
            <button type="button" className="primary" onClick={() => setFormMode("new")}>
              新增修蹄
            </button>
            <button
              type="button"
              className="secondary"
              disabled={horse.visits.length === 0}
              onClick={() => setFormMode("review")}
            >
              开始复查
            </button>
          </div>
        </div>

        <div className="review-strip">
          <div className="review-strip-item">
            <small>下次复查</small>
            {badge ? (
              <strong>
                {formatCN(horse.nextReviewDate)}
                <span className={`badge badge-${badge.tone}`}>{badge.text}</span>
              </strong>
            ) : (
              <strong className="muted">尚未安排（完成一次修蹄归档后生成）</strong>
            )}
          </div>
          <div className="review-strip-item">
            <small>上次步态</small>
            <strong>{last ? last.gaitIssue : "—"}</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>每次更换蹄铁都留档</p>
            <h2>蹄铁更换历史</h2>
          </div>
        </div>
        {changeHistory.length === 0 ? (
          <p className="empty-hint">暂无蹄铁类型变化记录；复查或重钉时类型发生变化会自动记入此处。</p>
        ) : (
          <ul className="change-list">
            {changeHistory.map((c, i) => (
              <li key={`${c.visit.id}-${c.position}-${i}`}>
                <span className="change-date">{formatCN(c.visit.date)}</span>
                <span className="change-pos">{HOOF_LABEL[c.position]}</span>
                <span className="change-types">
                  <s>{c.from}</s> → <b>{c.to}</b>
                </span>
                {c.visit.hooves[c.position].photoNote && (
                  <span className="change-note">备注：{c.visit.hooves[c.position].photoNote}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>类型 · 钉位 · 备注完整可追溯</p>
            <h2>历次修蹄档案</h2>
          </div>
        </div>
        {visitsDesc.length === 0 && (
          <p className="empty-hint">还没有修蹄记录，点击右上角“新增修蹄”开始建档。</p>
        )}
        <div className="visit-list">
          {visitsDesc.map((visit, idx) => {
            const prevVisit =
              idx < visitsDesc.length - 1 ? visitsDesc[idx + 1] : undefined;
            const changes = shoeChanges(prevVisit?.hooves, visit.hooves).filter((c) => c.changed);
            return (
              <article key={visit.id} className="visit-card">
                <header className="visit-card-head">
                  <div>
                    <h3>{formatCN(visit.date)}</h3>
                    <p className="visit-gait">
                      步态：{visit.gaitIssue}
                      {visit.abnormalGait && <span className="tag tag-danger">异常步态</span>}
                    </p>
                    {visit.gaitChange && (
                      <p className="visit-change">本次变化：{visit.gaitChange}</p>
                    )}
                    {visit.note && <p className="visit-note">整体备注：{visit.note}</p>}
                  </div>
                  <button
                    type="button"
                    className="link-danger small"
                    onClick={() =>
                      setConfirmDelete(confirmDelete === visit.id ? null : visit.id)
                    }
                  >
                    删除
                  </button>
                </header>

                {confirmDelete === visit.id && (
                  <div className="confirm-bar">
                    确定删除这次归档？该操作不可恢复。
                    <button
                      type="button"
                      className="danger"
                      onClick={() => {
                        deleteVisit(horse.id, visit.id);
                        setConfirmDelete(null);
                      }}
                    >
                      确认删除
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(null)}>
                      取消
                    </button>
                  </div>
                )}

                {changes.length > 0 && (
                  <div className="visit-changes">
                    {changes.map((c) => (
                      <span key={c.position} className="change-pill">
                        {HOOF_LABEL[c.position]}：{c.from} → {c.to}
                      </span>
                    ))}
                  </div>
                )}

                <div className="visit-hooves">
                  {HOOF_POSITIONS.map(({ key, axis }) => {
                    const h = visit.hooves[key];
                    const problem = isProblemAssessment(h.assessment);
                    return (
                      <article key={key} className={`visit-hoof hoof-${axis}`}>
                        <h4>
                          <span className={`axis-dot axis-${axis}`} />
                          {HOOF_LABEL[key]}
                          {problem && <span className="tag tag-warn">{h.assessment}</span>}
                        </h4>
                        <dl>
                          <div>
                            <dt>蹄形评估</dt>
                            <dd>{h.assessment}</dd>
                          </div>
                          <div>
                            <dt>蹄铁类型</dt>
                            <dd>{h.shoeType}</dd>
                          </div>
                          <div>
                            <dt>钉位</dt>
                            <dd>{h.nails}</dd>
                          </div>
                          {(h.photoNote || h.photoDataUrl) && (
                            <div>
                              <dt>照片备注</dt>
                              <dd className="photo-note-cell">
                                {h.photoDataUrl && (
                                  <button
                                    type="button"
                                    className="thumb"
                                    onClick={() => setLightbox(h.photoDataUrl!)}
                                  >
                                    <img src={h.photoDataUrl} alt={`${HOOF_LABEL[key]}照片`} />
                                  </button>
                                )}
                                <span>{h.photoNote || "（仅照片）"}</span>
                              </dd>
                            </div>
                          )}
                        </dl>
                      </article>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="蹄部照片放大" />
          <p>点击任意处关闭</p>
        </div>
      )}
    </div>
  );
}
