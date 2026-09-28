import { useMemo, useState } from "react";
import "./styles.css";
import { StoreProvider, useStore } from "./store";
import { HorseList } from "./components/HorseList";
import { HorseDetail } from "./components/HorseDetail";
import { Reminders } from "./components/Reminders";
import { VisitForm } from "./components/VisitForm";
import type { Horse } from "./types";
import { isPendingReview, latestVisit, shoeChanges } from "./utils";

type Tab = "list" | "reminders";

interface ReviewEntry {
  horse: Horse;
  mode: "review" | "new";
}

function Workspace() {
  const { horses, resetSeed } = useStore();
  const [tab, setTab] = useState<Tab>("list");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reviewEntry, setReviewEntry] = useState<ReviewEntry | null>(null);

  const metrics = useMemo(() => {
    const pending = horses.filter(isPendingReview).length;
    const abnormal = horses.filter((h) => latestVisit(h)?.abnormalGait).length;
    const changes = horses.reduce(
      (sum, h) =>
        sum +
        h.visits
          .slice(1)
          .reduce(
            (s, v, i) =>
              s + shoeChanges(h.visits[i].hooves, v.hooves).filter((c) => c.changed).length,
            0,
          ),
      0,
    );
    return [
      { label: "待复查", value: pending },
      { label: "异常步态", value: abnormal },
      { label: "更换蹄铁留档", value: changes },
      { label: "马匹档案", value: horses.length },
    ];
  }, [horses]);

  const detailHorse = detailId ? horses.find((h) => h.id === detailId) ?? null : null;
  const reviewHorse = reviewEntry
    ? horses.find((h) => h.id === reviewEntry.horse.id) ?? null
    : null;

  function goList() {
    setDetailId(null);
    setReviewEntry(null);
    setTab("list");
  }

  function openHorse(horse: Horse) {
    setReviewEntry(null);
    setDetailId(horse.id);
  }

  function startReview(horse: Horse, mode: "review" | "new" = "review") {
    if (horse.visits.length === 0) return;
    setDetailId(null);
    setReviewEntry({ horse, mode });
  }

  return (
    <main className="app">
      <header className="hero">
        <p>蹄铁师工作台 · 单页修蹄档案</p>
        <h1>马术蹄铁修整档案</h1>
        <span>
          四蹄分别登记蹄形评估、蹄铁类型、钉位与照片备注；一次修蹄四蹄完整才可归档。异常步态复查时先对照上次评估、录入本次变化；蹄铁更换逐次留档。
        </span>
      </header>

      <section className="metrics">
        {metrics.map((m) => (
          <article key={m.label}>
            <small>{m.label}</small>
            <strong>{m.value}</strong>
          </article>
        ))}
      </section>

      <nav className="tabs">
        <button
          type="button"
          className={tab === "list" ? "tab-active" : ""}
          onClick={() => {
            setTab("list");
            setDetailId(null);
            setReviewEntry(null);
          }}
        >
          马匹档案
        </button>
        <button
          type="button"
          className={tab === "reminders" ? "tab-active" : ""}
          onClick={() => {
            setTab("reminders");
            setDetailId(null);
            setReviewEntry(null);
          }}
        >
          复查提醒
        </button>
        <button type="button" className="reset-link" onClick={resetSeed}>
          恢复示例数据
        </button>
      </nav>

      {reviewEntry && reviewHorse ? (
        <VisitForm
          horse={reviewHorse}
          mode={reviewEntry.mode}
          onDone={goList}
          onCancel={() => setReviewEntry(null)}
        />
      ) : detailHorse ? (
        <HorseDetail horse={detailHorse} onBack={() => setDetailId(null)} />
      ) : tab === "list" ? (
        <HorseList onOpen={openHorse} />
      ) : (
        <Reminders horses={horses} onOpen={openHorse} onReview={(h) => startReview(h, "review")} />
      )}

      <footer className="footer">
        数据保存在本机浏览器（localStorage），换设备前请自行留存照片与记录。
      </footer>
    </main>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Workspace />
    </StoreProvider>
  );
}
