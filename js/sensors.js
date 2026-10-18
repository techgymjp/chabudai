// センサー入力: 加速度・ジャイロ・姿勢・コンパス（＋センサーが無い端末用のタッチ操作）
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const now = () => performance.now() / 1000;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const wrap180 = (d) => ((d % 360) + 540) % 360 - 180;

// 振り上げ判定: 上向き加速度 or 全体の加速度がこれを超えたら「投げた」
const TRIG_VERT = 13;
const TRIG_MAG = 38;
const AFTER_TRIGGER = 0.35; // ピークを取り切るため、トリガー後もこの秒数だけ記録する

export class SensorHub {
  constructor() {
    this.motionSeen = false;
    this.gyroSeen = false;
    this.orientSeen = false;
    this.compassSeen = false;
    this.gLP = null;        // 重力のローパス
    this.accSign = 0;       // iOS は加速度の符号が逆なので姿勢センサーと突き合わせて校正する
    this.orientUp = null;   // 端末座標系での「真上」方向（姿勢センサー由来）
    this.orientT = 0;
    this.heading = null;    // コンパス方位（北=0, 時計回り）
    this.prevT = null;
    this.prevLin = 0;
    this.live = { lin: 0, gyro: 0, vert: 0 };
    this.rec = null;
    this._m = this._onMotion.bind(this);
    this._o = this._onOrient.bind(this);
  }

  // ユーザー操作（クリック）の中で同期的に呼ぶこと（iOS の制約）
  requestPermission() {
    const ps = [];
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      ps.push(DeviceMotionEvent.requestPermission().catch(() => 'denied'));
    }
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      ps.push(DeviceOrientationEvent.requestPermission().catch(() => 'denied'));
    }
    return Promise.all(ps);
  }

  start() {
    window.addEventListener('devicemotion', this._m);
    window.addEventListener('deviceorientation', this._o);
    if ('ondeviceorientationabsolute' in window) window.addEventListener('deviceorientationabsolute', this._o);
  }

  _onOrient(e) {
    if (e.beta == null) return;
    this.orientSeen = true;
    const b = e.beta * D2R;
    const g = (e.gamma || 0) * D2R;
    // 端末座標系 (x:右, y:上端, z:画面手前) での鉛直上向きベクトル
    this.orientUp = [-Math.sin(g) * Math.cos(b), Math.sin(b), Math.cos(g) * Math.cos(b)];
    this.orientT = now();
    if (e.webkitCompassHeading != null && !isNaN(e.webkitCompassHeading)) {
      this.heading = e.webkitCompassHeading;
      this.compassSeen = true;
    } else if (e.absolute && e.alpha != null) {
      this.heading = (360 - e.alpha) % 360;
      this.compassSeen = true;
    }
  }

  _onMotion(e) {
    const ai = e.accelerationIncludingGravity;
    if (!ai || ai.x == null) return;
    this.motionSeen = true;
    const t = now();
    let dt = this.prevT == null ? 0.016 : t - this.prevT;
    this.prevT = t;
    dt = Math.min(Math.max(dt, 0.004), 0.1);

    const raw = [ai.x, ai.y, ai.z || 0];
    if (!this.gLP) this.gLP = raw.slice();
    const k = 1 - Math.exp(-dt / 0.6);
    for (let i = 0; i < 3; i++) this.gLP[i] += (raw[i] - this.gLP[i]) * k;
    const gl = len(this.gLP);

    const a = e.acceleration;
    let lin = a && a.x != null ? [a.x, a.y, a.z || 0] : raw.map((v, i) => v - this.gLP[i]);

    // 静止中に、加速度の重力成分と姿勢センサーの「上」が同じ向きか確認して符号を決める
    const orientFresh = this.orientUp && t - this.orientT < 0.3;
    if (orientFresh && !this.rec && Math.abs(gl - 9.8) < 1.5 && len(lin) < 1.5) {
      const c = dot(this.gLP, this.orientUp) / gl;
      if (c > 0.7) this.accSign = 1;
      else if (c < -0.7) this.accSign = -1;
    }
    let up;
    if (orientFresh && this.accSign !== 0) {
      up = this.orientUp;
      lin = lin.map((v) => v * this.accSign);
    } else {
      up = gl > 0.1 ? this.gLP.map((v) => v / gl) : [0, 1, 0];
    }

    const linMag = len(lin);
    const jerk = Math.abs(linMag - this.prevLin) / dt;
    this.prevLin = linMag;

    let gyro = 0;
    let yawRate = 0;
    const rr = e.rotationRate;
    if (rr && (rr.alpha != null || rr.beta != null)) {
      this.gyroSeen = true;
      const w = [rr.beta || 0, rr.gamma || 0, rr.alpha || 0]; // x, y, z 軸まわり (deg/s)
      gyro = len(w);
      yawRate = dot(w, up); // 鉛直軸まわりの回転 = 体ごとクルッと回った量
    }
    const vert = dot(lin, up);
    this.live.lin = linMag;
    this.live.gyro = gyro;
    this.live.vert = vert;
    if (this.rec) this._record(t, dt, linMag, jerk, gyro, yawRate, vert);
  }

  startRecording(onThrow) {
    this.rec = { t0: now(), samples: [], yaw: 0, trig: null, onThrow };
  }

  stopRecording() {
    this.rec = null;
  }

  get yaw() {
    return this.rec ? this.rec.yaw : 0;
  }

  finishNow() {
    if (this.rec) this._finish();
  }

  _record(t, dt, lin, jerk, gyro, yawRate, vert) {
    const r = this.rec;
    r.yaw += yawRate * dt;
    r.samples.push({ t, lin, jerk, gyro, yaw: r.yaw, vert, heading: this.heading });
    if (r.trig == null && t - r.t0 > 0.6 && (vert > TRIG_VERT || lin > TRIG_MAG)) r.trig = t;
    if (r.trig != null && t - r.trig > AFTER_TRIGGER) this._finish();
  }

  _finish() {
    const r = this.rec;
    this.rec = null;
    r.onThrow(analyze(r, this.gyroSeen, this.heading));
  }
}

function analyze(r, hasGyro, heading) {
  const S = r.samples;
  const res = {
    source: 'motion', accPeak: 0, jerkPeak: 0, gyroPeak: 0, spinDeg: 0,
    elevDeg: null, releaseDev: null, heading,
  };
  if (!S.length) return res;
  const tr = r.trig ?? S[S.length - 1].t;
  const win = S.filter((s) => s.t >= tr - 0.4);
  let pk = win[0] || S[S.length - 1];
  for (const s of win) if (s.lin > pk.lin) pk = s;
  res.accPeak = pk.lin;
  for (const s of win) res.jerkPeak = Math.max(res.jerkPeak, s.jerk);
  for (const s of S) if (s.t >= tr - 0.6) res.gyroPeak = Math.max(res.gyroPeak, s.gyro);

  // 振り上げ角度: ピーク付近の加速度ベクトルが水平から何度上を向いていたか
  let sw = 0, se = 0;
  for (const s of S) {
    if (Math.abs(s.t - pk.t) > 0.09 || s.lin < 1) continue;
    const e = Math.asin(Math.max(-1, Math.min(1, s.vert / s.lin)));
    se += e * s.lin;
    sw += s.lin;
  }
  if (sw > 0) res.elevDeg = Math.max(0, (se / sw) * R2D);

  if (hasGyro) {
    // 直近4秒でどれだけ体ごと回ったか（往復ではなく正味の回転）
    const from = S.find((s) => s.t >= pk.t - 4) || S[0];
    res.spinDeg = Math.abs(pk.yaw - (from === S[0] ? 0 : from.yaw));
    // 構えた時の正面からのズレ（ファウル判定用）
    res.releaseDev = wrap180(pk.yaw);
  }
  if (pk.heading != null) res.heading = pk.heading;
  return res;
}

// センサーが使えない端末（PCなど）用: 画面をぐるぐる回して上にフリック
export class TouchThrow {
  constructor(el) {
    this.el = el;
    this.active = false;
    this.down = false;
    this.live = { lin: 0, gyro: 0 };
    this.spin = 0;
    el.addEventListener('pointerdown', (e) => this._down(e));
    el.addEventListener('pointermove', (e) => this._move(e));
    el.addEventListener('pointerup', (e) => this._up(e));
    el.addEventListener('pointercancel', () => { this.down = false; this.lastA = null; });
  }

  start(onThrow) {
    Object.assign(this, { active: true, on: onThrow, pts: [], spin: 0, lastA: null, lastT: 0, gyroPeak: 0, down: false });
  }

  stop() {
    this.active = false;
  }

  finishNow() {
    if (this.active) this._throw(this._vel());
  }

  _pos(e) {
    const r = this.el.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top, r.width, r.height];
  }

  _down(e) {
    if (!this.active) return;
    this.down = true;
    this.pts = [];
    this.lastA = null;
    try { this.el.setPointerCapture(e.pointerId); } catch { /* 古いブラウザ */ }
    this._move(e);
  }

  _move(e) {
    if (!this.active || !this.down) return;
    const t = now();
    const [x, y, w, h] = this._pos(e);
    this.pts.push({ t, x, y });
    if (this.pts.length > 40) this.pts.shift();
    const a = Math.atan2(y - h / 2, x - w / 2);
    if (this.lastA != null) {
      const d = wrap180((a - this.lastA) * R2D);
      this.spin += d;
      const rate = Math.abs(d) / Math.max(t - this.lastT, 0.008);
      this.gyroPeak = Math.max(this.gyroPeak, Math.min(2000, rate));
      this.live.gyro = rate;
    }
    this.lastA = a;
    this.lastT = t;
    this.live.lin = this._vel().speed / 50;
  }

  _vel() {
    const p = this.pts;
    if (!p || p.length < 2) return { vx: 0, vy: 0, speed: 0 };
    const end = p[p.length - 1];
    let i = p.length - 1;
    while (i > 0 && end.t - p[i - 1].t < 0.1) i--;
    const s = p[i] === end ? p[p.length - 2] : p[i];
    const dt = Math.max(end.t - s.t, 0.008);
    const vx = (end.x - s.x) / dt;
    const vy = (end.y - s.y) / dt;
    return { vx, vy, speed: Math.hypot(vx, vy) };
  }

  _up() {
    if (!this.active) return;
    this.down = false;
    const v = this._vel();
    if (v.speed > 500 && v.vy < -Math.abs(v.vx) * 0.3) this._throw(v);
    else this.lastA = null;
  }

  _throw(v) {
    this.active = false;
    this.on({
      source: 'touch',
      accPeak: v.speed / 50,
      jerkPeak: v.speed * 0.9,
      gyroPeak: this.gyroPeak * 0.8,
      spinDeg: Math.abs(this.spin),
      // 競技場は画面の右。右上45°にフリックするのが理想
      elevDeg: v.speed > 0 ? Math.min(90, Math.max(0, Math.atan2(-v.vy, v.vx) * R2D)) : null,
      releaseDev: null,
      heading: null,
    });
  }
}
