/* storage.js - localStorageによるセーブ管理(4人麻雀版)
 * 二人打ち版とはキーを分けている(共存可能)。 */
window.YM = window.YM || {};

(function () {
  const KEY = 'yoimachi_mahjong_4p_save_v1';
  const St = {};

  function defaults() {
    return {
      wins: 0,           // 1位回数
      gamesPlayed: 0,
      intimacy: 0,
      unlockedEvents: [],
      selectedCharacters: ['lili', 'ayano', 'tome'],
      settings: { bgm: true, se: true, volume: 60 }
    };
  }

  St.data = defaults();

  St.load = function () {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) { St.data = defaults(); return St.data; }
      const parsed = JSON.parse(raw);
      St.data = Object.assign(defaults(), parsed);
      if (!Array.isArray(St.data.unlockedEvents)) St.data.unlockedEvents = [];
      if (!Array.isArray(St.data.selectedCharacters) || St.data.selectedCharacters.length !== 3) {
        St.data.selectedCharacters = defaults().selectedCharacters;
      }
      if (typeof St.data.intimacy !== 'number') St.data.intimacy = 0;
      St.data.settings = Object.assign(defaults().settings, St.data.settings || {});
    } catch (e) {
      St.data = defaults();
    }
    return St.data;
  };

  St.save = function () {
    try {
      localStorage.setItem(KEY, JSON.stringify(St.data));
    } catch (e) { /* プライベートモード等では保存できないが動作は継続 */ }
  };

  St.hasSave = function () {
    return St.data.gamesPlayed > 0 || St.data.intimacy > 0 || St.data.unlockedEvents.length > 0;
  };

  St.reset = function () {
    St.data = defaults();
    try { localStorage.removeItem(KEY); } catch (e) { }
  };

  St.unlockEvent = function (id) {
    if (!St.data.unlockedEvents.includes(id)) {
      St.data.unlockedEvents.push(id);
      St.save();
    }
  };

  YM.Storage = St;
})();
