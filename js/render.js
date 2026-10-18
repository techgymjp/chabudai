// 描画パーツ。親父・ちゃぶ台・食器はメートル単位・y軸上向きのローカル座標で描く
const lerp = (a, b, t) => a + (b - a) * t;
const lerpP = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];

const OUT = '#3b2416';
const SKIN = '#f1c28f';
const SKIN_D = '#d9a46e';
export const FONT = '"Dela Gothic One", "Hiragino Sans", "Noto Sans JP", sans-serif';

export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ell(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

function hash(a, b) {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

/* ---------------- ハゲ親父 ---------------- */

// 正座で構えた姿勢 (P0) → 立ち上がってちゃぶ台を返した姿勢 (P1)
const P0 = { hip: [0, 0.42], kneeF: [0.3, 0.1], ankleF: [-0.1, 0.05], toeF: [-0.2, 0.04], kneeB: [0.27, 0.11], ankleB: [-0.12, 0.06], toeB: [-0.22, 0.05], lean: 0.38 };
const P1 = { hip: [0.02, 0.8], kneeF: [0.24, 0.45], ankleF: [0.2, 0.06], toeF: [0.33, 0.03], kneeB: [-0.08, 0.43], ankleB: [-0.24, 0.07], toeB: [-0.34, 0.03], lean: -0.18 };
export const DAD_HANDS_UP = [0.36, 1.72];

function stroke2(ctx, w, color) {
  ctx.strokeStyle = OUT;
  ctx.lineWidth = w + 0.028;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}

function polyline(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
}

function leg(ctx, hip, knee, ankle, toe, color) {
  polyline(ctx, [hip, knee, ankle]);
  stroke2(ctx, 0.15, color);
  // 素足
  ctx.save();
  ctx.translate(ankle[0], ankle[1]);
  ctx.rotate(Math.atan2(toe[1] - ankle[1], toe[0] - ankle[0]));
  ell(ctx, 0.06, 0, 0.09, 0.04);
  ctx.fillStyle = SKIN;
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.015;
  ctx.stroke();
  ctx.restore();
}

function arm(ctx, sh, target, color) {
  const l1 = 0.3, l2 = 0.3;
  let dx = target[0] - sh[0], dy = target[1] - sh[1];
  let d = Math.hypot(dx, dy);
  let hand = target;
  if (d > l1 + l2 - 1e-3) {
    const s = (l1 + l2 - 1e-3) / d;
    hand = [sh[0] + dx * s, sh[1] + dy * s];
    d = l1 + l2 - 1e-3;
  }
  const a = Math.atan2(dy, dx);
  const A = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const elbow = [sh[0] + Math.cos(a - A) * l1, sh[1] + Math.sin(a - A) * l1];
  polyline(ctx, [sh, elbow, hand]);
  stroke2(ctx, 0.085, color);
  ell(ctx, hand[0], hand[1], 0.055, 0.055);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.015;
  ctx.stroke();
}

function torso(ctx, hip, lean) {
  ctx.save();
  ctx.translate(hip[0], hip[1]);
  ctx.rotate(-lean);
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(-0.12, 0.0);
    ctx.lineTo(-0.11, 0.5);
    ctx.quadraticCurveTo(-0.05, 0.6, 0.06, 0.56);
    ctx.quadraticCurveTo(0.16, 0.45, 0.17, 0.32);
    ctx.quadraticCurveTo(0.27, 0.18, 0.15, 0.02);
    ctx.quadraticCurveTo(0.02, -0.05, -0.12, 0.0);
    ctx.closePath();
  };
  // ランニングシャツ
  path();
  ctx.fillStyle = '#f8f8f2';
  ctx.fill();
  // 腹巻
  ctx.save();
  path();
  ctx.clip();
  ctx.fillStyle = '#c99c2e';
  ctx.fillRect(-0.3, -0.1, 0.7, 0.32);
  ctx.strokeStyle = '#8a6614';
  ctx.lineWidth = 0.012;
  for (const y of [0.05, 0.1, 0.15]) {
    ctx.beginPath();
    ctx.moveTo(-0.3, y);
    ctx.lineTo(0.4, y);
    ctx.stroke();
  }
  ctx.restore();
  path();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.02;
  ctx.stroke();
  ctx.restore();
}

function angerMark(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#e0202a';
  ctx.lineWidth = s * 0.35;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(s * 0.25, s);
    ctx.quadraticCurveTo(s * 0.25, s * 0.25, s, s * 0.25);
    ctx.stroke();
    ctx.rotate(Math.PI / 2);
  }
  ctx.restore();
}

function head(ctx, c, ang, o) {
  ctx.save();
  ctx.translate(c[0], c[1]);
  ctx.rotate(-ang);
  const r = 0.14;
  ell(ctx, 0, 0, r, r);
  ctx.fillStyle = SKIN;
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.018;
  ctx.stroke();
  // 後頭部にだけ残った白髪
  ctx.beginPath();
  ctx.arc(0, 0, r - 0.004, Math.PI * 0.78, Math.PI * 1.22);
  ctx.strokeStyle = '#a9a9a9';
  ctx.lineWidth = 0.04;
  ctx.stroke();
  // 耳
  ell(ctx, -0.015, -0.015, 0.032, 0.042);
  ctx.fillStyle = SKIN;
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.014;
  ctx.stroke();
  // ハゲの輝き
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#fff';
  ell(ctx, 0.03, 0.088, 0.05, 0.02, 0.35);
  ctx.fill();
  ell(ctx, -0.035, 0.105, 0.012, 0.012);
  ctx.fill();
  ctx.restore();
  // 怒り眉
  ctx.strokeStyle = '#2b2b2b';
  ctx.lineWidth = 0.026;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0.035, 0.055);
  ctx.lineTo(0.12, 0.025);
  ctx.stroke();
  // 目
  ctx.lineWidth = 0.014;
  if (o.shout) {
    ctx.beginPath();
    ctx.moveTo(0.06, 0.012);
    ctx.lineTo(0.105, 0.0);
    ctx.stroke();
  } else {
    ell(ctx, 0.088, 0.006, 0.013, 0.016);
    ctx.fillStyle = '#222';
    ctx.fill();
  }
  // 赤ら顔
  if (o.shout) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    ell(ctx, 0.06, -0.04, 0.035, 0.022);
    ctx.fillStyle = '#ff5a5a';
    ctx.fill();
    ctx.restore();
  }
  // 鼻
  ell(ctx, 0.14, -0.015, 0.028, 0.028);
  ctx.fillStyle = SKIN_D;
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.012;
  ctx.stroke();
  // 口
  if (o.shout) {
    ell(ctx, 0.11, -0.098, 0.034, 0.03);
    ctx.fillStyle = '#7a1d1d';
    ctx.fill();
    ell(ctx, 0.11, -0.115, 0.018, 0.01);
    ctx.fillStyle = '#e66';
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(0.08, -0.095);
    ctx.lineTo(0.13, -0.09);
    ctx.strokeStyle = '#4a2a1a';
    ctx.lineWidth = 0.012;
    ctx.stroke();
  }
  // ヒゲ
  ctx.beginPath();
  ctx.moveTo(0.045, -0.055);
  ctx.quadraticCurveTo(0.1, -0.025, 0.17, -0.05);
  ctx.quadraticCurveTo(0.12, -0.08, 0.045, -0.055);
  ctx.fillStyle = '#2b2b2b';
  ctx.fill();
  if (o.angry) angerMark(ctx, -0.02, 0.17, 0.04);
  ctx.restore();
}

// p: 0=正座で構え, 1=立ち上がって両手を振り上げた姿勢 / hands: 手の目標位置
export function drawDad(ctx, p, hands, o = {}) {
  const q = {};
  for (const k in P0) q[k] = Array.isArray(P0[k]) ? lerpP(P0[k], P1[k], p) : lerp(P0[k], P1[k], p);
  const lean = q.lean;
  const sp = [Math.sin(lean), Math.cos(lean)];
  const hip = q.hip;
  const sh = [hip[0] + sp[0] * 0.5, hip[1] + sp[1] * 0.5];
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  arm(ctx, [sh[0] - 0.03, sh[1]], [hands[0] - 0.05, hands[1] + 0.02], SKIN_D);
  leg(ctx, hip, q.kneeB, q.ankleB, q.toeB, '#d6c9a8');
  leg(ctx, hip, q.kneeF, q.ankleF, q.toeF, '#ece1c6');
  torso(ctx, hip, lean);
  // 首
  polyline(ctx, [sh, [sh[0] + sp[0] * 0.1, sh[1] + sp[1] * 0.1]]);
  stroke2(ctx, 0.09, SKIN);
  head(ctx, [sh[0] + sp[0] * 0.19, sh[1] + sp[1] * 0.19], lean * 0.5, o);
  arm(ctx, sh, hands, SKIN);
}

/* ---------------- ちゃぶ台と食器 ---------------- */

export const TABLE_HW = 0.375;
export const TABLE_HH = 0.165;

// 原点は高さの中心
export function drawTable(ctx) {
  const top = TABLE_HH, th = 0.035;
  ctx.lineWidth = 0.012;
  ctx.strokeStyle = OUT;
  const box = (x, y, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
  };
  box(-0.21, -TABLE_HH, 0.04, 0.3, '#4a2810');
  box(0.17, -TABLE_HH, 0.04, 0.3, '#4a2810');
  box(-0.31, -TABLE_HH, 0.05, 0.3, '#6a3a18');
  box(0.26, -TABLE_HH, 0.05, 0.3, '#6a3a18');
  box(-0.33, top - th - 0.035, 0.66, 0.035, '#5e3314');
  box(-TABLE_HW, top - th, TABLE_HW * 2, th, '#8b4a1f');
  ell(ctx, 0, top, TABLE_HW, 0.045);
  ctx.fillStyle = '#b06a35';
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(110,55,20,0.6)';
  ctx.lineWidth = 0.006;
  ell(ctx, 0, top, 0.25, 0.028);
  ctx.stroke();
  ell(ctx, 0, top, 0.12, 0.014);
  ctx.stroke();
}

export const DISH_LAYOUT = [
  { type: 'rice', x: -0.24 },
  { type: 'miso', x: -0.09 },
  { type: 'fish', x: 0.08 },
  { type: 'tea', x: 0.27 },
];
export const DISH_COLOR = { rice: '#ffffff', miso: '#6b1515', fish: '#f4f4f4', tea: '#6d8a4a' };
export const FOOD_COLOR = { rice: '#ffffff', miso: '#a0662a', fish: '#8a9cae', tea: '#9cc06a' };

function bowl(ctx, outer, rim) {
  ctx.beginPath();
  ctx.moveTo(-0.065, 0.055);
  ctx.quadraticCurveTo(-0.06, 0.0, -0.022, 0);
  ctx.lineTo(0.022, 0);
  ctx.quadraticCurveTo(0.06, 0.0, 0.065, 0.055);
  ctx.closePath();
  ctx.fillStyle = outer;
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.008;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-0.06, 0.042);
  ctx.lineTo(0.06, 0.042);
  ctx.strokeStyle = rim;
  ctx.lineWidth = 0.008;
  ctx.stroke();
}

// 原点は底の中心
export function drawDish(ctx, type) {
  ctx.lineWidth = 0.008;
  ctx.strokeStyle = OUT;
  if (type === 'rice') {
    ell(ctx, 0, 0.055, 0.058, 0.035);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.stroke();
    bowl(ctx, '#fdfdf8', '#2f5fae');
  } else if (type === 'miso') {
    bowl(ctx, '#6b1515', '#1a0505');
    ell(ctx, 0, 0.055, 0.062, 0.012);
    ctx.fillStyle = '#a0662a';
    ctx.fill();
  } else if (type === 'fish') {
    ell(ctx, 0, 0.006, 0.1, 0.012);
    ctx.fillStyle = '#f4f4f4';
    ctx.fill();
    ctx.stroke();
    ell(ctx, 0.005, 0.03, 0.065, 0.02);
    ctx.fillStyle = '#7b8fa3';
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-0.055, 0.03);
    ctx.lineTo(-0.09, 0.05);
    ctx.lineTo(-0.09, 0.01);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ell(ctx, 0.05, 0.034, 0.006, 0.006);
    ctx.fillStyle = '#111';
    ctx.fill();
  } else if (type === 'tea') {
    ctx.fillStyle = '#6d8a4a';
    ctx.fillRect(-0.03, 0, 0.06, 0.075);
    ctx.strokeRect(-0.03, 0, 0.06, 0.075);
    ctx.fillStyle = '#a7bf7d';
    ctx.fillRect(-0.03, 0.03, 0.06, 0.012);
  }
}

/* ---------------- 背景 ---------------- */

const CLOUDS = [[0.1, 0.12, 1], [0.55, 0.08, 0.8], [0.85, 0.2, 1.2], [1.3, 0.15, 0.9], [1.7, 0.06, 1.1]];
const CROWD = ['#e74c3c', '#f1c40f', '#3498db', '#ecf0f1', '#9b59b6', '#2ecc71', '#e67e22', '#34495e', '#fd79a8'];
const ADS = [
  ['ちゃぶ台返し連盟', '#c0392b', '#fff'],
  ['育毛トニック', '#1e3799', '#fff'],
  ['昭和食堂', '#f6e58d', '#c0392b'],
  ['みそ汁はあったかいうちに', '#fff', '#2d3436'],
  ['雷おやじ', '#2d3436', '#fdcb6e'],
  ['ハゲ ✕ 頑固', '#e17055', '#fff'],
];

export function drawSky(ctx, W, hy, camPx) {
  const g = ctx.createLinearGradient(0, 0, 0, hy);
  g.addColorStop(0, '#5fb4f0');
  g.addColorStop(1, '#d8f0ff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, hy);
  ctx.fillStyle = 'rgba(255,240,180,0.9)';
  ell(ctx, W * 0.82, hy * 0.18, 26, 26);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  const span = W + 240;
  for (const [fx, fy, s] of CLOUDS) {
    const x = ((((fx * span - camPx * 1.2) % span) + span) % span) - 120;
    const y = fy * hy + 20;
    ell(ctx, x, y, 38 * s, 14 * s);
    ctx.fill();
    ell(ctx, x - 22 * s, y + 4, 22 * s, 10 * s);
    ctx.fill();
    ell(ctx, x + 18 * s, y - 6 * s, 24 * s, 14 * s);
    ctx.fill();
  }
}

export function drawStands(ctx, W, H, hy, camPx) {
  const top = hy - H * 0.14;
  const boardH = Math.max(18, H * 0.03);
  ctx.fillStyle = '#34495e';
  ctx.fillRect(0, top, W, hy - top);
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(0, top - 6, W, 6);
  // 観客
  const off = camPx * 4;
  const sp = 9;
  const rows = Math.floor((hy - boardH - top - 6) / 9);
  for (let r = 0; r < rows; r++) {
    const y = top + 4 + r * 9;
    const shift = (r % 2) * 4.5;
    for (let i = Math.floor((off - shift) / sp) - 1, n = i + Math.ceil(W / sp) + 2; i < n; i++) {
      const x = i * sp - off + shift;
      const h = hash(i, r);
      if (h % 7 === 0) continue;
      ctx.fillStyle = CROWD[h % CROWD.length];
      ctx.fillRect(x, y + 3, 6, 5);
      ctx.fillStyle = h % 5 === 0 ? '#2d2d2d' : '#f0c8a0';
      ctx.fillRect(x + 1, y, 4, 3);
    }
  }
  // 広告看板
  const bw = 132;
  const boff = camPx * 14;
  ctx.font = `bold ${Math.round(boardH * 0.55)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = Math.floor(boff / bw) - 1, n = i + Math.ceil(W / bw) + 2; i < n; i++) {
    const x = i * bw - boff;
    const [txt, bg, fg] = ADS[((i % ADS.length) + ADS.length) % ADS.length];
    ctx.fillStyle = bg;
    ctx.fillRect(x, hy - boardH, bw - 2, boardH);
    ctx.fillStyle = fg;
    ctx.fillText(txt, x + bw / 2, hy - boardH / 2 + 1, bw - 10);
  }
}

// 上から見た投てきセクターと落下地点
export function drawMinimap(ctx, x, y, size, dist, lateral, foul, maxD) {
  const R = size;
  const S = Math.max(30, maxD * 1.15);
  const half = (17.46 * Math.PI) / 180;
  const cx = x + R * 0.5, cy = y + R;
  ctx.save();
  ctx.fillStyle = 'rgba(20,40,20,0.55)';
  rr(ctx, x - 6, y - 6, R + 12, R + 12, 8);
  ctx.fill();
  ctx.fillStyle = '#5cbf60';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, R * 0.98, -Math.PI / 2 - half, -Math.PI / 2 + half);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.lineWidth = 0.7;
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  const step = S > 120 ? 50 : S > 50 ? 20 : 10;
  for (let d = step; d < S; d += step) {
    ctx.beginPath();
    ctx.arc(cx, cy, (d / S) * R * 0.98, -Math.PI / 2 - half, -Math.PI / 2 + half);
    ctx.stroke();
  }
  if (dist != null) {
    const a = (lateral * Math.PI) / 180;
    const r = Math.min(dist / S, 1.05) * R * 0.98;
    const px = cx + Math.sin(a) * r, py = cy - Math.cos(a) * r;
    if (foul) {
      ctx.strokeStyle = '#ff3030';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px - 5, py - 5); ctx.lineTo(px + 5, py + 5);
      ctx.moveTo(px + 5, py - 5); ctx.lineTo(px - 5, py + 5);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffd400';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ell(ctx, px, py, 4.5, 4.5);
      ctx.fill();
      ctx.stroke();
    }
  }
  ell(ctx, cx, cy, 3, 3);
  ctx.fillStyle = '#ddd';
  ctx.fill();
  ctx.restore();
}

export function outlinedText(ctx, text, x, y, size, fill = '#fff', stroke = '#222', align = 'center') {
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size * 0.18);
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}
