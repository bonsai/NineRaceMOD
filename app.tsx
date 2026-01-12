import React, { useEffect, useMemo, useState } from "react";

type Cell = { id: string; color: string } | null;

const GRID = 5;          // 盤面サイズ (NxN)
const CENTER = 3;        // 目標は中央3x3
const SHUFFLE_MOVES = 200;

const COLORS = [
  "#ef4444", "#f97316", "#f59e0b",
  "#84cc16", "#22c55e", "#10b981",
  "#06b6d4", "#3b82f6", "#6366f1",
  "#a855f7", "#ec4899", "#f43f5e",
];

const key = (r: number, c: number) => `${r},${c}`;
const inBounds = (r: number, c: number) => r >= 0 && c >= 0 && r < GRID && c < GRID;

function centerTopLeft() {
  const start = Math.floor((GRID - CENTER) / 2);
  return { sr: start, sc: start };
}

function makeInitialBoard(): Cell[] {
  // 5x5 = 25 cells. 1つは空き
  const total = GRID * GRID;
  const tiles = Array.from({ length: total - 1 }, (_, i) => ({
    id: `t${i}`,
    color: COLORS[i % COLORS.length],
  }));
  const board: Cell[] = [...tiles, null];
  return board;
}

function idx(r: number, c: number) {
  return r * GRID + c;
}

function rc(i: number) {
  return { r: Math.floor(i / GRID), c: i % GRID };
}

function neighborsOfEmpty(emptyIndex: number) {
  const { r, c } = rc(emptyIndex);
  const n: number[] = [];
  const dirs = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ];
  for (const { dr, dc } of dirs) {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc)) n.push(idx(nr, nc));
  }
  return n;
}

function move(board: Cell[], fromIndex: number): Cell[] {
  const emptyIndex = board.findIndex((x) => x === null);
  if (emptyIndex < 0) return board;

  const n = neighborsOfEmpty(emptyIndex);
  if (!n.includes(fromIndex)) return board;

  const next = board.slice();
  next[emptyIndex] = next[fromIndex];
  next[fromIndex] = null;
  return next;
}

function snapshotCenter(board: Cell[]) {
  const { sr, sc } = centerTopLeft();
  const snap: (string | null)[] = [];
  for (let r = sr; r < sr + CENTER; r++) {
    for (let c = sc; c < sc + CENTER; c++) {
      const cell = board[idx(r, c)];
      snap.push(cell?.color ?? null);
    }
  }
  return snap;
}

function makeTargetFromBoard(board: Cell[]) {
  // ターゲットは「中央3x3の色配置」だけ保存
  return snapshotCenter(board);
}

function isSolved(board: Cell[], target: (string | null)[]) {
  const cur = snapshotCenter(board);
  if (cur.length !== target.length) return false;
  for (let i = 0; i < cur.length; i++) {
    if (cur[i] !== target[i]) return false;
  }
  return true;
}

function shuffleByMoves(board: Cell[], moves = SHUFFLE_MOVES) {
  let b = board.slice();
  for (let i = 0; i < moves; i++) {
    const empty = b.findIndex((x) => x === null);
    const n = neighborsOfEmpty(empty);
    const pick = n[Math.floor(Math.random() * n.length)];
    b = move(b, pick);
  }
  return b;
}

export default function App() {
  const [board, setBoard] = useState<Cell[]>(() => makeInitialBoard());
  const [target, setTarget] = useState<(string | null)[]>([]);
  const [moves, setMoves] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const solved = useMemo(() => target.length > 0 && isSolved(board, target), [board, target]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(t);
  }, []);

  const elapsedMs = startedAt ? now - startedAt : 0;

  const { sr, sc } = centerTopLeft();

  function handleTap(i: number) {
    if (solved) return;
    if (!startedAt) setStartedAt(Date.now());
    const next = move(board, i);
    if (next !== board) {
      setBoard(next);
      setMoves((m) => m + 1);
    }
  }

  function newGame() {
    const base = makeInitialBoard();
    // まず「完成形」を作ってそれをターゲットにし、そこから動かして崩す
    const solvedBoard = shuffleByMoves(base, 50); // 完成形をランダムっぽく
    const t = makeTargetFromBoard(solvedBoard);
    const scrambled = shuffleByMoves(solvedBoard, SHUFFLE_MOVES);

    setTarget(t);
    setBoard(scrambled);
    setMoves(0);
    setStartedAt(null);
  }

  function resetToScramble() {
    // 現在のターゲットは維持して、適当にシャッフルし直す
    const scrambled = shuffleByMoves(board, SHUFFLE_MOVES);
    setBoard(scrambled);
    setMoves(0);
    setStartedAt(null);
  }

  useEffect(() => {
    // 初回開始
    newGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }} className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Nine Race（TSX再実装 / ローカル版）</h1>
            <p className="text-sm text-neutral-300">
              隣のタイルを空きマスへスライド。中央3×3をターゲット配置に揃えたら勝ち。
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={newGame}
              className="rounded-2xl bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-950 shadow"
            >
              New Game
            </button>
            <button
              onClick={resetToScramble}
              className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-100"
            >
              Reshuffle
            </button>
          </div>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Target */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 shadow">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Target（中央3×3）</h2>
              {solved ? (
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                  CLEARED!
                </span>
              ) : (
                <span className="text-xs text-neutral-400">中央だけ判定</span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {target.map((col, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl border border-neutral-800"
                  style={{ background: col ?? "transparent" }}
                />
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-sm text-neutral-300">
              <div className="rounded-xl border border-neutral-800 bg-neutral-950/30 px-3 py-2">
                Moves: <span className="font-semibold text-neutral-100">{moves}</span>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-950/30 px-3 py-2">
                Time:{" "}
                <span className="font-semibold text-neutral-100">
                  {(elapsedMs / 1000).toFixed(1)}s
                </span>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-950/30 px-3 py-2">
                Empty:{" "}
                <span className="font-semibold text-neutral-100">
                  {(() => {
                    const e = board.findIndex((x) => x === null);
                    const { r, c } = rc(e);
                    return `${r + 1}-${c + 1}`;
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* Board */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 shadow">
            <h2 className="text-lg font-semibold">Board（{GRID}×{GRID}）</h2>
            <p className="mt-1 text-xs text-neutral-400">
              タップで移動（空きマスに隣接してると動く）
            </p>

            <div
              className="mt-4 grid gap-2"
              style={{ gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))` }}
            >
              {board.map((cell, i) => {
                const { r, c } = rc(i);
                const isCenter =
                  r >= sr && r < sr + CENTER && c >= sc && c < sc + CENTER;

                const canMove = (() => {
                  const empty = board.findIndex((x) => x === null);
                  return neighborsOfEmpty(empty).includes(i);
                })();

                return (
                  <button
                    key={i}
                    onClick={() => handleTap(i)}
                    disabled={cell === null || solved}
                    className={[
                      "aspect-square rounded-2xl border shadow-sm transition",
                      isCenter ? "border-neutral-200/70" : "border-neutral-800",
                      cell === null ? "bg-neutral-950/30" : "",
                      canMove && cell !== null && !solved ? "ring-2 ring-neutral-200/30" : "",
                      solved ? "opacity-80" : "hover:brightness-110",
                    ].join(" ")}
                    style={{ background: cell?.color ?? "transparent" }}
                    aria-label={cell ? `tile ${cell.id}` : "empty"}
                    title={cell ? "Tap to slide" : "Empty"}
                  />
                );
              })}
            </div>

            <div className="mt-4 text-xs text-neutral-400">
              ※オンライン対戦・マッチングは未実装（次ステップで WebSocket / WebRTC で追加できる）
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
