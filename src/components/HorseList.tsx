import { useEffect, useMemo, useState } from "react";
import type { HoofGroup, Horse } from "../types";
import {
  HOOF_GROUP,
  HOOF_LABEL,
  HOOF_ORDER,
  daysUntil,
  formatDate,
  hasIssue,
  isCurrentlyAbnormal,
  latestSession,
  pendingSession,
} from "../data";

type Filter = "all" | HoofGroup | "pending";

interface Props {
  horses: Horse[];
  pendingJumpToken: number;
  onOpen: (horse: Horse) => void;
  onReview: (horse: Horse) => void;
  onNew: () => void;
  onJumpPending: () => void;
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "全部马匹" },
  { key: "front", label: "前蹄问题" },
  { key: "hind", label: "后蹄问题" },
  { key: "pending", label: "待复查" },
];

export default function HorseList({
  horses,
  pendingJumpToken,
  onOpen,
  onReview,
  onNew,
  onJumpPending,
}: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (pendingJumpToken > 0) {
      setFilter("pending");
      setQuery("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [pendingJumpToken]);

  /** 复查提醒：有待复查修蹄的马，按下次复查日期先后排列 */
  const reminders = useMemo(() => {
    return horses
      .map((h) => ({ horse: h, session: pendingSession(h) }))
      .filter((x): x is { horse: Horse; session: NonNullable<typeof x.session> } =>
        !!x.session,
      )
      .sort(
        (a, b) =>
          new Date(a.session.nextReviewDate).getTime() -
          new Date(b.session.nextReviewDate).getTime(),
      );
  }, [horses]);

  const counts = useMemo(() => {
    const front = new Set<string>();
    const hind = new Set<string>();
    const pending = new Set<string>();
    for (const h of horses) {
      const s = latestSession(h);
      if (!s) continue;
      if (pendingSession(h)) pending.add(h.id);
      for (const pos of HOOF_ORDER) {
        if (hasIssue(s.hooves[pos].gaitIssue)) {
          if (HOOF_GROUP[pos] === "front") front.add(h.id);
          else hind.add(h.id);
        }
      }
    }
    return {
      all: horses.length,
      front: front.size,
      hind: hind.size,
      pending: pending.size,
    };
  }, [horses]);

  const visible = useMemo(() => {
    const q = query.trim().toUpperCase();
    return horses.filter((h) => {
      if (q && !h.code.toUpperCase().includes(q)) return false;
      if (filter === "pending") return !!pendingSession(h);
      if (filter === "all") return true;
      const s = latestSession(h);
      if (!s) return false;
      return HOOF_ORDER.some(
        (pos) =>
          HOOF_GROUP[pos] === filter && hasIssue(s.hooves[pos].gaitIssue),
      );
    });
  }, [horses, query, filter]);

  return (
    <div className="workspace-grid">
      <section className="panel reminders">
        <div className="heading">
          <div>
            <p>复查提醒</p>
            <h2>按日期先后排列</h2>
          </div>
          <button className="ghost-btn" onClick={onJumpPending}>
            查看全部待复查
          </button>
        </div>
        {reminders.length === 0 ? (
          <p className="empty">暂无待复查的马匹。</p>
        ) : (
          <ul className="reminder-list">
            {reminders.map(({ horse, session }) => {
              const due = daysUntil(session.nextReviewDate);
              return (
                <li
                  key={horse.id}
                  className={due < 0 ? "overdue" : due <= 3 ? "soon" : ""}
                >
                  <div className="reminder-date">
                    <strong>{formatDate(session.nextReviewDate)}</strong>
                    <small>
                      {due < 0
                        ? `已逾期 ${-due} 天`
                        : due === 0
                          ? "今天到期"
                          : `还有 ${due} 天`}
                    </small>
                  </div>
                  <div className="reminder-info">
                    <b>{horse.code}</b>
                    <small>
                      {horse.name}
                      {session.abnormalGait ? " · 异常步态跟踪" : ""}
                    </small>
                  </div>
                  <button
                    className="primary small"
                    onClick={() => onReview(horse)}
                  >
                    复查
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel list-panel">
        <div className="heading">
          <div>
            <p>马匹列表</p>
            <h2>修蹄档案</h2>
          </div>
          <button className="primary" onClick={onNew}>
            新增马匹 / 修蹄
          </button>
        </div>

        <div className="search-row">
          <input
            className="search-input"
            placeholder="按马匹编号搜索，如 HORSE-18"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="chips filter-chips">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={filter === f.key ? "active" : ""}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span className="chip-count">{counts[f.key]}</span>
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="empty">
            {horses.length === 0
              ? "还没有马匹档案，点击右上角“新增马匹 / 修蹄”开始记录。"
              : "没有符合条件的马匹。"}
          </p>
        ) : (
          <div className="horse-rows">
            {visible.map((h) => {
              const s = latestSession(h);
              const pending = pendingSession(h);
              const abnormal = isCurrentlyAbnormal(h);
              const issueHooves = s
                ? HOOF_ORDER.filter((p) =>
                    hasIssue(s.hooves[p].gaitIssue),
                  ).map((p) => HOOF_LABEL[p])
                : [];
              return (
                <article key={h.id} className="horse-row">
                  <div className="horse-main" onClick={() => onOpen(h)}>
                    <div className="horse-title">
                      <b>{h.code}</b>
                      <span>{h.name}</span>
                      <span className="tag">{h.category}</span>
                      {abnormal ? (
                        <span className="tag tag-warn">异常步态</span>
                      ) : null}
                      {pending ? (
                        <span
                          className={
                            "tag " +
                            (daysUntil(pending.nextReviewDate) < 0
                              ? "tag-danger"
                              : "tag-pending")
                          }
                        >
                          待复查 · {formatDate(pending.nextReviewDate)}
                        </span>
                      ) : (
                        <span className="tag tag-ok">复查完成</span>
                      )}
                    </div>
                    <p>
                      {s ? (
                        <>
                          最近修蹄 {formatDate(s.date)} · 蹄铁{" "}
                          {Object.values(s.hooves)
                            .filter((x) => x.shoeChanged)
                            .length + " 蹄更换"}
                          {issueHooves.length > 0
                            ? ` · 问题蹄位：${issueHooves.join("、")}`
                            : ""}
                        </>
                      ) : (
                        "尚无修蹄记录"
                      )}
                    </p>
                  </div>
                  <div className="horse-ops">
                    {pending ? (
                      <button
                        className="primary small"
                        onClick={() => onReview(h)}
                      >
                        复查
                      </button>
                    ) : null}
                    <button onClick={() => onOpen(h)}>档案</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
