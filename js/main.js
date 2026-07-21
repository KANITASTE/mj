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
  let characterSelection = null;

  Main.goTitle = function () {
    YM.timers.clearAll();
    YM.Animation.clear();
    $id('result-overlay').classList.add('hidden');
    $id('final-overlay').classList.add('hidden');
    $id('game-menu').classList.add('hidden');
    refreshContinue();
    UI().showScreen('title');
  };

  function refreshContinue() {
    $id('btn-continue').disabled = !St().hasSave();
  }

  function startGame() {
    AU().unlock();
    AU().se('decide');
    const saved = St().data.selectedCharacters || YM.defaultCharacterSelection;
    characterSelection = YM.CharacterUI.buildCharacterSelect(saved);
    UI().showScreen('character-select');
  }

  function confirmCharacters() {
    const selected = characterSelection ? characterSelection.getSelected() : [];
    if (selected.length !== 3) return;
    St().data.selectedCharacters = selected;
    St().save();
    AU().se('decide');
    YM.Round.startGame(selected);
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
  }

  function applyAudioSettings() {
    const s = St().data.settings;
    AU().settings.bgm = s.bgm;
    AU().settings.se = s.se;
    AU().settings.volume = s.volume;
    AU().applyVolume();
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
    $id('set-reset').addEventListener('click', () => {
      if (confirm('セーブデータを初期化します。よろしいですか?')) {
        St().reset();
        St().save();
        applyAudioSettings();
        refreshSettingsUI();
        refreshContinue();
        alert('初期化しました。');
      }
    });
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
    $id('btn-character-back').addEventListener('click', () => { AU().se('select'); UI().showScreen('title'); });
    $id('btn-howto').addEventListener('click', () => { AU().unlock(); AU().se('select'); UI().showScreen('howto'); });
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
        UI().showScreen(settingsReturn === 'game' ? 'game' : 'title');
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
    $id('btn-kan').addEventListener('click', () => YM.Turn.onKanButton());
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
