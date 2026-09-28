import { useState } from "react";
import type { Horse, HorseCategory, HoofPos, NewSessionPayload, SessionDraft } from "../types";
import { emptyDraft, findIncompleteHooves, sortByCode } from "../data";
import SessionForm from "./SessionForm";

interface Props {
  horses: Horse[];
  defaultHorseId?: string;
  onClose: () => void;
  onSubmit: (payload: NewSessionPayload) => string | null;
}

export default function NewSessionModal({
  horses,
  defaultHorseId,
  onClose,
  onSubmit,
}: Props) {
  const [mode, setMode] = useState<"existing" | "new">(
    defaultHorseId ? "existing" : horses.length === 0 ? "new" : "existing",
  );
  const [horseId, setHorseId] = useState<string>(
    defaultHorseId ?? horses[0]?.id ?? "",
  );
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<HorseCategory>("运动马");
  const [draft, setDraft] = useState<SessionDraft>(() => emptyDraft());
  const [invalidHooves, setInvalidHooves] = useState<HoofPos[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sortedHorses = sortByCode(horses);
  const codeExists = horses.some(
    (h) => h.code.trim().toUpperCase() === code.trim().toUpperCase(),
  );

  function handleSubmit() {
    setError(null);
    let headerError: string | null = null;
    if (!draft.date) headerError = "请选择修蹄日期";
    else if (!draft.nextReviewDate) headerError = "请选择下次复查日期";
    else if (mode === "new") {
      if (!code.trim()) headerError = "请填写马匹编号";
      else if (codeExists) headerError = `编号 ${code} 已存在，请直接选择该马`;
    } else if (!horseId) {
      headerError = "请选择马匹";
    }
    if (headerError) {
      setError(headerError);
      return;
    }
    const missing = findIncompleteHooves(draft);
    setInvalidHooves(missing);
    if (missing.length > 0) {
      setError("四个蹄位还没有记录完整，补全后才能归档。");
      return;
    }
    setSubmitting(true);
    try {
      const result = onSubmit({
        ...draft,
        horseId: mode === "new" ? "" : horseId,
        newHorse:
          mode === "new"
            ? { code: code.trim(), name: name.trim() || code.trim(), category }
            : undefined,
      });
      if (result) {
        setError(result);
        setSubmitting(false);
      }
    } catch {
      setError("保存失败：本地存储空间不足，请删除部分旧照片后重试。");
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div>
            <p>修蹄登记</p>
            <h2>四蹄完整记录后归档</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </header>

        <div className="seg">
          <button
            className={mode === "existing" ? "active" : ""}
            onClick={() => setMode("existing")}
            disabled={horses.length === 0}
          >
            选择已有马匹
          </button>
          <button
            className={mode === "new" ? "active" : ""}
            onClick={() => setMode("new")}
          >
            新建马匹档案
          </button>
        </div>

        {mode === "existing" ? (
          <label className="full-line">
            <span>马匹 *</span>
            <select
              value={horseId}
              onChange={(e) => setHorseId(e.target.value)}
            >
              {sortedHorses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.code} · {h.name}（{h.category}）
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="field-grid">
            <label>
              <span>马匹编号 *</span>
              <input
                placeholder="如 HORSE-42"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <label>
              <span>马匹名字</span>
              <input
                placeholder="选填，留空则同编号"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              <span>分类</span>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as HorseCategory)
                }
              >
                <option value="运动马">运动马</option>
                <option value="休养马">休养马</option>
              </select>
            </label>
          </div>
        )}

        <hr className="divider" />

        <SessionForm
          draft={draft}
          onChange={(d) => {
            setDraft(d);
            if (invalidHooves.length > 0)
              setInvalidHooves(findIncompleteHooves(d));
          }}
          onSubmit={handleSubmit}
          onCancel={onClose}
          invalidHooves={invalidHooves}
          submitting={submitting}
        />

        {error ? <p className="error-text">{error}</p> : null}
      </div>
    </div>
  );
}
