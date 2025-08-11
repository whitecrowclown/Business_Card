// ===== 1) PGN 원문 =====
const PGN = `[Event "Play vs Bot"]
[Site "Chess.com"]
[Date "2025.08.04"]
[Round "?"]
[White "White-Crows"]
[Black "skewer-BOT"]
[Result "1/2-1/2"]
[TimeControl "-"]
[WhiteElo "400"]
[BlackElo "300"]
[Termination "게임이 스테일메이트로 인해 무승부가 되었습니다"]
[ECO "A00"]
[EndDate "2025.08.04"]
[Link "https://www.chess.com/game/computer/356220950?move=0"]

1. Nc3 b6 2. Nf3 d5 3. d4 e6 4. e4 Nh6 5. exd5 Na6 6. Be3 Qxd5 7. Nxd5 exd5 8.
Bd3 Bb4+ 9. Qd2 Bxd2+ 10. Kxd2 c5 11. h4 Kd8 12. dxc5 Nxc5 13. Rh3 a6 14. a4
Bxh3 15. gxh3 b5 16. axb5 Nb3+ 17. cxb3 Ra7 18. bxa6 Ra8 19. a7 Rxa7 20. Rxa7 f6
21. Rxg7 Ng8 22. h5 h6 23. Bb6+ Ke8 24. Bb5+ Kf8 25. Re7 Kxe7 26. Ng5 fxg5 27.
h4 Nf6 28. hxg5 Ne4+ 29. Ke3 Ra8 30. Kd4 Rb8 31. Kxd5 Nc3+ 32. Kc5 Rc8+ 33. Bc6
Na2 34. gxh6 Rxc6+ 35. Kxc6 Kf7 36. h7 Kg7 37. h8=Q+ Kxh8 38. f4 Nc1 39. b4 Na2
40. b5 Nb4+ 41. Kc5 Nd3+ 42. Kd5 Nxf4+ 43. Kd6 Nxh5 44. Bd4+ Kg8 45. Kd7 Kf7 46.
b6 Nf6+ 47. Kd6 Ne4+ 48. Kd5 Ng3 49. b7 Ne4 50. Kxe4 Ke8 51. b8=Q+ Ke7 52. b4
Kd7 53. b5 Ke6 54. b6 Kd7 55. b7 Ke6 56. Qc8+ Kf7 57. b8=Q Kg6 58. Qf8 Kh5 59.
Qh2+ Kg5 60. Qf7 Kg4 61. Qf6 1/2-1/2`

// === 내 닉네임 & 방향 결정 함수 추가 ===
const MY_NICK = "White-Crows";
function getOrientationFromPGN(pgn, nick) {
  const mw = pgn.match(/\[White\s+"([^"]+)"\]/i);
  const mb = pgn.match(/\[Black\s+"([^"]+)"\]/i);
  const w = mw ? mw[1] : "";
  const b = mb ? mb[1] : "";
  const n = (nick || "").toLowerCase();
  if (w.toLowerCase().includes(n)) return "white";
  if (b.toLowerCase().includes(n)) return "black";
  return "white"; // 닉이 없으면 기본값
}

// ===== 2) 리체스 스타일 보드 =====
let viewer = null;
const root = document.getElementById('root');
const boardWrap = document.getElementById('boardWrap');

function renderViewer(boardSizePx) {
  document.getElementById('board').innerHTML = '';
  const orientation = getOrientationFromPGN(PGN, MY_NICK); // ★ 방향 결정
  viewer = PGNV.pgnView("board", {
    pgn: PGN.replace(/\r\n/g, "\n").replace(/\r/g, "\n"),
    theme: "blue",
    pieceStyle: "merida",
    showCoords: true,
    boardSize: boardSizePx + "px",
    headers: true,
    showResult: true,
    orientation: orientation // ★ 항상 내 진영이 아래
  });
}
function calcFitSize() {
  const rect = boardWrap.getBoundingClientRect();
  const inner = rect.width - 16;
  return Math.max(420, Math.floor(inner));
}
function applyFit() {
  root.classList.add('fit'); root.classList.remove('zoom');
  renderViewer(calcFitSize());
}
function applyZoom() {
  root.classList.remove('fit'); root.classList.add('zoom');
  const size = Math.max(boardWrap.clientWidth - 16, boardWrap.clientHeight - 16, 720);
  renderViewer(size);
}

// 자동재생
let playTimer = null;
function autoPlayStart(delay=800) {
  if (!viewer) return;
  if (playTimer) clearInterval(playTimer);
  viewer.play();
  playTimer = setInterval(() => {
    if (!viewer.next()) { clearInterval(playTimer); playTimer = null; }
  }, delay);
}
function autoPlayStop() { if (playTimer) clearInterval(playTimer); playTimer = null; }

// 초기화
window.addEventListener('load', () => {
  applyFit();
  setupEngine();
  buildEvalRowsSkeleton();
});
window.addEventListener('resize', () => {
  if (!root.classList.contains('zoom')) applyFit();
});

// 버튼
document.getElementById('fitBtn').addEventListener('click', () => { autoPlayStop(); applyFit(); });
document.getElementById('zoomBtn').addEventListener('click', () => { autoPlayStop(); applyZoom(); });
document.getElementById('playBtn').addEventListener('click', () => autoPlayStart(800));
document.getElementById('stopBtn').addEventListener('click', () => autoPlayStop());

// ===== 3) 엔진(Stockfish) — 사용자 시간으로 분석 =====
let engine = null;
let engineBusy = false;
const statusEl = document.getElementById('engineStatus');
const evalBody = document.getElementById('evalBody');

function setupEngine() {
  engine = STOCKFISH();
  engine.postMessage('uci');
  engine.onmessage = (line) => {
    // console.log('[SF]', line);
  };
}

// 수 → FEN 목록 생성
function getFensFromPGN(pgn) {
  const game = new Chess();
  game.load_pgn(pgn, { sloppy: true });
  const moves = game.history();
  const stepper = new Chess();
  const fens = [{ ply: 0, fen: stepper.fen() }];
  for (let i=0;i<moves.length;i++) {
    stepper.move(moves[i], { sloppy:true });
    fens.push({ ply: i+1, fen: stepper.fen() });
  }
  return fens;
}

// 엔진 한 포지션 분석 (movetime ms)
function analyzeFen(fen, ms=3000) {
  return new Promise((resolve) => {
    let best = '', pv = '', score = null, mate = null;

    const onMsg = (raw) => {
      const text = (''+raw).trim();
      if (text.startsWith('info ')) {
        const mCp = text.match(/ score cp (-?\d+)/);
        const mMt = text.match(/ score mate (-?\d+)/);
        const mPv = text.match(/ pv (.+)$/);
        if (mCp) { score = parseInt(mCp[1],10); mate = null; }
        if (mMt) { mate = parseInt(mMt[1],10); score = null; }
        if (mPv) { pv = mPv[1]; }
      }
      if (text.startsWith('bestmove ')) {
        best = text.split(' ')[1];
        resolve({ best, pv, score, mate });
      }
    };

    const prev = engine.onmessage;
    engine.onmessage = (msg) => { onMsg(msg.data ?? msg); prev && prev(msg); };

    engine.postMessage('ucinewgame');
    engine.postMessage('isready');
    engine.postMessage(`position fen ${fen}`);
    engine.postMessage(`go movetime ${ms}`);
  });
}

// 표 초안(수순만) 만들기
function buildEvalRowsSkeleton() {
  evalBody.innerHTML = '';
  const fens = getFensFromPGN(PGN);
  for (const row of fens) {
    const tr = document.createElement('tr');
    tr.id = `ply-${row.ply}`;
    const full = row.ply===0 ? '0' : `${Math.ceil(row.ply/2)} (${row.ply%2===1?'W':'B'})`;
    tr.innerHTML = `
      <td class="mono">${full}</td>
      <td class="mono" data-col="eval"></td>
      <td class="mono" data-col="pv"></td>
    `;
    evalBody.appendChild(tr);
  }
}

// 현재 위치(뷰어 커서)의 FEN 추출 (지금은 최종 포지션 기준)
function getCurrentFenFromViewer() {
  const game = new Chess();
  game.load_pgn(PGN, { sloppy:true });
  const moves = game.history();
  const stepper = new Chess();
  for (let i=0;i<moves.length;i++) stepper.move(moves[i], { sloppy:true });
  return stepper.fen();
}

// 이벤트: 현재 위치 분석
document.getElementById('analyzeCurrent').addEventListener('click', async () => {
  if (!engine || engineBusy) return;
  engineBusy = true;
  statusEl.textContent = '분석 중...';

  const ms = Math.max(100, parseInt(document.getElementById('msPerMove').value || '3000', 10));
  const fen = getCurrentFenFromViewer();
  const res = await analyzeFen(fen, ms);

  const lastRow = evalBody.querySelector('tr:last-child');
  if (lastRow) {
    const evalTd = lastRow.querySelector('[data-col="eval"]');
    const pvTd   = lastRow.querySelector('[data-col="pv"]');
    evalTd.textContent = res.mate!==null ? `#${res.mate}` : (res.score>0?`+${res.score}`:`${res.score}`);
    pvTd.textContent   = res.pv || res.best || '';
  }

  statusEl.textContent = '완료';
  engineBusy = false;
});

// 이벤트: 전체 분석(수마다 msPerMove 적용)
document.getElementById('analyzeAll').addEventListener('click', async () => {
  if (!engine || engineBusy) return;
  engineBusy = true;

  const ms = Math.max(100, parseInt(document.getElementById('msPerMove').value || '3000', 10));
  statusEl.textContent = `전체 분석 중... (수마다 ${ms}ms)`;

  const fens = getFensFromPGN(PGN);
  for (const row of fens) {
    const tr = document.getElementById(`ply-${row.ply}`);
    if (!tr) continue;
    const evalTd = tr.querySelector('[data-col="eval"]');
    const pvTd   = tr.querySelector('[data-col="pv"]');

    evalTd.textContent = '…';
    pvTd.textContent   = '';

    const res = await analyzeFen(row.fen, ms);
    evalTd.textContent = res.mate!==null ? `#${res.mate}` : (res.score>0?`+${res.score}`:`${res.score}`);
    pvTd.textContent   = res.pv || res.best || '';
  }

  statusEl.textContent = '완료';
  engineBusy = false;
});
