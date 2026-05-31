/*
 * 花火の音（WebAudioで合成。音源ファイル不要）
 *
 * 「忠実再現」の一環として、開花の光から距離に応じて遅れて音が届く現象を再現する。
 *   遅延 = 距離 / 音速(約340 m/s)
 *   音量 = 号数で増減 × 距離減衰
 *
 * ブラウザの自動再生制限のため、開始ボタン(ユーザー操作)で init/resume する。
 */
const HanabiAudio = (function () {
  const SPEED_OF_SOUND = 340; // m/s
  let ctx = null;
  let master = null;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    if (ctx.state === 'suspended') ctx.resume();
  }

  // ノイズバッファ（ドンという破裂＋低い余韻）
  function makeNoise(duration) {
    const len = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /* 開花の音を鳴らす（距離に応じて遅延・減衰）
   * opts: { size:号数, distance:メートル }
   */
  function boom(opts) {
    if (!ctx) return;
    const size = opts.size || 5;
    const distance = Math.max(50, opts.distance || 500);
    const delay = distance / SPEED_OF_SOUND; // 秒

    // 距離減衰（参照50m）＋号数で音量
    const atten = 50 / (distance + 50);
    const vol = Math.min(1.0, (0.25 + size * 0.05)) * atten;
    if (vol < 0.002) return;

    const t0 = ctx.currentTime + delay;
    const dur = 0.6 + size * 0.03;

    // 1) 破裂（フィルタ付きノイズ）
    const noise = ctx.createBufferSource();
    noise.buffer = makeNoise(dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 250 + 600 / Math.sqrt(size); // 大玉ほど低い
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0, t0);
    ng.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    ng.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    noise.connect(lp); lp.connect(ng); ng.connect(master);
    noise.start(t0); noise.stop(t0 + dur);

    // 2) 低い「ドン」（サイン波の衝撃）
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const f0 = 90 - size; // 大玉ほど低音
    osc.frequency.setValueAtTime(Math.max(45, f0), t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, f0 * 0.5), t0 + 0.25);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0, t0);
    og.gain.linearRampToValueAtTime(vol * 0.9, t0 + 0.008);
    og.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.45);
    osc.connect(og); og.connect(master);
    osc.start(t0); osc.stop(t0 + 0.5);
  }

  return { init, boom };
})();

if (typeof window !== 'undefined') window.HanabiAudio = HanabiAudio;
