import { SensorHub, TouchThrow } from './sensors.js';
import { AudioFX } from './audio.js';
import { World } from './world.js';
import { computeLaunch, meterScores, rankTitle, tipFor, dirName, ehouOf, WORLD_RECORD } from './physics.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
const sensors = new SensorHub();
const audio = new AudioFX();
const touch = new TouchThrow(canvas);
const world = new World(audio);

const store = {
  get(k, d) {
    try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; }
  },
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* プライベートモードなど */ }
  },
};

const state = {
  screen: 'title',
  mode: 'touch',
  voice: [],
  disp: { acc: 0, gyro: 0, voice: 0 },
  timer: null,
  m: null,
  L: null,
};
world.best = store.get('chabudai.best', 0);

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth, H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  world.resize(W, H);
}
window.addEventListener('resize', resize);
resize();

function show(id) {
  for (const s of ['title', 'ready', 'hud', 'result']) $(s).classList.toggle('hidden', s !== id);
  state.screen = id;
}

/* ---------- タイトル ---------- */

// 縦画面のときは横向きにするよう促す（「縦のまま遊ぶ」で閉じられる）
$('btnPortrait').addEventListener('click', () => {
  document.body.classList.add('allow-portrait');
});

// Android は全画面にすると横向きに固定できる（iOS は非対応なので案内表示だけ）
function lockLandscape() {
  const el = document.documentElement;
  if (!el.requestFullscreen || !screen.orientation || !screen.orientation.lock) return;
  el.requestFullscreen({ navigationUI: 'hide' })
    .then(() => screen.orientation.lock('landscape'))
    .catch(() => { /* 非対応のブラウザ */ });
}

$('btnStart').addEventListener('click', () => {
  // iOS は許可ダイアログをクリック処理の中で同期的に出す必要がある
  audio.unlock();
  lockLandscape();
  const perm = sensors.requestPermission();
  const mic = audio.requestMic();
  sensors.start();
  $('btnStart').disabled = true;
  $('btnStart').textContent = '準備中…';
  Promise.all([perm, mic]).then(() => {
    audio.attachMic();
    setTimeout(() => {
      state.mode = sensors.motionSeen ? 'motion' : 'touch';
      audio.pop();
      showReady();
    }, 600);
  });
});

/* ---------- 構え ---------- */

function showReady() {
  world.reset();
  const best = store.get('chabudai.best', 0);
  world.best = best;
  $('bestVal').textContent = best > 0 ? `${best.toFixed(2)} m` : '--';
  const year = new Date().getFullYear();
  $('ehouVal').textContent = `${dirName(ehouOf(year))}`;
  $('ehouYear').textContent = year;
  const chip = (name, ok) => `<span class="chip ${ok ? 'on' : 'off'}">${ok ? '●' : '×'} ${name}</span>`;
  $('chips').innerHTML = [
    chip('加速度', sensors.motionSeen),
    chip('ジャイロ', sensors.gyroSeen),
    chip('コンパス', sensors.compassSeen),
    chip('マイク', audio.micOk),
  ].join('');
  const motion = state.mode === 'motion';
  $('howtoMotion').classList.toggle('hidden', !motion);
  $('howtoTouch').classList.toggle('hidden', motion);
  $('btnMode').textContent = motion ? 'タッチ操作で遊ぶ' : 'センサー操作に戻す';
  $('btnMode').classList.toggle('hidden', !sensors.motionSeen);
  show('ready');
}

$('btnMode').addEventListener('click', () => {
  state.mode = state.mode === 'motion' ? 'touch' : 'motion';
  showReady();
});

$('btnArm').addEventListener('click', () => {
  audio.unlock();
  state.voice = [];
  state.disp = { acc: 0, gyro: 0, voice: 0 };
  if (state.mode === 'motion') sensors.startRecording(onThrow);
  else touch.start(onThrow);
  $('hudSub').textContent = state.mode === 'motion'
    ? '競技場の方を向いて…クルッと回って、叫んで、振り上げろ！'
    : '画面を指でぐるぐる回して → 右上にシュッ！とフリック';
  $('hudTitle').innerHTML = state.mode === 'motion' ? '回れ！叫べ！<br>振り上げろ！' : 'ぐるぐる回して<br>右上にフリック！';
  clearTimeout(state.timer);
  state.timer = setTimeout(forceThrow, 15000);
  show('hud');
});

$('btnCancel').addEventListener('click', () => {
  clearTimeout(state.timer);
  sensors.stopRecording();
  touch.stop();
  showReady();
});

function forceThrow() {
  if (state.mode === 'motion') sensors.finishNow();
  else touch.finishNow();
}

function analyzeVoice() {
  const v = state.voice;
  if (!v.length) return { db: null, time: 0 };
  let pk = -100, time = 0;
  for (let i = 0; i < v.length; i++) {
    pk = Math.max(pk, v[i].db);
    if (i > 0 && v[i].db > -30) time += v[i].t - v[i - 1].t;
  }
  return { db: pk, time };
}

function onThrow(m) {
  clearTimeout(state.timer);
  const voice = analyzeVoice();
  m.voiceDb = voice.db;
  m.voiceTime = voice.time;
  if (m.heading == null) m.heading = sensors.heading;
  const L = computeLaunch(m, audio.micOk);
  state.m = m;
  state.L = L;
  show(null);
  world.beginThrow(L);
}

world.onLand = (x) => {
  const big = x > Math.max(WORLD_RECORD, world.best);
  audio.cheer(big && !state.L.foul);
  if (navigator.vibrate) navigator.vibrate([60, 40, 140]);
};

/* ---------- 結果 ---------- */

world.onDone = showResult;

function bar(v) {
  return `<span class="mbar"><i style="width:${Math.round(Math.min(1, v) * 100)}%"></i></span>`;
}

function showResult() {
  const { m, L } = state;
  const d = world.landX;
  const best = store.get('chabudai.best', 0);
  const isNew = !L.foul && d > best;
  if (isNew) store.set('chabudai.best', d);
  world.best = Math.max(best, isNew ? d : 0);

  $('resKind').textContent = L.dadFlies ? '👴 まさかの親父が飛んだ！' : '';
  $('resKind').classList.toggle('hidden', !L.dadFlies);
  $('resDist').textContent = d.toFixed(2);
  $('resFoul').classList.toggle('hidden', !L.foul);
  $('resTitle').textContent = L.foul ? '（参考記録）' : `称号「${rankTitle(d)}」`;
  $('resNew').classList.toggle('hidden', !isNew);

  const s = L.s;
  const hasMic = audio.micOk;
  const rows = [
    ['腕力（加速度）', `${m.accPeak.toFixed(1)} m/s²`, s.acc],
    ['瞬発力（加加速度）', `${Math.round(m.jerkPeak)} m/s³`, s.jerk],
    ['手首のキレ（ジャイロ）', `${Math.round(m.gyroPeak)} °/s`, s.gyro],
    ['回転（スピン）', `${Math.round(m.spinDeg)}°`, s.spin],
    ['気合（声）', hasMic && m.voiceDb != null ? `${Math.round(m.voiceDb)} dB` : 'マイクなし', s.voice],
  ].map(([k, v, sc]) => `<tr><th>${k}</th><td>${v}</td><td>${bar(sc)}</td></tr>`);
  const extra = [
    ['振り上げ角度', `${Math.round(L.elev)}° → 射出 ${Math.round(L.angle)}°`],
    ['向き', m.heading != null ? `${dirName(m.heading)}${L.ehouHit ? ' <b class="lucky">恵方ボーナス！</b>' : ''}` : '不明'],
    ['正面からのズレ', `${L.lateral >= 0 ? '右' : '左'} ${Math.abs(L.lateral).toFixed(1)}°${L.foul ? '（セクター外）' : ''}`],
    ['風', `${L.wind >= 0 ? '追い風' : '向かい風'} ${Math.abs(L.wind).toFixed(1)} m/s`],
    ['初速', `${Math.round(L.v0 * 3.6)} km/h`],
  ].map(([k, v]) => `<tr><th>${k}</th><td colspan="2">${v}</td></tr>`);
  $('resTable').innerHTML = rows.concat(extra).join('');
  $('resTip').textContent = `💡 ${tipFor(L, hasMic)}`;
  show('result');
}

$('btnAgain').addEventListener('click', () => {
  audio.pop();
  showReady();
});

$('btnShare').addEventListener('click', async () => {
  const { L } = state;
  const d = world.landX.toFixed(2);
  const who = L.dadFlies ? '親父を' : 'ちゃぶ台を';
  const text = L.foul
    ? `ちゃぶ台返しリメンバーで${who}${d}m飛ばした…けどファウル！ #ちゃぶ台返しリメンバー`
    : `ちゃぶ台返しリメンバーで${who}${d}m飛ばした！ 称号「${rankTitle(world.landX)}」 #ちゃぶ台返しリメンバー`;
  const url = location.href.split('#')[0];
  if (navigator.share) {
    try { await navigator.share({ title: 'ちゃぶ台返しリメンバー', text, url }); } catch { /* キャンセル */ }
  } else {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  }
});

/* ---------- ループ ---------- */

function updateHud() {
  const t = performance.now() / 1000;
  const db = audio.level();
  if (db != null) state.voice.push({ t, db });
  const src = state.mode === 'motion' ? sensors.live : touch.live;
  const sc = meterScores({ accPeak: src.lin, jerkPeak: 0, gyroPeak: src.gyro, spinDeg: 0, voiceDb: db, voiceTime: 0 }, db != null);
  const D = state.disp;
  D.acc = Math.max(sc.acc, D.acc * 0.93);
  D.gyro = Math.max(sc.gyro, D.gyro * 0.93);
  D.voice = db != null ? Math.max(sc.voice / 0.8, D.voice * 0.9) : 0;
  $('mAcc').style.width = `${D.acc * 100}%`;
  $('mGyro').style.width = `${D.gyro * 100}%`;
  $('mVoice').style.width = `${Math.min(1, D.voice) * 100}%`;
  const spin = state.mode === 'motion' ? sensors.yaw : touch.spin;
  $('mSpin').textContent = `${Math.round(Math.abs(spin))}°`;
  $('mDir').textContent = sensors.heading != null ? dirName(sensors.heading) : '--';
  world.agitation = Math.max(D.acc, D.voice * 0.7);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state.screen === 'hud') updateHud();
  else world.agitation *= 0.9;
  world.update(dt);
  world.draw(ctx);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
