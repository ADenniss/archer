const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const $ = (s) => document.querySelector(s);
const ui = { start: $('#startScreen'), levelup: $('#levelUpScreen'), over: $('#gameOverScreen'), startButton: $('#startButton'), restartButton: $('#restartButton'), mapSelectButton: $('#mapSelectButton'), pauseButton: $('#pauseButton'), grid: $('#upgradeGrid'), health: $('#healthFill'), healthText: $('#healthText'), xp: $('#xpFill'), xpText: $('#xpText'), level: $('#levelLabel'), wave: $('#waveLabel'), relic: $('#relicLabel'), best: $('#bestLabel'), dash: $('#dashFill'), crosshair: $('#crosshair'), final: $('#finalStats'), toast: $('#toast'), interact: $('#interactPrompt') };

let W = 0, H = 0, dpr = 1, running = false, paused = false, manualPaused = false, last = 0, elapsed = 0, spawnTimer = 0, wave = 1, kills = 0;
const keys = new Set(), mouse = { x: 0, y: 0, down: false };
let player, arrows, enemies, particles, pickups, trails, stars, hills, ruins, iceRidges, mapObject, mapRelics;
let currentMap = 'grove', currentBow = 'starlight';
const maps = {
  grove: { name: 'Moonshot Grove', scene: 'wild', glow: '#133947', mid: '#0d2937', edge: '#06131f', star: '171,245,220', line: '#68d9c0', land: '#1d5753', accent: '#66ae75', feature: { name: 'Bloom Shrine', text: 'restore 40 vitality', icon: '✦', color: '#b7f05c' } },
  ruins: { name: 'Emberfall Ruins', scene: 'ruins', glow: '#5a2830', mid: '#2a1d2a', edge: '#100f1a', star: '255,190,119', line: '#dc795e', land: '#432432', accent: '#db7054', feature: { name: 'Cinder Forge', text: 'blast nearby shadows', icon: '◆', color: '#ffad70' } },
  frost: { name: 'Frostwake Basin', scene: 'ridges', glow: '#244e6f', mid: '#122d47', edge: '#071725', star: '196,244,255', line: '#82ddec', land: '#386b8b', accent: '#8de6f5', feature: { name: 'Aurora Well', text: 'freeze all shadows', icon: '✧', color: '#a5ecff' } },
  archives: { name: 'Starfall Archives', scene: 'ruins', glow: '#45316f', mid: '#23234a', edge: '#101126', star: '221,191,255', line: '#aa8ee8', land: '#292b5d', accent: '#9172d2', feature: { name: 'Rune Archive', text: 'claim 5 stardust', icon: '⌘', color: '#d8bcff' } },
  dunes: { name: 'Glasswind Dunes', scene: 'ridges', glow: '#80502d', mid: '#402a2a', edge: '#17131b', star: '255,222,154', line: '#e4a353', land: '#915c2f', accent: '#eab462', feature: { name: 'Wind Obelisk', text: 'refresh dash and sprint', icon: '↯', color: '#ffe19a' } },
  canopy: { name: 'Thornveil Canopy', scene: 'wild', glow: '#31543e', mid: '#183331', edge: '#081c24', star: '196,246,138', line: '#9cd96e', land: '#28533e', accent: '#72aa55', feature: { name: 'Thornheart', text: 'gain one arrow per shot', icon: '✤', color: '#c0f982' } }
};
const bows = {
  starlight: { name: 'Starlight', damage: 1, fireRate: .39, speed: 690, multishot: 1, pierce: 0, type: 'starlight', color: '#d7fa8c', trail: '#c4f66d' },
  cinder: { name: 'Cinder', damage: 2, fireRate: .57, speed: 610, multishot: 1, pierce: 0, type: 'cinder', color: '#ff9f71', trail: '#ff785e' },
  frost: { name: 'Froststring', damage: 1, fireRate: .3, speed: 785, multishot: 1, pierce: 0, type: 'frost', color: '#b4f2ff', trail: '#79dff4', freeze: 1.1 },
  thorn: { name: 'Thornwood', damage: 1, fireRate: .5, speed: 650, multishot: 3, pierce: 0, type: 'thorn', color: '#bbef84', trail: '#7fcb63' },
  dusk: { name: 'Duskpiercer', damage: 1, fireRate: .45, speed: 740, multishot: 1, pierce: 2, type: 'dusk', color: '#d7bbff', trail: '#9b76dc' },
  sun: { name: 'Sunspire', damage: 3, fireRate: .78, speed: 555, multishot: 1, pierce: 1, type: 'sun', color: '#ffe27d', trail: '#ffb85c' },
  storm: { name: 'Stormsong', damage: 1, fireRate: .2, speed: 900, multishot: 1, pierce: 0, type: 'storm', color: '#b8f2ff', trail: '#65ccef' },
  vine: { name: 'Vinewhisper', damage: 1, fireRate: .43, speed: 675, multishot: 2, pierce: 1, type: 'vine', color: '#99e8ad', trail: '#55ba86' }
};
const best = Number(localStorage.getItem('moonshot-best') || 0);
ui.best.textContent = String(best).padStart(3, '0');

function resize() { const box = canvas.getBoundingClientRect(); dpr = Math.min(devicePixelRatio || 1, 2); W = box.width; H = box.height; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); makeStars(); }
function makeStars() { stars = Array.from({ length: Math.ceil(W * H / 6500) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.4 + .25, a: Math.random() * .45 + .15, phase: Math.random() * 7 })); hills = Array.from({ length: 9 }, (_, i) => ({ x: (i / 8) * W, height: 150 + Math.random() * 60, color: i % 2 ? '#1d5753' : '#153c4b' })); ruins = Array.from({ length: 10 }, (_, i) => ({ x: (i + .2 + Math.random() * .5) * W / 10, width: 18 + Math.random() * 32, height: 32 + Math.random() * 92, lean: Math.random() * .13 - .065 })); iceRidges = Array.from({ length: 8 }, (_, i) => ({ x: (i - .1) * W / 7, peak: H - 90 - Math.random() * 145, width: W / 5 + Math.random() * 45 })); }
window.addEventListener('resize', resize); resize();

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function init() {
  const bow = bows[currentBow];
  player = { x: W * .5, y: H * .53, r: 16, speed: 245, hp: 100, maxHp: 100, level: 1, xp: 0, xpNext: 5, damage: bow.damage, fireRate: bow.fireRate, shootTimer: 0, arrowSpeed: bow.speed, multishot: bow.multishot, pierce: bow.pierce, bow: currentBow, dash: 0, dashCooldown: 1.45, invuln: 0, angle: 0, upgrades: {} };
  mapObject = { x: W * .72, y: H * .32, r: 24, used: false, ...maps[currentMap].feature };
  mapRelics = [{x:W*.22,y:H*.28},{x:W*.5,y:H*.76},{x:W*.84,y:H*.67}].map((spot,index)=>({ ...spot, r:13, hp:2, phase:index*2.1, broken:false, color:maps[currentMap].feature.color, icon:maps[currentMap].feature.icon }));
  arrows = []; enemies = []; particles = []; pickups = []; trails = []; elapsed = 0; spawnTimer = .6; wave = 1; kills = 0; paused = false;
  updateUI();
}
function start() { init(); running = true; manualPaused = false; updatePauseButton(); ui.start.classList.add('hidden'); ui.over.classList.add('hidden'); ui.crosshair.classList.add('visible'); last = performance.now(); requestAnimationFrame(loop); toast(`${maps[currentMap].name.toUpperCase()} AWAITS`); }
function gameOver() { running = false; manualPaused = false; updatePauseButton(); ui.crosshair.classList.remove('visible'); ui.interact.classList.remove('visible'); const record = Math.max(best, kills); localStorage.setItem('moonshot-best', record); ui.best.textContent = String(record).padStart(3, '0'); ui.final.textContent = `You reached level ${player.level} and scattered ${kills} shadow${kills === 1 ? '' : 's'}.`; ui.over.classList.remove('hidden'); }
function updatePauseButton() { ui.pauseButton.classList.toggle('is-paused', manualPaused); ui.pauseButton.innerHTML = manualPaused ? '▶ <span>RESUME</span>' : 'Ⅱ <span>PAUSE</span>'; ui.pauseButton.setAttribute('aria-label', manualPaused ? 'Resume game' : 'Pause game'); }
function togglePause() { if (!running || !ui.levelup.classList.contains('hidden')) return; manualPaused = !manualPaused; paused = manualPaused; mouse.down = false; updatePauseButton(); ui.crosshair.classList.toggle('visible', !manualPaused); toast(manualPaused ? 'THE GROVE WAITS' : 'THE HUNT CONTINUES'); }
function updateUI() { if (!player) return; ui.health.style.width = `${player.hp / player.maxHp * 100}%`; ui.healthText.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`; ui.xp.style.width = `${player.xp / player.xpNext * 100}%`; ui.xpText.textContent = `${player.xp} / ${player.xpNext}`; ui.level.textContent = `LVL ${String(player.level).padStart(2, '0')}`; ui.wave.textContent = String(wave).padStart(2, '0'); ui.relic.textContent = `${mapRelics ? mapRelics.filter(relic=>relic.broken).length : 0}/3`; ui.dash.style.width = `${(1 - player.dash / player.dashCooldown) * 100}%`; }
function toast(message) { ui.toast.textContent = message; ui.toast.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => ui.toast.classList.remove('show'), 1500); }

function spawnEnemy() {
  const side = Math.floor(Math.random() * 4); const pad = 45; let x, y;
  if (side === 0) [x,y] = [rand(-pad, W+pad), -pad]; if (side === 1) [x,y] = [W+pad, rand(-pad,H+pad)]; if (side === 2) [x,y] = [rand(-pad,W+pad), H+pad]; if (side === 3) [x,y] = [-pad, rand(-pad,H+pad)];
  const wisp = wave >= 2 && Math.random() < Math.min(.28, .08 + elapsed / 240), tank = !wisp && Math.random() < Math.min(.24, elapsed / 150); const sprite = wisp ? 'wisp' : Math.random() < .5 ? 'moss' : 'shade';
  enemies.push({ x, y, r: wisp ? 11 : tank ? 20 : 13, hp: wisp ? 2 + Math.floor(wave/6) : tank ? 4 + Math.floor(wave/3) : 1 + Math.floor(wave/5), maxHp: wisp ? 2 : tank ? 4 : 1, speed: wisp ? rand(86,108) : tank ? rand(37,52) : rand(53,80), hit:0, wobble:Math.random()*6.3, sprite, tank, knock:0, blink: wisp ? rand(1.4,2.8) : 0 });
}
function shoot() {
  const base = Math.atan2(mouse.y - player.y, mouse.x - player.x), bow = bows[player.bow], spread = .15;
  for(let i=0;i<player.multishot;i++) { const a = base + (i-(player.multishot-1)/2) * spread; arrows.push({ x:player.x + Math.cos(a)*17, y:player.y + Math.sin(a)*17, vx:Math.cos(a)*player.arrowSpeed, vy:Math.sin(a)*player.arrowSpeed, life:1.25, r:4, pierce:player.pierce, angle:a, type:bow.type, color:bow.color, trail:bow.trail, freeze:bow.freeze || 0 }); }
  for(let i=0;i<5;i++) particles.push({x:player.x+Math.cos(base)*14,y:player.y+Math.sin(base)*14,vx:rand(-25,25)+Math.cos(base)*60,vy:rand(-25,25)+Math.sin(base)*60,life:.25,max:.25,size:rand(1,3),color:bow.trail});
}
function burst(x,y,color,count=12,force=110) { for(let i=0;i<count;i++) { const a=rand(0,Math.PI*2), speed=rand(force*.25,force); particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:rand(.32,.7),max:.7,size:rand(1.5,4),color}); } }
function hitEnemy(e, arrow) { e.hp -= player.damage; e.hit = .12; e.knock = 12; if (arrow.freeze) e.frozen = Math.max(e.frozen || 0, arrow.freeze); burst(arrow.x, arrow.y, arrow.trail || '#d8ff9b', 5, 85); if (e.hp <= 0) { const index=enemies.indexOf(e); if(index>=0) enemies.splice(index,1); kills++; const enemyColor=e.sprite==='moss'?'#aeea6c':e.sprite==='wisp'?'#9fefff':'#a682e0'; burst(e.x,e.y,enemyColor, e.tank?22:12, e.tank?150:105); const number=e.tank?3:e.sprite==='wisp'?2:1; for(let i=0;i<number;i++) pickups.push({x:e.x+rand(-7,7),y:e.y+rand(-7,7),r:5,value:1,life:12,phase:Math.random()*5}); if(kills%12===0) toast(`${kills} SHADOWS DISPERSED`); } }
function collect(p) { player.xp += p.value; burst(p.x,p.y,'#8ef1cf',5,55); if(player.xp >= player.xpNext) levelUp(); updateUI(); }
function levelUp() { player.xp -= player.xpNext; player.level++; player.xpNext = Math.ceil(4 + player.level * 2.4); paused = true; mouse.down = false; ui.crosshair.classList.remove('visible'); render(); ui.grid.innerHTML = ''; upgradeOptions().forEach(o => { const b=document.createElement('button'); b.className='upgrade'; b.innerHTML=`<div class="upgrade-icon">${o.icon}</div><h3>${o.title}</h3><p>${o.text}</p><span class="pick">↗</span>`; b.addEventListener('click',()=>chooseUpgrade(o)); ui.grid.appendChild(b); }); ui.levelup.classList.remove('hidden'); }
function chooseUpgrade(o) { o.apply(); ui.levelup.classList.add('hidden'); paused=false; ui.crosshair.classList.add('visible'); toast(o.title.toUpperCase()); updateUI(); }
function upgradeOptions() {
  const pool = [
    {icon:'⇶',title:'Splitwood',text:'+1 arrow per shot. A wider song for the grove.',apply:()=>player.multishot++},
    {icon:'✦',title:'Star-Tipped',text:'+1 damage. Let every arrow burn brighter.',apply:()=>player.damage++},
    {icon:'↯',title:'Quickstring',text:'Fire 24% faster. Keep the night at bay.',apply:()=>player.fireRate*=.76},
    {icon:'➶',title:'Needlewind',text:'Arrows fly 28% faster and pierce one foe.',apply:()=>{player.arrowSpeed*=1.28;player.pierce++}},
    {icon:'♥',title:'Moonbloom',text:'+25 vitality, and heal the wound you carry.',apply:()=>{player.maxHp+=25;player.hp=Math.min(player.maxHp,player.hp+30)}},
    {icon:'✧',title:'Hare’s Step',text:'Move 18% faster. A footfall beyond the dark.',apply:()=>player.speed*=1.18}
  ];
  return pool.sort(()=>Math.random()-.5).slice(0,3);
}
function updateInteractionPrompt() {
  const nearby = mapObject && !mapObject.used && !paused && dist(player, mapObject) < mapObject.r + 50;
  ui.interact.classList.toggle('visible', nearby);
  ui.interact.setAttribute('aria-hidden', String(!nearby));
  if (nearby) ui.interact.innerHTML = `<kbd>E</kbd> ${mapObject.name.toUpperCase()} — ${mapObject.text.toUpperCase()}`;
}
function activateMapFeature() {
  if (!running || paused || !mapObject || mapObject.used || dist(player, mapObject) >= mapObject.r + 50) return;
  mapObject.used = true; ui.interact.classList.remove('visible'); ui.interact.setAttribute('aria-hidden', 'true');
  if (currentMap === 'grove') player.hp = Math.min(player.maxHp, player.hp + 40);
  if (currentMap === 'ruins') for (const enemy of enemies.slice()) if (dist(enemy, mapObject) < 255) { enemy.hp = 0; hitEnemy(enemy, { x: enemy.x, y: enemy.y, trail: mapObject.color }); }
  if (currentMap === 'frost') enemies.forEach(enemy => enemy.frozen = 5);
  if (currentMap === 'archives') { player.xp += 5; if (player.xp >= player.xpNext) levelUp(); }
  if (currentMap === 'dunes') { player.speed *= 1.18; player.dash = 0; }
  if (currentMap === 'canopy') player.multishot++;
  burst(mapObject.x, mapObject.y, mapObject.color, 24, 175); toast(`${mapObject.name.toUpperCase()} AWAKENED`); updateUI();
}
function shatterRelic(relic, arrow) {
  relic.hp -= Math.max(1, player.damage); burst(relic.x, relic.y, arrow.trail, 7, 95);
  if (relic.hp > 0) return;
  relic.broken = true; burst(relic.x, relic.y, relic.color, 20, 155);
  if (currentMap === 'grove') player.hp = Math.min(player.maxHp, player.hp + 12);
  if (currentMap === 'ruins') enemies.forEach(enemy => { if (dist(enemy, relic) < 185) { enemy.knock = 420; enemy.hit = .18; } });
  if (currentMap === 'frost') enemies.forEach(enemy => { if (dist(enemy, relic) < 230) enemy.frozen = Math.max(enemy.frozen || 0, 3); });
  if (currentMap === 'archives') for (let i=0;i<3;i++) pickups.push({x:relic.x+rand(-10,10),y:relic.y+rand(-10,10),r:5,value:1,life:12,phase:Math.random()*5});
  if (currentMap === 'dunes') { player.dash = 0; player.invuln = Math.max(player.invuln, .35); }
  if (currentMap === 'canopy') player.damage++;
  const rewards = { grove:'HEARTSEED RESTORED', ruins:'CINDERWAVE RELEASED', frost:'ICE PRISM SHATTERED', archives:'RUNE CACHE OPENED', dunes:'WINDBURST FOUND', canopy:'THORN SAP AWAKENED' };
  toast(rewards[currentMap]); updateUI();
}
function update(dt) {
  elapsed += dt; wave = 1 + Math.floor(elapsed / 32); spawnTimer -= dt; const spawnRate = Math.max(.18, .92 - elapsed*.011); if(spawnTimer<=0){spawnEnemy();spawnTimer=spawnRate*rand(.65,1.3)}
  let mx=(keys.has('d')?1:0)-(keys.has('a')?1:0), my=(keys.has('s')?1:0)-(keys.has('w')?1:0); if(mx||my){const l=Math.hypot(mx,my);mx/=l;my/=l;} player.x=clamp(player.x+mx*player.speed*dt,18,W-18);player.y=clamp(player.y+my*player.speed*dt,70,H-30);player.angle=Math.atan2(mouse.y-player.y,mouse.x-player.x);
  player.shootTimer-=dt;player.dash-=dt;player.invuln-=dt;if(mouse.down&&player.shootTimer<=0){shoot();player.shootTimer=player.fireRate}
  arrows.forEach(a=>{a.x+=a.vx*dt;a.y+=a.vy*dt;a.life-=dt;}); arrows=arrows.filter(a=>a.life>0&&a.x>-50&&a.y>-50&&a.x<W+50&&a.y<H+50);
  enemies.forEach(e=>{const a=Math.atan2(player.y-e.y,player.x-e.x), frozen=e.frozen>0; e.frozen=Math.max(0,(e.frozen||0)-dt); e.blink-=dt;if(e.sprite==='wisp'&&e.blink<=0&&!frozen){const leap=Math.min(100,Math.max(0,dist(e,player)-70));e.x+=Math.cos(a)*leap;e.y+=Math.sin(a)*leap;e.blink=rand(1.45,2.65);burst(e.x,e.y,'#8eefff',9,100);} e.x+=Math.cos(a)*(e.speed+e.knock)*(frozen?.16:1)*dt;e.y+=Math.sin(a)*(e.speed+e.knock)*(frozen?.16:1)*dt;e.knock=Math.max(0,e.knock-dt*70);e.wobble+=dt*3;e.hit-=dt;if(dist(e,player)<e.r+player.r&&player.invuln<=0){player.hp-=e.tank?16:e.sprite==='wisp'?11:9;player.invuln=.65;burst(player.x,player.y,'#f47b70',12,115);if(player.hp<=0)gameOver();}});
  for(const a of arrows.slice()){ let struckRelic=false; for(const relic of mapRelics){if(!relic.broken&&Math.hypot(a.x-relic.x,a.y-relic.y)<a.r+relic.r){shatterRelic(relic,a);arrows.splice(arrows.indexOf(a),1);struckRelic=true;break}} if(struckRelic)continue; for(const e of enemies.slice()){ if(Math.hypot(a.x-e.x,a.y-e.y)<a.r+e.r){hitEnemy(e,a);if(a.pierce>0)a.pierce--;else{arrows.splice(arrows.indexOf(a),1);break}}}}
  pickups.forEach(p=>{p.life-=dt;p.phase+=dt*4;const d=dist(p,player);if(d<125){const a=Math.atan2(player.y-p.y,player.x-p.x), speed=170+(125-d)*4;p.x+=Math.cos(a)*speed*dt;p.y+=Math.sin(a)*speed*dt;}if(d<player.r+10){p.collected=true;collect(p)}});pickups=pickups.filter(p=>p.life>0&&!p.collected);
  particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.94;p.vy*=.94;p.life-=dt;});particles=particles.filter(p=>p.life>0);mapRelics.forEach(relic=>relic.phase+=dt*2.3);trails.push({x:player.x,y:player.y,life:.42,max:.42});trails=trails.filter(t=>{t.life-=dt;return t.life>0});updateInteractionPrompt();updateUI();
}
function drawBackground() {
  const map = maps[currentMap];
  const g = ctx.createRadialGradient(W * .5, H * .45, 10, W * .5, H * .5, Math.max(W, H) * .7);
  g.addColorStop(0, map.glow); g.addColorStop(.44, map.mid); g.addColorStop(1, map.edge);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save();
  for (const s of stars) { const a = s.a * (.6 + .4 * Math.sin(elapsed * 1.3 + s.phase)); ctx.fillStyle = `rgba(${map.star},${a})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = .13; ctx.strokeStyle = map.line; ctx.lineWidth = 1;
  if (map.scene === 'wild') {
    const step = 42;
    for (let x = (elapsed * 4) % step - step; x < W + step; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H * .16, H); ctx.stroke(); }
    ctx.restore(); ctx.save(); ctx.globalAlpha = .26;
    hills.forEach((hill, index) => { ctx.fillStyle = index % 2 ? map.land : map.accent; ctx.beginPath(); ctx.moveTo(hill.x - 80, H); ctx.quadraticCurveTo(hill.x, H - hill.height, hill.x + 80, H); ctx.fill(); });
    ctx.restore(); return;
  }
  if (map.scene === 'ruins') {
    const step = 48;
    for (let y = (elapsed * 3) % step - step; y < H + step; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y + W * .1); ctx.stroke(); }
    ctx.restore(); ctx.save(); ctx.globalAlpha = .55;
    for (const ruin of ruins) { ctx.save(); ctx.translate(ruin.x, H); ctx.rotate(ruin.lean); ctx.fillStyle = map.land; ctx.fillRect(-ruin.width / 2, -ruin.height, ruin.width, ruin.height); ctx.fillStyle = map.accent; ctx.fillRect(-ruin.width / 2 + 4, -ruin.height + 7, ruin.width - 8, 3); ctx.restore(); }
    ctx.restore(); return;
  }
  const step = 52;
  for (let y = (elapsed * 2) % step - step; y < H + step; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.quadraticCurveTo(W * .5, y - 18, W, y); ctx.stroke(); }
  ctx.restore(); ctx.save(); ctx.globalAlpha = .42;
  for (const ridge of iceRidges) { ctx.fillStyle = map.land; ctx.beginPath(); ctx.moveTo(ridge.x - ridge.width, H); ctx.lineTo(ridge.x, ridge.peak); ctx.lineTo(ridge.x + ridge.width, H); ctx.fill(); ctx.fillStyle = map.accent; ctx.beginPath(); ctx.moveTo(ridge.x - ridge.width * .45, H); ctx.lineTo(ridge.x, ridge.peak + 18); ctx.lineTo(ridge.x + ridge.width * .32, H); ctx.fill(); }
  ctx.restore();
}
function drawPlayer() { const bow=bows[player.bow], ghost=trails;ctx.save();ghost.forEach((t,i)=>{ctx.globalAlpha=(t.life/t.max)*.15;ctx.fillStyle=bow.trail;ctx.beginPath();ctx.arc(t.x,t.y,player.r*(.5+i/ghost.length*.3),0,7);ctx.fill()});ctx.restore();ctx.save();ctx.translate(player.x,player.y);if(player.invuln>0&&Math.floor(player.invuln*15)%2===0)ctx.globalAlpha=.42;ctx.rotate(player.angle);ctx.fillStyle='rgba(92,229,204,.18)';ctx.beginPath();ctx.arc(0,0,25,0,7);ctx.fill();ctx.strokeStyle=bow.color;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(-2,0,15,-1.25,1.25);ctx.stroke();ctx.strokeStyle='#d9f3e2';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-2,-15);ctx.lineTo(17,0);ctx.lineTo(-2,15);ctx.stroke();ctx.fillStyle='#6ce0c6';ctx.beginPath();ctx.arc(-1,0,11,0,7);ctx.fill();ctx.fillStyle='#dff8e4';ctx.beginPath();ctx.arc(4,-3,3,0,7);ctx.fill();ctx.restore(); }
function drawMapRelics() { for (const relic of mapRelics) { if (relic.broken) continue; const pulse=1+Math.sin(relic.phase)*.13;ctx.save();ctx.translate(relic.x,relic.y);ctx.rotate(relic.phase*.45);ctx.fillStyle=relic.color;ctx.strokeStyle='#ecfff3';ctx.shadowColor=relic.color;ctx.shadowBlur=18;ctx.beginPath();ctx.moveTo(0,-relic.r*pulse);ctx.lineTo(relic.r*.68,0);ctx.lineTo(0,relic.r*pulse);ctx.lineTo(-relic.r*.68,0);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.stroke();ctx.rotate(-relic.phase*.45);ctx.fillStyle='#0d2730';ctx.font='700 10px Syne';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(relic.icon,0,1);ctx.restore(); } }
function drawMapObject() { if (!mapObject) return; const pulse=1+Math.sin(elapsed*3)*.12;ctx.save();ctx.translate(mapObject.x,mapObject.y);ctx.globalAlpha=mapObject.used?.3:1;ctx.strokeStyle=mapObject.color;ctx.fillStyle=mapObject.color;ctx.shadowColor=mapObject.color;ctx.shadowBlur=mapObject.used?5:20;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,mapObject.r*pulse,0,Math.PI*2);ctx.stroke();ctx.rotate(elapsed*.5);ctx.beginPath();ctx.moveTo(0,-15);ctx.lineTo(15,0);ctx.lineTo(0,15);ctx.lineTo(-15,0);ctx.closePath();ctx.stroke();ctx.rotate(-elapsed*.5);ctx.shadowBlur=0;ctx.font='700 16px Syne';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(mapObject.icon,0,1);ctx.restore(); }
function drawEnemy(e) { ctx.save();ctx.translate(e.x,e.y);const bob=Math.sin(e.wobble)*2, frozen=e.frozen>0;ctx.translate(0,bob);if(e.hit>0)ctx.fillStyle='#efffc8';else if(frozen)ctx.fillStyle='#78c9dc';else ctx.fillStyle=e.sprite==='moss'?'#75a85e':e.sprite==='wisp'?'#6bbde1':'#8264a7';ctx.shadowColor=frozen?'#a5ecff':e.sprite==='moss'?'#b5eb6d':e.sprite==='wisp'?'#86e9fa':'#af8ce4';ctx.shadowBlur=12;ctx.beginPath();if(e.sprite==='wisp'){const orbit=e.wobble*1.7;ctx.arc(0,0,e.r*.7,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.7;ctx.strokeStyle=frozen?'#e9ffff':'#c8f9ff';ctx.lineWidth=1;for(let i=0;i<3;i++){const a=orbit+i*Math.PI*2/3;ctx.beginPath();ctx.arc(Math.cos(a)*e.r,Math.sin(a)*e.r,e.r*.24,0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=1;ctx.fillStyle='#efffff';ctx.beginPath();ctx.arc(2,-2,2.2,0,7);ctx.fill();}else if(e.sprite==='moss'){ctx.ellipse(0,3,e.r,e.r*.8,0,0,7);ctx.fillStyle=e.hit>0?'#efffc8':frozen?'#a6eef8':'#83b466';ctx.beginPath();ctx.arc(-e.r*.45,-e.r*.42,e.r*.44,0,7);ctx.arc(e.r*.38,-e.r*.48,e.r*.39,0,7);ctx.fill();}else{ctx.rotate(Math.sin(e.wobble)*.12);ctx.moveTo(0,-e.r);ctx.quadraticCurveTo(e.r*1.1,-3,e.r*.65,e.r*.7);ctx.quadraticCurveTo(0,e.r*1.2,-e.r*.7,e.r*.65);ctx.quadraticCurveTo(-e.r*1.1,-3,0,-e.r);ctx.fill();}ctx.shadowBlur=0;if(e.sprite!=='wisp'){ctx.fillStyle='#102636';ctx.beginPath();ctx.arc(-e.r*.28,-1,2.1,0,7);ctx.arc(e.r*.28,-1,2.1,0,7);ctx.fill();}if(e.maxHp>1){ctx.fillStyle='#112a32';ctx.fillRect(-e.r, e.r+8,e.r*2,3);ctx.fillStyle=e.sprite==='wisp'?'#9fefff':'#d5ef83';ctx.fillRect(-e.r,e.r+8,e.r*2*(e.hp/e.maxHp),3)}ctx.restore(); }
function drawArrow(a) { ctx.save();ctx.translate(a.x,a.y);ctx.rotate(a.angle);ctx.strokeStyle=a.color;ctx.fillStyle=a.color;ctx.shadowColor=a.trail;ctx.shadowBlur=12;ctx.lineWidth=a.type==='cinder'||a.type==='sun'?3:2;ctx.beginPath();ctx.moveTo(-12,0);ctx.lineTo(8,0);ctx.stroke();if(a.type==='cinder'){ctx.beginPath();ctx.moveTo(13,0);ctx.lineTo(5,-7);ctx.lineTo(1,0);ctx.lineTo(5,7);ctx.closePath();ctx.fill();ctx.fillStyle='#ffe1af';ctx.fillRect(-8,-2,4,4);}else if(a.type==='frost'){ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(5,-5);ctx.lineTo(3,0);ctx.lineTo(5,5);ctx.closePath();ctx.fill();ctx.strokeStyle='#efffff';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(4,0);ctx.lineTo(-2,-5);ctx.moveTo(4,0);ctx.lineTo(-2,5);ctx.stroke();}else if(a.type==='dusk'){ctx.beginPath();ctx.arc(8,0,6,-Math.PI*.7,Math.PI*.7);ctx.lineTo(5,0);ctx.closePath();ctx.fill();ctx.fillStyle='#311d53';ctx.beginPath();ctx.arc(9,0,3.7,0,Math.PI*2);ctx.fill();}else if(a.type==='sun'){ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(8,-7);ctx.lineTo(3,-4);ctx.lineTo(1,-9);ctx.lineTo(-1,-3);ctx.lineTo(-7,0);ctx.lineTo(-1,3);ctx.lineTo(1,9);ctx.lineTo(3,4);ctx.lineTo(8,7);ctx.closePath();ctx.fill();}else if(a.type==='storm'){ctx.strokeStyle='#efffff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-8,-3);ctx.lineTo(-1,2);ctx.lineTo(3,-3);ctx.lineTo(11,2);ctx.stroke();ctx.fillStyle=a.color;ctx.beginPath();ctx.moveTo(13,0);ctx.lineTo(6,-4);ctx.lineTo(6,4);ctx.closePath();ctx.fill();}else if(a.type==='thorn'){ctx.beginPath();ctx.ellipse(8,0,7,3.5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e5ffb3';ctx.fillRect(-8,-1,10,2);}else if(a.type==='vine'){ctx.beginPath();ctx.ellipse(7,-3,5,2.5,-.45,0,Math.PI*2);ctx.ellipse(7,3,5,2.5,.45,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#d8ffcd';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-9,0);ctx.bezierCurveTo(-2,-5,3,5,12,0);ctx.stroke();}else{ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(6,-4);ctx.lineTo(6,4);ctx.closePath();ctx.fill();}ctx.restore(); }
function render() { drawBackground(); if (!player) return; pickups.forEach(p=>{ctx.save();ctx.translate(p.x,p.y+Math.sin(p.phase)*3);ctx.rotate(p.phase);ctx.fillStyle='#8cf0cb';ctx.shadowColor='#80f5cf';ctx.shadowBlur=15;ctx.beginPath();ctx.moveTo(0,-p.r);ctx.lineTo(p.r,0);ctx.lineTo(0,p.r);ctx.lineTo(-p.r,0);ctx.fill();ctx.restore()});drawMapRelics();drawMapObject();enemies.forEach(drawEnemy);particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,7);ctx.fill()});ctx.globalAlpha=1;arrows.forEach(drawArrow);drawPlayer(); }
function loop(now) { if(!running)return;const dt=Math.min(.033,(now-last)/1000||0);last=now;if(!paused)update(dt);render();requestAnimationFrame(loop); }
function pointer(e){const r=canvas.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top;ui.crosshair.style.left=`${mouse.x}px`;ui.crosshair.style.top=`${mouse.y}px`;}
canvas.addEventListener('pointermove',pointer);canvas.addEventListener('pointerdown',e=>{pointer(e);mouse.down=true});window.addEventListener('pointerup',()=>mouse.down=false);window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys.add(k);if(['w','a','s','d',' ','p','e'].includes(k))e.preventDefault();if(k===' '&&running&&!paused&&player.dash<=0){const a=player.angle;player.x=clamp(player.x+Math.cos(a)*105,18,W-18);player.y=clamp(player.y+Math.sin(a)*105,65,H-25);player.dash=player.dashCooldown;player.invuln=.22;burst(player.x,player.y,'#77f0cf',17,180);}if(k==='e')activateMapFeature();if(k==='p')togglePause();if(k==='r'&&!running)start();});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function selectMap(mapId) { if (running || !maps[mapId]) return; currentMap = mapId; document.querySelectorAll('.map-choice').forEach(button => button.classList.toggle('selected', button.dataset.map === mapId)); makeStars(); render(); }
function selectBow(bowId) { if (running || !bows[bowId]) return; currentBow = bowId; document.querySelectorAll('.bow-choice').forEach(button => button.classList.toggle('selected', button.dataset.bow === bowId)); }
function returnToMapSelect() { if (running) return; player = undefined; mapObject = undefined; ui.over.classList.add('hidden'); ui.start.classList.remove('hidden'); ui.interact.classList.remove('visible'); render(); }
ui.startButton.addEventListener('click',start);ui.restartButton.addEventListener('click',start);ui.mapSelectButton.addEventListener('click',returnToMapSelect);ui.pauseButton.addEventListener('click',togglePause);document.querySelectorAll('.map-choice').forEach(button=>button.addEventListener('click',()=>selectMap(button.dataset.map)));document.querySelectorAll('.bow-choice').forEach(button=>button.addEventListener('click',()=>selectBow(button.dataset.bow)));updatePauseButton();render();
