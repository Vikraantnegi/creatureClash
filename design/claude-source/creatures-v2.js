// Creature Clash — character development pass 2. Faceted style, shared lighting + face construction.
export const OUT = '#26201D';
const jit = [1, .93, 1.04, .9, 1, .95, 1.03, .91, .98];
const norm = c => typeof c === 'string' ? { base: c, shade: c, light: c } : c;
const TAU = Math.PI * 2;
const MOOD = { neutral: {}, confident: { dy: -6, sy: 1.04, rot: -4 }, defeated: { rot: -14, sy: .86, sx: 1.05, dy: 4 } };

function mk(R, st) {
  const sil = !!st.sil, SW = 3;
  const P = (pts, fill, extra) => R('polygon', Object.assign({ points: pts.map(p => p.join(',')).join(' '), fill, stroke: 'none', strokeLinejoin: 'round' }, extra));
  const shaded = (pts, cx, cy, col, tr = {}) => {
    col = norm(col);
    if (sil) return [P(pts, '#111', Object.assign({ stroke: '#111', strokeWidth: SW }, tr))];
    const ang = p => Math.atan2(p[1] - cy, p[0] - cx);
    const ins = (p, k) => [+(cx + (p[0] - cx) * k).toFixed(1), +(cy + (p[1] - cy) * k).toFixed(1)];
    const arc = (from, span) => pts.filter(p => ((ang(p) - from + TAU) % TAU) < span).sort((a, b) => ((ang(a) - from + TAU) % TAU) - ((ang(b) - from + TAU) % TAU));
    const lo = arc(-Math.PI / 6, Math.PI * .95), hi = arc(Math.PI * .9, Math.PI * .62);
    const els = [P(pts, col.base, tr)];
    if (lo.length >= 2) els.push(P([[cx, cy], ...lo.map(p => ins(p, .92))], col.shade, tr));
    if (hi.length >= 2) els.push(P([[cx, cy], ...hi.map(p => ins(p, .55))], col.light, tr));
    els.push(P(pts, 'none', Object.assign({ stroke: OUT, strokeWidth: SW }, tr)));
    return els;
  };
  const facet = (cx, cy, rx, ry, n, rot) => { const o = []; for (let i = 0; i < n; i++) { const a = rot + i * TAU / n, f = jit[i % jit.length]; o.push([+(cx + rx * f * Math.cos(a)).toFixed(1), +(cy + ry * f * Math.sin(a)).toFixed(1)]); } return o; };
  const vol = (cx, cy, rx, ry, col, o = {}) => {
    const pts = facet(cx, cy, rx, ry, o.n || 7, o.rot == null ? .4 : o.rot), tr = o.tilt ? { transform: `rotate(${o.tilt} ${cx} ${cy})` } : {};
    if (o.flat) return sil ? [] : [P(pts, norm(col).base, tr)];
    return shaded(pts, cx, cy, col, tr);
  };
  const slab = (x, y, w, h, col, ch) => shaded([[x + ch, y], [x + w - ch, y], [x + w, y + ch], [x + w, y + h - ch], [x + w - ch, y + h], [x + ch, y + h], [x, y + h - ch], [x, y + ch]], x + w / 2, y + h / 2, col);
  const tri = (pts, fill) => [P(pts, sil ? '#111' : fill, { stroke: sil ? '#111' : OUT, strokeWidth: SW })];
  const limb = (x1, y1, x2, y2, w, col) => { const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L * w / 2, ny = dx / L * w / 2; return shaded([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]].map(p => [+p[0].toFixed(1), +p[1].toFixed(1)]), (x1 + x2) / 2, (y1 + y2) / 2, col); };
  // Face kit — every creature uses the same three parts: eye (white + pupil), brow slab, mouth line.
  const eye = (cx, cy, r, m, o = {}) => {
    if (sil) return [];
    if (m === 'defeated') return [R('polygon', { points: `${cx - r},${cy - 1.6} ${cx + r},${cy + .2} ${cx + r},${cy + 3.4} ${cx - r},${cy + 1.6}`, fill: OUT })];
    let ay = o.ay || 1; if (m === 'confident') ay *= .72;
    const ry = r * ay, st = o.style || 'diamond', ps = (o.ps || .42) * r;
    let white;
    if (st === 'square') white = R('rect', { x: cx - r, y: cy - ry, width: 2 * r, height: 2 * ry, fill: '#FFFDF7', stroke: OUT, strokeWidth: 1.8 });
    else if (st === 'round') white = R('polygon', { points: facet(cx, cy, r, ry, 8, Math.PI / 8).map(p => p.join(',')).join(' '), fill: '#FFFDF7', stroke: OUT, strokeWidth: 1.8, strokeLinejoin: 'round' });
    else white = R('polygon', { points: `${cx - r},${cy} ${cx},${cy - ry} ${cx + r},${cy} ${cx},${cy + ry}`, fill: '#FFFDF7', stroke: OUT, strokeWidth: 1.8, strokeLinejoin: 'round' });
    const px = cx + r * .3, py = cy + (o.lid ? ry * .28 : 0);
    const els = [white];
    if (o.lid) { const k = m === 'confident' ? .6 : .42; els.push(R('polygon', { points: `${cx - r - 1},${cy - ry - 1} ${cx + r + 1},${cy - ry - 1} ${cx + r + 1},${cy - ry + 2 * ry * k} ${cx - r - 1},${cy - ry + 2 * ry * k}`, fill: o.lid }), R('polygon', { points: `${cx - r},${cy - ry + 2 * ry * k} ${cx + r},${cy - ry + 2 * ry * k} ${cx + r},${cy - ry + 2 * ry * k + 1.8} ${cx - r},${cy - ry + 2 * ry * k + 1.8}`, fill: OUT })); }
    els.push(R('rect', { x: px - ps, y: py - ps, width: 2 * ps, height: 2 * ps, fill: OUT, transform: `rotate(45 ${px} ${py})` }));
    return els;
  };
  const brow = (cx, cy, len, ang, m, dir = 1, th = 3.2) => {
    if (sil) return [];
    const a = (ang + (m === 'confident' ? 14 : m === 'defeated' ? -18 : 0)) * dir;
    return [R('rect', { x: cx - len / 2, y: cy - th / 2, width: len, height: th, rx: 1, fill: OUT, transform: `rotate(${a} ${cx} ${cy})` })];
  };
  const mouth = (x, y, w, m, o = {}) => {
    if (sil) return [];
    const dy = m === 'confident' ? -w * .42 : m === 'defeated' ? w * .45 : 0, th = o.th || 2.6;
    const els = [R('polygon', { points: `${x},${y - th / 2} ${x + w},${y + dy - th / 2} ${x + w},${y + dy + th / 2} ${x},${y + th / 2}`, fill: OUT })];
    if (o.open && m !== 'defeated') els.push(R('polygon', { points: `${x + 1},${y + th / 2} ${x + w - 1},${y + dy + th / 2} ${x + w * .45},${y + th / 2 + w * .5}`, fill: OUT }), R('polygon', { points: `${x + w * .18},${y + th / 2} ${x + w * .36},${y + th / 2} ${x + w * .27},${y + th / 2 + w * .28}`, fill: '#FFFDF7' }));
    return els;
  };
  return { vol, slab, tri, limb, eye, brow, mouth };
}

export const SPECIES = {
  ashkit: { name: 'Ashkit', type: 'Fire', foot: 36, crop: [106, 62, 64, 64], eyeStyle: 'narrow diamond, one eye, brow pitched forward, open jaw',
    col: { base: '#E8672C', shade: '#B5401A', light: '#F6A25B', accent: '#F9D24A' },
    moods: { confident: { dy: -10, sy: 1.06, rot: -6 }, defeated: { rot: -18, sy: .84, sx: 1.06, dy: 4 } },
    draw: (h, C, m) => [].concat(
      h.tri([[62, 118], [30, 88], [74, 100]], C.accent), h.tri([[64, 116], [46, 100], [72, 106]], C.light),
      h.limb(78, 140, 66, 166, 8, C.shade), h.limb(104, 142, 98, 166, 8, C.shade), h.slab(58, 163, 17, 7, C.shade, 2), h.slab(90, 163, 17, 7, C.shade, 2),
      h.vol(92, 126, 32, 19, C, { tilt: -14 }),
      h.limb(84, 142, 74, 166, 8, C.base), h.limb(110, 144, 118, 166, 8, C.base), h.slab(66, 163, 17, 7, C.base, 2), h.slab(110, 163, 17, 7, C.base, 2),
      h.vol(128, 100, 21, 17, C, { n: 6 }),
      h.tri([[116, 88], [122, 58], [132, 86]], C.accent), h.tri([[130, 84], [140, 52], [146, 86]], C.accent), h.tri([[144, 90], [158, 68], [156, 96]], C.accent),
      h.tri([[146, 98], [165, 106], [146, 115]], C.base),
      h.mouth(149, 108, 11, m, { open: true }), h.eye(136, 97, 5, m, { ay: .75 }), h.brow(134, 87, 12, 10, m)) },
  brookfin: { name: 'Brookfin', type: 'Water', foot: 42, crop: [64, 42, 72, 72], eyeStyle: 'two lidded diamonds, level brows, small closed mouth',
    col: { base: '#3D82B8', shade: '#25598A', light: '#9AD0EA', accent: '#6FC7CF' },
    moods: { confident: { dy: -4, sy: 1.08, sx: .97, rot: 0 }, defeated: { rot: -10, sy: .8, sx: 1.1, dy: 4 } },
    draw: (h, C, m) => [].concat(
      h.tri([[70, 118], [40, 144], [76, 138]], C.accent), h.tri([[130, 116], [160, 142], [126, 136]], C.accent),
      h.vol(100, 160, 40, 12, { base: C.shade, shade: C.shade, light: C.base }, { n: 8 }),
      h.vol(100, 138, 34, 30, C, { n: 8 }), h.vol(100, 106, 28, 40, C, { n: 8 }),
      h.vol(104, 124, 15, 26, { base: C.light, shade: C.light, light: '#FFFFFF' }, { n: 6 }),
      h.tri([[94, 72], [100, 28], [108, 74]], C.accent), h.tri([[106, 74], [124, 44], [114, 80]], C.accent),
      h.eye(90, 94, 5, m, { lid: C.base }), h.eye(111, 94, 5, m, { lid: C.base }), h.brow(89, 84, 10, 4, m, -1), h.brow(112, 84, 10, 4, m, 1), h.mouth(97, 110, 7, m)) },
  slate: { name: 'Slate', type: 'Rock', foot: 50, crop: [106, 72, 64, 64], eyeStyle: 'square eye, flat brow, straight mouth — the calmest face',
    col: { base: '#8E8A85', shade: '#5E5A57', light: '#C4BFB8', accent: '#6E7C86' },
    moods: { confident: { dy: -6, sy: 1.04, rot: -3 }, defeated: { rot: -12, sy: .86, sx: 1.05, dy: 4 } },
    draw: (h, C, m) => [].concat(
      h.limb(64, 124, 42, 112, 9, C.shade), h.vol(40, 110, 7, 6, C.shade, { n: 5 }),
      h.limb(76, 138, 66, 166, 9, C.shade), h.limb(116, 140, 124, 166, 9, C.shade), h.slab(57, 163, 18, 7, C.shade, 2), h.slab(115, 163, 18, 7, C.shade, 2),
      h.vol(96, 126, 36, 22, C, { n: 8, rot: .2 }),
      h.vol(82, 124, 6, 5, C.accent, { n: 5, flat: true }), h.vol(96, 134, 5, 4, C.accent, { n: 5, flat: true }),
      h.limb(84, 142, 78, 166, 9, C.base), h.limb(110, 142, 116, 166, 9, C.base), h.slab(69, 163, 18, 7, C.base, 2), h.slab(107, 163, 18, 7, C.base, 2),
      h.limb(120, 112, 130, 102, 12, C.base),
      h.vol(134, 98, 22, 17, C, { n: 6, rot: .3 }),
      h.eye(140, 95, 4.5, m, { style: 'square' }), h.brow(139, 86, 12, 0, m), h.mouth(146, 106, 9, m)) },
  fernlet: { name: 'Fernlet', type: 'Grass', foot: 54, crop: [70, 108, 66, 66], eyeStyle: 'two round eyes set wide, short brows under the rim, small mouth',
    col: { base: '#8DBE62', shade: '#5E8F3F', light: '#C6E3A6', accent: '#3F7A30', cap: { base: '#4E8F3C', shade: '#2F6B2A', light: '#7CB35A' } },
    moods: { confident: { dy: -6, sy: 1.05 }, defeated: { rot: -10, sy: .86, sx: 1.06, dy: 4 } },
    draw: (h, C, m) => [].concat(
      h.vol(102, 150, 30, 20, C, { n: 8 }),
      h.slab(80, 163, 15, 7, C.shade, 2), h.slab(108, 163, 15, 7, C.shade, 2),
      h.eye(107, 147, 5, m, { style: 'round' }), h.eye(122, 147, 5, m, { style: 'round' }), h.brow(106, 139, 8, 0, m, -1), h.brow(123, 139, 8, 0, m, 1), h.mouth(111, 157, 7, m),
      [50, 72, 94, 116].flatMap(x => h.tri([[x, 118], [x + 11, 136], [x + 22, 118]], C.accent)),
      h.vol(100, 104, 54, 32, C.cap, { n: 9 }),
      h.tri([[94, 76], [100, 48], [106, 78]], C.base), h.tri([[100, 66], [120, 56], [104, 74]], C.base)) },
  voltik: { name: 'Voltik', type: 'Electric', foot: 32, crop: [108, 46, 70, 70], eyeStyle: 'largest eye, smallest pupil, brow held high — permanently startled',
    col: { base: '#E6EDF1', shade: '#A9B9C6', light: '#FFFFFF', accent: '#2FC9DC', mark: '#2F3568' },
    moods: { confident: { dy: -14, sy: 1.06, sx: .97, rot: -4 }, defeated: { rot: -16, sy: .8, sx: 1.06, dy: 6 } },
    draw: (h, C, m) => [].concat(
      h.limb(78, 112, 56, 90, 7, C.mark), h.vol(52, 86, 9, 9, { base: C.accent, shade: C.accent, light: C.light }, { n: 4, rot: 0 }),
      h.limb(94, 124, 82, 146, 8, C.mark), h.limb(82, 146, 88, 166, 8, C.mark), h.slab(80, 163, 17, 7, C.mark, 2),
      h.vol(100, 114, 30, 18, C, { n: 7, tilt: -10 }),
      h.limb(108, 124, 122, 146, 8, C.mark), h.limb(122, 146, 116, 166, 8, C.mark), h.slab(108, 163, 17, 7, C.mark, 2),
      h.tri([[112, 96], [86, 72], [120, 104]], C.accent), h.tri([[108, 104], [78, 94], [114, 112]], C.accent),
      h.limb(118, 106, 130, 86, 13, C.base),
      h.vol(136, 76, 19, 16, C, { n: 6 }),
      h.tri([[152, 72], [170, 79], [152, 86]], C.mark),
      h.eye(138, 74, 7, m, { ps: .3 }), h.brow(136, 62, 12, -8, m)) },
  emberhorn: { name: 'Emberhorn', type: 'Fire', foot: 62, crop: [126, 90, 62, 62], eyeStyle: 'smallest eye under a heavy brow slab, nostril, mouth set low',
    col: { base: '#A23E30', shade: '#6B231C', light: '#CC6E52', accent: '#F08A2E', horn: '#2E2624' },
    moods: { confident: { rot: -8, dy: -4, sy: 1.04 }, defeated: { rot: -12, sy: .9, sx: 1.05, dy: 4 } },
    draw: (h, C, m) => [].concat(
      h.slab(42, 124, 16, 10, C.shade, 3),
      h.slab(60, 152, 18, 18, C.shade, 4), h.slab(118, 148, 20, 22, C.shade, 4),
      h.tri([[66, 112], [74, 98], [82, 112]], C.accent), h.tri([[86, 108], [94, 94], [102, 108]], C.accent), h.tri([[106, 106], [112, 96], [118, 106]], C.accent),
      h.vol(92, 136, 48, 28, C, { n: 8 }), h.vol(124, 128, 34, 30, C, { n: 8 }),
      h.slab(72, 154, 18, 16, C, 4), h.slab(140, 148, 20, 22, C, 4),
      h.tri([[138, 112], [110, 62], [154, 110]], C.horn), h.tri([[156, 110], [184, 66], [168, 112]], C.horn),
      h.vol(150, 128, 24, 18, C, { n: 6 }),
      h.slab(164, 130, 14, 10, C.shade, 3),
      h.brow(155, 113, 16, 8, m, 1, 4.5), h.eye(157, 122, 3.8, m, { ps: .5 }), h.mouth(165, 139, 9, m),
      m && !h.sil ? h.vol(176, 133, 1.8, 1.8, OUT, { n: 4, rot: 0, flat: true }) : []) }
};

export function draw(R, key, o = {}) {
  const s = SPECIES[key]; if (!s) return null;
  const h = mk(R, { sil: o.sil }); h.sil = !!o.sil;
  const m = o.mood || 'neutral';
  const p = Object.assign({}, MOOD[m] || {}, (s.moods || {})[m] || {});
  const t = `translate(100 170) rotate(${p.rot || 0}) scale(${p.sx || 1} ${p.sy || 1}) translate(-100 ${-170 + (p.dy || 0)})`;
  return R('svg', { viewBox: o.portrait ? s.crop.join(' ') : '0 0 200 200', width: '100%', height: '100%', style: { display: 'block', overflow: 'visible', transform: o.mirror ? 'scaleX(-1)' : 'none' } },
    (!o.sil && !o.portrait && o.ground !== false) ? R('ellipse', { cx: 100, cy: 172, rx: s.foot * (p.sx || 1), ry: 5, fill: 'rgba(30,20,10,.14)' }) : null,
    R('g', { transform: t }, ...s.draw(h, s.col, m)));
}
