// 表示言語（日本語 / 英語）。端末の言語が日本語なら日本語、それ以外は英語。タイトル画面で切り替えも可能
const dict = {
  ja: {
    'doc.title': 'ちゃぶ台返しリメンバー',
    'app.name': 'ちゃぶ台返しリメンバー',
    'rotate.msg': 'スマホを<b>横向き</b>にしてね',
    'rotate.sub': '画面が回らないときは、画面の回転ロックを解除してください',
    'rotate.portrait': '縦のまま遊ぶ',
    'title.main': 'ちゃぶ台返し',
    'title.sub': 'リメンバー',
    'title.lead': 'スマホを振り上げて、ちゃぶ台を<br>競技場の彼方へ飛ばせ！',
    'title.start': 'はじめる',
    'title.preparing': '準備中…',
    'title.note1': '⚠ スマホがすっぽ抜けないよう<b>しっかり握って</b>（ストラップ推奨）',
    'title.note2': '周りに人や物がないか確認してから遊んでね',
    'title.note3': 'モーションセンサー・コンパス・マイクを使います',
    'legal.privacy': 'プライバシーポリシー',
    'legal.adSettings': '広告の設定',
    'url.privacy': 'https://techgym.jp/privacy-policy/',
    'ready.best': '自己ベスト',
    'ready.wind': '🎐 次の1投は追い風 <b>{v}</b>！',
    'ready.m1': 'スマホを横向きに持って、競技場（前）の方を向いて立つ',
    'ready.m2': '「構える」を押す',
    'ready.m3': '砲丸投げのように<b>クルッと1回転</b>して正面に戻り、<b>叫びながら</b>スマホを<b>振り上げる！</b>',
    'ready.t1': '「構える」を押す',
    'ready.t2': '画面を指で<b>ぐるぐる回して</b>勢いをつける',
    'ready.t3': 'そのまま<b>右上にシュッ！</b>とフリック（叫ぶと気合アップ）',
    'ready.ehou': '{year}年の恵方 <b>{dir}</b> に向かって投げると縁起ボーナス',
    'ready.arm': '構える',
    'ready.toTouch': 'タッチ操作で遊ぶ',
    'ready.toMotion': 'センサー操作に戻す',
    'chip.acc': '加速度', 'chip.gyro': 'ジャイロ', 'chip.compass': 'コンパス', 'chip.mic': 'マイク',
    'hud.titleMotion': '回れ！叫べ！<br>振り上げろ！',
    'hud.titleTouch': 'ぐるぐる回して<br>右上にフリック！',
    'hud.subMotion': '競技場の方を向いて…クルッと回って、叫んで、振り上げろ！',
    'hud.subTouch': '画面を指でぐるぐる回して → 右上にシュッ！とフリック',
    'hud.acc': '腕力', 'hud.gyro': 'キレ', 'hud.voice': '気合', 'hud.spin': '回転', 'hud.dir': '向き',
    'hud.cancel': 'やめる',
    'res.dadFlies': '👴 まさかの親父が飛んだ！',
    'res.foul': 'ファウル',
    'res.new': '🎉 自己ベスト更新！',
    'res.ref': '（参考記録）',
    'res.rank': '称号「{r}」',
    'res.again': 'もう一度',
    'res.share': 'シェア',
    'res.wind': '📺 広告を見て、次の1投を追い風にする',
    'res.adFail': '広告を読み込めませんでした',
    'st.acc': '腕力（加速度）',
    'st.jerk': '瞬発力（加加速度）',
    'st.gyro': '手首のキレ（ジャイロ）',
    'st.spin': '回転（スピン）',
    'st.voice': '気合（声）',
    'st.noMic': 'マイクなし',
    'st.elev': '振り上げ角度',
    'st.elevV': '{e}° → 射出 {a}°',
    'st.dir': '向き',
    'st.ehou': '恵方ボーナス！',
    'st.unknown': '不明',
    'st.dev': '正面からのズレ',
    'st.right': '右', 'st.left': '左',
    'st.outside': '（セクター外）',
    'st.wind': '風',
    'st.tail': '追い風', 'st.head': '向かい風',
    'st.v0': '初速',
    'rank.0': 'ちゃぶ台を撫でただけ',
    'rank.1': '反抗期の中学生',
    'rank.2': 'ちょっと短気なお父さん',
    'rank.3': '頑固親父',
    'rank.4': '昭和の雷親父',
    'rank.5': 'ちゃぶ台返し名人',
    'rank.6': 'ちゃぶ台返し世界王者',
    'rank.7': '伝説のちゃぶ台神',
    'tip.acc': 'もっと勢いよく、腕全体でスマホを振り上げよう！',
    'tip.jerk': '「溜めて→一気に！」緩急をつけると瞬発力が上がる',
    'tip.gyro': '手首のスナップを効かせると、ちゃぶ台がよく回って伸びる',
    'tip.spin': '砲丸投げのように、投げる前にクルッと1回転してみよう',
    'tip.voice': '恥ずかしがらずに「こんな飯が食えるかぁ！」と叫ぼう。声の大きさ＝気合',
    'tip.foul': '正面からズレてファウル！ 1回転してちょうど正面を向いた瞬間に振り上げよう',
    'tip.low': 'もう少し上向きに振り上げると、もっと飛ぶ！',
    'tip.high': '真上に振り上げすぎ！ 斜め前方を狙おう',
    'share.table': 'ちゃぶ台を',
    'share.dad': '親父を',
    'share.text': 'ちゃぶ台返しリメンバーで{who}{d}m飛ばした！ 称号「{r}」 #ちゃぶ台返しリメンバー',
    'share.foul': 'ちゃぶ台返しリメンバーで{who}{d}m飛ばした…けどファウル！ #ちゃぶ台返しリメンバー',
    'share.dialog': 'シェア',
    'line.0': 'こんな飯が食えるかぁ！',
    'line.1': 'ちゃぶ台返しじゃあ！',
    'line.2': '父をなめるなぁ！',
    'line.3': 'ええい、やめじゃ！',
    'line.4': 'なんじゃこの味噌汁は！',
    'line.5': 'おかわりが遅いっ！',
    'line.dad': 'あ〜れ〜〜っ！',
    'flag.wr': '砲丸投げ世界記録 {d}m',
    'flag.best': '自己ベスト {d}m',
    'flag.foul': 'ファウル',
    'fly.wind': '風 {arrow} {kind} {v}m/s',
    'fly.height': '高さ {h}m',
    'ad.0': 'ちゃぶ台返し連盟', 'ad.1': '育毛トニック', 'ad.2': '昭和食堂',
    'ad.3': 'みそ汁はあったかいうちに', 'ad.4': '雷おやじ', 'ad.5': 'ハゲ ✕ 頑固',
    dirs: ['北', '北北東', '北東', '東北東', '東', '東南東', '南東', '南南東', '南', '南南西', '南西', '西南西', '西', '西北西', '北西', '北北西'],
  },
  en: {
    'doc.title': 'Table Flip Remember',
    'app.name': 'Table Flip Remember',
    'rotate.msg': 'Turn your phone <b>sideways</b>',
    'rotate.sub': "If the screen doesn't rotate, turn off rotation lock",
    'rotate.portrait': 'Play in portrait anyway',
    'title.main': 'TABLE FLIP',
    'title.sub': 'REMEMBER',
    'title.lead': 'Swing your phone up and flip the <i>chabudai</i><br>(a low Japanese dining table) across the stadium!',
    'title.start': 'Start',
    'title.preparing': 'Getting ready…',
    'title.note1': "⚠ <b>Hold your phone tight</b> so it doesn't fly out of your hand (a wrist strap helps)",
    'title.note2': 'Make sure no one and nothing is around you',
    'title.note3': 'Uses the motion sensors, compass and microphone',
    'legal.privacy': 'Privacy Policy',
    'legal.adSettings': 'Ad settings',
    'url.privacy': 'https://techgym.jp/privacy-policy-en/',
    'ready.best': 'Best',
    'ready.wind': '🎐 Tailwind <b>{v}</b> on your next throw!',
    'ready.m1': 'Hold your phone sideways and stand facing the field (forward)',
    'ready.m2': 'Tap "Get set"',
    'ready.m3': 'Like a shot putter, <b>spin around once</b> back to the front, then <b>shout</b> and <b>swing your phone up!</b>',
    'ready.t1': 'Tap "Get set"',
    'ready.t2': '<b>Circle your finger</b> on the screen to build up speed',
    'ready.t3': 'Then <b>flick up and to the right!</b> (shouting adds spirit)',
    'ready.ehou': "Throw toward this year's lucky direction (Ehō, {year}): <b>{dir}</b> for a bonus",
    'ready.arm': 'Get set',
    'ready.toTouch': 'Play with touch controls',
    'ready.toMotion': 'Back to motion controls',
    'chip.acc': 'Accel', 'chip.gyro': 'Gyro', 'chip.compass': 'Compass', 'chip.mic': 'Mic',
    'hud.titleMotion': 'Spin! Shout! <br>Swing up!',
    'hud.titleTouch': 'Circle, then <br>flick up-right!',
    'hud.subMotion': 'Face the field… spin around, shout, and swing up!',
    'hud.subTouch': 'Circle your finger on the screen → flick up and to the right!',
    'hud.acc': 'Power', 'hud.gyro': 'Snap', 'hud.voice': 'Spirit', 'hud.spin': 'Spin', 'hud.dir': 'Facing',
    'hud.cancel': 'Cancel',
    'res.dadFlies': '👴 Whoa, Dad flew instead!',
    'res.foul': 'FOUL',
    'res.new': '🎉 New personal best!',
    'res.ref': '(unofficial)',
    'res.rank': 'Rank: {r}',
    'res.again': 'Again',
    'res.share': 'Share',
    'res.wind': '📺 Watch an ad for a tailwind on your next throw',
    'res.adFail': "Couldn't load an ad",
    'st.acc': 'Power (acceleration)',
    'st.jerk': 'Burst (jerk)',
    'st.gyro': 'Wrist snap (gyro)',
    'st.spin': 'Spin',
    'st.voice': 'Spirit (voice)',
    'st.noMic': 'No mic',
    'st.elev': 'Swing angle',
    'st.elevV': '{e}° → launch {a}°',
    'st.dir': 'Facing',
    'st.ehou': 'Lucky direction bonus!',
    'st.unknown': 'Unknown',
    'st.dev': 'Off center',
    'st.right': 'Right', 'st.left': 'Left',
    'st.outside': ' (out of sector)',
    'st.wind': 'Wind',
    'st.tail': 'Tailwind', 'st.head': 'Headwind',
    'st.v0': 'Launch speed',
    'rank.0': 'Barely touched the table',
    'rank.1': 'Rebellious teenager',
    'rank.2': 'Slightly grumpy dad',
    'rank.3': 'Stubborn old man',
    'rank.4': 'Thunderous Showa-era dad',
    'rank.5': 'Table Flip Master',
    'rank.6': 'Table Flip World Champion',
    'rank.7': 'Legendary Table Flip God',
    'tip.acc': 'Swing harder — use your whole arm to whip the phone up!',
    'tip.jerk': 'Hold back, then explode! A sudden burst adds power',
    'tip.gyro': 'Snap your wrist — a spinning table flies farther',
    'tip.spin': 'Spin around once before you throw, like a shot putter',
    'tip.voice': "Don't be shy — yell \"I can't eat this!\" The louder you shout, the more spirit",
    'tip.foul': 'You were off center — foul! Spin once and swing up just as you face forward',
    'tip.low': 'Swing a little more upward and it will fly farther!',
    'tip.high': 'Too straight up! Aim up and forward',
    'share.table': 'the chabudai',
    'share.dad': 'Dad',
    'share.text': 'I flipped {who} {d} m in Table Flip Remember! Rank: {r} #ChabudaiFlip',
    'share.foul': 'I flipped {who} {d} m in Table Flip Remember… but it was a foul! #ChabudaiFlip',
    'share.dialog': 'Share',
    'line.0': "I can't eat this!",
    'line.1': 'TABLE FLIP!!',
    'line.2': "Don't mess with Dad!",
    'line.3': "That's it, I'm done!",
    'line.4': 'What is this miso soup?!',
    'line.5': "Where's my refill?!",
    'line.dad': 'Whoaaaaa!',
    'flag.wr': 'Shot put world record {d}m',
    'flag.best': 'Your best {d}m',
    'flag.foul': 'FOUL',
    'fly.wind': 'Wind {arrow} {kind} {v}m/s',
    'fly.height': 'Height {h}m',
    'ad.0': 'Table Flip League', 'ad.1': 'Hair Tonic', 'ad.2': 'Showa Diner',
    'ad.3': 'Eat your miso soup hot', 'ad.4': 'Thunder Dad', 'ad.5': 'BALD ✕ STUBBORN',
    dirs: ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'],
  },
};

const STORE_KEY = 'chabudai.lang';
let saved = null;
try { saved = localStorage.getItem(STORE_KEY); } catch { /* 保存不可 */ }
const deviceLang = (navigator.languages && navigator.languages[0]) || navigator.language || 'ja';
let lang = dict[saved] ? saved : (/^ja\b/i.test(deviceLang) ? 'ja' : 'en');
const listeners = [];

// t('res.rank', { r: '頑固親父' }) → '称号「頑固親父」'
export function t(key, vars) {
  let s = dict[lang][key];
  if (s === undefined) s = dict.ja[key];
  if (s === undefined) return key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m)) : s;
}

// 方位の名前（北=0 から 22.5° ごとの 16 方位）
export function dirLabel(index) {
  return dict[lang].dirs[index];
}

// data-i18n（文字）/ data-i18n-html（タグを含む）/ data-i18n-href（リンク先）の付いた要素を書き換える
export function applyI18n() {
  document.documentElement.lang = lang;
  document.title = t('doc.title');
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  document.querySelectorAll('[data-i18n-href]').forEach((el) => { el.href = t(el.dataset.i18nHref); });
  document.querySelectorAll('[data-lang]').forEach((el) => el.classList.toggle('on', el.dataset.lang === lang));
}

export function setLang(l) {
  if (!dict[l] || l === lang) return;
  lang = l;
  try { localStorage.setItem(STORE_KEY, l); } catch { /* 保存不可 */ }
  applyI18n();
  listeners.forEach((f) => f(l));
}

export function getLang() {
  return lang;
}

export function onLangChange(f) {
  listeners.push(f);
}
