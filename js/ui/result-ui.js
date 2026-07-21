/* result-ui.js - 和了・流局・最終結果の表示 */
window.YM = window.YM || {};

(function () {
  const R = {};
  const $id = id => document.getElementById(id);
  const G = () => YM.Game.G;

  /* ===== 和了結果 ===== */
  R.showWin = function (opts) {
    const ov = $id('result-overlay');
    $id('result-banner').textContent = opts.banner || '';

    // 手牌+副露+和了牌
    const handEl = $id('result-hand');
    handEl.innerHTML = '';
    (opts.handTiles || []).forEach(k => handEl.appendChild(YM.UI.tileEl(k, { small: true })));
    (opts.melds || []).forEach(m => {
      const spacer = document.createElement('div');
      spacer.className = 'result-meld-gap';
      handEl.appendChild(spacer);
      const tiles = m.type === 'ankan'
        ? [null, m.tile, m.tile, null]
        : m.tiles.map(t => t.kind);
      tiles.forEach(k => {
        handEl.appendChild(k == null
          ? YM.UI.tileEl(0, { small: true, back: true })
          : YM.UI.tileEl(k, { small: true }));
      });
    });
    if (opts.winKind != null) {
      const w = YM.UI.tileEl(opts.winKind, { small: true });
      w.style.marginLeft = '10px';
      w.style.outline = '2px solid var(--crimson)';
      handEl.appendChild(w);
    }

    // 役リスト
    const listEl = $id('result-yaku-list');
    listEl.innerHTML = '';
    (opts.yakuList || []).forEach((y, i) => {
      const row = document.createElement('div');
      row.className = 'yaku-row';
      row.style.animationDelay = (0.25 + i * 0.25) + 's';
      row.innerHTML = `<span>${y.name}</span><span>${y.han >= 13 ? '役満' : y.han + '翻'}</span>`;
      listEl.appendChild(row);
    });
    if (opts.doraCount > 0) {
      const row = document.createElement('div');
      row.className = 'yaku-row';
      row.style.animationDelay = (0.25 + (opts.yakuList || []).length * 0.25) + 's';
      row.innerHTML = `<span>ドラ</span><span>${opts.doraCount}翻</span>`;
      listEl.appendChild(row);
    }

    // 点数表示
    const rankTag = opts.rank ? `<span class="score-rank">${opts.rank}</span>` : '';
    const fuHan = opts.yakuman ? '役満' : `${opts.fu}符${opts.han}翻`;
    $id('result-score').innerHTML = `${rankTag}${fuHan}  ${opts.payText}点`;

    // 4人の点数変動
    renderDeltas($id('result-deltas'), opts.deltas);

    $id('result-next').onclick = () => {
      ov.classList.add('hidden');
      if (opts.onNext) opts.onNext();
    };
    ov.classList.remove('hidden');
  };

  /* ===== 流局結果 ===== */
  R.showRyuukyoku = function (opts) {
    const ov = $id('result-overlay');
    $id('result-banner').textContent = '流 局';
    $id('result-hand').innerHTML = '';
    const listEl = $id('result-yaku-list');
    listEl.innerHTML = '';
    const g = G();
    g.players.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'yaku-row';
      row.style.animationDelay = (0.2 + i * 0.15) + 's';
      row.innerHTML = `<span>${p.name}</span><span>${opts.tenpai[i] ? 'テンパイ' : 'ノーテン'}</span>`;
      listEl.appendChild(row);
    });
    $id('result-score').textContent = 'ノーテン罰符';
    renderDeltas($id('result-deltas'), opts.deltas);
    $id('result-next').onclick = () => {
      ov.classList.add('hidden');
      if (opts.onNext) opts.onNext();
    };
    ov.classList.remove('hidden');
  };

  function renderDeltas(el, deltas) {
    el.innerHTML = '';
    if (!deltas) return;
    const g = G();
    g.players.forEach((p, i) => {
      const d = deltas[i];
      const row = document.createElement('div');
      row.className = 'delta-row';
      row.innerHTML = `<span>${p.name}</span>` +
        `<span class="${d > 0 ? 'plus' : d < 0 ? 'minus' : ''}">${d > 0 ? '+' : ''}${d}</span>` +
        `<span>${p.score}</span>`;
      el.appendChild(row);
    });
  }

  /* ===== 最終結果(順位) ===== */
  R.showFinal = function (reason) {
    const g = G();
    const St = YM.Storage;
    const ranks = YM.GameState.ranks(g);
    const order = g.players.map((p, i) => ({ p, i, rank: ranks[i] }))
      .sort((a, b) => a.rank - b.rank);

    const ov = $id('final-overlay');
    $id('final-title').textContent = reason === 'tobi' ? '飛び終了' : '東風戦 終了';
    const listEl = $id('final-ranking');
    listEl.innerHTML = '';
    order.forEach(o => {
      const pt = (o.p.score - YM.CONST.RETURN_SCORE) / 1000;
      const row = document.createElement('div');
      row.className = 'final-row' + (o.i === 0 ? ' me' : '');
      row.innerHTML =
        `<span class="final-rank">${o.rank}位</span>` +
        `<span class="final-name">${o.p.name}</span>` +
        `<span class="final-score">${o.p.score}点</span>` +
        `<span class="final-pt">${pt >= 0 ? '+' : ''}${pt.toFixed(1)}pt</span>`;
      listEl.appendChild(row);
    });

    St.data.gamesPlayed++;
    const playerWon = ranks[0] === 1;
    if (playerWon) {
      St.data.wins++;
      St.data.intimacy++;
      St.unlockEvent('event01');
    }
    St.save();

    const ayanoAtTable = YM.Game.G.players.some(p => p.characterId === 'ayano');
    $id('final-event').classList.toggle('hidden', !playerWon || !ayanoAtTable);
    $id('final-event').onclick = () => {
      YM.Audio.se('event');
      $id('final-overlay').classList.add('hidden');
      const lines = YM.DIALOGUES.ayano.event01;
      YM.CharacterUI.runEvent('ayano', lines, () => {
        YM.CharacterUI.showEventChoices();
      });
    };
    $id('final-rematch').onclick = () => {
      $id('final-overlay').classList.add('hidden');
      YM.Audio.se('decide');
      YM.Round.startGame();
    };
    $id('final-title-btn').onclick = () => {
      $id('final-overlay').classList.add('hidden');
      YM.Main.goTitle();
    };

    YM.Audio.se(playerWon ? 'win' : 'lose');
    ov.classList.remove('hidden');
  };

  YM.ResultUI = R;
})();
