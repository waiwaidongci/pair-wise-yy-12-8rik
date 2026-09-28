import { useMemo, useState } from "react";
import type { HoofPos, Horse, ReviewDraft, TrimmingSession } from "../types";
import {
  HOOF_GROUP,
  HOOF_LABEL,
  HOOF_ORDER,
  formatDate,
  hasIssue,
} from "../data";

interface Props {
  horse: Horse;
  session: TrimmingSession;
  onClose: () => void;
  onSubmit: (draft: ReviewDraft) => void;
}

export default function ReviewModal({
  horse,
  session,
  onClose,
  onSubmit,
}: Props) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [changes, setChanges] = useState<Record<HoofPos, string>>(() => ({
    LF: "",
    RF: "",
    LH: "",
    RH: "",
  }));
  const [resolved, setResolved] = useState(false);
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);

  const abnormal = session.abnormalGait;
  const missing = useMemo(
    () =>
      abnormal ? HOOF_ORDER.filter((p) => !changes[p].trim()) : [],
    [abnormal, changes],
  );

  function markAllNoChange() {
    setChanges({ LF: "无变化", RF: "无变化", LH: "无变化", RH: "无变化" });
  }

  function submit() {
    setTried(true);
    if (missing.length > 0 || !date) return;
    onSubmit({ date, changes, resolved, note });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal review-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <div>
            <p>复查 · {horse.code} {horse.name}</p>
            <h2>
              {formatDate(session.nextReviewDate)} 到期
              （修蹄日期 {formatDate(session.date)}）
            </h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </header>

        {abnormal ? (
          <div className="alert">
            <b>该马被标记为异常步态。</b>
            请先核对下方“上次评估”，逐蹄录入本次变化后才能结束复查。
          </div>
        ) : (
          <div className="alert muted">
            步态正常马匹：逐蹄核对并填写复查备注即可结束复查。
          </div>
        )}

        <div className="review-grid">
          {HOOF_ORDER.map((pos) => {
            const h = session.hooves[pos];
            const missingHere = tried && abnormal && !changes[pos].trim();
            return (
              <article
                key={pos}
                className={"review-hoof" + (missingHere ? " invalid" : "")}
              >
                <header>
                  <h3>
                    <span className={`tag tag-${HOOF_GROUP[pos]}`}>
                      {HOOF_GROUP[pos] === "front" ? "前蹄" : "后蹄"}
                    </span>
                    {HOOF_LABEL[pos]}
                  </h3>
                  {hasIssue(h.gaitIssue) ? (
                    <span className="tag tag-warn">异常</span>
                  ) : (
                    <span className="tag tag-ok">无异常</span>
                  )}
                </header>
                <dl className="last-eval">
                  <dt>上次步态</dt>
                  <dd>{h.gaitIssue || "—"}</dd>
                  <dt>蹄形评估</dt>
                  <dd>{h.hoofShape}</dd>
                  <dt>蹄铁 / 钉位</dt>
                  <dd>
                    {h.shoeType} · {h.nailPositions}
                  </dd>
                  {h.photoNote ? (
                    <>
                      <dt>照片备注</dt>
                      <dd>{h.photoNote}</dd>
                    </>
                  ) : null}
                </dl>
                <label>
                  <span>
                    本次变化{abnormal ? " *" : "（无变化可留空）"}
                  </span>
                  <textarea
                    rows={2}
                    value={changes[pos]}
                    placeholder={
                      abnormal
                        ? "必填：相对上次评估的变化"
                        : "如：无变化 / 裂纹愈合…"
                    }
                    onChange={(e) =>
                      setChanges((c) => ({ ...c, [pos]: e.target.value }))
                    }
                  />
                </label>
              </article>
            );
          })}
        </div>

        {abnormal ? (
          <button type="button" className="ghost-btn" onClick={markAllNoChange}>
            四蹄均无明显变化（一键填入“无变化”）
          </button>
        ) : null}

        <div className="field-grid">
          <label>
            <span>复查日期 *</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          {abnormal ? (
            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={resolved}
                onChange={(e) => setResolved(e.target.checked)}
              />
              <span>
                <b>步态已恢复正常</b>
                <small>勾选后解除该马的异常步态标记</small>
              </span>
            </label>
          ) : null}
        </div>

        <label className="full-line">
          <span>复查备注</span>
          <textarea
            rows={2}
            value={note}
            placeholder="复查整体结论、后续安排…"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        {tried && missing.length > 0 ? (
          <p className="error-text">
            还有 {missing.map((p) => HOOF_LABEL[p]).join("、")} 未录入本次变化，
            异常步态复查必须四蹄填写完整。
          </p>
        ) : null}

        <div className="form-actions">
          <button type="button" onClick={onClose}>
            稍后复查
          </button>
          <button type="button" className="primary" onClick={submit}>
            结束复查并归档
          </button>
        </div>
      </div>
    </div>
  );
}
