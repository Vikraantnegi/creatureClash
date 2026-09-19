export const OUT = '#26201D';
const jit = [1, .93, 1.04, .9, 1, .95, 1.03, .91, .98];
const norm = c => typeof c === 'string' ? { base: c, shade: c, light: c } : c;
const POSE = { neutral: {}, ready: { rot: 8, sx: 1.04, sy: .94 }, victory: { dy: -14, sy: 1.06, sx: .98, eye: 'happy' }, defeated: { rot: -22, sy: .84, sx: 1.05, dy: 4, eye: 'x' } };

function mk(R, st) {
  const stroke = st.sil ? '#111' : OUT, sw = st.faceted ? 3 : 2.4, fillOf = c => st.sil ? '#111' : c;
  const base = extra => Object.assign({ stroke, strokeWidth: sw, strokeLinejoin: 'round' }, extra);
  const poly = (pts, fill, extra) => R('polygon', base(Object.assign({ points: pts.map(p => p.join(',')).join(' '), fill: fillOf(fill) }, extra)));
  const ell = (cx, cy, rx, ry, fill, extra) => R('ellipse', base(Object.assign({ cx, cy, rx, ry, fill: fillOf(fill) }, extra)));
  const facet = (cx, cy, rx, ry, n, rot) => { const pts = []; for (let i = 0; i < n; i++) { const a = rot + i * 2 * Math.PI / n, f = jit[i % jit.length]; pts.push([+(cx + rx * f * Math.cos(a)).toFixed(1), +(cy + ry * f * Math.sin(a)).toFixed(1)]); } return pts; };
  const blob = (cx, cy, rx, ry, col, opt = {}) => {
    col = norm(col); const els = [], tr = opt.tilt ? { transform: `rotate(${opt.tilt} ${cx} ${cy})` } : {};
    if (st.faceted) { const n = opt.n || 7, rot = opt.rot || .4; if (!st.sil) els.push(poly(facet(cx + 2, cy + 4, rx, ry, n, rot), col.shade, Object.assign({ stroke: 'none' }, tr))); els.push(poly(facet(cx, cy, rx, ry, n, rot), col.base, tr)); }
    else { els.push(ell(cx, cy, rx, ry, col.base, tr)); if (!st.sil) els.push(ell(cx - rx * .3, cy - ry * .38, rx * .32, ry * .24, col.light, Object.assign({ stroke: 'none' }, tr))); }
    return els;
  };
  const slab = (x, y, w, h, col, ch) => {
    col = norm(col); const els = [];
    if (st.faceted) { const pts = (dx, dy) => [[x + ch + dx, y + dy], [x + w - ch + dx, y + dy], [x + w + dx, y + ch + dy], [x + w + dx, y + h - ch + dy], [x + w - ch + dx, y + h + dy], [x + ch + dx, y + h + dy], [x + dx, y + h - ch + dy], [x + dx, y + ch + dy]]; if (!st.sil) els.push(poly(pts(2, 4), col.shade, { stroke: 'none' })); els.push(poly(pts(0, 0), col.base)); }
    else { els.push(R('rect', base({ x, y, width: w, height: h, rx: ch, fill: fillOf(col.base) }))); if (!st.sil) els.push(R('rect', { x: x + w * .12, y: y + h * .1, width: w * .3, height: h * .18, rx: ch / 2, fill: col.light })); }
    return els;
  };
  const tri = (pts, fill) => [poly(pts, fill)];
  const limb = (x1, y1, x2, y2, w, fill) => { const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L * w / 2, ny = dx / L * w / 2; return [poly([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]].map(p => [+p[0].toFixed(1), +p[1].toFixed(1)]), fill)]; };
  const eye = (cx, cy, r, state) => {
    if (st.sil) return []; const dark = OUT;
    if (state === 'x') return [R('rect', { x: cx - r, y: cy - r * .22, width: 2 * r, height: r * .44, fill: dark, transform: `rotate(45 ${cx} ${cy})` }), R('rect', { x: cx - r, y: cy - r * .22, width: 2 * r, height: r * .44, fill: dark, transform: `rotate(-45 ${cx} ${cy})` })];
    if (state === 'happy') return [R('ellipse', { cx, cy, rx: r, ry: r * .32, fill: dark, transform: `rotate(-8 ${cx} ${cy})` })];
    const ry = state === 'calm' ? r * .55 : r;
    const white = st.faceted ? R('polygon', { points: `${cx - r},${cy} ${cx},${cy - ry} ${cx + r},${cy} ${cx},${cy + ry}`, fill: '#FFFDF7', stroke: dark, strokeWidth: 1.6, strokeLinejoin: 'round' }) : R('ellipse', { cx, cy, rx: r, ry, fill: '#FFFDF7', stroke: dark, strokeWidth: 1.6 });
    return [white, R('circle', { cx: cx + r * .28, cy: cy + (state === 'calm' ? r * .1 : 0), r: r * .42, fill: dark })];
  };
  return { blob, slab, tri, limb, eye };
}

export const SPECIES = {
  ashkit: { name: 'Ashkit', type: 'Fire', base: { atk: 9, def: 3, spd: 9, spc: 5 }, eye: 'open', foot: 34, crop: [104, 48, 66, 66],
    col: { base: '#E8672C', shade: '#B5401A', light: '#F6A25B', accent: '#F9D24A' }, poses: { ready: { rot: 14, sy: .9, sx: 1.08 }, victory: { dy: -18, sy: 1.08 } },
    draw: (h, C, e) => [].concat(h.tri([[62, 118], [30, 88], [74, 100]], C.accent), h.tri([[64, 116], [46, 100], [72, 106]], C.light), h.limb(78, 140, 68, 170, 5, C.shade), h.limb(104, 142, 100, 170, 5, C.shade), h.blob(92, 126, 32, 19, C, { tilt: -14 }), h.limb(84, 142, 76, 170, 5, C.base), h.limb(110, 144, 118, 170, 5, C.base), h.blob(128, 100, 20, 16, C, { n: 6 }), h.tri([[116, 88], [122, 58], [132, 86]], C.accent), h.tri([[130, 84], [140, 52], [146, 86]], C.accent), h.tri([[144, 90], [158, 68], [156, 96]], C.accent), h.tri([[146, 100], [162, 106], [146, 112]], C.shade), h.eye(136, 98, 4.5, e)) },
  brookfin: { name: 'Brookfin', type: 'Water', base: { atk: 5, def: 5, spd: 3, spc: 9 }, eye: 'calm', foot: 42, crop: [64, 30, 72, 72],
    col: { base: '#3D82B8', shade: '#25598A', light: '#9AD0EA', accent: '#6FC7CF' }, poses: { ready: { rot: 3, sy: 1.03, sx: 1.02 }, victory: { dy: -8, sy: 1.1, sx: .97 }, defeated: { rot: -16, sy: .82, sx: 1.08, dy: 4 } },
    draw: (h, C, e) => [].concat(h.tri([[70, 118], [42, 142], [76, 136]], C.accent), h.tri([[130, 116], [158, 140], [126, 134]], C.accent), h.blob(100, 160, 40, 12, { base: C.shade, shade: C.shade, light: C.base }, { n: 8 }), h.blob(100, 138, 34, 30, C, { n: 8 }), h.blob(100, 106, 28, 40, C, { n: 8 }), h.blob(104, 122, 15, 26, { base: C.light, shade: C.light, light: '#FFFFFF' }, { n: 6 }), h.tri([[94, 72], [100, 28], [108, 74]], C.accent), h.tri([[106, 74], [124, 44], [114, 80]], C.accent), h.eye(92, 94, 4.5, e), h.eye(110, 94, 4.5, e)) },
  slate: { name: 'Slate', type: 'Rock', base: { atk: 6, def: 6, spd: 5, spc: 5 }, eye: 'open', foot: 52, crop: [112, 78, 60, 60],
    col: { base: '#8E8A85', shade: '#5E5A57', light: '#C4BFB8', accent: '#6E7C86' }, poses: { ready: { rot: 4, sy: .96, sx: 1.06 }, victory: { dy: -10, sy: 1.04 }, defeated: { rot: -12, sy: .86, sx: 1.06, dy: 4 } },
    draw: (h, C, e) => [].concat(h.slab(44, 116, 16, 12, C.shade, 3), h.slab(64, 148, 16, 22, C.shade, 3), h.slab(112, 148, 16, 22, C.shade, 3), h.tri([[70, 106], [78, 92], [86, 106]], C.accent), h.tri([[90, 106], [99, 86], [108, 106]], C.accent), h.tri([[112, 106], [120, 93], [128, 106]], C.accent), h.slab(58, 104, 84, 50, C, 10), h.slab(76, 150, 16, 20, C, 3), h.slab(126, 150, 16, 20, C, 3), h.slab(122, 92, 40, 36, C, 8), h.slab(150, 116, 12, 5, C.shade, 1), h.eye(150, 106, 4, e)) },
  fernlet: { name: 'Fernlet', type: 'Grass', base: { atk: 5, def: 8, spd: 3, spc: 8 }, eye: 'open', foot: 54, crop: [72, 100, 66, 66],
    col: { base: '#8DBE62', shade: '#5E8F3F', light: '#C6E3A6', accent: '#3F7A30', cap: { base: '#4E8F3C', shade: '#2F6B2A', light: '#7CB35A' } }, poses: { ready: { rot: 0, sy: .9, sx: 1.08, dy: 2 }, victory: { dy: -8, sy: 1.06 }, defeated: { rot: -14, sy: .86, sx: 1.06, dy: 4 } },
    draw: (h, C, e) => [].concat(h.blob(102, 150, 30, 20, C, { n: 8 }), h.slab(80, 162, 14, 8, C.shade, 3), h.slab(108, 162, 14, 8, C.shade, 3), h.eye(108, 146, 4, e), h.eye(122, 146, 4, e), [50, 72, 94, 116].flatMap(x => h.tri([[x, 118], [x + 11, 136], [x + 22, 118]], C.accent)), h.blob(100, 104, 54, 32, C.cap, { n: 9 }), h.tri([[94, 76], [100, 48], [106, 78]], C.base), h.tri([[100, 66], [120, 56], [104, 74]], C.base)) },
  voltik: { name: 'Voltik', type: 'Electric', base: { atk: 5, def: 3, spd: 9, spc: 6 }, eye: 'open', foot: 26, crop: [60, 12, 80, 80],
    col: { base: '#F2C83B', shade: '#C99A1D', light: '#FBE58A', accent: '#6B4FBF' }, poses: { ready: { rot: 12, sx: .96, sy: 1.04, dy: -6 }, victory: { dy: -24, sy: 1.08, sx: .96 }, defeated: { rot: -24, sy: .8, sx: 1.06, dy: 6 } },
    draw: (h, C, e) => [].concat(h.tri([[88, 132], [58, 148], [72, 126]], C.accent), h.limb(94, 146, 80, 158, 4, C.shade), h.limb(80, 158, 90, 170, 4, C.shade), h.limb(106, 146, 120, 158, 4, C.base), h.limb(120, 158, 112, 170, 4, C.base), h.limb(90, 116, 70, 104, 3.5, C.base), h.limb(110, 116, 130, 100, 3.5, C.base), h.blob(100, 122, 14, 28, C, { n: 6 }), h.tri([[90, 66], [76, 18], [100, 68]], C.base), h.tri([[102, 68], [128, 24], [112, 66]], C.base), h.tri([[82, 40], [76, 18], [91, 38]], C.accent), h.tri([[119, 40], [128, 24], [123, 38]], C.accent), h.blob(100, 80, 18, 15, C, { n: 6 }), h.eye(95, 80, 5.5, e), h.eye(109, 80, 5.5, e)) },
  emberhorn: { name: 'Emberhorn', type: 'Fire', base: { atk: 8, def: 8, spd: 3, spc: 5 }, eye: 'open', foot: 62, crop: [116, 58, 74, 74],
    col: { base: '#A23E30', shade: '#6B231C', light: '#CC6E52', accent: '#F08A2E', horn: '#2E2624' }, poses: { ready: { rot: 10, sy: .94, sx: 1.06, dy: 2 }, victory: { dy: -8, sy: 1.05, rot: -6 }, defeated: { rot: -14, sy: .9, sx: 1.05, dy: 4 } },
    draw: (h, C, e) => [].concat(h.slab(42, 124, 16, 10, C.shade, 3), h.slab(60, 152, 18, 18, C.shade, 4), h.slab(118, 148, 20, 22, C.shade, 4), h.tri([[66, 112], [74, 98], [82, 112]], C.accent), h.tri([[86, 108], [94, 94], [102, 108]], C.accent), h.tri([[106, 106], [112, 96], [118, 106]], C.accent), h.blob(92, 136, 48, 28, C, { n: 8 }), h.blob(124, 128, 34, 30, C, { n: 8 }), h.slab(72, 154, 18, 16, C, 4), h.slab(140, 148, 20, 22, C, 4), h.tri([[138, 112], [110, 62], [154, 110]], C.horn), h.tri([[156, 110], [184, 66], [168, 112]], C.horn), h.blob(150, 128, 24, 18, C, { n: 6 }), h.slab(164, 130, 14, 10, C.shade, 3), h.slab(148, 114, 16, 4, C.shade, 1), h.eye(156, 122, 3.5, e)) }
};

export function draw(R, key, st = { faceted: true }, poseName = 'neutral', opts = {}) {
  const spec = SPECIES[key]; if (!spec) return null;
  const h = mk(R, st);
  const p = Object.assign({}, POSE[poseName] || {}, (spec.poses || {})[poseName] || {});
  const e = p.eye || spec.eye;
  const t = `translate(100 170) rotate(${p.rot || 0}) scale(${p.sx || 1} ${p.sy || 1}) translate(-100 ${-170 + (p.dy || 0)})`;
  const view = opts.portrait ? spec.crop.join(' ') : '0 0 200 200';
  return R('svg', { viewBox: view, width: '100%', height: '100%', style: { display: 'block', overflow: 'visible', transform: opts.mirror ? 'scaleX(-1)' : 'none' } },
    (!st.sil && !opts.portrait && opts.ground !== false) ? R('ellipse', { cx: 100, cy: 172, rx: spec.foot * (p.sx || 1), ry: 5, fill: 'rgba(30,20,10,.14)' }) : null,
    R('g', { transform: t }, ...spec.draw(h, spec.col, e)));
}
