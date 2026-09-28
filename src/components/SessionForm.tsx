import { useState } from "react";
import type { HoofPos, HoofRecord, SessionDraft } from "../types";
import {
  HOOF_LABEL,
  HOOF_ORDER,
  HOOF_SHAPE_PRESETS,
  NAIL_PRESETS,
  SHOE_TYPES,
} from "../data";
import { fileToCompressedPhoto } from "../image";

interface Props {
  draft: SessionDraft;
  onChange: (draft: SessionDraft) => void;
  onSubmit: () => void;
  onCancel: () => void;
  invalidHooves: HoofPos[];
  submitting: boolean;
}

export default function SessionForm({
  draft,
  onChange,
  onSubmit,
  onCancel,
  invalidHooves,
  submitting,
}: Props) {
  const [uploading, setUploading] = useState<HoofPos | null>(null);

  function updateHoof(pos: HoofPos, patch: Partial<HoofRecord>) {
    onChange({
      ...draft,
      hooves: { ...draft.hooves, [pos]: { ...draft.hooves[pos], ...patch } },
    });
  }

  async function handlePhoto(pos: HoofPos, file: File | undefined) {
    if (!file) return;
    setUploading(pos);
    try {
      const photo = await fileToCompressedPhoto(file);
      updateHoof(pos, {
        photo,
        photoNote: draft.hooves[pos].photoNote || file.name,
      });
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="form-flow">
      <div className="field-grid">
        <label>
          <span>修蹄日期 *</span>
          <input
            type="date"
            value={draft.date}
            onChange={(e) => onChange({ ...draft, date: e.target.value })}
          />
        </label>
        <label>
          <span>下次复查日期 *</span>
          <input
            type="date"
            value={draft.nextReviewDate}
            onChange={(e) =>
              onChange({ ...draft, nextReviewDate: e.target.value })
            }
          />
        </label>
      </div>

      <label className="checkbox-line">
        <input
          type="checkbox"
          checked={draft.abnormalGait}
          onChange={(e) =>
            onChange({ ...draft, abnormalGait: e.target.checked })
          }
        />
        <span>
          <b>标记异常步态</b>
          <small>
            标记后，复查时将先显示本次评估，逐蹄录入变化后才能结束复查
          </small>
        </span>
      </label>

      <label className="full-line">
        <span>整体步态问题描述</span>
        <textarea
          rows={2}
          placeholder="例如：右前肢运步外展、快步点头…"
          value={draft.gaitSummary}
          onChange={(e) =>
            onChange({ ...draft, gaitSummary: e.target.value })
          }
        />
      </label>

      <div className="hoof-cards">
        {HOOF_ORDER.map((pos) => {
          const h = draft.hooves[pos];
          const invalid = invalidHooves.includes(pos);
          return (
            <article
              key={pos}
              className={"hoof-card" + (invalid ? " invalid" : "")}
            >
              <header>
                <h3>{HOOF_LABEL[pos]}</h3>
                <label className="shoe-toggle">
                  <input
                    type="checkbox"
                    checked={h.shoeChanged}
                    onChange={(e) =>
                      updateHoof(pos, { shoeChanged: e.target.checked })
                    }
                  />
                  本次更换蹄铁
                </label>
              </header>

              <label>
                <span>
                  步态问题 {draft.abnormalGait ? "*" : "（无问题可填“无”）"}
                </span>
                <input
                  value={h.gaitIssue}
                  placeholder={
                    draft.abnormalGait ? "异常步态必须逐蹄描述" : "如：无"
                  }
                  onChange={(e) =>
                    updateHoof(pos, { gaitIssue: e.target.value })
                  }
                />
              </label>

              <label>
                <span>蹄形评估 *</span>
                <input
                  list="hoof-shape-presets"
                  value={h.hoofShape}
                  placeholder="选择或填写"
                  onChange={(e) =>
                    updateHoof(pos, { hoofShape: e.target.value })
                  }
                />
              </label>

              <label>
                <span>蹄铁类型 *</span>
                <select
                  value={SHOE_TYPES.includes(h.shoeType) ? h.shoeType : ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) updateHoof(pos, { shoeType: v });
                  }}
                >
                  <option value="">请选择</option>
                  {SHOE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                {h.shoeType && !SHOE_TYPES.includes(h.shoeType) ? (
                  <small className="custom-hint">自定义：{h.shoeType}</small>
                ) : null}
                <input
                  className="custom-input"
                  value={SHOE_TYPES.includes(h.shoeType) ? "" : h.shoeType}
                  placeholder="或自定义蹄铁类型"
                  onChange={(e) =>
                    updateHoof(pos, { shoeType: e.target.value })
                  }
                />
              </label>

              <label>
                <span>钉位 *</span>
                <input
                  list="nail-presets"
                  value={h.nailPositions}
                  placeholder="如：内侧2钉·外侧3钉"
                  onChange={(e) =>
                    updateHoof(pos, { nailPositions: e.target.value })
                  }
                />
              </label>

              <label>
                <span>照片备注</span>
                <textarea
                  rows={2}
                  value={h.photoNote}
                  placeholder="裂纹位置、压痕、特殊处理…"
                  onChange={(e) =>
                    updateHoof(pos, { photoNote: e.target.value })
                  }
                />
              </label>

              <div className="photo-box">
                {h.photo ? (
                  <div className="photo-preview">
                    <img src={h.photo.dataUrl} alt={h.photo.name} />
                    <div>
                      <small title={h.photo.name}>{h.photo.name}</small>
                      <button
                        type="button"
                        className="link-danger"
                        onClick={() => updateHoof(pos, { photo: null })}
                      >
                        删除照片
                      </button>
                    </div>
                  </div>
                ) : null}
                <label className="upload-btn">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading === pos}
                    onChange={(e) =>
                      handlePhoto(pos, e.target.files?.[0])
                    }
                  />
                  {uploading === pos ? "压缩中…" : "添加现场照片"}
                </label>
              </div>
            </article>
          );
        })}
      </div>

      <datalist id="hoof-shape-presets">
        {HOOF_SHAPE_PRESETS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <datalist id="nail-presets">
        {NAIL_PRESETS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <div className="form-actions">
        <button type="button" onClick={onCancel} disabled={submitting}>
          取消
        </button>
        <button
          type="button"
          className="primary"
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting ? "归档中…" : "归档本次修蹄"}
        </button>
      </div>
      <p className="form-hint">
        归档要求：左前、右前、左后、右后四个蹄位的蹄形评估、蹄铁类型、钉位均需填写完整；
        标记异常步态时还需逐蹄填写步态问题。
      </p>
    </div>
  );
}
