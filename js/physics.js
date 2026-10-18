// センサー値 → 初速・角度などへの変換（いろんなセンサーを混ぜて記録をバラけさせる）
export const SECTOR_HALF = 17.46; // 砲丸投げの投てき角度 34.92° の半分
export const WORLD_RECORD = 23.56; // 砲丸投げ男子世界記録 (m)

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// 頭打ちせずに伸び続ける正規化 (0〜1)
const soft = (x, k) => 1 - Math.exp(-Math.max(0, x) / k);

export const DIR16 = ['北', '北北東', '北東', '東北東', '東', '東南東', '南東', '南南東', '南', '南南西', '南西', '西南西', '西', '西北西', '北西', '北北西'];
export const dirName = (deg) => DIR16[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
export const angDiff = (a, b) => ((a - b + 540) % 360) - 180;

// その年の恵方（西暦の下1桁で決まる）
export function ehouOf(year) {
  return [255, 165, 345, 165, 75, 255, 165, 345, 165, 75][year % 10];
}

export function meterScores(m, hasMic) {
  return {
    acc: soft(m.accPeak, 28),
    jerk: soft(m.jerkPeak, 1200),
    gyro: soft(m.gyroPeak, 900),
    spin: soft(m.spinDeg, 540),
    voice: hasMic && m.voiceDb != null
      ? clamp((m.voiceDb + 55) / 45, 0, 1) * 0.8 + clamp(m.voiceTime / 1.5, 0, 1) * 0.2
      : 0.3,
  };
}

export const WEIGHTS = { acc: 0.28, jerk: 0.12, gyro: 0.2, spin: 0.22, voice: 0.18 };

export function computeLaunch(m, hasMic) {
  const s = meterScores(m, hasMic);
  let power = 0;
  for (const k in WEIGHTS) power += WEIGHTS[k] * s[k];

  const luck = 1 + (Math.random() - 0.5) * 0.08;
  const ehou = ehouOf(new Date().getFullYear());
  const ehouHit = m.heading != null && Math.abs(angDiff(m.heading, ehou)) <= 22.5;
  let v0 = (5 + 27 * power) * luck * (ehouHit ? 1.08 : 1);

  // 振り上げた角度 → 射出角。真上に振り上げても前に飛ぶよう緩めにマッピング
  const elev = m.elevDeg ?? 35 + Math.random() * 20;
  const angle = clamp(15 + 0.55 * elev, 8, 70);

  // 構えた正面からのズレ → 左右の方向。ズレすぎるとファウル
  const lateral = m.releaseDev != null ? clamp(m.releaseDev * 0.3, -45, 45) : (Math.random() - 0.5) * 12;
  const foul = Math.abs(lateral) > SECTOR_HALF;

  const wind = Math.round((Math.random() * 5 - 2.5) * 10) / 10;
  const spinRate = 3 + s.gyro * 12;

  // ごくたまに親父が飛ぶ。回りすぎて目を回すと確率アップ
  const dadChance = 0.03 + (m.spinDeg > 720 ? 0.07 * soft(m.spinDeg - 720, 360) : 0);
  const dadFlies = Math.random() < dadChance;
  if (dadFlies) v0 *= 1.1;

  return { s, power, v0, angle, elev, lateral, foul, wind, ehou, ehouHit, spinRate, dadFlies, luck };
}

const TITLES = [
  [5, 'ちゃぶ台を撫でただけ'],
  [12, '反抗期の中学生'],
  [WORLD_RECORD, 'ちょっと短気なお父さん'],
  [40, '頑固親父'],
  [60, '昭和の雷親父'],
  [85, 'ちゃぶ台返し名人'],
  [110, 'ちゃぶ台返し世界王者'],
  [Infinity, '伝説のちゃぶ台神'],
];

export function rankTitle(d) {
  return TITLES.find(([max]) => d < max)[1];
}

const TIPS = {
  acc: 'もっと勢いよく、腕全体でスマホを振り上げよう！',
  jerk: '「溜めて→一気に！」緩急をつけると瞬発力が上がる',
  gyro: '手首のスナップを効かせると、ちゃぶ台がよく回って伸びる',
  spin: '砲丸投げのように、投げる前にクルッと1回転してみよう',
  voice: '恥ずかしがらずに「こんな飯が食えるかぁ！」と叫ぼう。声の大きさ＝気合',
};

export function tipFor(L, hasMic) {
  if (L.foul) return '正面からズレてファウル！ 1回転してちょうど正面を向いた瞬間に振り上げよう';
  if (L.angle < 28) return 'もう少し上向きに振り上げると、もっと飛ぶ！';
  if (L.angle > 55) return '真上に振り上げすぎ！ 斜め前方を狙おう';
  let worst = null;
  for (const k in WEIGHTS) {
    if (k === 'voice' && !hasMic) continue;
    if (!worst || L.s[k] < L.s[worst]) worst = k;
  }
  return TIPS[worst];
}
