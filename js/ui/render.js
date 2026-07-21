/* render.js - 対局画面の描画(4人麻雀版)
 * ゲーム状態(YM.Game.G)から一方向に描画する。DOMを状態として使わない。 */
window.YM = window.YM || {};

(function () {
  const UI = {};
  const $id = id => document.getElementById(id);
  const C = YM.CONST;
  const GS = () => YM.GameState;

  /* ===== 画面切替 ===== */
  UI.showScreen = function (name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = $id('screen-' + name);
    if (el) el.classList.add('active');
  };

  /* ===== 牌要素 ===== */
  UI.tileEl = function (kind, opts) {
    opts = opts || {};
    const el = document.createElement('div');
    el.className = 'tile';
    if (opts.back) {
      el.classList.add('back');
    } else {
      const imgSrc = YM.Tiles.faceImg(kind);
      if (imgSrc) {
        // 数牌: 切り出しPNGを表示。読み込み失敗時はSVGへフォールバック
        el.classList.add('img-tile');
        const im = document.createElement('img');
        im.className = 'tile-img';
        im.src = imgSrc;
        im.alt = YM.Tiles.nameOf(kind);
        im.draggable = false;
        im.onerror = () => {
          el.classList.remove('img-tile');
          el.innerHTML = YM.Tiles.faceSVG(kind);
        };
        el.appendChild(im);
      } else {
        // 字牌: 従来のSVG表示
        el.innerHTML = YM.Tiles.faceSVG(kind);
      }
    }
    if (opts.small) el.classList.add('small');
    if (opts.mini) el.classList.add('mini');
    if (opts.cpu) el.classList.add('cpu');
    if (opts.vback) el.classList.add('vback');
    if (opts.classes) opts.classes.forEach(c => el.classList.add(c));
    return el;
  };

  /* ===== メイン描画 ===== */
  UI.renderGame = function (G) {
    renderCenterPlate(G);
    for (let i = 0; i < 4; i++) {
      renderHand(G, i);
      renderMelds(G, i);
      renderRiver(G, i);
      renderInfoCard(G, i);
    }
    renderButtons(G);
    renderGuide(G);
  };

  /* --- 中央プレート --- */
  function renderCenterPlate(G) {
    const kyokuKanji = ['一', '二', '三', '四'][G.handNumber - 1] || G.handNumber;
    $id('plate-kyoku').textContent = `東${kyokuKanji}局`;
    $id('plate-honba').textContent = `${G.honba}本場`;
    $id('plate-sticks').textContent = `供託 ${G.riichiSticks}`;
    $id('plate-wall').textContent = `山 ${YM.Wall.liveCount(G.wall)}`;

    const doraEl = $id('plate-dora');
    doraEl.innerHTML = '';
    G.wall.doraIndicators.forEach(t => {
      doraEl.appendChild(UI.tileEl(t.kind, { mini: true }));
    });

    // 手番マーカー(東南西北の位置表示)
    for (let i = 0; i < 4; i++) {
      const arrow = $id(`turn-arrow-${i}`);
      if (!arrow) continue;
      arrow.classList.toggle('active', G.currentPlayerIndex === i && G.phase !== C.PHASE.ENDED);
      arrow.textContent = YM.CONST.WIND_NAMES[(i - G.dealerIndex + 4) % 4];
    }
  }

  /* --- 手牌 --- */
  function renderHand(G, i) {
    const p = G.players[i];
    if (i === 0) {
      renderPlayerHand(G);
      return;
    }
    const el = $id(`hand-${i}`);
    el.innerHTML = '';
    const count = p.hand.length + (p.drawnTile ? 1 : 0);
    const vertical = (i === 1 || i === 3);
    if (G.devShowHands) {
      // DEV手牌公開: 縦置きCPUも表向きミニ牌で見せる
      p.hand.forEach(t => el.appendChild(UI.tileEl(t.kind, { cpu: true })));
      if (p.drawnTile) {
        const d = UI.tileEl(p.drawnTile.kind, { cpu: true });
        d.classList.add('drawn-gap');
        el.appendChild(d);
      }
    } else {
      for (let n = 0; n < count; n++) {
        el.appendChild(UI.tileEl(0, vertical ? { back: true, vback: true } : { back: true, cpu: true }));
      }
    }
  }

  function renderPlayerHand(G) {
    const p = G.players[0];
    const handEl = $id('player-hand');
    handEl.innerHTML = '';
    const interactive = G.phase === C.PHASE.HUMAN_TURN && !G.busy;
    p.hand.forEach((t, i) => {
      const el = UI.tileEl(t.kind);
      if (G.selectedIndex === i) el.classList.add('selected');
      if (G.riichiMode) {
        if (G.riichiValidKinds.includes(t.kind)) el.classList.add('riichi-ok');
        else el.classList.add('disabled');
      }
      if (p.isRiichi && interactive) el.classList.add('disabled');
      if (interactive) el.addEventListener('click', () => YM.Turn.onTileClick(i));
      handEl.appendChild(el);
    });
    const tsumoEl = $id('player-tsumo');
    tsumoEl.innerHTML = '';
    if (p.drawnTile) {
      const el = UI.tileEl(p.drawnTile.kind, { classes: ['drawn-in'] });
      if (G.selectedIndex === 'drawn') el.classList.add('selected');
      if (G.riichiMode && !G.riichiValidKinds.includes(p.drawnTile.kind)) el.classList.add('disabled');
      if (interactive) el.addEventListener('click', () => YM.Turn.onTileClick('drawn'));
      tsumoEl.appendChild(el);
    }
  }

  /* --- 副露 --- */
  function renderMelds(G, i) {
    const el = $id(`melds-${i}`);
    el.innerHTML = '';
    for (const m of G.players[i].melds) {
      const group = document.createElement('div');
      group.className = 'meld-group';
      if (m.type === 'ankan') {
        // 暗槓は両端伏せ
        group.appendChild(UI.tileEl(0, { back: true, mini: true }));
        group.appendChild(UI.tileEl(m.tile, { mini: true }));
        group.appendChild(UI.tileEl(m.tile, { mini: true }));
        group.appendChild(UI.tileEl(0, { back: true, mini: true }));
      } else {
        m.tiles.forEach(t => {
          const opts = { mini: true, classes: [] };
          if (m.calledTile && t.id === m.calledTile.id) opts.classes.push('called-tile');
          group.appendChild(UI.tileEl(t.kind, opts));
        });
      }
      el.appendChild(group);
    }
  }

  /* --- 河 --- */
  function renderRiver(G, i) {
    const el = $id(`river-${i}`);
    el.innerHTML = '';
    const p = G.players[i];
    p.discards.forEach((d, n) => {
      const opts = { mini: true, classes: [] };
      if (d.riichiDecl) opts.classes.push('riichi-decl');
      if (d.called) opts.classes.push('called-out');
      if (n === p.discards.length - 1 && G.lastDiscardPlayer === i && !d.called) opts.classes.push('last-discard');
      el.appendChild(UI.tileEl(d.tile.kind, opts));
    });
  }

  /* --- 情報カード --- */
  function renderInfoCard(G, i) {
    const p = G.players[i];
    const card = $id(`card-${i}`);
    if (!card) return;
    const ranks = GS().ranks(G);
    card.classList.toggle('active', G.currentPlayerIndex === i && G.phase !== C.PHASE.ENDED);
    card.classList.toggle('riichi', p.isRiichi || p.riichiPending);

    // 顔アイコンは初回のみ描画
    const face = $id(`card-face-${i}`);
    if (face && face.dataset.char !== String(p.characterId)) {
      face.dataset.char = String(p.characterId);
      face.innerHTML = YM.CharacterUI.faceIconHTML(p.characterId);
    }

    $id(`card-name-${i}`).textContent = p.name;
    $id(`card-score-${i}`).textContent = p.score;
    $id(`card-rank-${i}`).textContent = `${ranks[i]}位`;
    $id(`card-wind-${i}`).textContent = YM.Tiles.nameOf(p.seatWind);
    $id(`card-dealer-${i}`).classList.toggle('hidden', !GS().isDealer(G, i));
    $id(`card-riichi-${i}`).classList.toggle('hidden', !(p.isRiichi || p.riichiPending));
  }

  /* --- 操作ボタン --- */
  function renderButtons(G) {
    const show = (id, on, glow) => {
      const el = $id(id);
      el.classList.toggle('hidden', !on);
      el.classList.toggle('glow', !!glow);
    };
    const o = G.humanOptions;
    const humanTurn = G.phase === C.PHASE.HUMAN_TURN && !G.busy;
    const pc = G.pendingCalls;
    const calling = G.phase === C.PHASE.CALLS && pc;
    const myCall = calling ? pc.options.find(x => x.player === 0) : null;

    show('btn-tsumo', humanTurn && o && !!o.tsumo, true);
    show('btn-riichi', humanTurn && o && o.riichiKinds && o.riichiKinds.length > 0 && !G.players[0].isRiichi, !G.riichiMode);
    $id('btn-riichi').textContent = G.riichiMode ? 'やめる' : 'リーチ';
    show('btn-kan', humanTurn && o && ((o.ankanKinds && o.ankanKinds.length > 0) || (o.kakanKinds && o.kakanKinds.length > 0)), false);

    show('btn-ron', calling && myCall && !!myCall.ron, true);
    show('btn-pon', calling && myCall && myCall.pon && pc.mode === 'discard', true);
    show('btn-minkan', calling && myCall && myCall.minkan, false);
    show('btn-chi', calling && myCall && myCall.chiVariants && myCall.chiVariants.length > 0, true);
    show('btn-pass', (calling && myCall) || (humanTurn && o && !!o.tsumo && G.players[0].isRiichi), false);
  }

  function renderGuide(G) {
    let text = '';
    const p = G.players[G.currentPlayerIndex];
    if (G.phase === C.PHASE.HUMAN_TURN) {
      if (G.riichiMode) text = '光っている牌を選んでリーチ宣言';
      else if (G.players[0].isRiichi) text = 'リーチ中は自動で進みます';
      else if (G.humanOptions && G.humanOptions.afterCall) text = '鳴いた後の捨て牌を選んでください';
      else text = '牌をクリックで選択、もう一度クリックで捨てる';
    } else if (G.phase === C.PHASE.CALLS) {
      text = '鳴きますか?';
    } else if (G.phase === C.PHASE.CPU_TURN && p && !p.isHuman) {
      text = `${p.name} が考えています……`;
    }
    $id('info-guide').textContent = text;
  }

  /* ===== チー候補の選択UI ===== */
  UI.showChiSelect = function (variants, calledKind) {
    const box = $id('chi-select');
    const list = $id('chi-select-list');
    list.innerHTML = '';
    variants.forEach(base => {
      const btn = document.createElement('button');
      btn.className = 'chi-option';
      for (let k = base; k < base + 3; k++) {
        const t = UI.tileEl(k, { small: true });
        if (k === calledKind) t.classList.add('called-tile');
        btn.appendChild(t);
      }
      btn.addEventListener('click', () => {
        YM.Calls.onHumanDecision({ type: 'chi', chi: base });
      });
      list.appendChild(btn);
    });
    box.classList.remove('hidden');
  };

  UI.hideChiSelect = function () {
    const box = $id('chi-select');
    if (box) box.classList.add('hidden');
  };

  YM.UI = UI;
})();
