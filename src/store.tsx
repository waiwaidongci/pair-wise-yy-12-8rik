import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Horse, Visit } from "./types";
import { buildSeedHorses } from "./seed";

const STORAGE_KEY = "farrier-archive:v1";

function loadHorses(): Horse[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildSeedHorses();
    const parsed = JSON.parse(raw) as Horse[];
    if (!Array.isArray(parsed)) return buildSeedHorses();
    return parsed;
  } catch {
    return buildSeedHorses();
  }
}

function persist(horses: Horse[]): string | null {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(horses));
    return null;
  } catch {
    // 照片体积过大等原因导致写入失败
    return "档案保存失败：本地存储空间可能不足，请精简照片后重试。";
  }
}

interface StoreValue {
  horses: Horse[];
  addHorse: (input: { code: string; name: string; category: Horse["category"] }) => string | null;
  addVisit: (horseId: string, visit: Visit, nextReviewDate: string) => string | null;
  deleteVisit: (horseId: string, visitId: string) => void;
  resetSeed: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

let seq = 0;
function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

export function newVisitId(): string {
  return nextId("visit");
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [horses, setHorses] = useState<Horse[]>(loadHorses);

  const addHorse = useCallback<StoreValue["addHorse"]>((input) => {
    const code = input.code.trim().toUpperCase();
    let error: string | null = null;
    setHorses((prev) => {
      if (prev.some((h) => h.code.toUpperCase() === code)) {
        error = `编号 ${code} 已存在，请使用其他编号。`;
        return prev;
      }
      const horse: Horse = {
        id: nextId("horse"),
        code,
        name: input.name.trim(),
        category: input.category,
        nextReviewDate: "",
        visits: [],
        createdAt: Date.now(),
      };
      const next = [...prev, horse];
      error = persist(next);
      return error ? prev : next;
    });
    return error;
  }, []);

  const addVisit = useCallback<StoreValue["addVisit"]>((horseId, visit, nextReviewDate) => {
    let error: string | null = null;
    setHorses((prev) => {
      const next = prev.map((horse) => {
        if (horse.id !== horseId) return horse;
        const visits = [...horse.visits, visit].sort((a, b) =>
          a.date === b.date ? a.createdAt - b.createdAt : a.date.localeCompare(b.date),
        );
        return { ...horse, visits, nextReviewDate };
      });
      error = persist(next);
      return error ? prev : next;
    });
    return error;
  }, []);

  const deleteVisit = useCallback<StoreValue["deleteVisit"]>((horseId, visitId) => {
    setHorses((prev) => {
      const next = prev.map((horse) => {
        if (horse.id !== horseId) return horse;
        const removedLatest =
          horse.visits.length > 0 && horse.visits[horse.visits.length - 1].id === visitId;
        const visits = horse.visits.filter((v) => v.id !== visitId);
        // 删除最近一次归档后复查提醒失去依据，置空避免误导
        return { ...horse, visits, nextReviewDate: removedLatest ? "" : horse.nextReviewDate };
      });
      persist(next);
      return next;
    });
  }, []);

  const resetSeed = useCallback(() => {
    const seed = buildSeedHorses();
    persist(seed);
    setHorses(seed);
  }, []);

  const value = useMemo(
    () => ({ horses, addHorse, addVisit, deleteVisit, resetSeed }),
    [horses, addHorse, addVisit, deleteVisit, resetSeed],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore 必须在 StoreProvider 内使用");
  return ctx;
}
