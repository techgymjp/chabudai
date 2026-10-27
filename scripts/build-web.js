// Android アプリに同梱する Web ファイルを www/ にコピーする
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'www');
fs.rmSync(out, { recursive: true, force: true });
for (const item of ['index.html', 'style.css', 'js', 'fonts', 'icon.svg', 'manifest.webmanifest']) {
  const src = path.join(root, item);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(out, item), { recursive: true });
}
// Google Play 用のビルドでは本番の広告を使う
const mode = process.env.ADMOB_MODE === 'production' ? 'production' : 'test';
if (mode === 'production') {
  // 本番の ID を入れ忘れたまま、ストア用のビルドを作らないようにする。
  // ADMOB_PLATFORM（android / ios）でどちらの ID を確かめるか決める（未指定なら両方）
  const target = process.env.ADMOB_PLATFORM;
  const ads = fs.readFileSync(path.join(root, 'js', 'ads.js'), 'utf8');
  const problems = [];
  const block = (name) => ads.slice(ads.indexOf(`  ${name}: {`), ads.indexOf('\n  },', ads.indexOf(`  ${name}: {`)));
  if (target !== 'ios') {
    const strings = fs.readFileSync(path.join(root, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml'), 'utf8');
    if (/production:[\s\S]*XXXXXXXXXX/.test(block('android'))) problems.push('js/ads.js の Android 用の本番の広告ユニット ID');
    if (strings.includes('ca-app-pub-3940256099942544')) problems.push('android/app/src/main/res/values/strings.xml の admob_app_id（テスト用のアプリ ID のまま）');
  }
  if (target !== 'android') {
    const plist = fs.readFileSync(path.join(root, 'ios', 'App', 'App', 'Info.plist'), 'utf8');
    if (/production:[\s\S]*XXXXXXXXXX/.test(block('ios'))) problems.push('js/ads.js の iOS 用の本番の広告ユニット ID');
    if (plist.includes('ca-app-pub-3940256099942544')) problems.push('ios/App/App/Info.plist の GADApplicationIdentifier（テスト用のアプリ ID のまま）');
  }
  if (problems.length) {
    console.error(`本番の AdMob の ID が設定されていません: ${problems.join('、')}`);
    process.exit(1);
  }
}
fs.writeFileSync(path.join(out, 'js', 'ads-config.js'), `// ビルド時に生成\nwindow.AD_MODE = '${mode}';\n`);
// タイトル画面に出すバージョン（CI では VERSION_NAME / VERSION_CODE を使う）
const version = process.env.VERSION_CODE
  ? `v${process.env.VERSION_NAME || require('../package.json').version} (build ${process.env.VERSION_CODE})`
  : 'dev';
fs.writeFileSync(path.join(out, 'js', 'build-info.js'), `// ビルド時に生成\nwindow.APP_VERSION = '${version}';\n`);
console.log(`built web assets into www/ (ads: ${mode}, version: ${version})`);
