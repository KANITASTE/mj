/* result-manager.js - 和了処理・点数移動・結果表示 */
window.YM = window.YM || {};

(function () {
  const C = YM.CONST;
  const GS = () => YM.GameState;
  const UI = () => YM.UI;
  const G = () => YM.Game.G;

  const Result = {};

  /* ===== 和了 =====
   * opts: { tsumo, winTile, res, loser, chankan, allRons } */
  Result.win = function (winnerIdx, opts) {
    const g = G();
    if (g.phase === C.PHASE.ENDED) return;
    g.phase = C.PHASE.ENDED;
    g.busy = true;
    YM.timers.clearAll();

    const p = g.players[winnerIdx];
    const res = opts.res;
    const isDealer = GS().isDealer(g, winnerIdx);
    const S = YM.Scoring;

    const deltas = [0, 0, 0, 0];
    let payText = '';

    if (opts.tsumo) {
      const pay = S.tsumoPayment(res.han, res.fu, isDealer, res.yakuman);
      if (isDealer) {
        for (let i = 0; i < 4; i++) {
          if (i === winnerIdx) continue;
          deltas[i] -= pay.each + g.honba * 100;
        }
        payText = `${pay.each + g.honba * 100} オール`;
      } else {
        for (let i = 0; i < 4; i++) {
          if (i === winnerIdx) continue;
          const base = GS().isDealer(g, i) ? pay.dealer : pay.other;
          deltas[i] -= base + g.honba * 100;
        }
        payText = `${pay.other + g.honba * 100} / ${pay.dealer + g.honba * 100}`;
      }
      deltas[winnerIdx] = -deltas.reduce((s, d) => s + d, 0);
    } else {
      const pay = S.ronPayment(res.han, res.fu, isDealer, res.yakuman);
      const total = pay.total + g.honba * C.HONBA_VALUE;
      deltas[opts.loser] -= total;
      deltas[winnerIdx] += total;
      payText = `${total}`;
    }

    // 供託
    const stickBonus = g.riichiSticks * C.RIICHI_COST;
    deltas[winnerIdx] += stickBonus;
    g.riichiSticks = 0;

    for (let i = 0; i < 4; i++) g.players[i].score += deltas[i];

    // 演出
    YM.Audio.se(opts.tsumo ? 'tsumo' : 'ron');
    YM.Animation.darken(1800);
    YM.Animation.announcement(opts.chankan ? '槍槓' : opts.tsumo ? 'ツモ' : 'ロン', {
      type: opts.tsumo ? 'tsumo' : 'ron',
      actor: p.name,
      life: 1800
    });
    if (res.yakuman) YM.Animation.yakumanBg(2600);
    else if (res.han >= 6) YM.Animation.flash();

    // 添付仕様の勝敗イベント。跳満以上は大勝/大敗、ツモ負けはCPUからランダム反応。
    const isBig = res.yakuman || res.han >= 6;
    let eventPlayer = null;
    let eventSituation = null;
    if (winnerIdx === 0) {
      const cpuPlayers = g.players.filter(q => !q.isHuman);
      const loserChar = opts.loser != null ? g.players[opts.loser] : null;
      if (res.yakuman) {
        eventPlayer = cpuPlayers.find(q => q.characterId === 'ayano') || cpuPlayers[Math.floor(Math.random() * cpuPlayers.length)];
        eventSituation = 'special';
      } else if (loserChar && !loserChar.isHuman) {
        eventPlayer = loserChar;
        eventSituation = isBig ? 'bigLoss' : 'cpuDealIn';
      } else {
        eventPlayer = cpuPlayers[Math.floor(Math.random() * cpuPlayers.length)];
        eventSituation = 'playerTsumo';
      }
    } else {
      const loserChar = opts.loser != null ? g.players[opts.loser] : null;
      if (loserChar && !loserChar.isHuman) {
        eventPlayer = loserChar;
        eventSituation = isBig ? 'bigLoss' : 'cpuDealIn';
      } else {
        eventPlayer = p;
        eventSituation = isBig ? 'bigWin' : 'cpuWin';
      }
    }
    if (eventPlayer) {
      YM.timers.set(() => {
        YM.CharacterUI.cutin(eventPlayer.characterId, eventSituation, {
          speaker: eventPlayer.id,
          banner: isBig ? (eventSituation === 'bigLoss' ? '痛恨の放銃' : '大物手') : null,
          life: 2200
        });
      }, 1350);
    }

    UI().renderGame(g);

    const rank = YM.Scoring.rankName(res.han, res.fu, res.yakuman);
    const winnerName = p.name;
    YM.timers.set(() => {
      YM.ResultUI.showWin({
        winnerIdx,
        banner: `${winnerName} の${opts.tsumo ? 'ツモ' : 'ロン'}和了`,
        handTiles: p.hand.map(t => t.kind),
        melds: p.melds,
        winKind: opts.winTile.kind,
        yakuList: res.yakuList,
        doraCount: res.doraCount,
        han: res.han,
        fu: res.fu,
        yakuman: res.yakuman,
        rank,
        payText,
        deltas,
        onNext: () => {
          YM.Round.advance({ ryuukyoku: false, dealerWon: isDealer });
        }
      });
      YM.Audio.se(winnerIdx === 0 ? 'win' : 'lose');
    }, eventPlayer ? 3750 : 2100);
  };

  YM.Result = Result;
})();
