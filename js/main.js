/* main.js - 起動処理と画面間の配線(4人麻雀版) */
window.YM = window.YM || {};

/* 完成時は false にするとDEVボタンが消える */
const DEBUG_MODE = true;

(function () {
  const $id = id => document.getElementById(id);
  const UI = () => YM.UI;
  const AU = () => YM.Audio;
  const St = () => YM.Storage;

  const Main = {};
  const PREP_BGM = 'assets/audio/mainbgm.mp3';
  let characterSelection = null;
  let selectedAvatar = '';
  const prepTouchedSettings = new Set();

  Main.goTitle = function () {
    YM.timers.clearAll();
    YM.Animation.clear();
    $id('result-overlay').classList.add('hidden');
    $id('final-overlay').classList.add('hidden');
    $id('game-menu').classList.add('hidden');
    refreshContinue();
    AU().stopBgm(true);
    UI().showScreen('title');
  };

  function refreshContinue() {
    $id('btn-continue').disabled = !St().hasSave();
  }

  function startGame() {
    AU().unlock();
    AU().se('decide');
    resetPrepInteractionState();
    const savedSelection = YM.normalizeCharacterSelection(St().data.selectedCharacters);
    characterSelection = YM.CharacterUI.buildCharacterSelect(savedSelection);
    refreshProfileUI(false);
    refreshPrepSettingsUI();
    updatePrepReady();
    UI().showScreen('character-select');
    AU().playBgm(PREP_BGM);
  }

  function confirmCharacters() {
    const selected = YM.normalizeCharacterSelection(
      characterSelection ? characterSelection.getSelected() : []
    );
    const name = $id('player-name').value.trim();
    if (!name) {
      $id('profile-error').textContent = 'プレイヤー名を入力してください。';
      $id('player-name').focus();
      return;
    }
    if (!selectedAvatar) {
      $id('profile-error').textContent = 'アバターを1つ選んでください。';
      return;
    }
    if (selected.length !== 3) return;
    St().data.playerProfile = { name: name.slice(0, 12), avatar: selectedAvatar };
    St().data.selectedCharacters = selected;
    St().save();
    AU().se('decide');
    YM.Round.startGame(selected);
  }

  /* ===== GAME START準備画面 ===== */
  function refreshProfileUI(clearAvatar) {
    const profile = St().data.playerProfile || { name: '', avatar: '' };
    $id('player-name').value = profile.name || '';
    selectedAvatar = clearAvatar ? '' : (profile.avatar || '');
    renderAvatarSelection();
    $id('profile-error').textContent = '';
  }

  function renderAvatarSelection() {
    document.querySelectorAll('.prep-avatar').forEach(btn => {
      const active = btn.dataset.avatar === selectedAvatar;
      btn.classList.toggle('selected', active);
      btn.setAttribute('aria-checked', String(active));
      btn.tabIndex = active || !selectedAvatar ? 0 : -1;
    });
  }

  function updatePrepReady(showNameError) {
    const name = $id('player-name').value.trim();
    const opponents = characterSelection ? characterSelection.getSelected() : [];
    const ready = !!name && !!selectedAvatar && opponents.length === 3;
    const button = $id('btn-confirm-characters');
    button.disabled = !ready;
    button.classList.toggle('ready', ready);
    if (showNameError && !name) $id('profile-error').textContent = 'プレイヤー名を入力してください。';
    else if (name) $id('profile-error').textContent = '';
  }

  function refreshPrepSettingsUI() {
    if (!$id('prep-volume')) return;
    const s = St().data.settings;
    const setOption = (id, selected, key) => {
      const el = $id(id);
      const touched = prepTouchedSettings.has(key);
      el.classList.toggle('selected', touched && selected);
      el.classList.toggle('touched', touched);
      el.setAttribute('aria-pressed', String(selected));
    };
    setOption('prep-bgm-on', s.bgm, 'bgm');
    setOption('prep-bgm-off', !s.bgm, 'bgm');
    setOption('prep-se-on', s.se, 'se');
    setOption('prep-se-off', !s.se, 'se');
    $id('prep-volume').value = s.volume;
    $id('prep-volume-value').value = `${s.volume}%`;
    $id('prep-volume-value').textContent = `${s.volume}%`;
    document.querySelector('.prep-stage').classList.toggle('volume-touched', prepTouchedSettings.has('volume'));
  }

  function resetPrepInteractionState() {
    prepTouchedSettings.clear();
    const stage = document.querySelector('.prep-stage');
    if (stage) stage.classList.remove('volume-touched');
  }

  function resetSaveData() {
    if (!confirm('名前、アイコン、対戦成績、解放イベント、選択メンバー、設定をすべて初期化します。よろしいですか？')) return;
    St().reset();
    St().save();
    applyAudioSettings();
    resetPrepInteractionState();
    refreshSettingsUI();
    refreshProfileUI();
    characterSelection = YM.CharacterUI.buildCharacterSelect([]);
    updatePrepReady();
    refreshContinue();
    alert('初期化しました。');
  }

  function wirePrepScreen() {
    $id('player-name').addEventListener('input', e => {
      St().data.playerProfile.name = e.target.value.slice(0, 12);
      St().save();
      updatePrepReady(false);
    });
    $id('player-name').addEventListener('blur', () => {
      St().data.playerProfile.name = $id('player-name').value.trim().slice(0, 12);
      $id('player-name').value = St().data.playerProfile.name;
      St().save();
      updatePrepReady(true);
    });
    document.querySelectorAll('.prep-avatar').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedAvatar = btn.dataset.avatar;
        St().data.playerProfile.avatar = selectedAvatar;
        St().save();
        renderAvatarSelection();
        updatePrepReady();
        AU().se('select');
      });
      btn.addEventListener('keydown', e => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
        e.preventDefault();
        const buttons = Array.from(document.querySelectorAll('.prep-avatar'));
        const current = buttons.indexOf(btn);
        const delta = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' ? -3 : 3;
        buttons[(current + delta + buttons.length) % buttons.length].focus();
      });
    });
    document.addEventListener('ym:opponents-changed', e => {
      St().data.selectedCharacters = YM.normalizeCharacterSelection(e.detail);
      St().save();
      updatePrepReady();
    });

    const setAudio = (key, value) => {
      prepTouchedSettings.add(key);
      St().data.settings[key] = value;
      St().save();
      applyAudioSettings();
      refreshSettingsUI();
      AU().se('select');
    };
    $id('prep-bgm-on').addEventListener('click', () => setAudio('bgm', true));
    $id('prep-bgm-off').addEventListener('click', () => setAudio('bgm', false));
    $id('prep-se-on').addEventListener('click', () => setAudio('se', true));
    $id('prep-se-off').addEventListener('click', () => setAudio('se', false));
    const revealVolume = () => {
      prepTouchedSettings.add('volume');
      refreshPrepSettingsUI();
    };
    $id('prep-volume').addEventListener('pointerdown', revealVolume);
    $id('prep-volume').addEventListener('focus', revealVolume);
    $id('prep-volume').addEventListener('input', e => {
      prepTouchedSettings.add('volume');
      St().data.settings.volume = parseInt(e.target.value, 10);
      St().save();
      applyAudioSettings();
      refreshSettingsUI();
    });
    $id('prep-reset').addEventListener('click', resetSaveData);
  }

  /* ===== 設定画面 ===== */
  function refreshSettingsUI() {
    const s = St().data.settings;
    $id('set-bgm').textContent = s.bgm ? 'ON' : 'OFF';
    $id('set-bgm').classList.toggle('off', !s.bgm);
    $id('set-se').textContent = s.se ? 'ON' : 'OFF';
    $id('set-se').classList.toggle('off', !s.se);
    $id('set-volume').value = s.volume;
    $id('set-volume-val').textContent = s.volume;
    refreshPrepSettingsUI();
  }

  function applyAudioSettings() {
    const s = St().data.settings;
    AU().settings.bgm = s.bgm;
    AU().settings.se = s.se;
    AU().settings.volume = s.volume;
    AU().applyVolume();
    AU().syncBgm();
  }

  let settingsReturn = 'title';

  function wireSettings() {
    $id('set-bgm').addEventListener('click', () => {
      St().data.settings.bgm = !St().data.settings.bgm;
      St().save(); applyAudioSettings(); refreshSettingsUI(); AU().se('select');
    });
    $id('set-se').addEventListener('click', () => {
      St().data.settings.se = !St().data.settings.se;
      St().save(); applyAudioSettings(); refreshSettingsUI(); AU().se('select');
    });
    $id('set-volume').addEventListener('input', e => {
      St().data.settings.volume = parseInt(e.target.value, 10);
      St().save(); applyAudioSettings();
      $id('set-volume-val').textContent = e.target.value;
    });
    $id('set-reset').addEventListener('click', resetSaveData);
  }

  /* ===== スマホ判定 ===== */
  function checkMobile() {
    const small = Math.max(window.innerWidth, window.innerHeight) < 900 ||
      (window.innerWidth < 700);
    $id('mobile-block').classList.toggle('hidden', !small);
  }

  /* ===== 起動 ===== */
  document.addEventListener('DOMContentLoaded', () => {
    St().load();
    applyAudioSettings();
    wirePrepScreen();
    wireSettings();
    refreshSettingsUI();
    refreshContinue();
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // タイトルメニュー
    $id('btn-start').addEventListener('click', startGame);
    $id('btn-continue').addEventListener('click', startGame);
    $id('btn-random-characters').addEventListener('click', () => { AU().se('select'); characterSelection.randomize(); });
    $id('btn-confirm-characters').addEventListener('click', confirmCharacters);
    $id('btn-character-back').addEventListener('click', () => { AU().se('select'); Main.goTitle(); });
    $id('btn-howto').addEventListener('click', () => { AU().unlock(); AU().se('select'); settingsReturn = 'title'; UI().showScreen('howto'); });
    $id('btn-prep-howto').addEventListener('click', () => { AU().se('select'); settingsReturn = 'character-select'; UI().showScreen('howto'); });
    $id('btn-settings').addEventListener('click', () => {
      AU().unlock(); AU().se('select');
      settingsReturn = 'title';
      UI().showScreen('settings');
    });
    $id('btn-gallery').addEventListener('click', () => {
      AU().unlock(); AU().se('select');
      YM.CharacterUI.buildGallery();
      UI().showScreen('gallery');
    });
    $id('btn-credit').addEventListener('click', () => { AU().unlock(); AU().se('select'); UI().showScreen('credit'); });

    // 「もどる」共通
    document.querySelectorAll('[data-back]').forEach(btn => {
      btn.addEventListener('click', () => {
        AU().se('select');
        UI().showScreen(settingsReturn === 'game' ? 'game' : settingsReturn === 'character-select' ? 'character-select' : 'title');
        if (settingsReturn === 'game') $id('game-menu').classList.remove('hidden');
        settingsReturn = 'title';
        refreshContinue();
      });
    });

    $id('gallery-viewer-close').addEventListener('click', () => {
      $id('gallery-viewer').classList.add('hidden');
    });

    // 対局中の操作ボタン
    $id('btn-riichi').addEventListener('click', () => YM.Turn.onRiichiButton());
    $id('btn-tsumo').addEventListener('click', () => YM.Turn.onTsumoButton());
    $id('btn-kan').addEventListener('click', () => {
      const g = YM.Game.G;
      const pending = g && g.phase === 'calls' && g.pendingCalls;
      const myCall = pending && pending.options && pending.options.find(option => option.player === 0);
      if (myCall && myCall.minkan) YM.Calls.onHumanDecision({ type: 'kan' });
      else YM.Turn.onKanButton();
    });
    $id('btn-ron').addEventListener('click', () => {
      const g = YM.Game.G;
      if (g && g.pendingCalls && g.pendingCalls.mode === 'chankan') YM.Calls.onHumanChankan(true);
      else YM.Calls.onHumanDecision({ type: 'ron' });
    });
    $id('btn-pon').addEventListener('click', () => YM.Calls.onHumanDecision({ type: 'pon' }));
    $id('btn-minkan').addEventListener('click', () => YM.Calls.onHumanDecision({ type: 'kan' }));
    $id('btn-chi').addEventListener('click', () => YM.Calls.onHumanDecision({ type: 'chi' }));
    $id('btn-pass').addEventListener('click', () => {
      const g = YM.Game.G;
      if (!g) return;
      if (g.phase === 'calls') YM.Calls.onHumanPass();
      else YM.Turn.onPassTsumo();
    });
    $id('btn-menu').addEventListener('click', () => {
      AU().se('select');
      $id('game-menu').classList.remove('hidden');
    });
    $id('chi-select-cancel').addEventListener('click', () => {
      UI().hideChiSelect();
    });

    // ゲーム内メニュー
    $id('gm-resume').addEventListener('click', () => {
      AU().se('select');
      $id('game-menu').classList.add('hidden');
    });
    $id('gm-settings').addEventListener('click', () => {
      AU().se('select');
      settingsReturn = 'game';
      $id('game-menu').classList.add('hidden');
      UI().showScreen('settings');
    });
    $id('gm-title').addEventListener('click', () => {
      AU().se('select');
      $id('game-menu').classList.add('hidden');
      Main.goTitle();
    });

    // 勝利イベント後の選択肢
    $id('ev-rematch').addEventListener('click', () => { AU().se('decide'); YM.Round.startGame(); });
    $id('ev-title').addEventListener('click', Main.goTitle);

    // DEVパネル
    if (!DEBUG_MODE) {
      $id('dev-toggle').style.display = 'none';
    } else {
      YM.Dev.wire();
    }

    UI().showScreen('title');
  });

  YM.Main = Main;
})();
