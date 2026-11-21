/* 末日爭奪戰 — 規則引擎（純函式、可序列化狀態） */
var G = (function () {
  'use strict';
  const FAC = {
    村民: { nation: '村民會', tag: '其他', key: 'g' },
    魔王: { nation: '魔王軍', tag: '攻', key: 'r' },
    勇者: { nation: '勇者團', tag: '守', key: 'b' },
  };
  const ROLES = {
    農夫: { f: '村民', pw: 2, sk: '種瓜得瓜', d: '將場面上任 1 張裝備移至自己面前（面前多於 5 張須棄牌）', win: ['蘋果', '烤蜥蜴串'] },
    商人: { f: '村民', pw: 5, sk: '賄絡', d: '棄掉任意張手牌，並抽取相同張數的資源加入手牌', win: ['鎖子甲', '英格蘭長弓'] },
    村姑: { f: '村民', pw: 3, sk: '第六感', d: '觀看所有玩家的角色卡', win: ['粉紅色圍裙', '牛角頭飾'] },
    村長: { f: '村民', pw: 1, sk: '權威', d: '除了自己以外的所有玩家將面前一張裝備丟入棄牌堆', ownN: 2, win: ['村長家的地契'] },
    幼童: { f: '村民', pw: 3, sk: '事不關己', d: '地標事件觸發時對自己無效（被動，不須發動）', passive: true, ownN: 2, win: ['魔女玩偶'] },
    小惡魔: { f: '魔王', pw: 4, sk: '惡作劇', d: '指定所有玩家的角色卡向上家／下家傳遞 N 次', win: ['塗毒的箭矢', '打火石'] },
    史萊姆: { f: '魔王', pw: 1, sk: '變形', d: '從角色牌庫抽 5 張，選 1 張變為該角色（不觸發地標）', win: [] },
    魔女: { f: '魔王', pw: 2, sk: '魅惑', d: '指定一名玩家，觀看其所有手牌及角色卡，並可交換任意張手牌', win: ['巫師帽', '化妝品'] },
    吸血鬼: { f: '魔王', pw: 3, sk: '吸血', d: '將場面上的吸血鬼裝備移至自己面前', win: ['備用惡魔角', '藍精靈墜子'] },
    食人魔: { f: '魔王', pw: 3, sk: '豪華大餐', d: '將所有玩家面前的裝備重新洗牌，再由自己開始平均分配', win: ['鐮刀', '拐杖'] },
    弓箭手: { f: '勇者', pw: 3, sk: '百發百中', d: '將所有手牌與指定某一玩家交換', win: ['毒蘋果', '裝備箱'] },
    劍士: { f: '勇者', pw: 2, sk: '鬥氣', d: '指定一名玩家決鬥，贏了可將對方面前所有劍士裝備移至自己面前，輸了不失去裝備', win: ['劍士的磨刀石', '斗笠'] },
    法師: { f: '勇者', pw: 3, sk: '魔力無限', d: '抽資源牌庫 3 張：功能卡立刻發動，裝備卡放置自己面前', win: ['玩偶熊', '煙霧彈'] },
    盜賊: { f: '勇者', pw: 4, sk: '偷竊', d: '搜刮市集中所有裝備至自己面前', win: ['保險箱', '玩具手槍'] },
    祭司: { f: '勇者', pw: 4, sk: '治癒', d: '打出手牌中所有裝備至自己面前，並抽取相同張數的資源卡', win: ['曼德拉草', '占卜籤詩'] },
  };
  const SK = {
    swapField: () => '可與場面上任一張裝備交換位置',
    swapDiscard: () => '可與棄牌堆任一張裝備交換',
    takeDef: () => '若場面上有防守裝備，可從棄牌堆拿一張防守裝備橫放至自己面前',
    lockOwn: () => '可翻轉橫放自己面前除此牌外任一張裝備',
    discardNamed: (a) => `若場面上有【${a}】，可將它丟入棄牌堆`,
    lockNamed: (a) => `若場面上有【${a}】，可將它翻轉橫放`,
    lockSelfIf: (a) => `若場面上有${a.n ? '【' + a.n + '】' : a.r + '裝備'}，可將此牌翻轉橫放`,
    unlockAny: () => '可翻正場面上任一張橫放的裝備',
    give: () => '若場面上有其他類裝備，可從棄牌堆拿一張裝備放置任一玩家面前',
    gamble: () => '若場面上有攻擊裝備，可抽一張資源卡：裝備放置自己面前，功能卡丟入棄牌堆',
  };
  const EQ = [
    ['農夫', '鋤頭', '攻', 'swapField'], ['農夫', '雨靴', '守', 'takeDef'], ['農夫', '斗笠', '守', 'lockOwn'], ['農夫', '鐮刀', '攻', 'discardNamed', '曼德拉草'],
    ['商人', '錢袋', '他', 'lockNamed', '假幣'], ['商人', '假幣', '他', 'swapDiscard'], ['商人', '裝備箱', '守', 'discardNamed', '屠刀'], ['商人', '村長家的地契', '他', 'discardNamed', '地契'],
    ['村姑', '洗衣板', '守', 'lockOwn'], ['村姑', '圍裙', '守', 'lockSelfIf', { n: '粉紅色圍裙' }], ['村姑', '化妝品', '他', 'give'], ['村姑', '占卜籤詩', '他', 'swapDiscard'],
    ['村長', '保險箱', '守', 'discardNamed', '錢袋'], ['村長', '地契', '他', 'lockSelfIf', { r: '村長' }], ['村長', '拐杖', '攻', 'gamble'], ['村長', '老花眼鏡', '他', 'swapDiscard'],
    ['幼童', '奶嘴', '守', 'lockSelfIf', { r: '幼童' }], ['幼童', '玩具手槍', '攻', 'unlockAny'], ['幼童', '玩偶熊', '他', 'swapField'], ['幼童', '玩具鴨', '他', 'give'],
    ['弓箭手', '金箭矢', '攻', 'lockSelfIf', { n: '塗毒的箭矢' }], ['弓箭手', '塗毒的箭矢', '攻', 'gamble'], ['弓箭手', '蘋果', '他', 'give'], ['弓箭手', '英格蘭長弓', '攻', 'swapField'],
    ['劍士', '破舊的劍', '攻', 'lockSelfIf', { n: '治療藥水' }], ['劍士', '鎖子甲', '守', 'lockOwn'], ['劍士', '藤盾', '守', 'discardNamed', '金箭矢'], ['劍士', '磨刀石', '攻', 'unlockAny'],
    ['祭司', '聖水', '他', 'swapField'], ['祭司', '治療藥水', '守', 'lockSelfIf', { n: '聖水' }], ['祭司', '藥罐', '他', 'swapDiscard'], ['祭司', '牛角頭飾', '守', 'takeDef'],
    ['盜賊', '苦無', '攻', 'gamble'], ['盜賊', '手裡劍', '攻', 'lockSelfIf', { n: '磨刀石' }], ['盜賊', '煙霧彈', '守', 'lockSelfIf', { r: '盜賊' }], ['盜賊', '替身木人', '守', 'discardNamed', '破舊的劍'],
    ['法師', '堅硬的魔法杖', '攻', 'swapDiscard'], ['法師', '巫師帽', '守', 'lockSelfIf', { r: '法師' }], ['法師', '魔法書', '攻', 'swapDiscard'], ['法師', '藍精靈墜子', '他', 'swapField'],
    ['小惡魔', '可拆卸式尾巴', '守', 'lockOwn'], ['小惡魔', '備用惡魔角', '攻', 'unlockAny'], ['小惡魔', '劍士的磨刀石', '攻', 'discardNamed', '磨刀石'], ['小惡魔', '蝙蝠翅膀', '守', 'takeDef'],
    ['魔女', '飛行掃帚', '攻', 'lockOwn'], ['魔女', '毒蘋果', '他', 'discardNamed', '蘋果'], ['魔女', '烤蜥蜴串', '他', 'give'], ['魔女', '變身藥水', '守', 'swapField'],
    ['吸血鬼', '黑色斗篷', '守', 'lockSelfIf', { r: '吸血鬼' }], ['吸血鬼', '魔女玩偶', '他', 'lockSelfIf', { n: '玩偶熊' }], ['吸血鬼', '鯊魚型獠牙', '攻', 'unlockAny'], ['吸血鬼', '曼德拉草', '攻', 'unlockAny'],
    ['食人魔', '屠刀', '攻', 'gamble'], ['食人魔', '粉紅色圍裙', '守', 'takeDef'], ['食人魔', '巨型餐具', '他', 'lockSelfIf', { r: '食人魔' }], ['食人魔', '打火石', '他', 'discardNamed', '磨刀石'],
  ];
  const MAG = [
    ['evTrigger', '事件觸發', 6, '抽取一張地標卡（事件）並發動'],
    ['gatherA', '資源蒐集・奪取', 6, '將場面上或市集中任一張裝備移至自己面前'],
    ['gatherB', '資源蒐集・探索', 3, '抽資源牌庫兩張，選一張收回手牌，另一張洗回牌庫'],
    ['viewHand', '資源觀看', 3, '指定任一玩家，觀看其所有手牌'],
    ['swapEq', '資源交換', 6, '指定一名玩家與一種裝備（名稱或角色），對方手牌有就與你交換一張手牌裝備，沒有則無效'],
    ['wind', '資源大風吹', 6, '指定手牌流向：所有人把手牌傳給上家／下家，或向上家／下家抽一張'],
    ['viewRole', '角色觀看', 3, '指定任一玩家，觀看其角色'],
    ['duel', '決鬥', 6, '以角色戰鬥指數決鬥，贏家從輸家面前拿 N 張裝備（N＝指數差）'],
    ['nullify', '無效', 6, '在別人發動功能卡或裝備技能時打出，使其無效'],
  ];
  const EVENTS = [
    ['ruins', '阿爾丹王國遺址', '每位玩家放置一張手牌中的防守裝備到自己面前，並抽 1 張資源卡（沒有防守裝備則無須動作）'],
    ['abyss', '地底深淵', '面前沒有攻擊裝備的玩家，須將面前一張其他類裝備丟入棄牌堆'],
    ['dragon', '巨龍沉眠處', '收回所有玩家手牌，洗牌後由觸發者開始平均發給所有玩家'],
    ['port', '貿易商港亞菲達安', '每位玩家擲四面骰得 N，將 N 張手牌丟入棄牌堆並抽取相同張數'],
    ['wreck', '沉船墓地', '每位玩家擲四面骰，擲到 4 則強制轉生（不觸發地標）'],
    ['newbie', '新手村', '尚未揭露角色的玩家從資源牌庫頂抽 1 張：裝備放置自己面前，功能卡丟入棄牌堆'],
    ['oasis', '沙漠綠洲', '每位玩家擲四面骰：1 或 2 須將面前 1 張裝備丟入棄牌堆；3 或 4 可橫放（覆蓋）面前 1 張裝備'],
    ['beast', '野獸巢穴', '每位玩家將手牌 1 張其他類裝備放到別人面前；未放置的玩家須揭露角色直至轉生'],
    ['temple', '智慧神殿', '已揭露角色的玩家可從棄牌堆任選 1 張功能卡並立即發動'],
    ['battle', '圖斯坦古戰場', '已揭露角色的玩家可從棄牌堆任選 1 張裝備放置在自己面前'],
    ['islands', '奧帕姆群島', '由觸發者開始，每位玩家將自己面前一張裝備傳給下家'],
  ];
  const CARDS = [];
  EQ.forEach((e) => CARDS.push({ id: CARDS.length, k: 'E', role: e[0], name: e[1], type: e[2], sk: e[3], arg: e[4], desc: SK[e[3]](e[4]) }));
  MAG.forEach((m) => { for (let i = 0; i < m[2]; i++) CARDS.push({ id: CARDS.length, k: 'M', fn: m[0], name: m[1], desc: m[3] }); });
  const C = (id) => CARDS[id];
  const EV = {}; EVENTS.forEach((e) => (EV[e[0]] = { id: e[0], name: e[1], desc: e[2] }));
  const TYPE = { 攻: '攻擊', 守: '防守', 他: '其他' };

  // ---------- helpers ----------
  const rnd = (n) => Math.floor(Math.random() * n);
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function log(s, t) { s.log.push(t); if (s.log.length > 90) s.log.shift(); }
  const nm = (s, i) => s.players[i].name;
  const cn = (id) => '【' + C(id).name + '】';
  function draw(s) {
    if (!s.deck.length) {
      if (!s.discard.length) return null;
      s.deck = shuffle(s.discard); s.discard = [];
      log(s, '資源牌庫用完，棄牌堆洗回牌庫。');
    }
    return s.deck.shift();
  }
  function drawTo(s, i, n) { let k = 0; for (; k < n; k++) { const c = draw(s); if (c == null) break; s.players[i].hand.push(c); } return k; }
  function refillMarket(s) { while (s.market.length < 3) { const c = draw(s); if (c == null) break; s.market.push(c); } }
  function field(s) { const out = []; s.players.forEach((p, pi) => p.front.forEach((x) => out.push({ p: pi, c: x.c, lock: x.lock }))); return out; }
  function findFront(s, cid) { for (let p = 0; p < s.players.length; p++) { const i = s.players[p].front.findIndex((x) => x.c === cid); if (i >= 0) return { p, i, lock: s.players[p].front[i].lock }; } return null; }
  function takeFront(s, cid) { const l = findFront(s, cid); if (l) s.players[l.p].front.splice(l.i, 1); return l; }
  function putFront(s, p, cid, lock) { s.players[p].front.push({ c: cid, lock: !!lock }); }
  function rm(arr, v) { const i = arr.indexOf(v); if (i < 0) return false; arr.splice(i, 1); return true; }
  function qFront(s, steps) { s.q.unshift.apply(s.q, steps); }
  function ask(s, pid, kind, k, data) { s.prompt = Object.assign({ pid, kind, k }, data); }
  function others(s, pid) { const o = []; for (let i = 1; i < s.players.length; i++) o.push((pid + i) % s.players.length); return o; }
  function order(s, pid) { return [pid].concat(others(s, pid)); }
  function askPlayer(s, pid, k, title, data) {
    ask(s, pid, 'choice', k, Object.assign({ title, opts: others(s, pid).map((i) => ({ id: String(i), label: nm(s, i) })) }, data || {}));
  }
  function tagOf(s, x) { return nm(s, x.p) + '面前'; }
  const next = (s, i) => (i + 1) % s.players.length;
  const ringTxt = (s, pid) => { const n = s.players.length; return `座位順序（箭頭方向為下家）：${s.players.map((_, k) => nm(s, (pid + k) % n)).join(' → ')} → 回到${nm(s, pid)}。你的上家是 ${nm(s, (pid + n - 1) % n)}，下家是 ${nm(s, next(s, pid))}`; };
  const prev = (s, i) => (i + s.players.length - 1) % s.players.length;
  function reveal(s, i, why) { const r = s.players[i].role; if (!r.rev) { r.rev = true; log(s, `${nm(s, i)} 的角色揭露：${r.n}${why ? '（' + why + '）' : ''}。`); } }

  // ---------- setup ----------
  function newGame(seats, opts) {
    const n = seats.length;
    const per = 2; // 4–6 人，每個陣營取 2 張角色
    let pool = [];
    const rest = [];
    Object.keys(FAC).forEach((f) => {
      const rs = shuffle(Object.keys(ROLES).filter((r) => ROLES[r].f === f));
      pool = pool.concat(rs.slice(0, per)); rest.push.apply(rest, rs.slice(per));
    });
    shuffle(pool);
    const s = {
      phase: 'play', opts: { facN: 2, skill: 'life', doom: opts && opts.doom ? doomCfg(seats.length, opts.doom) : null }, // 固定規則：陣營勝利每人專屬裝備 2 張；角色技能每次轉生 1 次
      players: seats.map((p, i) => ({ id: p.id, name: p.name, bot: !!p.bot, hand: [], front: [], role: { n: pool[i], rev: false, used: false } })),
      turn: 0, acted: false, round: 1,
      deck: shuffle(CARDS.map((c) => c.id)), discard: [], market: [],
      roleDeck: shuffle(pool.slice(n).concat(rest)),
      evDeck: shuffle(EVENTS.map((e) => e[0])), evDiscard: [],
      q: [], prompt: null, log: [], winners: null,
    };
    s.players.forEach((p, i) => drawTo(s, i, 5));
    refillMarket(s);
    s.turn = rnd(n); s.first = s.turn; s.cycle = 1;
    log(s, `遊戲開始，共 ${n} 人。${nm(s, s.turn)} 先手。`);
    return s;
  }

  // ---------- victory ----------
  function frontCards(p) { return p.front.map((x) => C(x.c)); }
  function soloCheck(p) {
    const r = p.role.n, R = ROLES[r], fc = frontCards(p);
    if (r === '史萊姆') {
      const a = fc.filter((c) => c.type === '攻').length, d = fc.filter((c) => c.type === '守').length, o = fc.filter((c) => c.type === '他').length;
      return [{ t: '任 4 個其他類裝備', ok: o >= 4 }];
    }
    const own = fc.filter((c) => c.role === r && !(r === '魔女' && c.name === '變身藥水')).length;
    const need = R.ownN || 1;
    return [{ t: `任 ${need} 個${r}裝備${r === '魔女' ? '（變身藥水除外）' : ''}`, ok: own >= need }]
      .concat(R.win.map((w) => ({ t: `${w}（${CARDS.find((c) => c.name === w).role}）`, ok: fc.some((c) => c.name === w) })));
  }
  function facProgress(s, p) {
    const r = p.role.n, fc = frontCards(p);
    if (r === '史萊姆') return { have: fc.filter((c) => c.type === '他').length, need: s.opts.facN + 1, text: `其他類裝備 ${s.opts.facN + 1} 張` };
    return { have: fc.filter((c) => c.role === r).length, need: s.opts.facN, text: `${r}裝備 ${s.opts.facN} 張` };
  }
  function checkWin(s) {
    if (s.phase !== 'play') return;
    const solo = order(s, s.turn).filter((i) => soloCheck(s.players[i]).every((x) => x.ok));
    if (solo.length) { s.phase = 'over'; s.winners = { type: 'solo', ids: solo }; log(s, `個人勝利：${solo.map((i) => nm(s, i) + '（' + s.players[i].role.n + '）').join('、')}！`); return; }
    for (const f of Object.keys(FAC)) {
      const mem = s.players.map((p, i) => i).filter((i) => ROLES[s.players[i].role.n].f === f);
      if (mem.length >= 2 && mem.every((i) => { const g = facProgress(s, s.players[i]); return g.have >= g.need; })) {
        s.phase = 'over'; s.winners = { type: 'fac', fac: f, ids: mem };
        log(s, `陣營勝利：${FAC[f].nation}（${mem.map((i) => nm(s, i)).join('、')}）！`); return;
      }
    }
  }

  // 末日倒數：人數越多，輪數越少（總回合數相近）
  const DOOM_END = { 4: 14, 5: 12, 6: 10 };
  function doomCfg(n, d) { d = typeof d === 'object' ? d : {}; return { from: d.from || 9, end: d.end || 0, sec: d.sec || 20 }; }
  function timed(s) { const D = s.opts.doom; return !!D && s.phase === 'play' && (s.cycle || 1) >= D.from; }
  // 末日倒數：最後一輪結束時比較個人勝利進度
  function doomScore(p) {
    const r = p.role.n, R = ROLES[r], fc = frontCards(p), g = facProgress({ opts: { facN: 2 } }, p);
    let prog;
    if (r === '史萊姆') prog = Math.min(4, fc.filter((c) => c.type === '他').length) / 4;
    else {
      const need = R.ownN || 1, own = fc.filter((c) => c.role === r && !(r === '魔女' && c.name === '變身藥水')).length;
      prog = (Math.min(own, need) / need + R.win.filter((w) => fc.some((c) => c.name === w)).length) / (1 + R.win.length);
    }
    return [prog, Math.min(g.have, g.need) / g.need, p.front.length];
  }
  function doomEnd(s) {
    const sc = s.players.map(doomScore), cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
    let best = sc[0]; sc.forEach((x) => { if (cmp(x, best) > 0) best = x; });
    const ids = order(s, s.first).filter((i) => cmp(sc[i], best) === 0);
    s.phase = 'over'; s.winners = { type: 'doom', ids };
    log(s, `☄ 末日降臨！最後倖存：${ids.map((i) => nm(s, i) + '（' + s.players[i].role.n + '）').join('、')}（個人勝利條件完成最多）。`);
  }

  // ---------- engine loop ----------
  const OPS = {}, RESP = {}, MAGIC = {}, SKILL = {}, EVT = {};
  function run(s) {
    for (let guard = 0; guard < 2000; guard++) {
      if (s.prompt || s.phase !== 'play') break;
      const o = s.players.findIndex((p) => p.front.length > 5);
      if (o >= 0) {
        const p = s.players[o], ex = p.front.length - 5;
        ask(s, o, 'cards', 'overflow', { title: `面前裝備超過 5 張，請選 ${ex} 張丟入棄牌堆`, cards: p.front.map((x) => ({ c: x.c, tag: x.lock ? '橫放' : '' })), min: ex, max: ex, sense: 'bad' });
        break;
      }
      if (!s.q.length) break;
      const st = s.q.shift();
      OPS[st.op](s, st);
    }
    if (!s.prompt && !s.q.length) checkWin(s);
    return s;
  }
  RESP.overflow = (s, p, a) => { a.forEach((c) => { if (takeFront(s, c)) s.discard.push(c); }); log(s, `${nm(s, p.pid)} 面前超過 5 張，棄掉 ${a.map(cn).join('')}。`); };

  // 無效 回應視窗
  const hasNull = (s, i) => s.players[i].hand.some((c) => C(c).fn === 'nullify');
  OPS.null = (s, st) => {
    if (!st.hold) st.hold = others(s, st.src).filter((i) => hasNull(s, i));
    while (st.hold.length && !hasNull(s, st.hold[0])) st.hold.shift();
    if (!st.hold.length) { qFront(s, st.then); return; }
    const pid = st.hold.shift();
    ask(s, pid, 'choice', 'null', { title: `${nm(s, st.src)} 發動了${st.label}，要打出【無效】嗎？`, sub: st.cid != null ? `${cn(st.cid)}的效果：${C(st.cid).desc}` : '', show: st.cid != null ? [st.cid] : undefined, opts: [{ id: 'n', label: '不使用' }, { id: 'y', label: '打出【無效】' }], st });
  };
  RESP.null = (s, p, a) => {
    if (a === 'y') {
      const c = s.players[p.pid].hand.find((x) => C(x).fn === 'nullify');
      rm(s.players[p.pid].hand, c); s.discard.push(c);
      log(s, `${nm(s, p.pid)} 打出【無效】，${nm(s, p.st.src)} 的${p.st.label}失效。`);
    } else qFront(s, [p.st]);
  };
  function withNull(s, src, label, then, cid) { qFront(s, [{ op: 'null', src, label, then, cid }]); }

  // ---------- 裝備 ----------
  RESP.accept = (s, p, a) => {
    const to = a === 'y' ? p.pid : p.from;
    putFront(s, to, p.cid);
    log(s, a === 'y' ? `${nm(s, p.pid)} 收下了 ${cn(p.cid)}。` : `${nm(s, p.pid)} 把 ${cn(p.cid)} 退回 ${nm(s, p.from)} 面前。`);
    qFront(s, [{ op: 'eqSkill', pid: p.from, cid: p.cid }]);
  };
  function skillSpec(s, pid, cid) {
    const loc = findFront(s, cid); if (!loc) return null;
    const card = C(cid), oth = field(s).filter((x) => x.c !== cid);
    const disE = (f) => s.discard.filter((c) => C(c).k === 'E' && (!f || f(C(c)))).map((c) => ({ c, tag: '棄牌堆' }));
    const pick = (cards, sense) => (cards.length ? { mode: 'pick', cards, sense } : null);
    switch (card.sk) {
      case 'swapField': return loc.lock ? null : pick(oth.filter((x) => !x.lock && x.p !== loc.p).map((x) => ({ c: x.c, tag: tagOf(s, x) })), 'good');
      case 'swapDiscard': return loc.lock ? null : pick(disE(), 'good');
      case 'takeDef': return oth.some((x) => C(x.c).type === '守') ? pick(disE((c) => c.type === '守'), 'good') : null;
      case 'lockOwn': return pick(s.players[pid].front.filter((x) => !x.lock && x.c !== cid).map((x) => ({ c: x.c, tag: '自己面前' })), 'good');
      case 'discardNamed': case 'lockNamed': return oth.some((x) => C(x.c).name === card.arg && !x.lock) ? { mode: 'yn' } : null;
      case 'lockSelfIf': return !loc.lock && oth.some((x) => (card.arg.n ? C(x.c).name === card.arg.n : C(x.c).role === card.arg.r)) ? { mode: 'yn' } : null;
      case 'unlockAny': return pick(oth.filter((x) => x.lock).map((x) => ({ c: x.c, tag: tagOf(s, x) + '・橫放' })));
      case 'give': return oth.some((x) => C(x.c).type === '他') ? pick(disE(), 'good') : null;
      case 'gamble': return oth.some((x) => C(x.c).type === '攻') ? { mode: 'yn' } : null;
    }
    return null;
  }
  OPS.eqSkill = (s, st) => {
    const sp = skillSpec(s, st.pid, st.cid); if (!sp) return;
    const card = C(st.cid);
    if (sp.mode === 'yn') ask(s, st.pid, 'choice', 'eqYN', { title: `要發動 ${cn(st.cid)} 的技能嗎？`, sub: card.desc, show: [st.cid], opts: [{ id: 'y', label: '發動' }, { id: 'n', label: '不發動' }], cid: st.cid });
    else ask(s, st.pid, 'cards', 'eqPick', { title: `${cn(st.cid)}技能：選擇目標（不選＝不發動）`, sub: card.desc, cards: sp.cards, min: 0, max: 1, sense: sp.sense, cid: st.cid, optional: true });
  };
  const eqLabel = (cid) => `裝備${cn(cid)}的技能`;
  RESP.eqYN = (s, p, a) => { if (a === 'y') withNull(s, p.pid, eqLabel(p.cid), [{ op: 'eqDo', pid: p.pid, cid: p.cid }], p.cid); };
  RESP.eqPick = (s, p, a) => {
    if (!a.length) return;
    if (C(p.cid).sk === 'give') ask(s, p.pid, 'choice', 'eqGive', { title: `把 ${cn(a[0])} 放到誰面前？`, opts: order(s, p.pid).map((i) => ({ id: String(i), label: nm(s, i) })), cid: p.cid, x: a[0] });
    else withNull(s, p.pid, eqLabel(p.cid), [{ op: 'eqDo', pid: p.pid, cid: p.cid, x: a[0] }], p.cid);
  };
  RESP.eqGive = (s, p, a) => withNull(s, p.pid, eqLabel(p.cid), [{ op: 'eqDo', pid: p.pid, cid: p.cid, x: p.x, to: +a }], p.cid);
  OPS.eqDo = (s, st) => {
    const card = C(st.cid), loc = findFront(s, st.cid), me = nm(s, st.pid);
    if (!loc) return;
    const fail = () => log(s, `${cn(st.cid)} 的技能落空。`);
    switch (card.sk) {
      case 'swapField': {
        const t = findFront(s, st.x); if (!t || t.lock || t.p === loc.p) return fail();
        takeFront(s, st.x); takeFront(s, st.cid); putFront(s, t.p, st.cid); putFront(s, loc.p, st.x);
        log(s, `${me} 用 ${cn(st.cid)} 與 ${nm(s, t.p)} 面前的 ${cn(st.x)} 交換。`); break;
      }
      case 'swapDiscard': {
        if (!rm(s.discard, st.x)) return fail();
        takeFront(s, st.cid); s.discard.push(st.cid); putFront(s, loc.p, st.x);
        log(s, `${me} 用 ${cn(st.cid)} 換回棄牌堆的 ${cn(st.x)}。`); break;
      }
      case 'takeDef': {
        if (!rm(s.discard, st.x)) return fail();
        putFront(s, st.pid, st.x, true); log(s, `${me} 從棄牌堆拿 ${cn(st.x)} 橫放在面前。`); break;
      }
      case 'lockOwn': {
        const t = findFront(s, st.x); if (!t || t.p !== st.pid) return fail();
        s.players[t.p].front[t.i].lock = true; log(s, `${me} 將 ${cn(st.x)} 翻轉橫放。`); break;
      }
      case 'discardNamed': case 'lockNamed': {
        const t = field(s).find((x) => C(x.c).name === card.arg && !x.lock && x.c !== st.cid); if (!t) return fail();
        if (card.sk === 'lockNamed') { const l = findFront(s, t.c); s.players[l.p].front[l.i].lock = true; log(s, `${me} 將 ${nm(s, t.p)} 面前的 ${cn(t.c)} 翻轉橫放。`); }
        else { takeFront(s, t.c); s.discard.push(t.c); log(s, `${me} 用 ${cn(st.cid)} 把 ${nm(s, t.p)} 面前的 ${cn(t.c)} 丟入棄牌堆。`); }
        break;
      }
      case 'lockSelfIf': s.players[loc.p].front[loc.i].lock = true; log(s, `${me} 將 ${cn(st.cid)} 翻轉橫放。`); break;
      case 'unlockAny': {
        const t = findFront(s, st.x); if (!t || !t.lock) return fail();
        s.players[t.p].front[t.i].lock = false; log(s, `${me} 把 ${nm(s, t.p)} 面前橫放的 ${cn(st.x)} 翻正。`); break;
      }
      case 'give': {
        if (!rm(s.discard, st.x)) return fail();
        putFront(s, st.to, st.x); log(s, `${me} 從棄牌堆拿 ${cn(st.x)} 放到 ${nm(s, st.to)} 面前。`); break;
      }
      case 'gamble': gamble(s, st.pid, cn(st.cid)); break;
    }
  };
  function gamble(s, pid, why) {
    const c = draw(s); if (c == null) return;
    if (C(c).k === 'E') { putFront(s, pid, c); log(s, `${nm(s, pid)}（${why}）抽到 ${cn(c)}，放置面前。`); }
    else { s.discard.push(c); log(s, `${nm(s, pid)}（${why}）抽到功能卡 ${cn(c)}，丟入棄牌堆。`); }
  }

  // ---------- 功能卡 ----------
  OPS.magic = (s, st) => MAGIC[st.fn](s, st.pid);
  function castMagic(s, pid, cid) { withNull(s, pid, `功能卡${cn(cid)}`, [{ op: 'magic', fn: C(cid).fn, pid }], cid); }
  MAGIC.nullify = () => {};
  MAGIC.evTrigger = (s, pid) => qFront(s, [{ op: 'event', pid }]);
  MAGIC.gatherA = (s, pid) => {
    const cards = field(s).filter((x) => !x.lock && x.p !== pid).map((x) => ({ c: x.c, tag: tagOf(s, x) }))
      .concat(s.market.filter((c) => C(c).k === 'E').map((c) => ({ c, tag: '市集' })));
    if (!cards.length) return log(s, '場面上沒有可以奪取的裝備。');
    ask(s, pid, 'cards', 'gatherA', { title: '選一張裝備移至自己面前', cards, min: 1, max: 1, sense: 'good' });
  };
  RESP.gatherA = (s, p, a) => {
    const c = a[0], l = takeFront(s, c);
    if (l) log(s, `${nm(s, p.pid)} 奪取了 ${nm(s, l.p)} 面前的 ${cn(c)}。`);
    else if (rm(s.market, c)) { log(s, `${nm(s, p.pid)} 拿走市集的 ${cn(c)}。`); refillMarket(s); } else return;
    putFront(s, p.pid, c);
  };
  MAGIC.gatherB = (s, pid) => {
    const cs = [draw(s), draw(s)].filter((c) => c != null);
    if (!cs.length) return;
    ask(s, pid, 'cards', 'gatherB', { title: '選一張收回手牌，另一張洗回牌庫', cards: cs.map((c) => ({ c, tag: '抽到' })), min: 1, max: 1, sense: 'good' });
  };
  RESP.gatherB = (s, p, a) => {
    p.cards.forEach((x) => { if (x.c === a[0]) s.players[p.pid].hand.push(x.c); else { s.deck.push(x.c); shuffle(s.deck); } });
    log(s, `${nm(s, p.pid)} 抽兩張資源卡，留下一張。`);
  };
  MAGIC.viewHand = (s, pid) => askPlayer(s, pid, 'viewHand', '要觀看誰的手牌？');
  RESP.viewHand = (s, p, a) => {
    log(s, `${nm(s, p.pid)} 觀看了 ${nm(s, +a)} 的手牌。`);
    ask(s, p.pid, 'view', 'ack', { title: `${nm(s, +a)} 的手牌`, show: s.players[+a].hand.slice() });
  };
  RESP.ack = () => {};
  MAGIC.viewRole = (s, pid) => askPlayer(s, pid, 'viewRole', '要觀看誰的角色？');
  RESP.viewRole = (s, p, a) => {
    log(s, `${nm(s, p.pid)} 觀看了 ${nm(s, +a)} 的角色。`);
    ask(s, p.pid, 'view', 'ack', { title: `${nm(s, +a)} 的角色`, roles: [{ p: +a, n: s.players[+a].role.n }] });
  };
  MAGIC.swapEq = (s, pid) => askPlayer(s, pid, 'swapT', '資源交換：指定一名玩家');
  RESP.swapT = (s, p, a) => ask(s, p.pid, 'choice', 'swapR', { title: `向 ${nm(s, +a)} 指定哪個角色的裝備？`, opts: Object.keys(ROLES).filter((r) => r !== '史萊姆').map((r) => ({ id: r, label: r + '裝備' })), t: +a });
  RESP.swapR = (s, p, a) => ask(s, p.pid, 'choice', 'swapN', {
    title: '指定裝備名稱，或任一張該角色裝備', t: p.t, r: a,
    opts: [{ id: '*', label: `任一張${a}裝備` }].concat(CARDS.filter((c) => c.k === 'E' && c.role === a).map((c) => ({ id: String(c.id), label: c.name }))),
  });
  RESP.swapN = (s, p, a) => {
    const th = s.players[p.t].hand;
    const m = a === '*' ? shuffle(th.filter((c) => C(c).k === 'E' && C(c).role === p.r))[0] : th.find((c) => c === +a);
    const what = a === '*' ? `${p.r}裝備` : cn(+a);
    if (m == null) return log(s, `${nm(s, p.pid)} 向 ${nm(s, p.t)} 指定 ${what}，但對方沒有，資源交換無效。`);
    const mine = s.players[p.pid].hand.filter((c) => C(c).k === 'E');
    log(s, `${nm(s, p.pid)} 向 ${nm(s, p.t)} 指定 ${what}，對方有！`);
    if (!mine.length) { rm(th, m); s.players[p.pid].hand.push(m); return log(s, `${nm(s, p.pid)} 沒有裝備可換，直接取得 ${cn(m)}。`); }
    ask(s, p.pid, 'cards', 'swapGive', { title: `選一張手牌裝備交給 ${nm(s, p.t)}，換取 ${cn(m)}`, cards: mine.map((c) => ({ c, tag: '手牌' })), min: 1, max: 1, sense: 'bad', t: p.t, m });
  };
  RESP.swapGive = (s, p, a) => {
    const A = s.players[p.pid].hand, B = s.players[p.t].hand;
    if (!rm(B, p.m)) return;
    rm(A, a[0]); A.push(p.m); B.push(a[0]);
    log(s, `${nm(s, p.pid)} 與 ${nm(s, p.t)} 交換了一張手牌裝備。`);
  };
  MAGIC.wind = (s, pid) => ask(s, pid, 'choice', 'wind', { title: '資源大風吹：指定手牌流向。' + ringTxt(s, pid), opts: [{ id: 'pn', label: '所有人把手牌傳給下家' }, { id: 'pp', label: '所有人把手牌傳給上家' }, { id: 'dn', label: '所有人向下家抽一張' }, { id: 'dp', label: '所有人向上家抽一張' }] });
  RESP.wind = (s, p, a) => {
    const n = s.players.length, hands = s.players.map((x) => x.hand);
    if (a[0] === 'p') {
      s.players.forEach((x, i) => { x.hand = hands[a === 'pn' ? prev(s, i) : next(s, i)]; });
      log(s, `${nm(s, p.pid)} 發動資源大風吹：所有人把手牌傳給${a === 'pn' ? '下家' : '上家'}。`);
    } else {
      const got = [];
      for (let i = 0; i < n; i++) { const from = hands[a === 'dn' ? next(s, i) : prev(s, i)]; got.push(from.length ? from[rnd(from.length)] : null); }
      // 同時結算：先決定每人被抽走的牌
      for (let i = 0; i < n; i++) { const from = hands[a === 'dn' ? next(s, i) : prev(s, i)]; if (got[i] != null) rm(from, got[i]); }
      for (let i = 0; i < n; i++) if (got[i] != null) hands[i].push(got[i]);
      log(s, `${nm(s, p.pid)} 發動資源大風吹：所有人向${a === 'dn' ? '下家' : '上家'}抽一張手牌。`);
    }
  };
  function duel(s, a, b) {
    const pa = ROLES[s.players[a].role.n].pw, pb = ROLES[s.players[b].role.n].pw;
    if (pa === pb) { log(s, `${nm(s, a)} 與 ${nm(s, b)} 決鬥：平手。`); return { w: -1 }; }
    const w = pa > pb ? a : b, l = pa > pb ? b : a, d = Math.abs(pa - pb);
    log(s, `${nm(s, a)} 與 ${nm(s, b)} 決鬥：${nm(s, w)} 獲勝（戰鬥指數差 ${d}）。`);
    return { w, l, d };
  }
  MAGIC.duel = (s, pid) => askPlayer(s, pid, 'duelT', '決鬥：指定對手');
  RESP.duelT = (s, p, a) => {
    const r = duel(s, p.pid, +a); if (r.w < 0) return;
    const cards = s.players[r.l].front.filter((x) => !x.lock).map((x) => ({ c: x.c, tag: nm(s, r.l) + '面前' }));
    const n = Math.min(r.d, cards.length);
    if (!n) return log(s, `${nm(s, r.l)} 面前沒有可拿的裝備。`);
    ask(s, r.w, 'cards', 'duelTake', { title: `決鬥獲勝：從 ${nm(s, r.l)} 面前拿 ${n} 張裝備`, cards, min: n, max: n, sense: 'good' });
  };
  RESP.duelTake = (s, p, a) => { a.forEach((c) => { if (takeFront(s, c)) putFront(s, p.pid, c); }); log(s, `${nm(s, p.pid)} 拿走 ${a.map(cn).join('')}。`); };

  // ---------- 轉生 / 事件 ----------
  OPS.reinc = (s, st) => {
    const p = s.players[st.pid];
    s.roleDeck.push(p.role.n);
    p.role = { n: s.roleDeck.shift(), rev: false, used: false };
    log(s, `${nm(s, st.pid)} 轉生了，換上新的角色。`);
    if (st.event) qFront(s, [{ op: 'event', pid: st.pid }]);
  };
  OPS.event = (s, st) => {
    if (!s.evDeck.length) { s.evDeck = shuffle(s.evDiscard); s.evDiscard = []; }
    const id = s.evDeck.shift(); s.evDiscard.push(id);
    s.lastEvent = id;
    log(s, `地標「${EV[id].name}」觸發：${EV[id].desc}`);
    const who = order(s, st.pid).filter((i) => s.players[i].role.n !== '幼童');
    if (id === 'dragon') return qFront(s, [{ op: 'ev', id, who, trig: st.pid }]);
    qFront(s, who.map((i) => ({ op: 'ev', id, pid: i, trig: st.pid })));
  };
  OPS.ev = (s, st) => EVT[st.id](s, st.pid, st);
  const d4 = (s, pid) => { const r = 1 + rnd(4); log(s, `${nm(s, pid)} 擲出 ${r}。`); return r; };
  const handPick = (s, pid, f) => s.players[pid].hand.filter((c) => f(C(c))).map((c) => ({ c, tag: '手牌' }));
  const ownFrontPick = (s, pid, f) => s.players[pid].front.filter((x) => !x.lock && (!f || f(C(x.c)))).map((x) => ({ c: x.c, tag: '自己面前' }));
  EVT.ruins = (s, pid) => {
    const cards = handPick(s, pid, (c) => c.k === 'E' && c.type === '守'); if (!cards.length) return;
    ask(s, pid, 'cards', 'ruins', { title: '阿爾丹王國遺址：放置一張防守裝備到自己面前', cards, min: 1, max: 1, sense: 'good' });
  };
  RESP.ruins = (s, p, a) => { if (rm(s.players[p.pid].hand, a[0])) { putFront(s, p.pid, a[0]); drawTo(s, p.pid, 1); log(s, `${nm(s, p.pid)} 放置 ${cn(a[0])} 並抽 1 張。`); } };
  EVT.abyss = (s, pid) => {
    const p = s.players[pid]; if (p.front.some((x) => C(x.c).type === '攻')) return;
    const cards = ownFrontPick(s, pid, (c) => c.type === '他'); if (!cards.length) return;
    ask(s, pid, 'cards', 'evDiscard', { title: '地底深淵：面前沒有攻擊裝備，須棄掉一張其他類裝備', cards, min: 1, max: 1, sense: 'bad' });
  };
  RESP.evDiscard = (s, p, a) => { a.forEach((c) => { if (takeFront(s, c)) s.discard.push(c); }); if (a.length) log(s, `${nm(s, p.pid)} 將 ${a.map(cn).join('')} 丟入棄牌堆。`); };
  EVT.dragon = (s, _pid, st) => {
    let pool = []; st.who.forEach((i) => { pool = pool.concat(s.players[i].hand); s.players[i].hand = []; });
    shuffle(pool); pool.forEach((c, k) => s.players[st.who[k % st.who.length]].hand.push(c));
    log(s, '所有手牌收回洗勻後重新平均分配。');
  };
  EVT.port = (s, pid) => {
    const r = d4(s, pid), h = s.players[pid].hand, n = Math.min(r, h.length); if (!n) return;
    ask(s, pid, 'cards', 'port', { title: `貿易商港：選 ${n} 張手牌丟棄，再抽 ${n} 張`, cards: h.map((c) => ({ c, tag: '手牌' })), min: n, max: n, sense: 'bad' });
  };
  RESP.port = (s, p, a) => { const h = s.players[p.pid].hand; let k = 0; a.forEach((c) => { if (rm(h, c)) { s.discard.push(c); k++; } }); drawTo(s, p.pid, k); log(s, `${nm(s, p.pid)} 換掉 ${k} 張手牌。`); };
  EVT.wreck = (s, pid) => { if (d4(s, pid) === 4) qFront(s, [{ op: 'reinc', pid, event: false }]); };
  EVT.newbie = (s, pid) => { if (!s.players[pid].role.rev) gamble(s, pid, '新手村'); };
  EVT.oasis = (s, pid) => {
    const r = d4(s, pid), cards = ownFrontPick(s, pid); if (!cards.length) return;
    if (r <= 2) ask(s, pid, 'cards', 'evDiscard', { title: '沙漠綠洲：須將面前 1 張裝備丟入棄牌堆', cards, min: 1, max: 1, sense: 'bad' });
    else ask(s, pid, 'cards', 'oasisLock', { title: '沙漠綠洲：可橫放（覆蓋）面前 1 張裝備', cards, min: 0, max: 1, sense: 'good', optional: true });
  };
  RESP.oasisLock = (s, p, a) => { if (!a.length) return; const l = findFront(s, a[0]); if (l) { s.players[l.p].front[l.i].lock = true; log(s, `${nm(s, p.pid)} 將 ${cn(a[0])} 橫放。`); } };
  EVT.beast = (s, pid) => {
    const cards = handPick(s, pid, (c) => c.k === 'E' && c.type === '他');
    if (!cards.length) return reveal(s, pid, '野獸巢穴');
    ask(s, pid, 'cards', 'beast', { title: '野獸巢穴：選一張其他類裝備放到別人面前（不放則揭露角色）', cards, min: 0, max: 1, optional: true });
  };
  RESP.beast = (s, p, a) => { if (!a.length) return reveal(s, p.pid, '野獸巢穴'); askPlayer(s, p.pid, 'beastTo', `把 ${cn(a[0])} 放到誰面前？`, { x: a[0] }); };
  RESP.beastTo = (s, p, a) => { if (rm(s.players[p.pid].hand, p.x)) { putFront(s, +a, p.x); log(s, `${nm(s, p.pid)} 把 ${cn(p.x)} 放到 ${nm(s, +a)} 面前。`); } };
  EVT.temple = (s, pid) => {
    if (!s.players[pid].role.rev) return;
    const seen = {}, cards = s.discard.filter((c) => C(c).k === 'M' && C(c).fn !== 'nullify' && !seen[C(c).fn] && (seen[C(c).fn] = 1)).map((c) => ({ c, tag: '棄牌堆' }));
    if (!cards.length) return;
    ask(s, pid, 'cards', 'temple', { title: '智慧神殿：可從棄牌堆選 1 張功能卡立即發動', cards, min: 0, max: 1, optional: true });
  };
  RESP.temple = (s, p, a) => { if (a.length) { log(s, `${nm(s, p.pid)} 在智慧神殿發動 ${cn(a[0])}。`); castMagic(s, p.pid, a[0]); } };
  EVT.battle = (s, pid) => {
    if (!s.players[pid].role.rev) return;
    const cards = s.discard.filter((c) => C(c).k === 'E').map((c) => ({ c, tag: '棄牌堆' })); if (!cards.length) return;
    ask(s, pid, 'cards', 'battle', { title: '圖斯坦古戰場：可從棄牌堆選 1 張裝備放置自己面前', cards, min: 0, max: 1, sense: 'good', optional: true });
  };
  RESP.battle = (s, p, a) => { if (a.length && rm(s.discard, a[0])) { putFront(s, p.pid, a[0]); log(s, `${nm(s, p.pid)} 從棄牌堆取得 ${cn(a[0])}。`); } };
  EVT.islands = (s, pid) => {
    const cards = ownFrontPick(s, pid); if (!cards.length) return;
    ask(s, pid, 'cards', 'islands', { title: `奧帕姆群島：選一張面前裝備傳給下家 ${nm(s, next(s, pid))}`, cards, min: 1, max: 1, sense: 'bad' });
  };
  RESP.islands = (s, p, a) => { if (takeFront(s, a[0])) { putFront(s, next(s, p.pid), a[0]); log(s, `${nm(s, p.pid)} 把 ${cn(a[0])} 傳給 ${nm(s, next(s, p.pid))}。`); } };

  // ---------- 角色技能 ----------
  OPS.skill = (s, st) => SKILL[st.r](s, st.pid);
  SKILL.農夫 = (s, pid) => {
    const cards = field(s).filter((x) => !x.lock && x.p !== pid).map((x) => ({ c: x.c, tag: tagOf(s, x) }));
    if (!cards.length) return log(s, '場面上沒有可移動的裝備。');
    ask(s, pid, 'cards', 'farmer', { title: '種瓜得瓜：選 1 張裝備移至自己面前', cards, min: 1, max: 1, sense: 'good' });
  };
  RESP.farmer = (s, p, a) => { a.forEach((c) => { if (takeFront(s, c)) putFront(s, p.pid, c); }); log(s, `${nm(s, p.pid)} 把 ${a.map(cn).join('')} 移到自己面前。`); };
  SKILL.商人 = (s, pid) => {
    const h = s.players[pid].hand; if (!h.length) return;
    ask(s, pid, 'cards', 'port', { title: '賄絡：選任意張手牌丟棄，並抽相同張數', cards: h.map((c) => ({ c, tag: '手牌' })), min: 0, max: h.length, sense: 'bad', optional: true });
  };
  SKILL.村姑 = (s, pid) => ask(s, pid, 'view', 'ack', { title: '第六感：所有玩家的角色', roles: others(s, pid).map((i) => ({ p: i, n: s.players[i].role.n })) });
  SKILL.村長 = (s, pid) => qFront(s, others(s, pid).map((i) => ({ op: 'chief', pid: i })));
  OPS.chief = (s, st) => {
    const cards = ownFrontPick(s, st.pid); if (!cards.length) return;
    ask(s, st.pid, 'cards', 'evDiscard', { title: '村長的權威：須將面前一張裝備丟入棄牌堆', cards, min: 1, max: 1, sense: 'bad' });
  };
  SKILL.小惡魔 = (s, pid) => {
    const n = s.players.length, opts = [];
    for (let k = 1; k < n; k++) opts.push({ id: 'n' + k, label: `角色卡傳給下家 ${k} 次` });
    for (let k = 1; k < n; k++) opts.push({ id: 'p' + k, label: `角色卡傳給上家 ${k} 次` });
    ask(s, pid, 'choice', 'imp', { title: '惡作劇：所有玩家的角色卡要怎麼傳？' + ringTxt(s, pid), opts });
  };
  RESP.imp = (s, p, a) => {
    const n = s.players.length, k = +a.slice(1) * (a[0] === 'n' ? 1 : -1), roles = s.players.map((x) => x.role);
    s.players.forEach((x, i) => { x.role = roles[((i - k) % n + n) % n]; });
    log(s, `${nm(s, p.pid)} 惡作劇：所有角色卡傳給${a[0] === 'n' ? '下家' : '上家'} ${a.slice(1)} 次。`);
  };
  SKILL.史萊姆 = (s, pid) => {
    const five = s.roleDeck.splice(0, 5);
    ask(s, pid, 'choice', 'slime', { title: '變形：選一個角色', opts: five.map((r) => ({ id: r, label: `${r}（${FAC[ROLES[r].f].nation}）— ${ROLES[r].sk}` })), five });
  };
  RESP.slime = (s, p, a) => {
    s.roleDeck = shuffle(s.roleDeck.concat(p.five.filter((r) => r !== a), ['史萊姆']));
    s.players[p.pid].role = { n: a, rev: false, used: false };
    log(s, `${nm(s, p.pid)}（史萊姆）變形成了另一個角色。`);
  };
  SKILL.魔女 = (s, pid) => askPlayer(s, pid, 'witchT', '魅惑：指定一名玩家');
  RESP.witchT = (s, p, a) => {
    const t = +a, h = s.players[t].hand;
    log(s, `${nm(s, p.pid)} 魅惑了 ${nm(s, t)}，觀看其手牌與角色。`);
    ask(s, p.pid, 'cards', 'witchTake', { title: `${nm(s, t)} 的角色是「${s.players[t].role.n}」。選擇要換走的手牌（可不選）`, cards: h.map((c) => ({ c, tag: nm(s, t) + '手牌' })), min: 0, max: Math.min(h.length, s.players[p.pid].hand.length), sense: 'good', optional: true, t });
  };
  RESP.witchTake = (s, p, a) => {
    if (!a.length) return;
    ask(s, p.pid, 'cards', 'witchGive', { title: `選 ${a.length} 張自己的手牌交給 ${nm(s, p.t)}`, cards: s.players[p.pid].hand.map((c) => ({ c, tag: '手牌' })), min: a.length, max: a.length, sense: 'bad', t: p.t, take: a });
  };
  RESP.witchGive = (s, p, a) => {
    const A = s.players[p.pid].hand, B = s.players[p.t].hand;
    p.take.forEach((c) => { if (rm(B, c)) A.push(c); }); a.forEach((c) => { if (rm(A, c)) B.push(c); });
    log(s, `${nm(s, p.pid)} 與 ${nm(s, p.t)} 交換了 ${a.length} 張手牌。`);
  };
  SKILL.吸血鬼 = (s, pid) => {
    const got = field(s).filter((x) => !x.lock && x.p !== pid && C(x.c).role === '吸血鬼');
    got.forEach((x) => { takeFront(s, x.c); putFront(s, pid, x.c); });
    log(s, got.length ? `${nm(s, pid)} 吸走了 ${got.map((x) => cn(x.c)).join('')}。` : '場面上沒有吸血鬼裝備。');
  };
  SKILL.食人魔 = (s, pid) => {
    let pool = []; s.players.forEach((p) => { pool = pool.concat(p.front.filter((x) => !x.lock).map((x) => x.c)); p.front = p.front.filter((x) => x.lock); });
    shuffle(pool); const ord = order(s, pid); pool.forEach((c, k) => putFront(s, ord[k % ord.length], c));
    log(s, `${nm(s, pid)} 的豪華大餐：場上 ${pool.length} 張裝備重新洗牌平均分配。`);
  };
  SKILL.弓箭手 = (s, pid) => askPlayer(s, pid, 'archer', '百發百中：與誰交換所有手牌？');
  RESP.archer = (s, p, a) => { const A = s.players[p.pid], B = s.players[+a], t = A.hand; A.hand = B.hand; B.hand = t; log(s, `${nm(s, p.pid)} 與 ${nm(s, +a)} 交換了所有手牌。`); };
  SKILL.劍士 = (s, pid) => askPlayer(s, pid, 'sword', '鬥氣：指定決鬥對手');
  RESP.sword = (s, p, a) => {
    const r = duel(s, p.pid, +a); if (r.w !== p.pid) return;
    const got = s.players[+a].front.filter((x) => !x.lock && C(x.c).role === '劍士').map((x) => x.c);
    got.forEach((c) => { takeFront(s, c); putFront(s, p.pid, c); });
    log(s, got.length ? `${nm(s, p.pid)} 奪得 ${got.map(cn).join('')}。` : `${nm(s, +a)} 面前沒有劍士裝備。`);
  };
  SKILL.法師 = (s, pid) => {
    const cs = [draw(s), draw(s), draw(s)].filter((c) => c != null), steps = [];
    cs.forEach((c) => {
      if (C(c).k === 'E') { putFront(s, pid, c); log(s, `${nm(s, pid)} 抽到 ${cn(c)}，放置面前。`); }
      else { s.discard.push(c); log(s, `${nm(s, pid)} 抽到功能卡 ${cn(c)}${C(c).fn === 'nullify' ? '，無法發動' : '，立刻發動'}。`); if (C(c).fn !== 'nullify') steps.push({ op: 'null', src: pid, label: `功能卡${cn(c)}`, then: [{ op: 'magic', fn: C(c).fn, pid }], cid: c }); }
    });
    qFront(s, steps);
  };
  SKILL.盜賊 = (s, pid) => {
    const got = s.market.filter((c) => C(c).k === 'E'); s.market = s.market.filter((c) => C(c).k !== 'E');
    got.forEach((c) => putFront(s, pid, c)); refillMarket(s);
    log(s, got.length ? `${nm(s, pid)} 搜刮了市集的 ${got.map(cn).join('')}。` : '市集裡沒有裝備可偷。');
  };
  SKILL.祭司 = (s, pid) => {
    const p = s.players[pid], es = p.hand.filter((c) => C(c).k === 'E'); p.hand = p.hand.filter((c) => C(c).k !== 'E');
    es.forEach((c) => putFront(s, pid, c)); drawTo(s, pid, es.length);
    log(s, es.length ? `${nm(s, pid)} 打出 ${es.map(cn).join('')} 並抽 ${es.length} 張。` : `${nm(s, pid)} 手上沒有裝備。`);
  };

  // ---------- 玩家行動 ----------
  function canSkill(s, pid) { const r = s.players[pid].role; return s.phase === 'play' && s.turn === pid && !s.prompt && !s.q.length && !ROLES[r.n].passive && !r.used; }
  function canRedraw(s, pid) { const h = s.players[pid].hand; return h.length > 0 && (h.every((c) => C(c).k === 'E') || h.every((c) => C(c).k === 'M')); }
  function act(s, pid, a) {
    if (s.phase !== 'play') return '遊戲已結束';
    if (s.prompt || s.q.length) return '請等待目前的效果結算';
    if (s.turn !== pid) return '還沒輪到你';
    const p = s.players[pid];
    if (a.t === 'timeout') {
      if (!timed(s)) return '目前沒有計時';
      if (!s.acted) log(s, `⏱ 時間到：${p.name} 沒有行動，跳過回合。`);
      else log(s, `⏱ 時間到：${p.name} 的回合強制結束。`);
      s.acted = true; const r = act(s, pid, { t: 'end' });
      return r;
    }
    if (a.t === 'end') {
      if (!s.acted) return '請先執行一個動作';
      if (p.hand.length < 5) drawTo(s, pid, 5 - p.hand.length);
      s.turn = next(s, pid); s.acted = false; s.round++;
      if (s.opts.skill === 'turn') s.players[s.turn].role.used = false;
      const D = s.opts.doom;
      if (s.turn === s.first) {
        s.cycle = (s.cycle || 1) + 1;
        if (D && D.end && s.cycle > D.end) { doomEnd(s); return null; }
      }
      log(s, `— 輪到 ${nm(s, s.turn)} —`);
      if (D && s.turn === s.first && s.cycle === D.from) log(s, `☄ 末日將至（第 ${s.cycle} 輪）：從現在起每位玩家只有 ${D.sec} 秒思考時間，時間到強制換下一位。`);
      return run(s), null;
    }
    if (a.t === 'skill') {
      if (!canSkill(s, pid)) return '現在不能發動角色技能';
      p.role.used = true; reveal(s, pid, '發動技能');
      log(s, `${p.name} 發動角色技能「${ROLES[p.role.n].sk}」。`);
      s.q.push({ op: 'skill', r: p.role.n, pid });
      return run(s), null;
    }
    if (s.acted) return '本回合已執行過動作，請結束回合';
    if (a.t === 'play') {
      const card = C(a.c); if (!card || !p.hand.includes(a.c)) return '沒有這張牌';
      if (card.k === 'M') {
        if (card.fn === 'nullify') return '【無效】只能在別人發動功能卡或裝備技能時打出';
        rm(p.hand, a.c); s.discard.push(a.c); s.acted = true;
        log(s, `${p.name} 發動功能卡 ${cn(a.c)}。`);
        castMagic(s, pid, a.c);
      } else {
        const to = a.to == null ? pid : a.to; if (!s.players[to]) return '目標不存在';
        rm(p.hand, a.c); s.acted = true;
        if (to === pid) { putFront(s, pid, a.c); log(s, `${p.name} 打出裝備 ${cn(a.c)} 到自己面前。`); s.q.push({ op: 'eqSkill', pid, cid: a.c }); }
        else {
          log(s, `${p.name} 把裝備 ${cn(a.c)} 放到 ${nm(s, to)} 面前。`);
          ask(s, to, 'choice', 'accept', { title: `${p.name} 把 ${cn(a.c)} 放到你面前，要收下嗎？`, sub: '退回的話，這張牌會放到對方面前。', show: [a.c], opts: [{ id: 'y', label: '收下' }, { id: 'n', label: '退回' }], from: pid, cid: a.c });
        }
      }
      return run(s), null;
    }
    if (a.t === 'market') {
      if (!p.hand.includes(a.c) || !s.market.includes(a.m)) return '無法交換';
      p.hand[p.hand.indexOf(a.c)] = a.m; s.market[s.market.indexOf(a.m)] = a.c; s.acted = true;
      log(s, `${p.name} 用 ${cn(a.c)} 與市集的 ${cn(a.m)} 交換。`);
      return run(s), null;
    }
    if (a.t === 'redraw') {
      if (!canRedraw(s, pid)) return '手牌必須全是裝備或全是功能卡';
      const n = p.hand.length; s.discard.push.apply(s.discard, p.hand); p.hand = []; drawTo(s, pid, 5); s.acted = true;
      log(s, `${p.name} 換掉全部 ${n} 張手牌。`);
      return run(s), null;
    }
    if (a.t === 'reinc') { s.acted = true; s.q.push({ op: 'reinc', pid, event: true }); return run(s), null; }
    return '未知的動作';
  }
  function respond(s, pid, ans) {
    const p = s.prompt; if (!p || p.pid !== pid) return '現在不需要你回應';
    if (p.kind === 'choice') { if (!p.opts.some((o) => o.id === ans)) return '無效的選項'; }
    else if (p.kind === 'cards') {
      if (!Array.isArray(ans)) return '請選擇卡片';
      const ok = p.cards.map((x) => x.c); ans = ans.filter((c, i) => ok.includes(c) && ans.indexOf(c) === i);
      if (ans.length < p.min || ans.length > p.max) return p.min === p.max ? `請選 ${p.min} 張` : `請選 ${p.min}–${p.max} 張`;
    }
    s.prompt = null; RESP[p.k](s, p, ans); run(s); return null;
  }

  // ---------- 電腦玩家 ----------
  function useful(s, pid, cid) { const c = C(cid); if (c.k !== 'E') return false; const r = s.players[pid].role.n; return r === '史萊姆' || c.role === r || ROLES[r].win.includes(c.name); }
  function autoAnswer(s) { // 計時到時替真人代答：【無效】一律不打，其餘照電腦邏輯
    const pr = s.prompt; if (!pr) return null;
    if (pr.kind === 'choice' && pr.k === 'null') return { pid: pr.pid, ans: 'n' };
    return bot(s);
  }
  function bot(s) {
    if (s.phase !== 'play') return null;
    const pr = s.prompt;
    if (pr) {
      const pid = pr.pid;
      if (pr.kind === 'view') return { pid, ans: 'ok' };
      if (pr.kind === 'choice') {
        if (pr.k === 'null') return { pid, ans: Math.random() < 0.3 ? 'y' : 'n' };
        if (pr.k === 'accept') return { pid, ans: useful(s, pid, pr.cid) || Math.random() < 0.5 ? 'y' : 'n' };
        if (pr.k === 'eqYN') return { pid, ans: 'y' };
        return { pid, ans: pr.opts[rnd(pr.opts.length)].id };
      }
      let cs = shuffle(pr.cards.map((x) => x.c));
      if (pr.sense === 'good') cs.sort((a, b) => useful(s, pid, b) - useful(s, pid, a));
      if (pr.sense === 'bad') cs.sort((a, b) => useful(s, pid, a) - useful(s, pid, b));
      let n = pr.min;
      if (pr.max > pr.min) n = pr.sense === 'bad' ? pr.min : pr.sense === 'good' ? pr.max : pr.min + rnd(pr.max - pr.min + 1);
      if (pr.k === 'witchTake') n = cs.filter((c) => useful(s, pid, c)).length;
      if (pr.k === 'eqPick' && C(pr.cid).sk.indexOf('swap') === 0 && !useful(s, pid, cs[0])) n = 0;
      return { pid, ans: cs.slice(0, Math.min(n, pr.max)) };
    }
    const pid = s.turn, p = s.players[pid];
    if (s.acted) return { pid, act: { t: 'end' } };
    if (canSkill(s, pid) && Math.random() < 0.3) return { pid, act: { t: 'skill' } };
    const good = p.hand.filter((c) => useful(s, pid, c));
    if (good.length) return { pid, act: { t: 'play', c: good[0], to: pid } };
    const mu = s.market.find((c) => useful(s, pid, c));
    if (mu != null && p.hand.length) return { pid, act: { t: 'market', c: p.hand[0], m: mu } };
    const playable = p.hand.filter((c) => C(c).fn !== 'nullify' && (C(c).k === 'M' || p.front.length < 5));
    if (playable.length && Math.random() < 0.85) {
      const c = playable[rnd(playable.length)], o = others(s, pid);
      return { pid, act: { t: 'play', c, to: C(c).k === 'E' && Math.random() < 0.3 ? o[rnd(o.length)] : pid } };
    }
    if (canRedraw(s, pid) && Math.random() < 0.5) return { pid, act: { t: 'redraw' } };
    return { pid, act: { t: 'reinc' } };
  }

  return { FAC, ROLES, CARDS, EV, EVENTS, MAG, TYPE, C, newGame, act, respond, bot, canSkill, canRedraw, timed, autoAnswer, soloCheck, facProgress, skillSpec };
})();
if (typeof module !== 'undefined') module.exports = G;
