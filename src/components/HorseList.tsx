import { useMemo, useState } from "react";
import type { Horse } from "../types";
import { HORSE_CATEGORIES } from "../constants";
import {
  axisHasIssue,
  formatCN,
  isPendingReview,
  latestVisit,
  reviewBadge,
} from "../utils";
import { useStore } from "../store";

type Filter = "all" | "front" | "hind" | "review";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "全部马匹" },
  { key: "front", label: "前蹄问题" },
  { key: "hind", label: "后蹄问题" },
  { key: "review", label: "待复查" },
];

export function HorseList({ onOpen }: { onOpen: (horse: Horse) => void }) {
  const { horses, addHorse } = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<(typeof HORSE_CATEGORIES)[number]>("运动马");
  const [addError, setAddError] = useState("");

  const counts = useMemo(
    () => ({
      all: horses.length,
      front: horses.filter((h) => axisHasIssue(h, "front")).length,
      hind: horses.filter((h) => axisHasIssue(h, "hind")).length,
      review: horses.filter(isPendingReview).length,
    }),
    [horses],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    return horses
      .filter((h) => (q ? h.code.toUpperCase().includes(q) : true))
      .filter((h) => {
        if (filter === "front") return axisHasIssue(h, "front");
        if (filter === "hind") return axisHasIssue(h, "hind");
        if (filter === "review") return isPendingReview(h);
        return true;
      })
      .sort((a, b) => a.code.localeCompare(b.code, "zh-CN", { numeric: true }));
  }, [horses, query, filter]);

  function handleAdd() {
    if (!newCode.trim()) {
      setAddError("请填写马匹编号。");
      return;
    }
    const error = addHorse({ code: newCode, name: newName, category: newCategory });
    if (error) {
      setAddError(error);
      return;
    }
    setNewCode("");
    setNewName("");
    setNewCategory("运动马");
    setAddError("");
    setShowAdd(false);
  }

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>马匹档案</p>
          <h2>马匹列表</h2>
        </div>
        <button type="button" className="primary" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? "收起" : "新建马匹档案"}
        </button>
      </div>

      {showAdd && (
        <div className="add-horse">
          <div className="field-grid">
            <label>
              <span>马匹编号 *</span>
              <input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="例如 HORSE-42"
              />
            </label>
            <label>
              <span>马名</span>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="便于现场识别（可选）"
              />
            </label>
            <label>
              <span>马匹类别</span>
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as typeof newCategory)}>
                {HORSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {addError && <p className="form-error">{addError}</p>}
          <div className="form-actions">
            <button type="button" onClick={() => setShowAdd(false)}>
              取消
            </button>
            <button type="button" className="primary" onClick={handleAdd}>
              创建档案
            </button>
          </div>
        </div>
      )}

      <label className="search-box">
        <span>按马匹编号搜索</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="输入编号，如 HORSE-18"
        />
      </label>

      <div className="chips filter-chips">
        {FILTERS.map((f) => (
          <button
            type="button"
            key={f.key}
            className={filter === f.key ? "chip-active" : ""}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <em>{counts[f.key]}</em>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="empty-hint">没有符合条件的马匹。</p>
      ) : (
        <div className="horse-cards">
          {filtered.map((horse) => {
            const last = latestVisit(horse);
            const badge = horse.nextReviewDate ? reviewBadge(horse.nextReviewDate) : null;
            return (
              <button
                type="button"
                key={horse.id}
                className="horse-card"
                onClick={() => onOpen(horse)}
              >
                <div className="horse-card-top">
                  <h3>
                    {horse.code}
                    {horse.name && <span className="horse-name"> · {horse.name}</span>}
                  </h3>
                  {last?.abnormalGait && <span className="tag tag-danger">异常步态</span>}
                </div>
                <p className="horse-card-gait">{last ? last.gaitIssue : "尚未记录修蹄"}</p>
                <div className="horse-card-foot">
                  <span className="tag tag-neutral">{horse.category}</span>
                  <span>
                    下次复查：
                    {badge ? (
                      <>
                        {formatCN(horse.nextReviewDate)}{" "}
                        <span className={`badge badge-${badge.tone}`}>{badge.text}</span>
                      </>
                    ) : (
                      <span className="muted">未安排</span>
                    )}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
