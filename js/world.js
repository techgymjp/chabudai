// 競技場のシミュレーションと描画
import {
  drawDad, drawTable, drawDish, drawSky, drawStands, drawMinimap, outlinedText, rr, FONT,
  TABLE_HW, TABLE_HH, DISH_LAYOUT, DISH_COLOR, FOOD_COLOR, DAD_HANDS_UP,
} from './render.js';
import { WORLD_RECORD, SECTOR_HALF } from './physics.js';
import { t } from './i18n.js';

const G = 9.8;
const D2R = Math.PI / 180;
const WINDUP = 0.32;
const TABLE_REST = { x: 0.68, y: TABLE_HH };
const PIVOT = { x: TABLE_REST.x + 0.29, y: 0 }; // ちゃぶ台は奥の脚を支点に起き上がる
const READY_HANDS = [0.31, 0.33];
const SCENE_X = 0.45; // 親父とちゃぶ台の中心あたり
const LINE_COUNT = 6; // 親父のセリフ（i18n の line.0〜line.5）

const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const rand = (a, b) => a + Math.random() * (b - a);

export class World {
  constructor(sfx) {
    this.sfx = sfx;
    this.W = 1;
    this.H = 1;
    this.best = 0;
    this.cam = { x: SCENE_X, ppm: 150, lift: 0 };
    this.basePpm = 150;
    this.agitation = 0;
    this.onLand = null;
    this.onDone = null;
    this.reset();
  }

  resize(W, H) {
    this.W = W;
    this.H = H;
    this.landscape = W >= H;
    this.baseHorizonY = H * (this.landscape ? 0.5 : 0.44);
    this.baseGroundY = H * (this.landscape ? 0.66 : 0.54);
    this.basePpm = Math.min(W / (this.landscape ? 4.4 : 2.6), (this.baseGroundY - H * 0.12) / 1.95);
    // 遠くまで飛んでもこれ以上はズームアウトしない（横画面で約55m幅）
    this.minPpm = Math.max(W, H) / 55;
    if (this.phase === 'ready') {
      this.cam.ppm = this.basePpm;
      this.cam.x = this.readyCamX();
    }
  }

  // 高く飛ぶとカメラが上がり、地面ごと下にスクロールする
  get groundY() { return this.baseGroundY + this.cam.lift; }
  get horizonY() { return this.baseHorizonY + this.cam.lift; }

  // 横画面では右側にパネルが出るので、親父を画面の左寄りに置く
  readyCamX() {
    return this.landscape ? SCENE_X + (this.W * 0.2) / this.basePpm : SCENE_X;
  }

  reset() {
    this.phase = 'ready';
    this.t = 0;
    this.launch = null;
    this.dad = { visible: true, pose: 0, hands: READY_HANDS.slice() };
    this.table = { x: TABLE_REST.x, y: TABLE_REST.y, rot: 0, visible: true, dishes: true };
    this.objs = [];
    this.parts = [];
    this.main = null;
    this.landX = null;
    this.bubble = null;
    this.restT = 0;
    this.done = false;
    this.flightT = 0;
    this.cam.ppm = this.basePpm;
    this.cam.x = this.readyCamX();
    this.cam.lift = 0;
  }

  beginThrow(launch) {
    this.launch = launch;
    this.phase = 'windup';
    this.t = 0;
    this.bubble = { text: t(`line.${Math.floor(Math.random() * LINE_COUNT)}`), t: 0, on: 'dad' };
  }

  tablePose(phi) {
    const c = rot(TABLE_REST.x - PIVOT.x, TABLE_REST.y, phi);
    const e = rot(TABLE_REST.x - TABLE_HW - PIVOT.x, TABLE_HH * 2, phi);
    return { x: PIVOT.x + c[0], y: PIVOT.y + c[1], edge: [PIVOT.x + e[0], PIVOT.y + e[1]] };
  }

  release() {
    const L = this.launch;
    const th = L.angle * D2R;
    const tb = this.table;
    this.phase = 'flight';
    this.flightT = 0;
    this.releaseHands = this.dad.hands.slice();
    const body = (o) => ({ landed: false, rest: false, ...o });
    let tv;
    if (!L.dadFlies) {
      this.main = body({
        kind: 'table', x: tb.x, y: tb.y, vx: L.v0 * Math.cos(th), vy: L.v0 * Math.sin(th),
        rot: tb.rot, rotV: -L.spinRate, hw: TABLE_HW, hh: TABLE_HH, k: 0.0035, settle: Math.PI,
      });
      this.objs = [this.main];
      tv = [this.main.vx, this.main.vy];
    } else {
      // まさかの親父が飛ぶ。ちゃぶ台はその場でひっくり返るだけ
      const t2 = body({ kind: 'table', x: tb.x, y: tb.y, vx: 1.3, vy: 3.2, rot: tb.rot, rotV: -6, hw: TABLE_HW, hh: TABLE_HH, k: 0.0035, settle: Math.PI });
      this.main = body({
        kind: 'dad', x: 0.05, y: 0.85, vx: L.v0 * Math.cos(th), vy: L.v0 * Math.sin(th),
        rot: 0, rotV: -L.spinRate * 0.6, hw: 0.25, hh: 0.85, k: 0.003, settle: Math.PI / 2,
      });
      this.objs = [t2, this.main];
      this.dad.visible = false;
      tv = [t2.vx, t2.vy];
      this.bubble = { text: t('line.dad'), t: 0, on: 'main' };
    }
    tb.visible = false;

    // 食器と中身をぶちまける
    const sp = Math.hypot(tv[0], tv[1]);
    const dir = Math.atan2(tv[1], tv[0]);
    for (const d of DISH_LAYOUT) {
      const [ox, oy] = rot(d.x, TABLE_HH, tb.rot);
      const x = tb.x + ox, y = tb.y + oy;
      const a = dir + rand(-0.25, 0.35);
      const v = sp * rand(0.45, 0.95) + 1;
      this.parts.push({ type: 'dish', dish: d.type, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + 1.5, rot: tb.rot, rotV: rand(-14, 14) });
      for (let i = 0; i < 10; i++) {
        const b = dir + rand(-0.6, 0.8);
        const w = sp * rand(0.2, 0.8) + rand(0.5, 2.5);
        this.parts.push({ type: 'food', color: FOOD_COLOR[d.type], x, y: y + 0.05, vx: Math.cos(b) * w, vy: Math.sin(b) * w + rand(0, 2), r: rand(0.008, 0.02) });
      }
    }
    this.sfx.crash();
    this.sfx.whoosh(Math.min(3, 0.8 + L.v0 / 12));
    if (navigator.vibrate) navigator.vibrate(80);
  }

  update(dt) {
    this.t += dt;
    if (this.bubble) this.bubble.t += dt;
    if (this.phase === 'windup') {
      const k = ease(this.t / WINDUP);
      const p = this.tablePose(-0.9 * k);
      Object.assign(this.table, { x: p.x, y: p.y, rot: -0.9 * k });
      this.dad.pose = 0.4 * k;
      this.dad.hands = p.edge;
      if (this.t >= WINDUP) this.release();
    } else if (this.phase === 'flight') {
      this.stepFlight(dt);
    } else {
      this.dad.pose = 0.03 + Math.sin(this.t * 2) * 0.015 + this.agitation * 0.1;
    }
    this.updateCam(dt);
  }

  stepFlight(dt) {
    this.flightT += dt;
    const k = ease(this.flightT / 0.35);
    this.dad.pose = 0.4 + 0.6 * k;
    this.dad.hands = [
      this.releaseHands[0] + (DAD_HANDS_UP[0] - this.releaseHands[0]) * k,
      this.releaseHands[1] + (DAD_HANDS_UP[1] - this.releaseHands[1]) * k,
    ];
    // 放した直後はスローモーション、長い滞空は少し早送り
    const ft = this.flightT;
    const ts = ft < 0.6 ? 0.3 + 0.7 * (ft / 0.6) : ft > 3 ? 1.5 : 1;
    const sdt = dt * ts;
    const n = Math.ceil(sdt / 0.006);
    for (let i = 0; i < n; i++) for (const o of this.objs) this.stepObj(o, sdt / n);
    this.stepParts(sdt);
    if (this.main.landed) {
      this.restT += dt;
      if (!this.done && (this.restT > 2.6 || (this.main.rest && this.restT > 1.4))) {
        this.done = true;
        if (this.onDone) this.onDone();
      }
    }
  }

  stepObj(o, h) {
    if (o.rest) return;
    const vrx = o.vx - this.launch.wind;
    const vr = Math.hypot(vrx, o.vy);
    o.vx += -o.k * vr * vrx * h;
    o.vy += (-G - o.k * vr * o.vy) * h;
    o.x += o.vx * h;
    o.y += o.vy * h;
    o.rot += o.rotV * h;
    const ext = this.ext(o);
    if (o.y - ext > 0) return;
    o.y = ext;
    if (!o.landed) {
      o.landed = true;
      if (o === this.main) {
        this.landX = o.x;
        this.dust(o.x, 18);
        if (this.onLand) this.onLand(o.x);
      }
    }
    if (o.vy < -1.5) {
      this.sfx.thud(Math.min(1, -o.vy / 15) * (o === this.main ? 1 : 0.5));
      o.vy = -o.vy * 0.3;
      o.vx *= 0.65;
      o.rotV *= 0.6;
      if (o === this.main) this.dust(o.x, 6);
    } else {
      o.vy = 0;
      const f = 7 * h;
      o.vx = Math.abs(o.vx) <= f ? 0 : o.vx - Math.sign(o.vx) * f;
      const target = Math.round(o.rot / o.settle) * o.settle;
      o.rot += (target - o.rot) * Math.min(1, h * 8);
      o.rotV *= Math.max(0, 1 - h * 8);
      if (o.vx === 0 && Math.abs(target - o.rot) < 0.01) o.rest = true;
    }
  }

  dust(x, n) {
    for (let i = 0; i < n; i++) {
      this.parts.push({ type: 'dust', x: x + rand(-0.3, 0.3), y: rand(0, 0.15), vx: rand(-1.5, 1.5), vy: rand(0.2, 1.2), r: rand(0.08, 0.2), life: 1 });
    }
  }

  stepParts(h) {
    const out = [];
    for (const p of this.parts) {
      if (p.type === 'dust') {
        p.x += p.vx * h;
        p.y += p.vy * h;
        p.r += h * 0.4;
        p.life -= h * 0.9;
        if (p.life > 0) out.push(p);
        continue;
      }
      if (!p.ground) {
        p.vy -= G * h;
        p.x += p.vx * h;
        p.y += p.vy * h;
        if (p.rotV) p.rot += p.rotV * h;
        if (p.y <= 0) {
          p.y = 0;
          if (p.type === 'dish') {
            // 着地して割れる
            this.sfx.clink(0.6);
            for (let i = 0; i < 6; i++) {
              out.push({ type: 'shard', color: DISH_COLOR[p.dish], x: p.x, y: 0.02, vx: p.vx * 0.3 + rand(-1.5, 1.5), vy: rand(1, 3), r: rand(0.015, 0.03), rot: rand(0, 6), rotV: rand(-20, 20) });
            }
            continue;
          }
          p.ground = true;
        }
      }
      out.push(p);
    }
    this.parts = out.length > 500 ? out.slice(out.length - 500) : out;
  }

  updateCam(dt) {
    const c = this.cam;
    let tx = this.readyCamX(), tp = this.basePpm;
    const room = this.baseGroundY - this.H * 0.3; // 飛んでいる物を画面上端から離しておく余白
    if (this.phase === 'flight' && this.main) {
      const m = this.main;
      tp = Math.max(this.minPpm, Math.min(this.basePpm, room / (m.y + 1.4)));
      // 結果カード（横画面では右側）に着地点が隠れないよう、着地後は左に寄せる
      const lead = this.done && this.landscape ? 0.25 : this.landscape ? 0.12 : 0.06;
      tx = Math.max(SCENE_X, m.x + (this.W * lead) / c.ppm);
    }
    c.ppm = Math.exp(Math.log(c.ppm) + (Math.log(tp) - Math.log(c.ppm)) * (1 - Math.exp(-dt * 5)));
    c.x += (tx - c.x) * (1 - Math.exp(-dt * 6));
    c.lift = this.phase === 'flight' && this.main ? Math.max(0, (this.main.y + 0.8) * c.ppm - room) : 0;
  }

  /* ---------------- 描画 ---------------- */

  sx(x) { return this.W / 2 + (x - this.cam.x) * this.cam.ppm; }
  sy(y) { return this.groundY - y * this.cam.ppm; }

  // 地面上の点 (x, 奥行き y) → 画面。奥ほど縮む簡易パース
  fieldX(x, y) {
    const f = 1 + ((y - this.groundY) / (this.groundY - this.horizonY)) * 0.3;
    return this.W / 2 + (x - this.cam.x) * this.cam.ppm * f;
  }

  inWorld(ctx, x, y, r, fn) {
    ctx.save();
    ctx.translate(this.sx(x), this.sy(y));
    ctx.scale(this.cam.ppm, -this.cam.ppm);
    if (r) ctx.rotate(r);
    fn();
    ctx.restore();
  }

  // ズームアウトしても豆粒にならないよう、最低 minPx の大きさで描く。
  // 拡大しても地面にめり込まないよう、一番下の点を基準に位置を合わせる
  inWorldMin(ctx, x, y, r, size, minPx, ext, fn) {
    const ppm = this.cam.ppm;
    const s = Math.max(ppm, minPx / size);
    ctx.save();
    ctx.translate(this.sx(x), this.sy(y - ext) - ext * s);
    ctx.scale(s, -s);
    if (r) ctx.rotate(r);
    fn();
    ctx.restore();
    return s;
  }

  ext(o) {
    return Math.abs(o.hw * Math.sin(o.rot)) + Math.abs(o.hh * Math.cos(o.rot));
  }

  draw(ctx) {
    const { W, H } = this;
    const camPx = this.cam.x;
    drawSky(ctx, W, H, this.horizonY - H * 0.14 - 6, camPx, this.cam.lift);
    drawStands(ctx, W, H, this.horizonY, camPx);
    this.drawField(ctx);
    this.drawFlags(ctx);

    // 影
    const minTable = this.H * 0.16;
    for (const o of this.objs) {
      const k = 1 / (1 + Math.max(0, o.y) * 0.15);
      const s = Math.max(this.cam.ppm, (o.kind === 'table' ? minTable / (TABLE_HW * 2) : minTable * 1.5 / 1.7));
      ctx.fillStyle = `rgba(0,0,0,${0.25 * k})`;
      ctx.beginPath();
      ctx.ellipse(this.sx(o.x), this.groundY + 2, Math.max(3, o.hw * s * k), Math.max(1.5, 0.06 * s * k), 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.table.visible) {
      this.inWorld(ctx, this.table.x, this.table.y, this.table.rot, () => {
        drawTable(ctx);
        for (const d of DISH_LAYOUT) {
          ctx.save();
          ctx.translate(d.x, TABLE_HH);
          drawDish(ctx, d.type);
          ctx.restore();
        }
      });
    }
    if (this.dad.visible) {
      const sh = this.phase === 'ready' ? Math.sin(this.t * 70) * 0.012 * this.agitation : 0;
      const shout = this.phase !== 'ready' || this.agitation > 0.5;
      this.inWorld(ctx, sh, 0, 0, () => drawDad(ctx, this.dad.pose, this.dad.hands, { shout, angry: this.phase !== 'ready' || this.agitation > 0.2 }));
    }
    for (const o of this.objs) {
      if (o.kind === 'table') this.inWorldMin(ctx, o.x, o.y, o.rot, TABLE_HW * 2, minTable, this.ext(o), () => drawTable(ctx));
      else {
        this.inWorldMin(ctx, o.x, o.y, o.rot, 1.7, minTable * 1.5, this.ext(o), () => {
          ctx.translate(0, -0.85);
          drawDad(ctx, 1, DAD_HANDS_UP, { shout: true, angry: false });
        });
      }
    }
    this.drawParts(ctx);
    this.drawBubble(ctx);
    if (this.phase === 'flight') this.drawHud(ctx);
  }

  drawField(ctx) {
    const { W, H, horizonY: hy, groundY: gy, cam } = this;
    const trackH = (gy - hy) * 0.35;
    ctx.fillStyle = '#c4553b';
    ctx.fillRect(0, hy, W, trackH);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, hy + (trackH * i) / 3);
      ctx.lineTo(W, hy + (trackH * i) / 3);
      ctx.stroke();
    }
    const fy = hy + trackH;
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(0, fy, W, H - fy);

    const span = W / 2 / (cam.ppm * 0.7) + 5;
    const x0 = Math.floor((cam.x - span) / 5) * 5;
    const x1 = cam.x + span;
    ctx.fillStyle = '#5cbf60';
    for (let x = x0; x < x1; x += 5) {
      if (Math.abs(Math.round(x / 5)) % 2 !== 1) continue;
      ctx.beginPath();
      ctx.moveTo(this.fieldX(x, fy), fy);
      ctx.lineTo(this.fieldX(x + 5, fy), fy);
      ctx.lineTo(this.fieldX(x + 5, H), H);
      ctx.lineTo(this.fieldX(x, H), H);
      ctx.fill();
    }
    // 投てきセクターの線（奥と手前に広がる）
    const tanH = Math.tan(SECTOR_HALF * D2R) * cam.ppm * 0.2;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    const far = Math.min(x1, (gy - fy) / tanH);
    const near = Math.min(x1, (H - gy) / tanH);
    ctx.beginPath();
    ctx.moveTo(this.sx(0), gy);
    ctx.lineTo(this.sx(far), gy - far * tanH);
    ctx.moveTo(this.sx(0), gy);
    ctx.lineTo(this.sx(near), gy + near * tanH);
    ctx.stroke();

    // 距離ライン
    const labelStep = cam.ppm < 9 ? 20 : 10;
    for (let x = Math.max(5, x0); x < x1; x += 5) {
      const major = x % 10 === 0;
      ctx.strokeStyle = major ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)';
      ctx.lineWidth = major ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(this.fieldX(x, fy), fy);
      ctx.lineTo(this.fieldX(x, H), H);
      ctx.stroke();
      if (x % labelStep === 0) outlinedText(ctx, `${x}m`, this.fieldX(x, fy + 10), fy + 10, 13, '#fff', '#1b5e20');
    }

    // サークル
    const r = 1.07 * cam.ppm;
    ctx.fillStyle = '#a8a8a8';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(this.sx(0), gy, r, Math.max(3, r * 0.2), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillRect(this.sx(1.07) - 2, gy - Math.max(3, r * 0.2) * 0.6, 4, Math.max(3, r * 0.2) * 1.2);
  }

  drawFlags(ctx) {
    // lift: 旗の棒を長くして、近くの旗とラベルが重ならないようにする
    const flag = (x, color, label, lift = 0) => {
      const px = this.sx(x);
      if (px < -100 || px > this.W + 100) return;
      const top = this.groundY - 64 - lift;
      ctx.strokeStyle = '#eee';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, this.groundY);
      ctx.lineTo(px, top);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(px, top);
      ctx.lineTo(px + 26, top + 8);
      ctx.lineTo(px, top + 16);
      ctx.fill();
      outlinedText(ctx, label, px, top - 10, 11, '#fff', '#222');
    };
    flag(WORLD_RECORD, '#e74c3c', t('flag.wr', { d: WORLD_RECORD }));
    if (this.best > 0) {
      const label = t('flag.best', { d: this.best.toFixed(2) });
      ctx.font = `11px ${FONT}`;
      const near = Math.abs(this.sx(this.best) - this.sx(WORLD_RECORD)) < ctx.measureText(label).width + 20;
      flag(this.best, '#f1c40f', label, near ? 26 : 0);
    }
    if (this.landX != null) {
      // 計測メジャー
      const y = this.groundY + 6;
      ctx.strokeStyle = '#ffd400';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      ctx.moveTo(this.sx(0), y);
      ctx.lineTo(this.sx(this.landX), y);
      ctx.stroke();
      ctx.setLineDash([]);
      const foul = this.launch.foul;
      flag(this.landX, foul ? '#ff3030' : '#ffd400', foul ? t('flag.foul') : '');
      const label = `${this.landX.toFixed(2)}m`;
      ctx.font = `30px ${FONT}`;
      const half = ctx.measureText(label).width / 2 + 8;
      outlinedText(ctx, label, Math.min(this.W - half, Math.max(half, this.sx(this.landX))), this.groundY - 100, 30, foul ? '#ff8080' : '#ffe14d', '#222');
    }
  }

  drawParts(ctx) {
    const ppm = this.cam.ppm;
    for (const p of this.parts) {
      const x = this.sx(p.x), y = this.sy(p.y);
      if (x < -50 || x > this.W + 50) continue;
      if (p.type === 'dish') {
        this.inWorldMin(ctx, p.x, p.y, p.rot, 0.15, this.H * 0.04, 0, () => drawDish(ctx, p.dish));
      } else if (p.type === 'dust') {
        ctx.fillStyle = `rgba(160,130,90,${0.5 * p.life})`;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(2, p.r * ppm), 0, Math.PI * 2);
        ctx.fill();
      } else {
        const r = Math.max(1.2, p.r * ppm);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        if (p.ground && p.type === 'food') ctx.ellipse(x, y, r * 1.8, r * 0.6, 0, 0, Math.PI * 2);
        else if (p.type === 'shard') {
          ctx.moveTo(x + Math.cos(p.rot) * r * 1.5, y + Math.sin(p.rot) * r * 1.5);
          ctx.lineTo(x + Math.cos(p.rot + 2.2) * r, y + Math.sin(p.rot + 2.2) * r);
          ctx.lineTo(x + Math.cos(p.rot + 4) * r, y + Math.sin(p.rot + 4) * r);
        } else ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawBubble(ctx) {
    const b = this.bubble;
    if (!b || b.t > 2.2) return;
    let ax, ay;
    if (b.on === 'main' && this.main) {
      ax = this.sx(this.main.x);
      ay = this.sy(this.main.y) - Math.max(this.cam.ppm * 0.9, this.H * 0.16);
    } else {
      ax = this.sx(0.2);
      ay = this.sy(this.dad.pose > 0.5 ? 1.6 : 1.05);
      if (ax < 0) return;
    }
    ctx.font = `17px ${FONT}`;
    const w = ctx.measureText(b.text).width + 24;
    const h = 36;
    const bx = Math.min(Math.max(ax - w * 0.25, 8), this.W - w - 8);
    const by = Math.max(8, ay - h - 26);
    ctx.save();
    ctx.globalAlpha = Math.min(1, (2.2 - b.t) * 3);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2.5;
    rr(ctx, bx, by, w, h, 12);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(Math.min(Math.max(ax, bx + 14), bx + w - 14) - 8, by + h - 1);
    ctx.lineTo(ax, by + h + 18);
    ctx.lineTo(Math.min(Math.max(ax, bx + 14), bx + w - 14) + 8, by + h - 1);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c0392b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.text, bx + w / 2, by + h / 2 + 1);
    ctx.restore();
  }

  drawHud(ctx) {
    const L = this.launch;
    const m = this.main;
    const d = this.landX ?? Math.max(0, m.x);
    const w = L.wind;
    const wtxt = t('fly.wind', { arrow: w >= 0 ? '→' : '←', kind: t(w >= 0 ? 'st.tail' : 'st.head'), v: Math.abs(w).toFixed(1) });
    const high = m.y > 3 ? t('fly.height', { h: m.y.toFixed(1) }) : '';
    if (this.landscape) {
      // 横画面: 計器は上の隅に。飛んでいる物は画面上端から 30% 以上離してある
      const size = Math.min(100, this.H * 0.24);
      // 中央上はセリフの吹き出し用に空けておく
      if (this.landX == null) outlinedText(ctx, `${d.toFixed(1)}m`, 16, 34, 36, '#fff', '#222', 'left');
      outlinedText(ctx, wtxt, 16, 72, 13, '#fff', '#333', 'left');
      if (high) outlinedText(ctx, high, 16, 94, 13, '#fff', '#333', 'left');
      drawMinimap(ctx, this.W - size - 16, 16, size, this.landX ?? m.x, L.lateral, L.foul && this.landX != null, Math.max(d, 25));
      return;
    }
    // 縦画面: 空は飛んでいく物のために空けて、計器類は手前の芝生に置く
    const top = this.baseGroundY + (this.H - this.baseGroundY) * 0.22;
    if (this.landX == null) outlinedText(ctx, `${d.toFixed(1)}m`, this.W / 2, top, 40, '#fff', '#1b5e20');
    const size = Math.min(110, this.W * 0.28, this.H - top - 60);
    outlinedText(ctx, wtxt, 16, this.H - 22, 13, '#fff', '#1b5e20', 'left');
    if (high) outlinedText(ctx, high, 16, this.H - 44, 13, '#fff', '#1b5e20', 'left');
    drawMinimap(ctx, this.W - size - 16, this.H - size - 22, size, this.landX ?? m.x, L.lateral, L.foul && this.landX != null, Math.max(d, 25));
  }
}
