import { useMemo, useState } from "react";
import type { HoofMap, HoofPosition, HoofRecord, Horse, Visit } from "../types";
import {
  ASSESSMENTS,
  AXIS_LABEL,
  GAIT_CHIPS,
  HOOF_LABEL,
  HOOF_POSITIONS,
  NAIL_PRESETS,
  REVIEW_INTERVAL_DAYS,
  SHOE_TYPES,
  emptyHoof,
} from "../constants";
import {
  addDays,
  dayDiff,
  fileToResizedDataUrl,
  formatCN,
  shoeChanges,
  todayInput,
} from "../utils";
import { newVisitId, useStore } from "../store";

const BARE = "无蹄铁（裸蹄修整）";
const NO_NAILS = "无钉（裸蹄修整）";

interface VisitFormProps {
  horse: Horse;
  mode: "new" | "review";
  onDone: () => void;
  onCancel: () => void;
}

type HoofErrors = Partial<Record<"assessment" | "shoeType" | "nails", string>>;

function prefillFrom(prev: Visit | undefined): HoofMap {
  if (!prev) {
    return { LF: emptyHoof(), RF: emptyHoof(), LH: emptyHoof(), RH: emptyHoof() };
  }
  // 复查时沿用上轮结构字段便于对比修改；照片需重新拍摄，不带入
  const map = {} as HoofMap;
  HOOF_POSITIONS.forEach(({ key }) => {
    const h = prev.hooves[key];
    map[key] = { assessment: h.assessment, shoeType: h.shoeType, nails: h.nails, photoNote: "" };
  });
  return map;
}

export function VisitForm({ horse, mode, onDone, onCancel }: VisitFormProps) {
  const { addVisit } = useStore();
  const prev = horse.visits.length > 0 ? horse.visits[horse.visits.length - 1] : undefined;

  const [date, setDate] = useState(todayInput());
  const [nextReviewDate, setNextReviewDate] = useState(addDays(todayInput(), REVIEW_INTERVAL_DAYS));
  const [gaitIssue, setGaitIssue] = useState("");
  const [abnormalGait, setAbnormalGait] = useState(false);
  const [gaitChange, setGaitChange] = useState("");
  const [note, setNote] = useState("");
  const [hooves, setHooves] = useState<HoofMap>(() => prefillFrom(prev));
  const [topError, setTopError] = useState("");
  const [hoofErrors, setHoofErrors] = useState<Partial<Record<HoofPosition, HoofErrors>>>({});
  const [photoBusy, setPhotoBusy] = useState<HoofPosition | null>(null);

  const changes = useMemo(() => shoeChanges(prev?.hooves, hooves), [prev, hooves]);

  function patchHoof(position: HoofPosition, patch: Partial<HoofRecord>) {
    setHooves((old) => ({ ...old, [position]: { ...old[position], ...patch } }));
    setHoofErrors((old) => {
      if (!old[position]) return old;
      const nextErrors = { ...old };
      delete nextErrors[position];
      return nextErrors;
    });
  }

  function handleShoeType(position: HoofPosition, shoeType: string) {
    if (shoeType === BARE) {
      patchHoof(position, { shoeType, nails: NO_NAILS });
    } else {
      patchHoof(position, {
        shoeType,
        nails: hooves[position].nails === NO_NAILS ? "" : hooves[position].nails,
      });
    }
  }

  async function handlePhoto(position: HoofPosition, file: File | undefined) {
    if (!file) return;
    setPhotoBusy(position);
    setTopError("");
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      patchHoof(position, { photoDataUrl: dataUrl });
    } catch (e) {
      setTopError(e instanceof Error ? e.message : "照片处理失败");
    } finally {
      setPhotoBusy(null);
    }
  }

  function validate(): boolean {
    const errors: Partial<Record<HoofPosition, HoofErrors>> = {};
    let ok = true;

    if (!date) {
      setTopError("请填写修蹄日期。");
      return false;
    }
    if (!nextReviewDate) {
      setTopError("请填写下次复查日期。");
      return false;
    }
    if (dayDiff(date, nextReviewDate) < 1) {
      setTopError("下次复查日期需晚于本次修蹄日期。");
      return false;
    }
    if (!gaitIssue.trim()) {
      setTopError("请填写本次步态问题（无异常可填写“行走正常”）。");
      return false;
    }
    if (mode === "review" && prev?.abnormalGait && !gaitChange.trim()) {
      setTopError("该马上次被标记异常步态，请先录入本次变化后才能结束复查。");
      return false;
    }

    HOOF_POSITIONS.forEach(({ key }) => {
      const h = hooves[key];
      const e: HoofErrors = {};
      if (!h.assessment) e.assessment = "必选";
      if (!h.shoeType) e.shoeType = "必选";
      if (!h.nails) e.nails = "必选";
      if (Object.keys(e).length > 0) {
        errors[key] = e;
        ok = false;
      }
    });

    setHoofErrors(errors);
    if (!ok) {
      const missing = HOOF_POSITIONS.filter(({ key }) => errors[key]).map(({ key }) => HOOF_LABEL[key]);
      setTopError(`四蹄记录不完整，尚未填写：${missing.join("、")}。一次修蹄需四蹄全部记录才能归档。`);
      return false;
    }
    setTopError("");
    return true;
  }

  function handleSubmit() {
    if (!validate()) return;
    const visit: Visit = {
      id: newVisitId(),
      date,
      gaitIssue: gaitIssue.trim(),
      abnormalGait,
      gaitChange: mode === "review" && prev?.abnormalGait ? gaitChange.trim() : undefined,
      note: note.trim() || undefined,
      hooves,
      createdAt: Date.now(),
    };
    const error = addVisit(horse.id, visit, nextReviewDate);
    if (error) {
      setTopError(error);
      return;
    }
    onDone();
  }

  return (
    <div className="visit-form">
      {mode === "review" && prev && (
        <section className="panel prev-panel">
          <div className="prev-header">
            <h2>上次评估 · {formatCN(prev.date)}</h2>
            {prev.abnormalGait && <span className="tag tag-danger">异常步态</span>}
          </div>
          <p className="prev-gait">
            <b>步态问题：</b>
            {prev.gaitIssue}
          </p>
          <div className="prev-hoof-grid">
            {HOOF_POSITIONS.map(({ key }) => {
              const h = prev.hooves[key];
              return (
                <article key={key} className="prev-hoof">
                  <h4>{HOOF_LABEL[key]}</h4>
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
                    {h.photoNote && (
                      <div className="prev-photo-note">
                        <dt>照片备注</dt>
                        <dd>{h.photoNote}</dd>
                      </div>
                    )}
                  </dl>
                  {h.photoDataUrl && <img src={h.photoDataUrl} alt={`${HOOF_LABEL[key]}上次照片`} />}
                </article>
              );
            })}
          </div>
          {prev.abnormalGait && (
            <p className="prev-warn">
              该马上次被标记为异常步态：请对照上面的上次评估录入本次变化，四蹄记录完整后才能结束复查。
            </p>
          )}
        </section>
      )}

      <section className="panel">
        <div className="heading">
          <div>
            <p>{mode === "review" ? "复查登记" : "新增修蹄"}</p>
            <h2>
              {horse.code} {horse.name}
            </h2>
          </div>
          <button type="button" onClick={onCancel}>
            取消
          </button>
        </div>

        <div className="field-grid form-meta-grid">
          <label>
            <span>修蹄日期 *</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            <span>下次复查日期 *</span>
            <input
              type="date"
              value={nextReviewDate}
              onChange={(e) => setNextReviewDate(e.target.value)}
            />
          </label>
        </div>

        <div className="form-block">
          <div className="block-label-row">
            <span className="block-label">步态问题 *</span>
            <label className="checkbox abnormal-check">
              <input
                type="checkbox"
                checked={abnormalGait}
                onChange={(e) => setAbnormalGait(e.target.checked)}
              />
              标记异常步态
            </label>
          </div>
          <input
            value={gaitIssue}
            onChange={(e) => setGaitIssue(e.target.value)}
            placeholder="描述本次步态问题，例如：右前蹄外侧磨耗 / 行走正常"
          />
          <div className="chips chips-small">
            {GAIT_CHIPS.map((chip) => (
              <button type="button" key={chip} onClick={() => setGaitIssue(chip)}>
                {chip}
              </button>
            ))}
          </div>
        </div>

        {mode === "review" && prev?.abnormalGait && (
          <div className="form-block change-block">
            <span className="block-label">本次步态变化 *（异常步态复查必填）</span>
            <textarea
              rows={2}
              value={gaitChange}
              onChange={(e) => setGaitChange(e.target.value)}
              placeholder="对照上次评估，说明本次变化：改善 / 无变化 / 加重，以及具体表现"
            />
          </div>
        )}

        <div className="form-block">
          <span className="block-label">本次整体备注</span>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="骑乘反馈、教练意见等（可选）"
          />
        </div>

        <div className="form-block">
          <span className="block-label">四蹄记录（四项蹄位全部填写完整才能归档）</span>
          <div className="hoof-grid">
            {HOOF_POSITIONS.map(({ key, axis }) => {
              const h = hooves[key];
              const errs = hoofErrors[key];
              const complete = Boolean(h.assessment && h.shoeType && h.nails);
              const change = changes.find((c) => c.position === key);
              const bare = h.shoeType === BARE;
              return (
                <article
                  key={key}
                  className={`hoof-card hoof-${axis} ${complete ? "is-complete" : ""} ${
                    errs ? "has-error" : ""
                  }`}
                >
                  <header>
                    <h3>
                      <span className={`axis-dot axis-${axis}`} />
                      {HOOF_LABEL[key]}
                      <small>{AXIS_LABEL[axis]}</small>
                    </h3>
                    <span className={`completion ${complete ? "done" : "todo"}`}>
                      {complete ? "已完整" : "待填写"}
                    </span>
                  </header>

                  <label>
                    <span>蹄形评估 *</span>
                    <select
                      className={errs?.assessment ? "invalid" : ""}
                      value={h.assessment}
                      onChange={(e) => patchHoof(key, { assessment: e.target.value })}
                    >
                      <option value="">请选择评估结果</option>
                      {ASSESSMENTS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>蹄铁类型 *</span>
                    <select
                      className={errs?.shoeType ? "invalid" : ""}
                      value={h.shoeType}
                      onChange={(e) => handleShoeType(key, e.target.value)}
                    >
                      <option value="">请选择蹄铁类型</option>
                      {SHOE_TYPES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>钉位 *</span>
                    <select
                      className={errs?.nails ? "invalid" : ""}
                      value={h.nails}
                      disabled={bare}
                      onChange={(e) => patchHoof(key, { nails: e.target.value })}
                    >
                      <option value="">{bare ? NO_NAILS : "请选择钉位方案"}</option>
                      {NAIL_PRESETS.filter((n) => n !== NO_NAILS).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>

                  {change?.changed && (
                    <p className="shoe-change-hint">
                      更换蹄铁：{change.from} → {change.to}（自动留档）
                    </p>
                  )}

                  <div className="photo-field">
                    <span>照片备注</span>
                    <div className="photo-row">
                      {h.photoDataUrl ? (
                        <div className="photo-preview">
                          <img src={h.photoDataUrl} alt={`${HOOF_LABEL[key]}照片`} />
                          <button
                            type="button"
                            className="link-danger"
                            onClick={() => patchHoof(key, { photoDataUrl: undefined })}
                          >
                            移除照片
                          </button>
                        </div>
                      ) : (
                        <label className="photo-upload">
                          <input
                            type="file"
                            accept="image/*"
                            disabled={photoBusy === key}
                            onChange={(e) => handlePhoto(key, e.target.files?.[0])}
                          />
                          {photoBusy === key ? "处理中…" : "＋ 拍摄 / 上传蹄部照片"}
                        </label>
                      )}
                    </div>
                    <textarea
                      rows={2}
                      value={h.photoNote}
                      onChange={(e) => patchHoof(key, { photoNote: e.target.value })}
                      placeholder="照片角度、观察到的细节（可选）"
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {topError && <p className="form-error">{topError}</p>}

        <div className="form-actions">
          <button type="button" onClick={onCancel}>
            暂不归档
          </button>
          <button type="button" className="primary" onClick={handleSubmit}>
            {mode === "review" ? "录入变化并结束复查、归档" : "归档本次修蹄"}
          </button>
        </div>
      </section>
    </div>
  );
}
