import { useMemo, useState } from "react";
import "./styles.css";
import type {
  Horse,
  NewSessionPayload,
  ReviewDraft,
  TrimmingSession,
} from "./types";
import {
  HOOF_ORDER,
  isCurrentlyAbnormal,
  loadHorses,
  pendingSession,
  persistHorses,
  uid,
} from "./data";
import HorseList from "./components/HorseList";
import HorseDetail from "./components/HorseDetail";
import NewSessionModal from "./components/NewSessionModal";
import ReviewModal from "./components/ReviewModal";

type View = { name: "list" } | { name: "detail"; horseId: string };

export default function App() {
  const [horses, setHorses] = useState<Horse[]>(() => loadHorses());
  const [view, setView] = useState<View>({ name: "list" });
  const [listPendingJump, setListPendingJump] = useState(0);
  const [newOpen, setNewOpen] = useState(false);
  const [newDefaultHorseId, setNewDefaultHorseId] = useState<string | undefined>(
    undefined,
  );
  const [reviewHorseId, setReviewHorseId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const metrics = useMemo(() => {
    const pending = horses.filter((h) => pendingSession(h)).length;
    const abnormal = horses.filter((h) => isCurrentlyAbnormal(h)).length;
    const changes = horses.reduce(
      (sum, h) =>
        sum +
        h.sessions.reduce(
          (n, s) => n + HOOF_ORDER.filter((p) => s.hooves[p].shoeChanged).length,
          0,
        ),
      0,
    );
    return { pending, abnormal, changes, horses: horses.length };
  }, [horses]);

  function save(next: Horse[]) {
    persistHorses(next);
    setHorses(next);
  }

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }

  function openNew(horseId?: string) {
    setNewDefaultHorseId(horseId);
    setNewOpen(true);
  }

  /** 归档新一次修蹄；返回 null 表示成功，否则返回错误信息 */
  function handleNewSession(payload: NewSessionPayload): string | null {
    const now = new Date().toISOString();
    const session: TrimmingSession = {
      id: uid(),
      date: payload.date,
      nextReviewDate: payload.nextReviewDate,
      abnormalGait: payload.abnormalGait,
      gaitSummary: payload.gaitSummary,
      hooves: payload.hooves,
      review: null,
    };

    let next: Horse[];
    if (payload.newHorse) {
      const horse: Horse = {
        id: uid(),
        code: payload.newHorse.code,
        name: payload.newHorse.name,
        category: payload.newHorse.category,
        createdAt: payload.date,
        sessions: [session],
      };
      next = [...horses, horse];
      save(next);
      setNewOpen(false);
      setView({ name: "detail", horseId: horse.id });
      showToast(`已建立 ${horse.code} 档案并归档第 1 次修蹄`);
      return null;
    }

    next = horses.map((h) =>
      h.id === payload.horseId
        ? { ...h, sessions: [...h.sessions, session] }
        : h,
    );
    save(next);
    setNewOpen(false);
    const target = horses.find((h) => h.id === payload.horseId);
    if (view.name !== "detail") {
      setView({ name: "detail", horseId: payload.horseId });
    }
    showToast(`${target?.code ?? "马匹"} 第 ${(target?.sessions.length ?? 0) + 1} 次修蹄已归档`);
    return null;
  }

  function handleReview(draft: ReviewDraft) {
    if (!reviewHorseId) return;
    const next = horses.map((h) => {
      if (h.id !== reviewHorseId) return h;
      const sessions = [...h.sessions];
      const last = sessions[sessions.length - 1];
      if (!last || last.review) return h;
      sessions[sessions.length - 1] = {
        ...last,
        review: {
          date: draft.date,
          changes: draft.changes,
          resolved: draft.resolved,
          note: draft.note,
        },
      };
      return { ...h, sessions };
    });
    try {
      save(next);
    } catch {
      showToast("保存失败：本地存储空间不足，请删除部分旧照片后重试。");
      return;
    }
    setReviewHorseId(null);
    showToast("复查已归档");
  }

  const detailHorse =
    view.name === "detail"
      ? horses.find((h) => h.id === view.horseId)
      : undefined;
  const reviewHorse = reviewHorseId
    ? horses.find((h) => h.id === reviewHorseId)
    : undefined;
  const reviewSession = reviewHorse
    ? pendingSession(reviewHorse)
    : undefined;

  return (
    <main className="app">
      <section className="hero">
        <div className="hero-top">
          <div>
            <p>蹄铁师工作台</p>
            <h1>马术蹄铁修整档案</h1>
          </div>
          <button className="primary hero-btn" onClick={() => openNew()}>
            新增马匹 / 修蹄
          </button>
        </div>
        <span>
          四蹄逐一记录蹄形评估、蹄铁类型、钉位与照片备注；异常步态复查先核对上次评估，
          逐蹄录入变化后归档。所有档案保存在本机浏览器中。
        </span>
      </section>

      <section className="metrics">
        <article
          className="clickable"
          onClick={() => {
            setView({ name: "list" });
            setListPendingJump((n) => n + 1);
          }}
          title="查看待复查马匹"
        >
          <small>待复查</small>
          <strong>{metrics.pending}</strong>
        </article>
        <article>
          <small>异常步态</small>
          <strong>{metrics.abnormal}</strong>
        </article>
        <article>
          <small>更换蹄铁（蹄次）</small>
          <strong>{metrics.changes}</strong>
        </article>
        <article>
          <small>马匹档案</small>
          <strong>{metrics.horses}</strong>
        </article>
      </section>

      {view.name === "list" || !detailHorse ? (
        <HorseList
          horses={horses}
          pendingJumpToken={listPendingJump}
          onOpen={(h) => setView({ name: "detail", horseId: h.id })}
          onReview={(h) => setReviewHorseId(h.id)}
          onNew={() => openNew()}
          onJumpPending={() => {
            setView({ name: "list" });
            setListPendingJump((n) => n + 1);
          }}
        />
      ) : (
        <HorseDetail
          horse={detailHorse}
          onBack={() => setView({ name: "list" })}
          onAddSession={() => openNew(detailHorse.id)}
          onReview={() => setReviewHorseId(detailHorse.id)}
        />
      )}

      {newOpen ? (
        <NewSessionModal
          key={(newDefaultHorseId ?? "new") + String(newOpen)}
          horses={horses}
          defaultHorseId={
            view.name === "detail" ? view.horseId : newDefaultHorseId
          }
          onClose={() => setNewOpen(false)}
          onSubmit={handleNewSession}
        />
      ) : null}

      {reviewHorse && reviewSession ? (
        <ReviewModal
          horse={reviewHorse}
          session={reviewSession}
          onClose={() => setReviewHorseId(null)}
          onSubmit={handleReview}
        />
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </main>
  );
}
