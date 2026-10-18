// マイク音量の取得と、効果音の合成（音声ファイル不要）
export class AudioFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.stream = null;
    this.an = null;
    this.td = null;
    this.noiseBuf = null;
  }

  get micOk() {
    return !!this.an;
  }

  // ユーザー操作の中で呼ぶ
  unlock() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      const n = this.ctx.sampleRate * 2;
      this.noiseBuf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const s = this.ctx.createBufferSource();
    s.buffer = this.ctx.createBuffer(1, 1, 22050);
    s.connect(this.ctx.destination);
    s.start(0);
  }

  requestMic() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.resolve(false);
    return navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
      .then((st) => { this.stream = st; return true; })
      .catch(() => false);
  }

  attachMic() {
    if (!this.stream || !this.ctx || this.an) return;
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.an = this.ctx.createAnalyser();
    this.an.fftSize = 1024;
    src.connect(this.an);
    this.td = new Float32Array(this.an.fftSize);
  }

  // 現在の音量 (dBFS)。マイクが無ければ null
  level() {
    if (!this.an || !this.an.getFloatTimeDomainData) return null;
    this.an.getFloatTimeDomainData(this.td);
    let s = 0;
    for (let i = 0; i < this.td.length; i++) s += this.td[i] * this.td[i];
    return 20 * Math.log10(Math.sqrt(s / this.td.length) + 1e-6);
  }

  _noise(t0, dur, filterType, freq, q, gain, attack = 0.005) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0, Math.random());
    src.stop(t0 + dur + 0.05);
    return f;
  }

  _tone(t0, freq, dur, gain, type = 'sine', freqEnd = null) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  _ok() {
    return this.ctx && this.ctx.state === 'running';
  }

  // ガシャーン！
  crash() {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    this._noise(t, 0.7, 'bandpass', 2500, 0.7, 0.9);
    this._noise(t, 0.25, 'lowpass', 600, 0.5, 0.8);
    for (let i = 0; i < 7; i++) {
      this._tone(t + Math.random() * 0.25, 1800 + Math.random() * 3000, 0.15 + Math.random() * 0.2, 0.12, 'triangle');
    }
  }

  // 食器が割れる
  clink(v = 1) {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    this._noise(t, 0.18, 'highpass', 3500, 0.5, 0.25 * v);
    for (let i = 0; i < 3; i++) this._tone(t + Math.random() * 0.06, 2500 + Math.random() * 2500, 0.12, 0.07 * v, 'triangle');
  }

  whoosh(dur = 1.2) {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    const f = this._noise(t, dur, 'bandpass', 400, 1.5, 0.5, 0.15);
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(1600, t + dur * 0.3);
    f.frequency.exponentialRampToValueAtTime(250, t + dur);
  }

  // ドスン
  thud(v = 1) {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    this._tone(t, 140, 0.35, 0.9 * v, 'sine', 40);
    this._noise(t, 0.3, 'lowpass', 400, 0.7, 0.6 * v);
  }

  // 観客の歓声
  cheer(big = false) {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    const dur = big ? 3.5 : 2.2;
    this._noise(t, dur, 'bandpass', 900, 0.4, big ? 0.35 : 0.2, 0.4);
    this._noise(t, dur * 0.9, 'bandpass', 2200, 0.8, big ? 0.15 : 0.08, 0.5);
    if (big) {
      this._tone(t + 0.3, 2400, 0.25, 0.1, 'sine', 2600);
      this._tone(t + 0.65, 2400, 0.4, 0.1, 'sine', 2000);
    }
  }

  pop() {
    if (!this._ok()) return;
    this._tone(this.ctx.currentTime, 600, 0.12, 0.25, 'sine', 900);
  }
}
