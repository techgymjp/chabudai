import { SensorHub, TouchThrow } from './sensors.js';
import { AudioFX } from './audio.js';
import { World } from './world.js';
import { computeLaunch, meterScores, rankIndex, tipKey, dirIndex, ehouOf, WORLD_RECORD, TAILWIND } from './physics.js';
import { t, dirLabel, applyI18n, setLang } from './i18n.js';
import { createAds } from './ads.js';

const $ = (id) => document.getElementById(id);
// Android アプリ（Capacitor）で動いているか
const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const plugin = (name) => (NATIVE && window.Capacitor.Plugins ? window.Capacitor.Plugins[name] : null);
// iOS アプリでは、投げるたびにマイクを閉じて開き直す（アプリが許可を持っているので確認画面は出ない）
const IOS_APP = NATIVE && window.Capacitor.getPlatform && window.Capacitor.getPlatform() === 'ios';
const dirName = (deg) => dirLabel(dirIndex(deg));
const rankTitle = (d) => t(`rank.${rankIndex(d)}`);

applyI18n();
// Web 版では Android アプリ版（Google Play）へのリンクを出す。アプリの中と、Android アプリを入れられない iPhone・iPad では出さない
const APPLE_DEVICE = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
if (!NATIVE && !APPLE_DEVICE) $('getApp').classList.remove('hidden');
// タイトル画面の言語切り替え
document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
// シェア時に載せるURL（ゲームの紹介記事）
const SHARE_URL = 'https://techgym.jp/column/claude-code-game-chabudai/';
const canvas = $('game');
const ctx = canvas.getContext('2d');
const sensors = new SensorHub();
const audio = new AudioFX();
const touch = new TouchThrow(canvas);
const world = new World(audio);
const Ads = createAds(audio);

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
  micGranted: false, // マイクの使用を許可されたか
  hasMic: false,     // 今回の投てきで声を測れたか
  tailwind: false, // リワード広告を見て、次の1投を追い風にする
  plays: 0,
};
world.best = store.get('chabudai.best', 0);
// ストア用の画像の撮影（?shot を付けて開いたときだけ）
if (new URLSearchParams(location.search).has('shot')) window.__chabudai = { world, audio };

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
  if (NATIVE) return; // アプリは AndroidManifest で横画面に固定している
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
  $('btnStart').textContent = t('title.preparing');
  Promise.all([perm, mic]).then(([, micOk]) => {
    state.micGranted = micOk;
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
  $('ehou').innerHTML = t('ready.ehou', { year, dir: dirName(ehouOf(year)) });
  const chip = (name, ok) => `<span class="chip ${ok ? 'on' : 'off'}">${ok ? '●' : '×'} ${name}</span>`;
  $('chips').innerHTML = [
    chip(t('chip.acc'), sensors.motionSeen),
    chip(t('chip.gyro'), sensors.gyroSeen),
    chip(t('chip.compass'), sensors.compassSeen),
    chip(t('chip.mic'), state.micGranted),
  ].join('');
  const motion = state.mode === 'motion';
  $('howtoMotion').classList.toggle('hidden', !motion);
  $('howtoTouch').classList.toggle('hidden', motion);
  $('btnMode').textContent = t(motion ? 'ready.toTouch' : 'ready.toMotion');
  $('btnMode').classList.toggle('hidden', !sensors.motionSeen);
  $('windBonus').innerHTML = t('ready.wind', { v: `+${TAILWIND.toFixed(1)}m/s` });
  $('windBonus').classList.toggle('hidden', !state.tailwind);
  show('ready');
}

$('btnMode').addEventListener('click', () => {
  state.mode = state.mode === 'motion' ? 'touch' : 'motion';
  showReady();
});

$('btnArm').addEventListener('click', () => {
  audio.unlock();
  if (IOS_APP && state.micGranted && !audio.micOk) audio.requestMic().then(() => audio.attachMic());
  state.voice = [];
  state.disp = { acc: 0, gyro: 0, voice: 0 };
  if (state.mode === 'motion') sensors.startRecording(onThrow);
  else touch.start(onThrow);
  const motion = state.mode === 'motion';
  $('hudSub').textContent = t(motion ? 'hud.subMotion' : 'hud.subTouch');
  $('hudTitle').innerHTML = t(motion ? 'hud.titleMotion' : 'hud.titleTouch');
  clearTimeout(state.timer);
  state.timer = setTimeout(forceThrow, 15000);
  show('hud');
});

function cancelThrow() {
  clearTimeout(state.timer);
  sensors.stopRecording();
  touch.stop();
  if (IOS_APP) audio.releaseMic();
  showReady();
}
$('btnCancel').addEventListener('click', cancelThrow);

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
  state.hasMic = audio.micOk;
  if (IOS_APP) audio.releaseMic();
  const L = computeLaunch(m, state.hasMic, { tailwind: state.tailwind });
  state.tailwind = false;
  state.plays++;
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

  $('resKind').textContent = L.dadFlies ? t('res.dadFlies') : '';
  $('resKind').classList.toggle('hidden', !L.dadFlies);
  $('resDist').textContent = d.toFixed(2);
  $('resFoul').classList.toggle('hidden', !L.foul);
  $('resTitle').textContent = L.foul ? t('res.ref') : t('res.rank', { r: rankTitle(d) });
  $('resNew').classList.toggle('hidden', !isNew);

  const s = L.s;
  const hasMic = state.hasMic;
  const rows = [
    [t('st.acc'), `${m.accPeak.toFixed(1)} m/s²`, s.acc],
    [t('st.jerk'), `${Math.round(m.jerkPeak)} m/s³`, s.jerk],
    [t('st.gyro'), `${Math.round(m.gyroPeak)} °/s`, s.gyro],
    [t('st.spin'), `${Math.round(m.spinDeg)}°`, s.spin],
    [t('st.voice'), hasMic && m.voiceDb != null ? `${Math.round(m.voiceDb)} dB` : t('st.noMic'), s.voice],
  ].map(([k, v, sc]) => `<tr><th>${k}</th><td>${v}</td><td>${bar(sc)}</td></tr>`);
  const extra = [
    [t('st.elev'), t('st.elevV', { e: Math.round(L.elev), a: Math.round(L.angle) })],
    [t('st.dir'), m.heading != null ? `${dirName(m.heading)}${L.ehouHit ? ` <b class="lucky">${t('st.ehou')}</b>` : ''}` : t('st.unknown')],
    [t('st.dev'), `${t(L.lateral >= 0 ? 'st.right' : 'st.left')} ${Math.abs(L.lateral).toFixed(1)}°${L.foul ? t('st.outside') : ''}`],
    [t('st.wind'), `${t(L.wind >= 0 ? 'st.tail' : 'st.head')} ${Math.abs(L.wind).toFixed(1)} m/s`],
    [t('st.v0'), `${Math.round(L.v0 * 3.6)} km/h`],
  ].map(([k, v]) => `<tr><th>${k}</th><td colspan="2">${v}</td></tr>`);
  $('resTable').innerHTML = rows.concat(extra).join('');
  $('resTip').textContent = `💡 ${t(tipKey(L, hasMic))}`;
  $('btnWind').classList.toggle('hidden', !Ads.available || state.tailwind);
  $('btnWind').disabled = false;
  $('btnWind').textContent = t('res.wind');
  show('result');
}

// 2 回に 1 回、「もう一度」の前に全画面広告を出す（Android アプリのみ）
let againBusy = false;
$('btnAgain').addEventListener('click', async () => {
  if (againBusy) return;
  againBusy = true;
  if (state.plays % 2 === 0) await Ads.showInterstitial();
  againBusy = false;
  audio.pop();
  showReady();
});

// リワード広告: 最後まで見ると、次の1投が追い風になる
$('btnWind').addEventListener('click', async () => {
  $('btnWind').disabled = true;
  const r = await Ads.showRewarded();
  if (r === 'rewarded') {
    state.tailwind = true;
    $('btnWind').classList.add('hidden');
    audio.pop();
    showReady();
    return;
  }
  $('btnWind').disabled = false;
  if (r === 'unavailable') $('btnWind').textContent = t('res.adFail');
});

$('btnShare').addEventListener('click', async () => {
  const { L } = state;
  const d = world.landX.toFixed(2);
  const who = t(L.dadFlies ? 'share.dad' : 'share.table');
  const text = t(L.foul ? 'share.foul' : 'share.text', { who, d, r: rankTitle(world.landX) });
  const url = SHARE_URL;
  const nativeShare = plugin('Share');
  if (nativeShare) {
    try { await nativeShare.share({ title: t('app.name'), text, url, dialogTitle: t('share.dialog') }); } catch { /* キャンセル */ }
  } else if (navigator.share) {
    try { await navigator.share({ title: t('app.name'), text, url }); } catch { /* キャンセル */ }
  } else {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  }
});

/* ---------- アプリ（Android） ---------- */

// アプリが裏に回ったら音を止め、計測中なら取り消す
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (state.screen === 'hud') cancelThrow();
    audio.suspend();
  } else if (!Ads.showing) {
    audio.resume();
  }
});

// Android の戻るボタン：計測中は取り消し、投げている最中は無視、それ以外の画面ではアプリを閉じる
if (plugin('App')) {
  plugin('App').addListener('backButton', () => {
    if (state.screen === 'hud') cancelThrow();
    else if (state.screen !== null) plugin('App').exitApp();
  });
}

// どのビルドが入っているか分かるよう、アプリ版はタイトル画面にバージョンを出す
if (window.APP_VERSION && window.APP_VERSION !== 'dev') $('buildInfo').textContent = window.APP_VERSION;

// EU など同意が必要な地域では、タイトル画面から広告の同意内容を変更できるようにする
Ads.initDone.then(() => { if (Ads.privacyOptionsRequired) $('adPrivacy').classList.remove('hidden'); });
$('adPrivacyLink').addEventListener('click', (e) => { e.preventDefault(); Ads.showPrivacyOptions(); });

/* ---------- ループ ---------- */

function updateHud() {
  const now = performance.now() / 1000;
  const db = audio.level();
  if (db != null) state.voice.push({ t: now, db });
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
