/* audio.js - Web Audio APIによる簡易効果音
 * 音声ファイルを assets/audio/ に置いて差し替えられるよう、
 * se(name) の入口を一本化してある。BGMは未実装(フックのみ)。 */
window.YM = window.YM || {};

(function () {
  const AU = {};
  let ctx = null;
  let master = null;
  let enabled = false;
  let bgmPlayer = null;
  let bgmSource = '';
  let bgmRequested = false;
  const BGM_VOLUME_SCALE = 0.5;

  AU.settings = { bgm: true, se: true, volume: 60 };

  // 初回のユーザー操作後に呼ぶ(自動再生制限対策)
  AU.unlock = function () {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return;
    }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.connect(ctx.destination);
      AU.applyVolume();
      enabled = true;
    } catch (e) {
      enabled = false;
    }
  };

  AU.applyVolume = function () {
    const normalized = Math.max(0, Math.min(100, Number(AU.settings.volume) || 0)) / 100;
    if (master) master.gain.value = normalized * 0.5;
    if (bgmPlayer) {
      bgmPlayer.volume = normalized * BGM_VOLUME_SCALE;
      bgmPlayer.dataset.volume = String(bgmPlayer.volume);
    }
  };

  function ensureBgmPlayer() {
    if (bgmPlayer) return bgmPlayer;
    bgmPlayer = document.createElement('audio');
    bgmPlayer.id = 'ym-main-bgm';
    bgmPlayer.hidden = true;
    bgmPlayer.loop = true;
    bgmPlayer.preload = 'auto';
    bgmPlayer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bgmPlayer);
    AU.applyVolume();
    return bgmPlayer;
  }

  AU.playBgm = function (src) {
    if (!src) return Promise.resolve(false);
    const player = ensureBgmPlayer();
    const absoluteSrc = new URL(src, document.baseURI).href;
    bgmRequested = true;

    if (bgmSource !== absoluteSrc) {
      player.pause();
      player.src = src;
      player.currentTime = 0;
      player.load();
      bgmSource = absoluteSrc;
    }

    AU.applyVolume();
    if (!AU.settings.bgm) {
      player.pause();
      return Promise.resolve(false);
    }
    return player.play().then(() => true).catch(() => false);
  };

  AU.stopBgm = function (forgetSource) {
    bgmRequested = false;
    if (!bgmPlayer) return;
    bgmPlayer.pause();
    bgmPlayer.currentTime = 0;
    if (forgetSource !== false) {
      bgmPlayer.removeAttribute('src');
      bgmPlayer.load();
      bgmSource = '';
    }
  };

  AU.syncBgm = function () {
    AU.applyVolume();
    if (!bgmPlayer || !bgmRequested || !bgmSource) return;
    if (AU.settings.bgm) bgmPlayer.play().catch(() => {});
    else bgmPlayer.pause();
  };

  AU.getBgmState = function () {
    return {
      source: bgmSource,
      requested: bgmRequested,
      paused: bgmPlayer ? bgmPlayer.paused : true,
      loop: bgmPlayer ? bgmPlayer.loop : false,
      volume: bgmPlayer ? bgmPlayer.volume : 0
    };
  };

  function tone(freq, dur, type, vol, delay, slideTo) {
    if (!enabled || !AU.settings.se) return;
    if (ctx.state === 'suspended') ctx.resume();
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.linearRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol || 0.18, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, delay) {
    if (!enabled || !AU.settings.se) return;
    const t0 = ctx.currentTime + (delay || 0);
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = vol || 0.2;
    src.connect(g).connect(master);
    src.start(t0);
  }

  const SE = {
    select:  () => tone(880, 0.05, 'square', 0.10),
    discard: () => { noise(0.06, 0.25); tone(220, 0.06, 'triangle', 0.2); },
    draw:    () => tone(660, 0.04, 'triangle', 0.10),
    decide:  () => { tone(660, 0.06, 'square', 0.12); tone(990, 0.08, 'square', 0.12, 0.06); },
    riichi:  () => { tone(440, 0.1, 'sawtooth', 0.16); tone(660, 0.12, 'sawtooth', 0.16, 0.1); tone(880, 0.2, 'sawtooth', 0.14, 0.2); },
    ron:     () => { tone(330, 0.12, 'sawtooth', 0.2); tone(220, 0.3, 'sawtooth', 0.2, 0.12); },
    tsumo:   () => { tone(523, 0.1, 'square', 0.15); tone(659, 0.1, 'square', 0.15, 0.1); tone(784, 0.2, 'square', 0.15, 0.2); },
    win:     () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'square', 0.14, i * 0.13)); },
    lose:    () => { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.2, 'triangle', 0.16, i * 0.16)); },
    event:   () => { [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.22, 'sine', 0.16, i * 0.15)); }
  };

  AU.se = function (name) {
    if (SE[name]) SE[name]();
  };

  YM.Audio = AU;
})();
