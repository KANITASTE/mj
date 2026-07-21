/* storage.js - localStorageによるセーブ管理(4人麻雀版)
 * 二人打ち版とはキーを分けている(共存可能)。 */
window.YM = window.YM || {};

(function () {
  const KEY = 'yoimachi_mahjong_4p_save_v1';
  const VALID_CHARACTERS = ['ayano', 'lili', 'masked', 'tanabe', 'tome', 'mofuzo'];
  const VALID_AVATARS = ['avatar-1', 'avatar-2', 'avatar-3', 'avatar-4', 'avatar-5', 'avatar-6'];
  const St = {};

  function defaults() {
    return {
      wins: 0,           // 1位回数
      gamesPlayed: 0,
      intimacy: 0,
      unlockedEvents: [],
      selectedCharacters: [],
      playerProfile: { name: '', avatar: '' },
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
      if (!Array.isArray(St.data.selectedCharacters)) St.data.selectedCharacters = [];
      St.data.selectedCharacters = St.data.selectedCharacters
        .filter((id, index, all) => VALID_CHARACTERS.includes(id) && all.indexOf(id) === index)
        .slice(0, 3);
      if (typeof St.data.intimacy !== 'number') St.data.intimacy = 0;
      St.data.settings = Object.assign(defaults().settings, St.data.settings || {});
      St.data.settings.bgm = St.data.settings.bgm !== false;
      St.data.settings.se = St.data.settings.se !== false;
      const volume = Number(St.data.settings.volume);
      St.data.settings.volume = Number.isFinite(volume) ? Math.max(0, Math.min(100, Math.round(volume))) : 60;
      St.data.playerProfile = Object.assign(defaults().playerProfile, St.data.playerProfile || {});
      St.data.playerProfile.name = typeof St.data.playerProfile.name === 'string'
        ? St.data.playerProfile.name.trim().slice(0, 12) : '';
      if (!VALID_AVATARS.includes(St.data.playerProfile.avatar)) St.data.playerProfile.avatar = '';
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
