function SudokuCore() {
  const R = i => (i / 9) | 0, C = i => i % 9, B = i => ((i / 27) | 0) * 3 + (((i % 9) / 3) | 0);
  const UNITS = [];
  for (let r = 0; r < 9; r++) UNITS.push(Array.from({ length: 9 }, (_, c) => r * 9 + c));
  for (let c = 0; c < 9; c++) UNITS.push(Array.from({ length: 9 }, (_, r) => r * 9 + c));
  for (let b = 0; b < 9; b++) {
    const br = ((b / 3) | 0) * 3, bc = (b % 3) * 3, a = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) a.push((br + r) * 9 + bc + c);
    UNITS.push(a);
  }
  const PEERS = [], SEES = [];
  for (let i = 0; i < 81; i++) {
    const s = new Set([...UNITS[R(i)], ...UNITS[9 + C(i)], ...UNITS[18 + B(i)]]);
    s.delete(i);
    PEERS.push([...s]);
    const row = new Array(81).fill(false);
    s.forEach(p => (row[p] = true));
    SEES.push(row);
  }
  const POP = new Array(512), DIG = new Array(512);
  for (let m = 0; m < 512; m++) {
    const d = [];
    for (let k = 0; k < 9; k++) if (m & (1 << k)) d.push(k + 1);
    POP[m] = d.length; DIG[m] = d;
  }
  const bit = d => 1 << (d - 1);
  const BOX_FIRST = [...Array(9).keys()].map(x => x + 18).concat([...Array(18).keys()]);

  // ---------- Namen ----------
  const unitName = u => (u < 9 ? `Zeile ${u + 1}` : u < 18 ? `Spalte ${u - 8}` : `Block ${u - 17}`);
  const unitGen = u => (u < 9 ? 'der Zeile' : u < 18 ? 'der Spalte' : 'des Blocks');
  const cellName = i => `Z${R(i) + 1}S${C(i) + 1}`;
  const list = arr => (arr.length <= 1 ? arr.join('') : arr.slice(0, -1).join(', ') + ' und ' + arr[arr.length - 1]);
  const cellList = cells => list(cells.map(cellName));
  const elimCells = elims => [...new Set(elims.map(e => e.cell))];

  function* combos(arr, k, start = 0, acc = []) {
    if (acc.length === k) { yield acc.slice(); return; }
    for (let i = start; i <= arr.length - (k - acc.length); i++) {
      acc.push(arr[i]);
      yield* combos(arr, k, i + 1, acc);
      acc.pop();
    }
  }

  function initCands(g) {
    const c = new Array(81).fill(0);
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      let m = 511;
      for (const p of PEERS[i]) if (g[p]) m &= ~bit(g[p]);
      c[i] = m;
    }
    return c;
  }

  // ---------- Techniken ----------
  function hidden1(g, c) {
    for (const u of BOX_FIRST) {
      for (let d = 1; d <= 9; d++) {
        const b = bit(d); let n = 0, pos = -1, placed = false;
        for (const i of UNITS[u]) {
          if (g[i] === d) { placed = true; break; }
          if (!g[i] && c[i] & b) { n++; pos = i; }
        }
        if (!placed && n === 1)
          return {
            place: { cell: pos, d }, elims: [], unit: u, cells: [pos], digit: d,
            short: `Schau dir ${unitName(u)} an: Wo kann die ${d} hin?`,
            text: `In ${unitName(u)} passt die ${d} nur noch in ${cellName(pos)}. In allen anderen freien Feldern ${unitGen(u)} ist die ${d} schon durch eine Zeile, Spalte oder einen Block ausgeschlossen.`
          };
      }
    }
    return null;
  }

  function naked1(g, c) {
    for (let i = 0; i < 81; i++) {
      if (!g[i] && POP[c[i]] === 1) {
        const d = DIG[c[i]][0];
        return {
          place: { cell: i, d }, elims: [], unit: null, cells: [i], digit: d,
          short: `Ein Feld hat nur noch einen möglichen Kandidaten. Sieh dir ${cellName(i)} genauer an.`,
          text: `In ${cellName(i)} passt nur noch die ${d}. Alle anderen Ziffern stehen schon in seiner Zeile, Spalte oder seinem Block oder wurden ausgeschlossen.`
        };
      }
    }
    return null;
  }

  function pointing(g, c) {
    for (let b = 0; b < 9; b++) {
      const u = 18 + b;
      for (let d = 1; d <= 9; d++) {
        const bt = bit(d);
        const cells = UNITS[u].filter(i => !g[i] && c[i] & bt);
        if (cells.length < 2) continue;
        for (const [fn, off] of [[R, 0], [C, 9]]) {
          const lines = new Set(cells.map(fn));
          if (lines.size !== 1) continue;
          const line = off + [...lines][0];
          const elims = UNITS[line].filter(i => B(i) !== b && !g[i] && c[i] & bt).map(cell => ({ cell, d }));
          if (elims.length)
            return {
              elims, unit: u, line, cells, digit: d,
              short: `Schau dir in Block ${b + 1} an, wo die ${d} überhaupt noch hin kann.`,
              text: `In Block ${b + 1} kann die ${d} nur in ${unitName(line)} stehen (${cellList(cells)}). Die ${d} dieses Blocks landet also sicher in ${unitName(line)}. Im Rest ${unitGen(line)} kann sie gestrichen werden: ${cellList(elimCells(elims))}.`
            };
        }
      }
    }
    return null;
  }

  function claiming(g, c) {
    for (let u = 0; u < 18; u++) {
      for (let d = 1; d <= 9; d++) {
        const bt = bit(d);
        const cells = UNITS[u].filter(i => !g[i] && c[i] & bt);
        if (cells.length < 2) continue;
        const boxes = new Set(cells.map(B));
        if (boxes.size !== 1) continue;
        const b = [...boxes][0];
        const elims = UNITS[18 + b].filter(i => !UNITS[u].includes(i) && !g[i] && c[i] & bt).map(cell => ({ cell, d }));
        if (elims.length)
          return {
            elims, unit: u, line: 18 + b, cells, digit: d,
            short: `Schau dir an, wo die ${d} in ${unitName(u)} noch stehen kann.`,
            text: `In ${unitName(u)} kann die ${d} nur noch in Block ${b + 1} stehen (${cellList(cells)}). Die ${d} von Block ${b + 1} muss also in ${unitName(u)} liegen. In den übrigen Feldern des Blocks fällt sie weg: ${cellList(elimCells(elims))}.`
          };
      }
    }
    return null;
  }

  function nakedN(n) {
    const word = n === 2 ? 'beiden' : 'drei';
    return (g, c) => {
      for (const u of BOX_FIRST) {
        const empties = UNITS[u].filter(i => !g[i]);
        if (empties.length <= n) continue;
        const pool = empties.filter(i => POP[c[i]] >= 2 && POP[c[i]] <= n);
        for (const combo of combos(pool, n)) {
          let m = 0;
          for (const i of combo) m |= c[i];
          if (POP[m] !== n) continue;
          const elims = [];
          for (const i of empties) if (!combo.includes(i)) for (const d of DIG[c[i] & m]) elims.push({ cell: i, d });
          if (elims.length)
            return {
              elims, unit: u, cells: combo, digits: DIG[m],
              short: `Suche in ${unitName(u)} nach ${n} Feldern, die zusammen nur ${n} verschiedene Kandidaten haben.`,
              text: `Die Felder ${cellList(combo)} in ${unitName(u)} haben zusammen nur die Kandidaten ${list(DIG[m])}. Diese ${n} Ziffern müssen sich also genau auf diese ${n} Felder verteilen. In allen anderen Feldern ${unitGen(u)} fallen sie weg.`
            };
        }
      }
      return null;
    };
  }

  function hiddenN(n) {
    return (g, c) => {
      for (const u of BOX_FIRST) {
        const empties = UNITS[u].filter(i => !g[i]);
        if (empties.length <= n) continue;
        const pos = {};
        const pool = [];
        for (let d = 1; d <= 9; d++) {
          if (UNITS[u].some(i => g[i] === d)) continue;
          const p = empties.filter(i => c[i] & bit(d));
          pos[d] = p;
          if (p.length >= 2 && p.length <= n) pool.push(d);
        }
        for (const combo of combos(pool, n)) {
          const cells = [...new Set(combo.flatMap(d => pos[d]))];
          if (cells.length !== n) continue;
          let m = 0;
          for (const d of combo) m |= bit(d);
          const elims = [];
          for (const i of cells) for (const d of DIG[c[i] & ~m]) elims.push({ cell: i, d });
          if (elims.length)
            return {
              elims, unit: u, cells: cells.sort((a, b) => a - b), digits: combo,
              short: `Suche in ${unitName(u)} nach ${n} Ziffern, die nur in denselben ${n} Feldern vorkommen.`,
              text: `In ${unitName(u)} können die Ziffern ${list(combo)} nur in ${cellList(cells)} stehen. Diese ${n} Felder sind also für genau diese Ziffern reserviert. Alle anderen Kandidaten darin können gestrichen werden.`
            };
        }
      }
      return null;
    };
  }

  function fish(n) {
    return (g, c) => {
      for (let d = 1; d <= 9; d++) {
        const bt = bit(d);
        for (const colBase of [false, true]) {
          const lines = [];
          for (let l = 0; l < 9; l++) {
            const u = colBase ? 9 + l : l;
            let m = 0;
            for (const i of UNITS[u]) if (!g[i] && c[i] & bt) m |= 1 << (colBase ? R(i) : C(i));
            if (POP[m] >= 2 && POP[m] <= n) lines.push({ l, m });
          }
          for (const combo of combos(lines, n)) {
            let cover = 0;
            for (const x of combo) cover |= x.m;
            if (POP[cover] !== n) continue;
            const baseIdx = combo.map(x => x.l);
            const coverIdx = DIG[cover].map(k => k - 1);
            const elims = [];
            for (const k of coverIdx) {
              const u = colBase ? k : 9 + k;
              for (const i of UNITS[u]) {
                const b = colBase ? C(i) : R(i);
                if (!baseIdx.includes(b) && !g[i] && c[i] & bt) elims.push({ cell: i, d });
              }
            }
            if (!elims.length) continue;
            const cells = [];
            for (const l of baseIdx) for (const i of UNITS[colBase ? 9 + l : l]) if (!g[i] && c[i] & bt) cells.push(i);
            const baseW = colBase ? 'Spalten' : 'Zeilen', coverW = colBase ? 'Zeilen' : 'Spalten';
            const bl = list(baseIdx.map(x => x + 1)), cl = list(coverIdx.map(x => x + 1));
            return {
              elims, cells, digit: d, baseUnits: baseIdx.map(l => (colBase ? 9 + l : l)), coverUnits: coverIdx.map(k => (colBase ? k : 9 + k)),
              short: `Achte nur auf die ${d}: In ${n} ${baseW} hat sie jeweils nur wenige Plätze, die in denselben ${n} ${coverW} liegen.`,
              text: `In den ${baseW} ${bl} kann die ${d} jeweils nur in den ${coverW} ${cl} stehen. Wie auch immer man sie verteilt: In diesen ${n} ${coverW} sind die ${d}en damit schon vergeben. In allen anderen Feldern dieser ${coverW} fällt die ${d} weg: ${cellList(elimCells(elims))}.`
            };
          }
        }
      }
      return null;
    };
  }

  function ywing(g, c) {
    for (let p = 0; p < 81; p++) {
      if (g[p] || POP[c[p]] !== 2) continue;
      const [a, b] = DIG[c[p]];
      const wings = PEERS[p].filter(w => !g[w] && POP[c[w]] === 2 && c[w] !== c[p]);
      for (const w1 of wings) {
        if (!(c[w1] & bit(a)) || c[w1] & bit(b)) continue;
        const z = DIG[c[w1] & ~bit(a)][0];
        for (const w2 of wings) {
          if (w2 === w1 || c[w2] !== (bit(b) | bit(z))) continue;
          const elims = [];
          for (let i = 0; i < 81; i++)
            if (i !== p && i !== w1 && i !== w2 && !g[i] && c[i] & bit(z) && SEES[i][w1] && SEES[i][w2]) elims.push({ cell: i, d: z });
          if (elims.length)
            return {
              elims, cells: [p, w1, w2], pivot: p, digit: z,
              short: `Suche ein Feld mit genau zwei Kandidaten, das zwei andere Zweier-Felder sieht.`,
              text: `${cellName(p)} kann nur ${a} oder ${b} sein. Ist es die ${a}, wird ${cellName(w1)} zur ${z}. Ist es die ${b}, wird ${cellName(w2)} zur ${z}. In jedem Fall steht in einem der beiden Felder eine ${z}. Felder, die beide sehen, können also keine ${z} sein: ${cellList(elimCells(elims))}.`
            };
        }
      }
    }
    return null;
  }

  // ================= Fortgeschrittene Techniken =================
  const posIn = (g, c, u, d) => UNITS[u].filter(i => !g[i] && c[i] & bit(d));
  function strongLinks(g, c, d) {
    const adj = new Map();
    for (let u = 0; u < 27; u++) {
      const p = posIn(g, c, u, d);
      if (p.length !== 2) continue;
      const [a, b] = p;
      if (!adj.has(a)) adj.set(a, new Set());
      if (!adj.has(b)) adj.set(b, new Set());
      adj.get(a).add(b); adj.get(b).add(a);
    }
    return adj;
  }
  function elimSeeing(g, c, d, ends, exclude) {
    const out = [];
    for (let i = 0; i < 81; i++) {
      if (g[i] || !(c[i] & bit(d)) || exclude.includes(i)) continue;
      if (ends.every(e => SEES[i][e])) out.push({ cell: i, d });
    }
    return out;
  }
  const bivalues = (g, c) => { const a = []; for (let i = 0; i < 81; i++) if (!g[i] && POP[c[i]] === 2) a.push(i); return a; };

  function skyscraper(g, c) {
    for (let d = 1; d <= 9; d++) {
      for (const colBase of [false, true]) {
        const lines = [];
        for (let l = 0; l < 9; l++) { const u = colBase ? 9 + l : l, p = posIn(g, c, u, d); if (p.length === 2) lines.push({ u, p }); }
        const cr = colBase ? R : C;
        for (let x = 0; x < lines.length; x++) for (let y = x + 1; y < lines.length; y++) {
          const A = lines[x], Bl = lines[y];
          for (const ai of [0, 1]) for (const bi of [0, 1]) {
            if (cr(A.p[ai]) !== cr(Bl.p[bi])) continue;
            const tA = A.p[1 - ai], tB = Bl.p[1 - bi];
            if (cr(tA) === cr(tB)) continue;
            const elims = elimSeeing(g, c, d, [tA, tB], [...A.p, ...Bl.p]);
            if (!elims.length) continue;
            const cross = colBase ? 'Zeile' : 'Spalte';
            return {
              elims, cells: [...A.p, ...Bl.p], digit: d, baseUnits: [A.u, Bl.u],
              short: `Achte auf die ${d}: Zwei ${colBase ? 'Spalten' : 'Zeilen'} haben jeweils nur zwei Plätze, und zwei davon liegen auf einer Linie.`,
              text: `Die ${d} hat in ${unitName(A.u)} und ${unitName(Bl.u)} jeweils nur zwei Plätze. ${cellName(A.p[ai])} und ${cellName(Bl.p[bi])} liegen in derselben ${cross} und sehen sich, also ist höchstens eines davon die ${d}. Damit ist mindestens eines der anderen Enden, ${cellName(tA)} oder ${cellName(tB)}, eine ${d}. Felder, die beide Enden sehen, verlieren die ${d}: ${cellList(elimCells(elims))}.`
            };
          }
        }
      }
    }
    return null;
  }

  function kite(g, c) {
    for (let d = 1; d <= 9; d++) {
      const rows = [], cols = [];
      for (let l = 0; l < 9; l++) {
        const pr = posIn(g, c, l, d), pc = posIn(g, c, 9 + l, d);
        if (pr.length === 2) rows.push({ u: l, p: pr });
        if (pc.length === 2) cols.push({ u: 9 + l, p: pc });
      }
      for (const Rw of rows) for (const Cl of cols) {
        if (Rw.p.some(i => Cl.p.includes(i))) continue;
        for (const ri of [0, 1]) for (const ci of [0, 1]) {
          const a = Rw.p[ri], b = Cl.p[ci];
          if (B(a) !== B(b)) continue;
          const rEnd = Rw.p[1 - ri], cEnd = Cl.p[1 - ci];
          if (B(rEnd) === B(a) || B(cEnd) === B(a)) continue;
          const elims = elimSeeing(g, c, d, [rEnd, cEnd], [...Rw.p, ...Cl.p]);
          if (!elims.length) continue;
          return {
            elims, cells: [...Rw.p, ...Cl.p], digit: d, baseUnits: [Rw.u, Cl.u],
            short: `Achte auf die ${d}: Eine Zeile und eine Spalte haben je nur zwei Plätze, die sich in einem Block treffen.`,
            text: `In ${unitName(Rw.u)} hat die ${d} nur zwei Plätze, in ${unitName(Cl.u)} ebenfalls. ${cellName(a)} und ${cellName(b)} liegen beide in Block ${B(a) + 1} und sehen sich, also ist höchstens eines davon die ${d}. Damit ist eines der äußeren Enden, ${cellName(rEnd)} oder ${cellName(cEnd)}, eine ${d}. Felder, die beide sehen, verlieren die ${d}: ${cellList(elimCells(elims))}.`
          };
        }
      }
    }
    return null;
  }

  function xyzwing(g, c) {
    for (let p = 0; p < 81; p++) {
      if (g[p] || POP[c[p]] !== 3) continue;
      const wings = PEERS[p].filter(w => !g[w] && POP[c[w]] === 2 && (c[w] & ~c[p]) === 0);
      for (let x = 0; x < wings.length; x++) for (let y = x + 1; y < wings.length; y++) {
        const w1 = wings[x], w2 = wings[y];
        if (c[w1] === c[w2]) continue;
        const common = c[w1] & c[w2];
        if (POP[common] !== 1) continue;
        const z = DIG[common][0];
        const elims = [];
        for (let i = 0; i < 81; i++)
          if (i !== p && i !== w1 && i !== w2 && !g[i] && c[i] & common && SEES[i][p] && SEES[i][w1] && SEES[i][w2]) elims.push({ cell: i, d: z });
        if (!elims.length) continue;
        return {
          elims, cells: [p, w1, w2], pivot: p, digit: z, allNotes: true,
          short: `Suche ein Feld mit drei Kandidaten, das zwei passende Zweier-Felder sieht.`,
          text: `${cellName(p)} kann nur ${list(DIG[c[p]])} sein. Die Flügel ${cellName(w1)} {${DIG[c[w1]].join(',')}} und ${cellName(w2)} {${DIG[c[w2]].join(',')}} sieht es beide. Ist der Drehpunkt die ${z}, steht dort die ${z}. Sonst zwingt er einen der Flügel zur ${z}. In jedem Fall steht in einem der drei Felder eine ${z}. Felder, die alle drei sehen, verlieren die ${z}: ${cellList(elimCells(elims))}.`
        };
      }
    }
    return null;
  }

  function wwing(g, c) {
    const bv = bivalues(g, c);
    for (let x = 0; x < bv.length; x++) for (let y = x + 1; y < bv.length; y++) {
      const A = bv[x], Bc = bv[y];
      if (c[A] !== c[Bc] || SEES[A][Bc]) continue;
      for (const xd of DIG[c[A]]) {
        const yd = DIG[c[A] & ~bit(xd)][0];
        for (let u = 0; u < 27; u++) {
          const p = posIn(g, c, u, xd);
          if (p.length !== 2 || p.includes(A) || p.includes(Bc)) continue;
          let P1 = null, P2 = null;
          if (SEES[p[0]][A] && SEES[p[1]][Bc]) { P1 = p[0]; P2 = p[1]; }
          else if (SEES[p[1]][A] && SEES[p[0]][Bc]) { P1 = p[1]; P2 = p[0]; }
          if (P1 === null) continue;
          const elims = elimSeeing(g, c, yd, [A, Bc], [A, Bc]);
          if (!elims.length) continue;
          return {
            elims, cells: [A, Bc, P1, P2], digits: [xd, yd], unit: u,
            short: `Zwei Zweier-Felder mit denselben Kandidaten, verbunden über eine Einheit, in der eine ihrer Ziffern nur zwei Plätze hat.`,
            text: `${cellName(A)} und ${cellName(Bc)} haben beide nur ${xd} und ${yd}. In ${unitName(u)} kann die ${xd} nur in ${cellName(P1)} oder ${cellName(P2)} stehen. ${cellName(P1)} sieht ${cellName(A)}, ${cellName(P2)} sieht ${cellName(Bc)}. Wären beide Zweier-Felder die ${xd}, hätte ${unitName(u)} keinen Platz mehr dafür. Also ist mindestens eines davon die ${yd}. Felder, die beide sehen, verlieren die ${yd}: ${cellList(elimCells(elims))}.`
          };
        }
      }
    }
    return null;
  }

  function emptyRect(g, c) {
    for (let d = 1; d <= 9; d++) {
      for (let b = 0; b < 9; b++) {
        const cells = posIn(g, c, 18 + b, d);
        if (cells.length < 2) continue;
        const br = ((b / 3) | 0) * 3, bc = (b % 3) * 3;
        for (let r = br; r < br + 3; r++) for (let cc = bc; cc < bc + 3; cc++) {
          if (!cells.every(i => R(i) === r || C(i) === cc)) continue;
          if (cells.every(i => R(i) === r) || cells.every(i => C(i) === cc)) continue;
          // Spalte als Verbindung
          for (let x = 0; x < 9; x++) {
            if (x >= bc && x < bc + 3) continue;
            const p = posIn(g, c, 9 + x, d);
            if (p.length !== 2) continue;
            const inR = p.find(i => R(i) === r);
            if (inR === undefined) continue;
            const q = p.find(i => i !== inR);
            if (R(q) >= br && R(q) < br + 3) continue;
            const t = R(q) * 9 + cc;
            if (g[t] || !(c[t] & bit(d))) continue;
            return erStep(d, b, r, cc, 9 + x, inR, q, t, cells);
          }
          // Zeile als Verbindung
          for (let y = 0; y < 9; y++) {
            if (y >= br && y < br + 3) continue;
            const p = posIn(g, c, y, d);
            if (p.length !== 2) continue;
            const inC = p.find(i => C(i) === cc);
            if (inC === undefined) continue;
            const q = p.find(i => i !== inC);
            if (C(q) >= bc && C(q) < bc + 3) continue;
            const t = r * 9 + C(q);
            if (g[t] || !(c[t] & bit(d))) continue;
            return erStep(d, b, r, cc, y, inC, q, t, cells);
          }
        }
      }
    }
    return null;
  }
  function erStep(d, b, r, cc, u, near, q, t, cells) {
    return {
      elims: [{ cell: t, d }], cells: [...cells, near, q], digit: d, unit: 18 + b, line: u,
      short: `In einem Block liegen alle Plätze einer Ziffer auf einem Kreuz aus einer Zeile und einer Spalte. Kombiniere das mit einer Einheit, in der die Ziffer nur zwei Plätze hat.`,
      text: `In Block ${b + 1} liegen alle Kandidaten der ${d} in Zeile ${r + 1} oder Spalte ${cc + 1}. In ${unitName(u)} hat die ${d} nur zwei Plätze: ${cellName(near)} und ${cellName(q)}. Wäre ${cellName(t)} eine ${d}, dann wäre ${cellName(q)} keine, also ${cellName(near)} die ${d}. Dann wären Zeile ${r + 1} und Spalte ${cc + 1} beide belegt, und in Block ${b + 1} bliebe kein Platz für die ${d}. Deshalb fällt die ${d} in ${cellName(t)} weg.`
    };
  }

  function uniqueRect(g, c) {
    for (let r1 = 0; r1 < 9; r1++) for (let r2 = r1 + 1; r2 < 9; r2++) for (let c1 = 0; c1 < 9; c1++) for (let c2 = c1 + 1; c2 < 9; c2++) {
      const sameBand = ((r1 / 3) | 0) === ((r2 / 3) | 0), sameStack = ((c1 / 3) | 0) === ((c2 / 3) | 0);
      if (sameBand === sameStack) continue;
      const q = [r1 * 9 + c1, r1 * 9 + c2, r2 * 9 + c1, r2 * 9 + c2];
      if (q.some(i => g[i])) continue;
      const bv = q.filter(i => POP[c[i]] === 2);
      if (bv.length !== 3 || !bv.every(i => c[i] === c[bv[0]])) continue;
      const m = c[bv[0]], f = q.find(i => !bv.includes(i));
      if ((c[f] & m) !== m) continue;
      const [a, b2] = DIG[m];
      return {
        elims: [{ cell: f, d: a }, { cell: f, d: b2 }], cells: q, digits: [a, b2],
        short: `Suche vier Felder in Rechteckform über genau zwei Blöcke, drei davon mit demselben Kandidatenpaar.`,
        text: `${cellList(q)} bilden ein Rechteck über zwei Blöcke. Drei davon haben nur ${a} und ${b2}. Hätte auch ${cellName(f)} nur diese beiden, könnte man ${a} und ${b2} im Rechteck vertauschen, und das Rätsel hätte zwei Lösungen. Weil es eindeutig ist, kann ${cellName(f)} weder ${a} noch ${b2} sein.`
      };
    }
    return null;
  }

  function simpleColoring(g, c) {
    for (let d = 1; d <= 9; d++) {
      const adj = strongLinks(g, c, d), seen = new Set();
      for (const start of adj.keys()) {
        if (seen.has(start)) continue;
        const col = new Map([[start, 0]]), queue = [start];
        seen.add(start);
        while (queue.length) {
          const n = queue.shift();
          for (const m of adj.get(n)) if (!col.has(m)) { col.set(m, 1 - col.get(n)); seen.add(m); queue.push(m); }
        }
        if (col.size < 3) continue;
        const comp = [...col.keys()], A = comp.filter(i => col.get(i) === 0), Bc = comp.filter(i => col.get(i) === 1);
        const base = { cells: comp, digit: d, colorA: A, colorB: Bc, short: `Färbe die ${d}: Verbinde Felder über Einheiten, in denen die ${d} nur zwei Plätze hat, und färbe abwechselnd.` };
        // Regel 1: gleiche Farbe sieht sich
        for (const [grp, other] of [[A, Bc], [Bc, A]]) {
          let clash = null;
          for (let x = 0; x < grp.length && !clash; x++) for (let y = x + 1; y < grp.length; y++) if (SEES[grp[x]][grp[y]]) { clash = [grp[x], grp[y]]; break; }
          if (clash) {
            const elims = grp.map(i => ({ cell: i, d }));
            return Object.assign(base, {
              elims,
              text: `Für die ${d} lässt sich eine Kette aus Paaren bilden (Einheiten, in denen die ${d} nur zwei Plätze hat). Färbt man die Felder abwechselnd in zwei Farben, ist genau eine Farbe richtig. ${cellName(clash[0])} und ${cellName(clash[1])} haben dieselbe Farbe und sehen sich. Diese Farbe kann also nicht stimmen, und die ${d} fällt in allen ihren Feldern weg: ${cellList(grp)}.`
            });
          }
        }
        // Regel 2: sieht beide Farben
        const elims = [];
        for (let i = 0; i < 81; i++) {
          if (g[i] || !(c[i] & bit(d)) || col.has(i)) continue;
          if (A.some(a => SEES[i][a]) && Bc.some(b => SEES[i][b])) elims.push({ cell: i, d });
        }
        if (elims.length)
          return Object.assign(base, {
            elims,
            text: `Für die ${d} lässt sich eine Kette aus Paaren bilden (Einheiten, in denen die ${d} nur zwei Plätze hat). Färbt man die Felder abwechselnd in zwei Farben, ist eine Farbe komplett richtig. ${cellList(elimCells(elims))} ${elims.length > 1 ? 'sehen' : 'sieht'} Felder beider Farben. Egal welche Farbe stimmt, dort kann keine ${d} stehen.`
          });
      }
    }
    return null;
  }

  function pathFrom(prev, key) { const out = []; while (key !== -1) { out.unshift(key); key = prev.get(key); } return out; }

  function xchain(g, c) {
    let best = null;
    for (let d = 1; d <= 9; d++) {
      const adj = strongLinks(g, c, d);
      const nodes = []; for (let i = 0; i < 81; i++) if (!g[i] && c[i] & bit(d)) nodes.push(i);
      for (const A of adj.keys()) {
        const prev = new Map([[A * 2, -1]]);
        let frontier = [A * 2], depth = 0;
        while (frontier.length && depth < 11) {
          const next = [];
          for (const key of frontier) {
            const n = key >> 1, par = key & 1, path = pathFrom(prev, key).map(k => k >> 1);
            const targets = par === 0 ? [...(adj.get(n) || [])] : nodes.filter(m => m !== n && SEES[n][m]);
            for (const m of targets) {
              const k2 = m * 2 + (par === 0 ? 1 : 0);
              if (prev.has(k2) || path.includes(m)) continue;
              prev.set(k2, key);
              if (par === 0) {
                const chain = [...path, m], strong = (chain.length) / 2;
                if (strong >= 2 && m !== A) {
                  const elims = elimSeeing(g, c, d, [A, m], chain);
                  if (elims.length && (!best || chain.length < best.chain.length)) best = { d, chain, elims };
                }
              }
              next.push(k2);
            }
          }
          frontier = next; depth++;
          if (best && best.chain.length <= depth + 1) break;
        }
      }
      if (best) break;
    }
    if (!best) return null;
    const { d, chain, elims } = best;
    const desc = chain.map((x, k) => cellName(x) + (k < chain.length - 1 ? (k % 2 === 0 ? ' = ' : ' – ') : '')).join('');
    return {
      elims, cells: chain, digit: d,
      short: `Baue für eine Ziffer eine Kette aus abwechselnd starken und schwachen Verbindungen.`,
      text: `Kette für die ${d}: ${desc}. „=“ heißt: In dieser Einheit hat die ${d} nur diese zwei Plätze. „–“ heißt: Die Felder sehen sich. Ist ${cellName(chain[0])} keine ${d}, muss ${cellName(chain[1])} eine sein, dann ist ${cellName(chain[2])} keine, und so weiter bis zum Ende. Also ist ${cellName(chain[0])} oder ${cellName(chain[chain.length - 1])} eine ${d}. Felder, die beide sehen, verlieren die ${d}: ${cellList(elimCells(elims))}.`
    };
  }

  function xychain(g, c) {
    const bv = bivalues(g, c);
    let best = null;
    for (const A of bv) {
      for (const z of DIG[c[A]]) {
        const start = A * 10 + DIG[c[A] & ~bit(z)][0];
        const prev = new Map([[start, -1]]);
        let frontier = [start], depth = 0;
        while (frontier.length && depth < 10) {
          const next = [];
          for (const key of frontier) {
            const n = Math.floor(key / 10), v = key % 10, path = pathFrom(prev, key).map(k => Math.floor(k / 10));
            for (const m of bv) {
              if (!SEES[n][m] || !(c[m] & bit(v)) || path.includes(m)) continue;
              const w = DIG[c[m] & ~bit(v)][0], k2 = m * 10 + w;
              if (prev.has(k2)) continue;
              prev.set(k2, key);
              const chain = [...path, m];
              if (w === z && chain.length >= 3) {
                const elims = elimSeeing(g, c, z, [A, m], chain);
                if (elims.length && (!best || chain.length < best.chain.length)) best = { z, chain, keys: pathFrom(prev, k2), elims };
              }
              next.push(k2);
            }
          }
          frontier = next; depth++;
          if (best && best.chain.length <= depth + 1) break;
        }
      }
    }
    if (!best) return null;
    const { z, chain, keys, elims } = best;
    const steps = keys.map(k => `${cellName(Math.floor(k / 10))} wird ${k % 10}`).join(', ');
    return {
      elims, cells: chain, digit: z, allNotes: true,
      short: `Verbinde Zweier-Felder zu einer Kette, die mit derselben Ziffer beginnt und endet.`,
      text: `Kette aus Zweier-Feldern: Ist ${cellName(chain[0])} keine ${z}, dann folgt: ${steps}. Also ist ${cellName(chain[0])} oder ${cellName(chain[chain.length - 1])} eine ${z}. Felder, die beide sehen, verlieren die ${z}: ${cellList(elimCells(elims))}.`
    };
  }

  // Widerspruchskette: Annahme setzen und nur mit Einern weiterrechnen
  function propagate(g0, c0, cell, d, limit) {
    const g = g0.slice(), c = c0.slice(), steps = [];
    const place = (i, v) => { g[i] = v; c[i] = 0; for (const p of PEERS[i]) c[p] &= ~bit(v); };
    place(cell, d);
    for (let k = 0; k <= limit; k++) {
      for (let i = 0; i < 81; i++) if (!g[i] && !c[i]) return { steps, contra: `In ${cellName(i)} bleibt keine Ziffer übrig.`, at: i };
      let found = null;
      for (let u = 0; u < 27 && !found; u++) {
        for (let v = 1; v <= 9; v++) {
          let n = 0, pos = -1, placed = false;
          for (const i of UNITS[u]) { if (g[i] === v) { placed = true; break; } if (!g[i] && c[i] & bit(v)) { n++; pos = i; } }
          if (placed) continue;
          if (n === 0) return { steps, contra: `In ${unitName(u)} gibt es keinen Platz mehr für die ${v}.`, at: null, unit: u };
          if (n === 1 && !found) found = [pos, v];
        }
      }
      if (!found) for (let i = 0; i < 81; i++) if (!g[i] && POP[c[i]] === 1) { found = [i, DIG[c[i]][0]]; break; }
      if (!found || k === limit) return null;
      steps.push({ cell: found[0], d: found[1] });
      place(found[0], found[1]);
    }
    return null;
  }
  function forcing(g, c) {
    let best = null;
    const order = [];
    for (let i = 0; i < 81; i++) if (!g[i]) order.push(i);
    order.sort((a, b) => POP[c[a]] - POP[c[b]]);
    for (const i of order) {
      for (const d of DIG[c[i]]) {
        const lim = best ? best.r.steps.length - 1 : 30;
        if (lim < 2) break;
        const r = propagate(g, c, i, d, lim);
        if (r && r.steps.length >= 2 && (!best || r.steps.length < best.r.steps.length)) best = { i, d, r };
      }
      if (best && best.r.steps.length <= 3) break;
    }
    if (!best) return null;
    const { i, d, r } = best;
    const shown = r.steps.slice(0, 12).map(s => `${cellName(s.cell)} = ${s.d}`).join(', ') + (r.steps.length > 12 ? ' …' : '');
    return {
      elims: [{ cell: i, d }], cells: [i], digit: d, chainCells: r.steps.map(s => s.cell), contraCell: r.at, contraUnit: r.unit,
      short: `Nimm probeweise eine Ziffer an und rechne nur mit Einern weiter, bis etwas nicht mehr aufgeht.`,
      text: `Angenommen, in ${cellName(i)} stünde die ${d}. ${r.steps.length ? `Dann folgt Schritt für Schritt mit Einern: ${shown}. ` : ''}${r.contra} Das ist ein Widerspruch, also kann die ${d} nicht in ${cellName(i)} stehen.`
    };
  }

  // ================= Technikliste =================
  // tier = Schwierigkeitsrang der Technik, level = Stufe, ab der sie gebraucht wird
  const TECHS = [
    { id: 'hidden1', name: 'Versteckter Einer', tier: 1, fn: hidden1 },
    { id: 'naked1', name: 'Nackter Einer', tier: 2, fn: naked1 },
    { id: 'pointing', name: 'Zeigendes Paar', tier: 3, fn: pointing },
    { id: 'claiming', name: 'Block-Linien-Reduktion', tier: 3, fn: claiming },
    { id: 'naked2', name: 'Nacktes Paar', tier: 4, fn: nakedN(2) },
    { id: 'hidden2', name: 'Verstecktes Paar', tier: 5, fn: hiddenN(2) },
    { id: 'naked3', name: 'Nackter Drilling', tier: 5, fn: nakedN(3) },
    { id: 'hidden3', name: 'Versteckter Drilling', tier: 5, fn: hiddenN(3) },
    { id: 'naked4', name: 'Nackter Vierer', tier: 6, fn: nakedN(4) },
    { id: 'hidden4', name: 'Versteckter Vierer', tier: 6, fn: hiddenN(4) },
    { id: 'xwing', name: 'X-Wing', tier: 6, fn: fish(2) },
    { id: 'skyscraper', name: 'Skyscraper', tier: 6, fn: skyscraper },
    { id: 'kite', name: 'Drachen', tier: 6, fn: kite },
    { id: 'ywing', name: 'Y-Wing', tier: 6, fn: ywing },
    { id: 'xyzwing', name: 'XYZ-Wing', tier: 7, fn: xyzwing },
    { id: 'wwing', name: 'W-Wing', tier: 7, fn: wwing },
    { id: 'swordfish', name: 'Schwertfisch', tier: 7, fn: fish(3) },
    { id: 'emptyrect', name: 'Leeres Rechteck', tier: 7, fn: emptyRect },
    { id: 'uniquerect', name: 'Eindeutiges Rechteck', tier: 7, fn: uniqueRect },
    { id: 'jellyfish', name: 'Qualle', tier: 7, fn: fish(4) },
    { id: 'coloring', name: 'Simple Coloring', tier: 8, fn: simpleColoring },
    { id: 'xchain', name: 'X-Kette', tier: 8, fn: xchain },
    { id: 'xychain', name: 'XY-Kette', tier: 9, fn: xychain },
    { id: 'forcing', name: 'Widerspruchskette', tier: 9, fn: forcing }
  ];
  const TIER_LEVEL = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 8, 8: 9, 9: 10 };
  TECHS.forEach(t => (t.level = TIER_LEVEL[t.tier]));
  const TECH = Object.fromEntries(TECHS.map(t => [t.id, t]));

  function decorate(step, t) {
    step.tech = t.id; step.name = t.name; step.level = t.level; step.tier = t.tier;
    return step;
  }
  function findStep(g, c, maxTier = 99) {
    for (const t of TECHS) {
      if (t.tier > maxTier) break;
      const s = t.fn(g, c);
      if (s) return decorate(s, t);
    }
    return null;
  }
  function applyStep(g, c, s) {
    if (s.place) {
      const { cell, d } = s.place;
      g[cell] = d; c[cell] = 0;
      for (const p of PEERS[cell]) c[p] &= ~bit(d);
    }
    for (const e of s.elims) c[e.cell] &= ~bit(e.d);
  }

  function gradeLevel(used) {
    let maxT = 0; const cnt = {};
    for (const id in used) { const t = TECH[id].tier; cnt[t] = (cnt[t] || 0) + used[id]; if (t > maxT) maxT = t; }
    if (maxT <= 1) return 1;
    if (maxT === 2) return 2;
    if (maxT === 3) return cnt[3] <= 2 ? 3 : 4;
    if (maxT === 4) return 4;
    if (maxT === 5) return 5;
    if (maxT === 6) return cnt[6] === 1 ? 6 : 7;
    return TIER_LEVEL[maxT];
  }

  function solveLogic(puzzle, opts = {}) {
    const g = puzzle.slice(), c = initCands(g);
    const used = {}; let snapshot = null, steps = 0;
    const target = opts.target ? TECH[opts.target] : null;
    while (true) {
      const s = findStep(g, c, opts.maxTier || 99);
      if (!s) break;
      if (target && !snapshot) {
        if (s.tech === target.id) snapshot = { g: g.slice(), c: c.slice(), step: s };
        else if (target.tier >= 3 && s.tier >= 3) {
          const t2 = target.fn(g, c);
          if (t2) snapshot = { g: g.slice(), c: c.slice(), step: decorate(t2, target) };
        }
        if (snapshot && opts.stopAtSnapshot) return { solved: false, snapshot, used };
      }
      used[s.tech] = (used[s.tech] || 0) + 1;
      applyStep(g, c, s);
      if (++steps > 3000) break;
    }
    const solved = g.every(v => v);
    return { solved, used, level: solved ? gradeLevel(used) : 0, snapshot, grid: g };
  }

  // ================= Generator =================
  function countSolutions(p, limit = 2) {
    const a = p.slice(), rm = new Array(9).fill(0), cm = new Array(9).fill(0), bm = new Array(9).fill(0);
    for (let i = 0; i < 81; i++) {
      if (!a[i]) continue;
      const b = bit(a[i]);
      if (rm[R(i)] & b || cm[C(i)] & b || bm[B(i)] & b) return 0;
      rm[R(i)] |= b; cm[C(i)] |= b; bm[B(i)] |= b;
    }
    let count = 0;
    const rec = () => {
      let best = -1, bestM = 0, bestC = 10;
      for (let i = 0; i < 81; i++) {
        if (a[i]) continue;
        const m = ~(rm[R(i)] | cm[C(i)] | bm[B(i)]) & 511, n = POP[m];
        if (n === 0) return;
        if (n < bestC) { bestC = n; best = i; bestM = m; if (n === 1) break; }
      }
      if (best < 0) { count++; return; }
      const r = R(best), cc = C(best), bb = B(best);
      for (const d of DIG[bestM]) {
        const b = bit(d);
        a[best] = d; rm[r] |= b; cm[cc] |= b; bm[bb] |= b;
        rec();
        a[best] = 0; rm[r] &= ~b; cm[cc] &= ~b; bm[bb] &= ~b;
        if (count >= limit) return;
      }
    };
    rec();
    return count;
  }
  const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  function randomFull() {
    const a = new Array(81).fill(0);
    const rec = i => {
      if (i === 81) return true;
      let m = 511;
      for (const p of PEERS[i]) if (a[p]) m &= ~bit(a[p]);
      for (const d of shuffle(DIG[m].slice())) { a[i] = d; if (rec(i + 1)) return true; }
      a[i] = 0; return false;
    };
    rec(0);
    return a;
  }
  // maxTier/floor: für leichte Stufen nur so weit ausdünnen, wie es mit einfachen Techniken lösbar bleibt
  function makePuzzle(maxTier, floor) {
    const sol = randomFull(), p = sol.slice();
    const order = shuffle([...Array(41).keys()]);
    let clues = 81;
    for (const i of order) {
      const j = 80 - i, n = i === j ? 1 : 2;
      if (floor && clues - n < floor) continue;
      const vi = p[i], vj = p[j];
      p[i] = 0; p[j] = 0;
      let ok = countSolutions(p, 2) === 1;
      if (ok && maxTier) ok = solveLogic(p, { maxTier }).solved;
      if (ok) clues -= n; else { p[i] = vi; p[j] = vj; }
    }
    return { puzzle: p, solution: sol };
  }
  const LEVEL_MAKE = { 1: [1, 36], 2: [2, 30] };

  function* levelGen(level) {
    let best = null, attempts = 0;
    while (true) {
      attempts++;
      const mk = LEVEL_MAKE[level] || [0, 0];
      const { puzzle, solution } = makePuzzle(mk[0], mk[1]);
      const r = solveLogic(puzzle);
      if (r.solved) {
        const res = { puzzle, solution, level: r.level, used: r.used, attempts };
        if (r.level === level) return res;
        if (r.level < level && (!best || r.level > best.level)) best = res;
      }
      yield { attempts, best };
    }
  }
  function* lessonGen(tech) {
    let attempts = 0;
    const t = TECH[tech];
    while (true) {
      attempts++;
      const { puzzle, solution } = makePuzzle(t.tier <= 2 ? t.tier : 0, t.tier === 1 ? 36 : t.tier === 2 ? 30 : 0);
      const r = solveLogic(puzzle, { target: tech });
      if (r.snapshot && r.solved) return { puzzle, solution, snapshot: r.snapshot, used: r.used, level: r.level, attempts };
      yield { attempts };
    }
  }
  function runSync(gen, maxMs) {
    const t0 = Date.now(); let last = null;
    while (true) {
      const s = gen.next();
      if (s.done) return s.value;
      last = s.value;
      if (Date.now() - t0 > maxMs) return last && last.best ? Object.assign(last.best, { fallback: true }) : null;
    }
  }
  const generateLevel = (level, ms = 8000) => runSync(levelGen(level), ms);
  const generateLesson = (tech, ms = 15000) => runSync(lessonGen(tech), ms);

  return {
    UNITS, PEERS, SEES, POP, DIG, bit, R, C, B, TECHS, TECH, TIER_LEVEL, unitName, cellName,
    initCands, findStep, applyStep, solveLogic, gradeLevel, countSolutions, makePuzzle, levelGen, lessonGen, generateLevel, generateLesson
  };
}
if (typeof module !== 'undefined') module.exports = SudokuCore;
