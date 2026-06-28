
let PRED,RES,PARTICIPANTES=[],MATCHES=[],PLAYED=[],PENDING=[],RANKING=[],GROUP='A',CHAMPIONS=[],RARE_EVENTS=[],SURPRISE=null;

// Calendario interno para ordenar "en vivo" y "próximos".
// Horas en UTC. No afecta los resultados ni el ranking.
const MATCH_SCHEDULE={
  p001:'2026-06-11T19:00:00Z',p002:'2026-06-12T02:00:00Z',
  p003:'2026-06-12T19:00:00Z',p004:'2026-06-13T01:00:00Z',
  p008:'2026-06-13T19:00:00Z',p007:'2026-06-13T22:00:00Z',p005:'2026-06-14T01:00:00Z',
  p006:'2026-06-14T04:00:00Z',p010:'2026-06-14T17:00:00Z',p011:'2026-06-14T20:00:00Z',p009:'2026-06-14T23:00:00Z',p012:'2026-06-15T02:00:00Z',
  p014:'2026-06-15T16:00:00Z',p016:'2026-06-15T19:00:00Z',p013:'2026-06-15T22:00:00Z',p015:'2026-06-16T01:00:00Z',
  p017:'2026-06-16T19:00:00Z',p018:'2026-06-16T22:00:00Z',p019:'2026-06-17T01:00:00Z',
  p020:'2026-06-17T04:00:00Z',p023:'2026-06-17T17:00:00Z',p022:'2026-06-17T20:00:00Z',p021:'2026-06-17T23:00:00Z',p024:'2026-06-18T02:00:00Z',
  p025:'2026-06-18T16:00:00Z',p026:'2026-06-18T19:00:00Z',p027:'2026-06-18T22:00:00Z',p028:'2026-06-19T01:00:00Z',
  p032:'2026-06-19T19:00:00Z',p030:'2026-06-19T22:00:00Z',p029:'2026-06-20T00:30:00Z',p031:'2026-06-20T03:00:00Z',
  p035:'2026-06-20T17:00:00Z',p033:'2026-06-20T20:00:00Z',p034:'2026-06-21T00:00:00Z',
  p036:'2026-06-21T04:00:00Z',p038:'2026-06-21T16:00:00Z',p039:'2026-06-21T19:00:00Z',p037:'2026-06-21T22:00:00Z',p040:'2026-06-22T01:00:00Z',
  p043:'2026-06-22T17:00:00Z',p042:'2026-06-22T21:00:00Z',p041:'2026-06-23T00:00:00Z',p044:'2026-06-23T03:00:00Z',
  p047:'2026-06-23T17:00:00Z',p045:'2026-06-23T20:00:00Z',p046:'2026-06-23T23:00:00Z',p048:'2026-06-24T02:00:00Z',
  p051:'2026-06-24T19:00:00Z',p052:'2026-06-24T19:00:00Z',p049:'2026-06-24T22:00:00Z',p050:'2026-06-24T22:00:00Z',p053:'2026-06-25T01:00:00Z',p054:'2026-06-25T01:00:00Z',
  p056:'2026-06-25T20:00:00Z',p055:'2026-06-25T20:00:00Z',p058:'2026-06-25T23:00:00Z',p057:'2026-06-25T23:00:00Z',p059:'2026-06-26T02:00:00Z',p060:'2026-06-26T02:00:00Z',
  p061:'2026-06-26T19:00:00Z',p062:'2026-06-26T19:00:00Z',p066:'2026-06-27T00:00:00Z',p065:'2026-06-27T00:00:00Z',p064:'2026-06-27T03:00:00Z',p063:'2026-06-27T03:00:00Z',
  p067:'2026-06-27T21:00:00Z',p068:'2026-06-27T21:00:00Z',p071:'2026-06-27T23:30:00Z',p072:'2026-06-27T23:30:00Z',p070:'2026-06-28T02:00:00Z',p069:'2026-06-28T02:00:00Z'
};
function matchTime(m){return MATCH_SCHEDULE[m.id]?new Date(MATCH_SCHEDULE[m.id]).getTime():((m.matchId||9999)*999999999999)}
function fmtTime(m){
  if(!MATCH_SCHEDULE[m.id])return '';
  return new Date(MATCH_SCHEDULE[m.id]).toLocaleString('es-CO',{weekday:'short',hour:'numeric',minute:'2-digit',hour12:true});
}
function currentLiveMatches(){
  const fromData=MATCHES.filter(isLive).sort((a,b)=>matchTime(a)-matchTime(b));
  if(fromData.length)return fromData;
  const now=Date.now();
  return MATCHES
    .filter(m=>m.estado!=='finalizado'&&MATCH_SCHEDULE[m.id])
    .filter(m=>{
      const t=matchTime(m);
      return now>=t && now<=t+(2.2*60*60*1000);
    })
    .sort((a,b)=>matchTime(a)-matchTime(b));
}
function currentLiveMatch(){return currentLiveMatches()[0]||null}
function nextScheduledMatches(){
  const now=Date.now();
  const upcoming=MATCHES
    .filter(m=>!isScoreable(m))
    .slice()
    .sort((a,b)=>matchTime(a)-matchTime(b))
    .filter(m=>!MATCH_SCHEDULE[m.id]||matchTime(m)>now-(2.35*60*60*1000));
  if(!upcoming.length)return [];
  const firstTime=matchTime(upcoming[0]);
  // Si hay partidos simultáneos, muestra todos los que inician a la misma hora.
  return upcoming.filter(m=>Math.abs(matchTime(m)-firstTime)<=10*60*1000);
}
function nextScheduledMatch(){return nextScheduledMatches()[0]||null}
function displayFocusMatches(){
  const live=currentLiveMatches();
  if(live.length)return live;
  const next=nextScheduledMatches();
  if(next.length)return next;
  return MATCHES.length?[MATCHES[MATCHES.length-1]]:[];
}
function displayFocusMatch(){return displayFocusMatches()[0]||null}

const BADGE_DEFS={
  leader:{ico:'👑',title:'Rey del Mundial',desc:'Líder actual de la polla'},
  exact:{ico:'🎯',title:'Francotirador',desc:'Más marcadores exactos'},
  hit:{ico:'🐙',title:'Pulpo Paul',desc:'Mayor porcentaje de aciertos'},
  surprise:{ico:'🔥',title:'Sorpresero',desc:'Más aciertos en marcadores poco predichos'},
  champion:{ico:'🏆',title:'Visión de campeón',desc:'Su campeón elegido es el más popular'}
};
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function outcome(a,b){return a>b?'L':a<b?'V':'E'}
function outcomeLabel(o,m){return o==='L'?m.local:o==='V'?m.visitante:'Empate'}
function points(ph,pa,rh,ra){ph=+ph;pa=+pa;rh=+rh;ra=+ra;if(ph===rh&&pa===ra)return 5+rh+ra;const ok=outcome(ph,pa)===outcome(rh,ra);const bonus=(ph===rh&&rh>0)?rh:((pa===ra&&ra>0)?ra:0);return ok?3+bonus:bonus}
function norm(s){return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function teamKey(s){return norm(s).replace(/[^a-z0-9]/g,'')}
function sameTeam(a,b){return teamKey(a)===teamKey(b)}
function pairKey(a,b){return [teamKey(a),teamKey(b)].sort().join('::')}
function pct(n,d){return Math.round((n/(d||1))*100)}
function medal(i){return i===1?'🥇':i===2?'🥈':i===3?'🥉':'#'+i}

function isScoreable(m){
  return (m.estado==='finalizado'||m.estado==='en_vivo') && m.golesLocal!==null && m.golesVisitante!==null;
}
function isFinal(m){
  return m.estado==='finalizado' && m.golesLocal!==null && m.golesVisitante!==null;
}
function isLive(m){
  return m.estado==='en_vivo' && m.golesLocal!==null && m.golesVisitante!==null;
}


// Corrección de seguridad para el Grupo B:
// evita que el partido Suiza-Bosnia de jornada 2 se duplique como jornada 3.
// p026 es Suiza vs Bosnia 4-1; p051 debe ser Suiza vs Canadá; p052 debe ser Bosnia vs Qatar.
function sanitizeMatches(matches){
  matches.forEach(m=>{
    if(m.id==='p051'){
      const l=norm(m.local), v=norm(m.visitante);
      const isCorrect=l.includes('suiza') && v.includes('canada');
      const isDuplicated=(l.includes('bosnia')&&v.includes('suiza'))||(l.includes('suiza')&&v.includes('bosnia'));
      if(!isCorrect || isDuplicated){
        m.local='Suiza';
        m.visitante='Canadá';
        m.grupo='B';
        m.jornada=3;
        m.estado='pendiente';
        m.golesLocal=null;
        m.golesVisitante=null;
      }
      if(m.espn_id==='760439') delete m.espn_id;
    }
    if(m.id==='p052'){
      const l=norm(m.local), v=norm(m.visitante);
      const isCorrect=l.includes('bosnia') && v.includes('qatar');
      if(!isCorrect){
        m.local='Bosnia';
        m.visitante='Qatar';
        m.grupo='B';
        m.jornada=3;
        m.estado='pendiente';
        m.golesLocal=null;
        m.golesVisitante=null;
      }
      if(m.espn_id==='760439') delete m.espn_id;
    }
  });
  return matches;
}

async function loadData(){
  try{
    const [p,r]=await Promise.all([
      fetch('predicciones.json?ts='+Date.now(), {cache:'no-store'}).then(x=>{if(!x.ok)throw new Error('No cargó predicciones.json');return x.json()}),
      fetch('resultados.json?ts='+Date.now(), {cache:'no-store'}).then(x=>{if(!x.ok)throw new Error('No cargó resultados.json');return x.json()})
    ]);
    PRED=p;RES=r;
    PARTICIPANTES=(p.participantes||[]).filter(x=>x.id!=='alejandro_gonzalex'&&x.nombre!=='Alejandro Gonzalex');
    MATCHES=sanitizeMatches((r.partidos||[]).map(m=>({...m})));
    PLAYED=MATCHES.filter(isScoreable).sort((a,b)=>matchTime(a)-matchTime(b));
    PENDING=MATCHES.filter(m=>!isScoreable(m)).sort((a,b)=>matchTime(a)-matchTime(b));
    calculate();renderAll();
  }catch(e){
    document.getElementById('subtitle').textContent='No pude cargar predicciones.json/resultados.json';
    document.getElementById('daily-card').innerHTML='<div class="empty">No cargaron los datos. Revisa que index.html, predicciones.json y resultados.json estén en la misma carpeta. Detalle: '+esc(e.message)+'</div>';
  }
}

// Bonificación por posiciones finales de grupo.
// Se suma únicamente cuando el grupo ya tiene sus 6 partidos finalizados.
// 1.º correcto = 4 pts, 2.º correcto = 3 pts, 3.º correcto = 1 pt, 4.º correcto = 1 pt.
const GROUP_POSITION_BONUS=[4,3,1,1];
function groupLetters(){return [...new Set(MATCHES.map(m=>m.grupo).filter(Boolean))].sort()}
function groupMatches(g){return MATCHES.filter(m=>m.grupo===g).sort((a,b)=>matchTime(a)-matchTime(b))}
function tableRow(team){return {team,pj:0,pts:0,gf:0,gc:0,gd:0,w:0,d:0,l:0}}
function addStandingMatch(rows,local,visitante,gl,gv){
  if(!rows[local])rows[local]=tableRow(local);
  if(!rows[visitante])rows[visitante]=tableRow(visitante);
  const a=rows[local], b=rows[visitante];
  a.pj++;b.pj++;a.gf+=gl;a.gc+=gv;b.gf+=gv;b.gc+=gl;a.gd=a.gf-a.gc;b.gd=b.gf-b.gc;
  if(gl>gv){a.w++;b.l++;a.pts+=3}else if(gl<gv){b.w++;a.l++;b.pts+=3}else{a.d++;b.d++;a.pts++;b.pts++}
}
function sortStandings(rows){
  return Object.values(rows).sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf||a.gc-b.gc||a.team.localeCompare(b.team));
}
function actualGroupStanding(g){
  const ms=groupMatches(g);
  if(ms.length<6 || !ms.every(isFinal))return null;
  const rows={};
  ms.forEach(m=>addStandingMatch(rows,m.local,m.visitante,+m.golesLocal,+m.golesVisitante));
  return sortStandings(rows);
}
function predictedGroupStandingFromScores(g,p){
  const ms=groupMatches(g);
  if(ms.length<6)return null;
  const rows={};
  for(const m of ms){
    const pr=p.predicciones?.[m.id];
    if(!pr || pr.golesLocal===undefined || pr.golesVisitante===undefined)return null;
    addStandingMatch(rows,m.local,m.visitante,+pr.golesLocal,+pr.golesVisitante);
  }
  return sortStandings(rows);
}
function predictedGroupStanding(g,p){
  const byScore=predictedGroupStandingFromScores(g,p)||[];
  const statsByTeam={};
  byScore.forEach(x=>statsByTeam[teamKey(x.team)]=x);
  if(p.grupos && Array.isArray(p.grupos[g]) && p.grupos[g].length>=4){
    return p.grupos[g].map(team=>({...(statsByTeam[teamKey(team)]||{}),team}));
  }
  return byScore.length?byScore:null;
}
function groupPositionBonus(p){
  let total=0,hits=0,closed=0;
  const detail=[];
  groupLetters().forEach(g=>{
    const real=actualGroupStanding(g);
    if(!real)return;
    const pred=predictedGroupStanding(g,p);
    if(!pred)return;
    closed++;
    for(let i=0;i<4;i++){
      if(real[i]?.team && pred[i]?.team && sameTeam(real[i].team,pred[i].team)){
        const pts=GROUP_POSITION_BONUS[i]||0;
        total+=pts;hits++;
        detail.push({grupo:g,pos:i+1,team:real[i].team,pts});
      }
    }
  });
  return {total,hits,closed,detail};
}
function calculate(){
  RANKING=PARTICIPANTES.map(p=>{
    let pts=0,ex=0,hit=0,last=[],surpriseScore=0,surpriseHits=0;
    PLAYED.forEach(m=>{
      const pr=p.predicciones?.[m.id];if(!pr)return;
      const s=points(pr.golesLocal,pr.golesVisitante,m.golesLocal,m.golesVisitante);
      pts+=s;
      const exact=+pr.golesLocal===+m.golesLocal&&+pr.golesVisitante===+m.golesVisitante;
      const ok=outcome(+pr.golesLocal,+pr.golesVisitante)===outcome(+m.golesLocal,+m.golesVisitante);
      if(exact)ex++;if(ok)hit++;
      last.push({m,pr,s,exact,ok});
    });
    const groupBonus=groupPositionBonus(p);
    const r32Bonus=r32ExactMatchupBonus(p);
    const r16Bonus=r16ExactMatchupBonus(p);
    pts+=groupBonus.total+r32Bonus.total+r16Bonus.total;
    return {...p,pts,exact:ex,hit,pct:PLAYED.length?pct(hit,PLAYED.length):0,last:last.reverse(),surpriseScore,surpriseHits,groupPosPts:groupBonus.total,groupPosHits:groupBonus.hits,groupPosClosed:groupBonus.closed,groupPosDetail:groupBonus.detail,r32MatchPts:r32Bonus.total,r32MatchHits:r32Bonus.hits,r32MatchAvailable:r32Bonus.available,r32MatchDetail:r32Bonus.detail,r16MatchPts:r16Bonus.total,r16MatchHits:r16Bonus.hits,r16MatchAvailable:r16Bonus.available,r16MatchDetail:r16Bonus.detail}
  });
  computeRarity();
  RANKING.sort((a,b)=>b.pts-a.pts||b.exact-a.exact||b.hit-a.hit||b.groupPosPts-a.groupPosPts||a.nombre.localeCompare(b.nombre));
  RANKING.forEach((p,i)=>p.pos=i+1);
  computeChampions();
}
function computeRarity(){
  RARE_EVENTS=[];
  PLAYED.forEach(m=>{
    const exactScore=`${m.golesLocal}-${m.golesVisitante}`;
    const scoreCounts={};
    const outcomeCounts={L:0,E:0,V:0};
    PARTICIPANTES.forEach(p=>{
      const pr=p.predicciones?.[m.id];if(!pr)return;
      const score=`${pr.golesLocal}-${pr.golesVisitante}`;
      scoreCounts[score]=(scoreCounts[score]||0)+1;
      outcomeCounts[outcome(+pr.golesLocal,+pr.golesVisitante)]++;
    });
    const exactCount=scoreCounts[exactScore]||0;
    const realOutcome=outcome(+m.golesLocal,+m.golesVisitante);
    const outcomeCount=outcomeCounts[realOutcome]||0;
    RARE_EVENTS.push({m,exactCount,outcomeCount,exactScore,realOutcome});
    if(exactCount>0){
      RANKING.forEach(p=>{
        const pr=p.predicciones?.[m.id];if(!pr)return;
        if(+pr.golesLocal===+m.golesLocal&&+pr.golesVisitante===+m.golesVisitante){
          p.surpriseHits=(p.surpriseHits||0)+1;
          p.surpriseScore=(p.surpriseScore||0)+(PARTICIPANTES.length-exactCount+1);
        }
      });
    }
  });
  RARE_EVENTS.sort((a,b)=>(a.exactCount-b.exactCount)||(a.outcomeCount-b.outcomeCount));
  SURPRISE=RANKING.slice().sort((a,b)=>(b.surpriseScore||0)-(a.surpriseScore||0)||b.exact-a.exact)[0];
}
function cleanHonorTeam(value){
  const raw=String(value||'').trim();
  if(!raw)return '';
  // Algunas celdas de Excel exportaron códigos internos de la llave (W101, L101, 1K)
  // en vez del país. No deben mostrarse como equipos favoritos.
  if(/^W\d+$/i.test(raw) || /^L\d+$/i.test(raw) || /^\d+[A-Z]$/i.test(raw))return '';
  return raw;
}
function addVote(obj,value){
  const team=cleanHonorTeam(value);
  if(team)obj[team]=(obj[team]||0)+1;
}
function computeChampions(){
  const count={};
  const sub={};
  const third={};
  PARTICIPANTES.forEach(p=>{
    const h=p.honor||{};
    addVote(count,h.campeon);
    addVote(sub,h.subcampeon);
    addVote(third,h.tercer_puesto);
  });
  CHAMPIONS=Object.entries(count).map(([team,n])=>({team,n})).sort((a,b)=>b.n-a.n||a.team.localeCompare(b.team));
  window.SUBS=Object.entries(sub).map(([team,n])=>({team,n})).sort((a,b)=>b.n-a.n||a.team.localeCompare(b.team));
  window.THIRDS=Object.entries(third).map(([team,n])=>({team,n})).sort((a,b)=>b.n-a.n||a.team.localeCompare(b.team));
}

const KO_PHASES={
  '16avos':{ids:['p073','p074','p075','p076','p077','p078','p079','p080','p081','p082','p083','p084','p085','p086','p087','p088'],total:16,label:'Clasificados a 8vos / 16avos jugados'},
  '8vos':{ids:['p089','p090','p091','p092','p093','p094','p095','p096'],total:8,label:'Clasificados a cuartos'},
  'Cuartos':{ids:['p097','p098','p099','p100'],total:4,label:'Clasificados a semifinal'},
  'Semis':{ids:['p101','p102'],total:2,label:'Finalistas'},
  'Final':{ids:['p103','p104'],total:2,label:'Tercer puesto y final'}
};
const R32_EXACT_MATCHUP_BONUS=2;
const R16_EXACT_MATCHUP_BONUS=2;
// Emparejamiento oficial R32→R16: cada pareja de 16avos alimenta un octavo
// p073+p074→p089, p075+p076→p090, ..., p087+p088→p096
const R16_SLOTS=[
  {id:'R16-1',r32a:'p073',r32b:'p074',r16:'p089'},
  {id:'R16-2',r32a:'p075',r32b:'p076',r16:'p090'},
  {id:'R16-3',r32a:'p077',r32b:'p078',r16:'p091'},
  {id:'R16-4',r32a:'p079',r32b:'p080',r16:'p092'},
  {id:'R16-5',r32a:'p081',r32b:'p082',r16:'p093'},
  {id:'R16-6',r32a:'p083',r32b:'p084',r16:'p094'},
  {id:'R16-7',r32a:'p085',r32b:'p086',r16:'p095'},
  {id:'R16-8',r32a:'p087',r32b:'p088',r16:'p096'},
];
const R32_SLOTS=[
  {id:'R32-1',a:{group:'A',pos:2},b:{group:'B',pos:2}},
  {id:'R32-2',a:{group:'C',pos:1},b:{group:'F',pos:2}},
  {id:'R32-3',a:{group:'E',pos:1},b:{third:['A','B','C','D','F']}},
  {id:'R32-4',a:{group:'F',pos:1},b:{group:'C',pos:2}},
  {id:'R32-5',a:{group:'E',pos:2},b:{group:'I',pos:2}},
  {id:'R32-6',a:{group:'I',pos:1},b:{third:['C','D','F','G','H']}},
  {id:'R32-7',a:{group:'A',pos:1},b:{third:['C','E','F','H','I']}},
  {id:'R32-8',a:{group:'L',pos:1},b:{third:['E','H','I','J','K']}},
  {id:'R32-9',a:{group:'G',pos:1},b:{third:['A','E','H','I','J']}},
  {id:'R32-10',a:{group:'D',pos:1},b:{third:['B','E','F','I','J']}},
  {id:'R32-11',a:{group:'H',pos:1},b:{group:'J',pos:2}},
  {id:'R32-12',a:{group:'K',pos:2},b:{group:'L',pos:2}},
  {id:'R32-13',a:{group:'B',pos:1},b:{third:['E','F','G','I','J']}},
  {id:'R32-14',a:{group:'D',pos:2},b:{group:'G',pos:2}},
  {id:'R32-15',a:{group:'J',pos:1},b:{group:'H',pos:2}},
  {id:'R32-16',a:{group:'K',pos:1},b:{third:['D','E','I','J','L']}}
];
function getGroupStandingForBracket(g,p){
  return p?predictedGroupStanding(g,p):actualGroupStanding(g);
}
function bestThirdsForBracket(p){
  const thirds=[]; let closed=0;
  groupLetters().forEach(g=>{
    const st=getGroupStandingForBracket(g,p);
    if(!st||st.length<4)return;
    closed++;
    thirds.push({...st[2],grupo:g});
  });
  if(!p && closed<groupLetters().length)return {thirds:[],closed,total:groupLetters().length,complete:false};
  thirds.sort((a,b)=>(b.pts??0)-(a.pts??0)||(b.gd??0)-(a.gd??0)||(b.gf??0)-(a.gf??0)||(a.gc??0)-(b.gc??0)||String(a.team).localeCompare(String(b.team)));
  return {thirds:thirds.slice(0,8),closed,total:groupLetters().length,complete:p?true:closed===groupLetters().length};
}
function resolveBracketSlot(slot,p,usedThirdGroups){
  if(slot.group){
    const st=getGroupStandingForBracket(slot.group,p);
    if(!st||!st[slot.pos-1])return null;
    return {team:st[slot.pos-1].team,source:slot.pos+slot.group};
  }
  if(slot.third){
    const best=bestThirdsForBracket(p);
    if(!best.complete)return null;
    const found=best.thirds.find(x=>slot.third.includes(x.grupo)&&!usedThirdGroups.has(x.grupo));
    if(!found)return null;
    usedThirdGroups.add(found.grupo);
    return {team:found.team,source:'3'+found.grupo};
  }
  return null;
}
function r32Matchups(p){
  const usedThirdGroups=new Set();
  const out=[];
  R32_SLOTS.forEach(slot=>{
    const a=resolveBracketSlot(slot.a,p,usedThirdGroups);
    const b=resolveBracketSlot(slot.b,p,usedThirdGroups);
    if(a&&b)out.push({id:slot.id,a:a.team,b:b.team,aSource:a.source,bSource:b.source,key:pairKey(a.team,b.team)});
  });
  return out;
}
function r32ExactMatchupBonus(p){
  const real=r32Matchups(null);
  const pred=r32Matchups(p);
  const predKeys=new Set(pred.map(x=>x.key));
  const detail=[]; let total=0;
  real.forEach(m=>{
    if(predKeys.has(m.key)){
      total+=R32_EXACT_MATCHUP_BONUS;
      detail.push({...m,pts:R32_EXACT_MATCHUP_BONUS});
    }
  });
  return {total,hits:detail.length,available:real.length,detail};
}
function predictedR32Winner(p,matchId){
  const m=MATCHES.find(x=>x.id===matchId);if(!m)return null;
  const pr=p.predicciones?.[matchId];if(!pr||pr.golesLocal===undefined)return null;
  const gl=+pr.golesLocal,gv=+pr.golesVisitante;
  if(gl===gv)return null;
  return gl>gv?m.local:m.visitante;
}
function r16ExactMatchupBonus(p){
  const detail=[];let total=0;let available=0;
  R16_SLOTS.forEach(slot=>{
    const realMatch=MATCHES.find(m=>m.id===slot.r16);
    if(!realMatch||!realMatch.local||!realMatch.visitante)return;
    available++;
    const realA=realMatch.local,realB=realMatch.visitante;
    const predA=predictedR32Winner(p,slot.r32a);
    const predB=predictedR32Winner(p,slot.r32b);
    if(!predA||!predB)return;
    const realKey=pairKey(realA,realB);
    const predKey=pairKey(predA,predB);
    if(realKey===predKey){
      total+=R16_EXACT_MATCHUP_BONUS;
      detail.push({r16:slot.r16,a:predA,b:predB,pts:R16_EXACT_MATCHUP_BONUS});
    }
  });
  return {total,hits:detail.length,available,detail};
}
function knockoutMatches(){return MATCHES.filter(m=>/^p(0?7[3-9]|0?8[0-9]|0?9[0-9]|10[0-4])$/.test(m.id))}
function phaseMatches(phase){
  const ids=new Set(KO_PHASES[phase].ids);
  return MATCHES.filter(m=>ids.has(m.id));
}
function phaseStatsForParticipant(p,phase){
  const ms=phaseMatches(phase).filter(isScoreable);
  let pts=0,hit=0,exact=0,played=ms.length,detail=[];
  ms.forEach(m=>{
    const pr=p.predicciones?.[m.id]; if(!pr)return;
    const s=points(pr.golesLocal,pr.golesVisitante,m.golesLocal,m.golesVisitante);
    const ok=outcome(+pr.golesLocal,+pr.golesVisitante)===outcome(+m.golesLocal,+m.golesVisitante);
    const ex=+pr.golesLocal===+m.golesLocal&&+pr.golesVisitante===+m.golesVisitante;
    pts+=s; if(ok)hit++; if(ex)exact++;
    detail.push({m,pr,s,ok,ex});
  });
  return {pts,hit,exact,played,detail};
}
function phaseRanking(phase){
  return RANKING.map(p=>({p,...phaseStatsForParticipant(p,phase)}))
    .sort((a,b)=>b.pts-a.pts||b.exact-a.exact||b.hit-a.hit||a.p.nombre.localeCompare(b.p.nombre));
}
function predictedQualifiers(p){
  const thirds=[]; const qualified=[];
  groupLetters().forEach(g=>{
    const pred=predictedGroupStanding(g,p); if(!pred||pred.length<4)return;
    qualified.push(pred[0].team,pred[1].team);
    thirds.push({...pred[2],grupo:g});
  });
  thirds.sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf||a.gc-b.gc||a.team.localeCompare(b.team));
  qualified.push(...thirds.slice(0,8).map(x=>x.team));
  return qualified;
}
function actualQualifiers(){
  const thirds=[]; const qualified=[]; let closed=0;
  groupLetters().forEach(g=>{
    const real=actualGroupStanding(g); if(!real||real.length<4)return;
    closed++;
    qualified.push(real[0].team,real[1].team);
    thirds.push({...real[2],grupo:g});
  });
  if(closed===groupLetters().length){
    thirds.sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf||a.gc-b.gc||a.team.localeCompare(b.team));
    qualified.push(...thirds.slice(0,8).map(x=>x.team));
  }else{
    // Mientras no hayan cerrado todos los grupos, se evalúan solo los dos primeros de los grupos cerrados.
    // Los mejores terceros se activan cuando cierren los 12 grupos para evitar falsos positivos.
  }
  qualified.teams = qualified; qualified.closed = closed; qualified.total = groupLetters().length; return qualified;
}
function qualifierRanking(){
  // Esta tabla NO suma simplemente equipos clasificados.
  // Usa la regla de puntos que definiste para cierre de grupos:
  // 1.º exacto = 4 pts, 2.º exacto = 3 pts, 3.º exacto = 1 pt, 4.º exacto = 1 pt.
  // Solo se evalúan grupos con sus 6 partidos finalizados para evitar asignar puntos provisionales.
  return RANKING.map(p=>{
    const bonus=groupPositionBonus(p);
    const r32=r32ExactMatchupBonus(p);
    return {
      p,
      pts:bonus.total+r32.total,
      groupPts:bonus.total,
      r32Pts:r32.total,
      hit:bonus.hits+r32.hits,
      groupHits:bonus.hits,
      r32Hits:r32.hits,
      r32Available:r32.available,
      closed:bonus.closed,
      detail:bonus.detail,
      r32Detail:r32.detail,
      total:bonus.closed*4+r32.available,
      maxPts:bonus.closed*9+r32.available*R32_EXACT_MATCHUP_BONUS,
      pct:(bonus.closed||r32.available)?pct(bonus.total+r32.total, bonus.closed*9+r32.available*R32_EXACT_MATCHUP_BONUS):0
    };
  }).sort((a,b)=>b.pts-a.pts||b.groupPts-a.groupPts||b.r32Pts-a.r32Pts||b.hit-a.hit||a.p.nombre.localeCompare(b.p.nombre));
}
function renderKORank(phase,elementId){
  const played=phaseMatches(phase).filter(isScoreable).length;
  const total=KO_PHASES[phase].ids.length;
  const rows=phaseRanking(phase);
  const status=played?('Evaluados '+played+'/'+total+' partidos de esta fase.'):('Aún no hay partidos jugados en esta fase. Se activará automáticamente cuando resultados.json incluya estos partidos.');
  document.getElementById(elementId).innerHTML='<p class="ko-status">'+status+'</p>'+
    (played?rows.slice(0,40).map((r,i)=>'<div class="ko-rank-row" onclick="openProfile(\''+r.p.id+'\')"><div class="pos">'+medal(i+1)+'</div><div><div class="name">'+esc(r.p.nombre)+'</div><div class="ko-detail">✅ '+r.hit+'/'+played+' aciertos · 🎯 '+r.exact+' exactos · '+pct(r.hit,played)+'%</div></div><div class="pts">'+r.pts+' pts</div></div>').join(''):'<div class="empty">Pendiente por resultados oficiales.</div>');
}
function renderQualifierModule(){
  const actual=actualQualifiers();
  const rows=qualifierRanking();
  const realR32=r32Matchups(null);
  let intro='<p class="ko-status">Grupos cerrados: '+actual.closed+'/'+actual.total+'. Posiciones de grupo: 1.º exacto = 4 pts, 2.º exacto = 3 pts, 3.º exacto = 1 pt y 4.º exacto = 1 pt. Llave exacta de 16avos: +2 pts por cada cruce correcto, sin importar el orden local/visitante.</p>';
  let pills='';
  if(actual.teams.length){pills='<div class="ko-phase-title">Clasificados reales ya evaluables</div>'+actual.teams.map(t=>'<span class="ko-pill ok">'+esc(t)+'</span>').join('');}
  if(realR32.length){pills+='<div class="ko-phase-title">Llaves oficiales ya evaluables (+2)</div>'+realR32.map(m=>'<span class="ko-pill ok">'+esc(m.a)+' vs '+esc(m.b)+'</span>').join('');}
  document.getElementById('ko-16-content').innerHTML=intro+pills+'<div class="ko-phase-title">Ranking de puntos por grupos + llave exacta de 16avos</div>'+
    (actual.closed||realR32.length?rows.slice(0,40).map((r,i)=>'<div class="ko-rank-row" onclick="openProfile(\''+r.p.id+'\')"><div class="pos">'+medal(i+1)+'</div><div><div class="name">'+esc(r.p.nombre)+'</div><div class="ko-detail">Grupos: '+r.groupPts+' pts ('+r.groupHits+'/'+(r.closed*4)+' pos.) · Llaves: '+r.r32Pts+' pts ('+r.r32Hits+'/'+r.r32Available+') · máximo '+r.maxPts+' pts</div></div><div class="pts">'+r.pts+' pts</div></div>').join(''):'<div class="empty">Aún no hay grupos cerrados ni llaves de 16avos definidas.</div>');
}
function renderKOResumen(){
  const actual=actualQualifiers();
  const bestQ=qualifierRanking()[0];
  const cards=['16avos','8vos','Cuartos','Semis','Final'].map(ph=>{
    const played=ph==='16avos'?actual.closed:phaseMatches(ph).filter(isScoreable).length;
    const top=ph==='16avos'?bestQ:phaseRanking(ph)[0];
    const label=ph==='16avos'?'Puntos grupos':KO_PHASES[ph].label;
    const value=ph==='16avos'?(played?((top?.pts||0)+' pts'):'0 pts'):(played?((top?.hit||0)+'/'+played):'0/'+KO_PHASES[ph].ids.length);
    const name=top?.p?.nombre||'—';
    return '<div class="ko-card"><span>'+esc(label)+'</span><b>'+esc(value)+'</b><div class="ko-detail">Líder: '+esc(name)+'</div></div>';
  }).join('');
  document.getElementById('ko-resumen-content').innerHTML='<div class="ko-summary">'+cards+'</div><p class="ko-status">Este módulo se actualiza solo con los datos disponibles. Cuando entren resultados de eliminatorias en resultados.json, se llenan automáticamente 8vos, cuartos, semis y final.</p>';
}
function renderEliminatorias(){
  if(!document.getElementById('ko-16-content'))return;
  renderQualifierModule();
  renderKORank('8vos','ko-8-content');
  renderKORank('Cuartos','ko-4-content');
  renderKORank('Semis','ko-2-content');
  renderKORank('Final','ko-final-content');
  renderKOResumen();
}

function renderAll(){
  const leader=RANKING[0]||{}, exactTop=Math.max(0,...RANKING.map(x=>x.exact));
  const fav=CHAMPIONS[0]||{team:'—',n:0};
  const liveCount=MATCHES.filter(isLive).length;const finalCount=MATCHES.filter(isFinal).length;document.getElementById('subtitle').textContent=PARTICIPANTES.length+' participantes · '+finalCount+' finalizados'+(liveCount?' · '+liveCount+' en vivo':'')+' · '+PENDING.length+' pendientes';
  document.getElementById('leader-name').textContent=leader.nombre||'—';
  document.getElementById('leader-pts').textContent=leader.pts||0;
  document.getElementById('leader-sub').textContent=(leader.hit||0)+' aciertos · '+(leader.exact||0)+' exactos · '+(leader.pct||0)+'% efectividad'+((leader.groupPosPts||0)?' · +'+leader.groupPosPts+' posiciones':'')+(liveCount?' · ranking provisional':'');
  document.getElementById('stat-part').textContent=PARTICIPANTES.length;
  document.getElementById('stat-played').textContent=finalCount+'/'+MATCHES.length+(liveCount?' +'+liveCount+' vivo':'');
  document.getElementById('stat-exact').textContent=exactTop;
  document.getElementById('stat-champ').textContent=fav.team;
  const liveMatches=currentLiveMatches();document.getElementById('live-pill').textContent=liveMatches.length>1?'🔴 '+liveMatches.length+' PARTIDOS EN VIVO':(liveMatches.length===1?'🔴 EN VIVO: '+liveMatches[0].local+' vs '+liveMatches[0].visitante:'● En vivo');document.getElementById('rbar').innerHTML='<b>Resultados:</b> '+(PLAYED.length?PLAYED.slice(-18).map(m=>esc(m.local.substring(0,3))+'-'+esc(m.visitante.substring(0,3))+' '+m.golesLocal+'-'+m.golesVisitante).join(' · '):'sin partidos finalizados');
  renderDaily();renderQuickAwards();renderSurprise();renderCollective();renderChampionCards();renderGroupButtons();renderGroupPredictions();renderTopMeter();renderRanking();renderMatches();renderMatchPredictionTable();renderEliminatorias();renderBadges();renderRarest();
  // 🏆 Actualizar Camino al Campeonato cuando hay datos nuevos
  if(typeof refreshBracket==='function') refreshBracket('bracket-section-body');
}
function renderDaily(){
  let best=null;
  PLAYED.forEach(m=>{
    const exacts=RANKING.filter(p=>{const pr=p.predicciones?.[m.id];return pr&&+pr.golesLocal===+m.golesLocal&&+pr.golesVisitante===+m.golesVisitante});
    const hits=RANKING.filter(p=>{const pr=p.predicciones?.[m.id];return pr&&outcome(+pr.golesLocal,+pr.golesVisitante)===outcome(+m.golesLocal,+m.golesVisitante)});
    const rarity=exacts.length?exacts.length:hits.length+100;
    const cand={m,exacts,hits,rarity};
    if(!best||cand.rarity<best.rarity)best=cand;
  });
  if(!best){document.getElementById('daily-card').innerHTML='<div class="empty">Aún no hay partidos finalizados.</div>';return}
  const m=best.m;
  let html='<div class="label">Marcador difícil ya jugado</div><h2 style="margin:6px 0;color:var(--gold)">'+esc(m.local)+' '+m.golesLocal+' - '+m.golesVisitante+' '+esc(m.visitante)+'</h2>';
  if(best.exacts.length===1)html+='<p><b>🏅 Solo una persona lo tuvo exacto:</b><br>'+esc(best.exacts[0].nombre)+'</p><p class="quick-award-desc">Este bloque premia el marcador exacto más raro entre los partidos ya finalizados.</p>';
  else if(best.exacts.length>1)html+='<p><b>🎯 '+best.exacts.length+' personas</b> acertaron este marcador exacto.</p><p class="muted" style="margin-top:6px">'+best.exacts.slice(0,5).map(x=>esc(x.nombre)).join(', ')+(best.exacts.length>5?' +' +(best.exacts.length-5):'')+'</p><p class="quick-award-desc">Este bloque destaca uno de los marcadores menos predichos del torneo.</p>';
  else html+='<p><b>🔥 Partido imposible:</b> nadie tuvo marcador exacto. '+best.hits.length+' acertaron el resultado.</p>';
  document.getElementById('daily-card').innerHTML=html;
}

function renderQuickAwards(){
  const jscores=typeof jornadaScores==='function'?jornadaScores():[];
  const oracle=jscores[0];
  const tourist=jscores.slice().reverse().find(p=>p.jGames>0)||jscores[jscores.length-1];
  const oc=document.getElementById('oracle-card');
  const tc=document.getElementById('tourist-card');
  if(oc){
    oc.innerHTML=oracle?'<div class="label">Mejor rendimiento de la jornada reciente</div><div class="quick-award-name">'+esc(oracle.nombre)+'</div><div class="quick-award-score">'+(oracle.jPts??0)+' pts · '+(oracle.jHit??0)+' aciertos · '+(oracle.jExact??0)+' exactos</div><div class="quick-award-desc">El que más puntos hizo en los partidos más recientes evaluados.</div>':'<div class="empty">Aún no hay jornada para calcular.</div>';
  }
  if(tc){
    tc.innerHTML=tourist?'<div class="label">Premio cariñoso de la jornada</div><div class="quick-award-name">'+esc(tourist.nombre)+'</div><div class="quick-award-score">'+(tourist.jPts??0)+' pts · '+(tourist.jHit??0)+' aciertos</div><div class="quick-award-desc">El que menos sumó en la jornada reciente. Sirve para molestar con amor 😄.</div>':'<div class="empty">Aún no hay jornada para calcular.</div>';
  }
}

function renderSurprise(){
  if(!SURPRISE||!SURPRISE.surpriseScore){document.getElementById('surprise-card').innerHTML='<div class="empty">Todavía no hay sorpresero.</div>';return}
  const rare=RARE_EVENTS.find(e=>{
    const pr=SURPRISE.predicciones?.[e.m.id];return pr&&+pr.golesLocal===+e.m.golesLocal&&+pr.golesVisitante===+e.m.golesVisitante;
  });
  document.getElementById('surprise-card').innerHTML='<div class="label">Más aciertos en marcadores poco predichos</div><h2 style="color:var(--gold);margin:5px 0">'+esc(SURPRISE.nombre)+'</h2><p><b>'+SURPRISE.surpriseHits+' marcadores sorpresa</b> · '+SURPRISE.surpriseScore+' pts de rareza</p>'+(rare?'<p class="muted" style="margin-top:8px">Ejemplo: '+esc(rare.m.local)+' '+rare.m.golesLocal+'-'+rare.m.golesVisitante+' '+esc(rare.m.visitante)+' · solo '+rare.exactCount+' exactos.</p>':'');
}
function renderCollective(){
  const matches=displayFocusMatches();
  const box=document.getElementById('collective-card');
  if(!matches.length){box.innerHTML='<div class="empty">No hay partidos para mostrar.</div>';return;}
  const liveIds=new Set(currentLiveMatches().map(m=>m.id));

  function oneCollective(m){
    let local=0,emp=0,visit=0,total=0;
    const scores={};
    PARTICIPANTES.forEach(p=>{
      const pr=p.predicciones?.[m.id];
      if(!pr || pr.golesLocal===undefined || pr.golesVisitante===undefined)return;
      total++;
      const gl=+pr.golesLocal, gv=+pr.golesVisitante;
      const o=outcome(gl,gv);
      if(o==='L')local++;else if(o==='V')visit++;else emp++;
      const marcador=gl+'-'+gv;
      scores[marcador]=(scores[marcador]||0)+1;
    });
    total=total||1;
    const isLive=liveIds.has(m.id);
    const title=isLive?'🔴 Partido en vivo':'⏳ Próximo partido';
    const top=Object.entries(scores).sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0], 'es'));
    const medals=['🥇','🥈','🥉'];
    const topHtml=top.slice(0,3).map((r,i)=>
      '<div class="match-card"><div><b>'+(medals[i]||'🏅')+' '+esc(r[0])+'</b><div class="muted" style="font-size:.68rem">'+((r[1]/total)*100).toFixed(1)+'% de la polla</div></div><div class="score">'+r[1]+'</div></div>'
    ).join('');
    const tableRows=top.map(r=>
      '<tr><td>'+esc(r[0])+'</td><td style="text-align:center">'+r[1]+'</td><td style="text-align:right">'+((r[1]/total)*100).toFixed(1)+'%</td></tr>'
    ).join('');
    return '<div class="live-card"><span class="'+(isLive?'live-badge':'time-badge')+'">'+title+'</span><h3 style="margin:5px 0 4px">'+esc(m.local)+' vs '+esc(m.visitante)+'</h3>'+(fmtTime(m)?'<div class="pred-small">Horario: '+esc(fmtTime(m))+'</div>':'')+'</div>'+ 
      '<div class="barrow"><div class="barhead"><span>Victoria '+esc(m.local)+'</span><b>'+pct(local,total)+'%</b></div><div class="bar"><div class="fill" style="width:'+pct(local,total)+'%"></div></div></div>'+ 
      '<div class="barrow"><div class="barhead"><span>Empate</span><b>'+pct(emp,total)+'%</b></div><div class="bar"><div class="fill ok" style="width:'+pct(emp,total)+'%"></div></div></div>'+ 
      '<div class="barrow"><div class="barhead"><span>Victoria '+esc(m.visitante)+'</span><b>'+pct(visit,total)+'%</b></div><div class="bar"><div class="fill violet" style="width:'+pct(visit,total)+'%"></div></div></div>'+ 
      '<div style="margin-top:12px;font-weight:950;color:var(--gold)">Marcadores más votados</div>'+topHtml+
      '<details style="margin-top:8px"><summary style="cursor:pointer;font-weight:850;color:var(--muted)">Ver tabla completa</summary><div style="overflow:auto;margin-top:8px"><table class="collective-table"><thead><tr><th>Marcador</th><th>Cantidad</th><th>%</th></tr></thead><tbody>'+tableRows+'</tbody><tfoot><tr><td>Total</td><td style="text-align:center">'+total+'</td><td></td></tr></tfoot></table></div></details>';
  }

  box.innerHTML=(matches.length>1?'<div class="muted" style="font-weight:900;margin-bottom:8px">Mostrando '+matches.length+' partidos simultáneos</div>':'')+
    matches.map(oneCollective).join('<div style="height:12px"></div>');
}
function renderChampionCards(){
  const fav=CHAMPIONS[0]||{team:'—',n:0};
  document.getElementById('champion-card').innerHTML='<div class="label">Favorito de la polla</div><h2 style="color:var(--gold);margin:5px 0">'+esc(fav.team)+'</h2><p><b>'+fav.n+' de '+PARTICIPANTES.length+'</b> lo pusieron campeón.</p>'+championBars(CHAMPIONS.slice(0,5));
  document.getElementById('champion-full').innerHTML=championBars(CHAMPIONS, true);
  const sub=window.SUBS?.[0]||{team:'—',n:0}, third=window.THIRDS?.[0]||{team:'—',n:0};
  document.getElementById('podium-card').innerHTML=[
    ['🥇 Campeón',fav.team,fav.n],
    ['🥈 Subcampeón',sub.team,sub.n],
    ['🥉 Tercer puesto',third.team,third.n]
  ].map(x=>'<div class="match-card"><div><b>'+x[0]+'</b><div class="muted">'+esc(x[1])+'</div></div><div class="score">'+x[2]+'</div></div>').join('');
}
function championBars(arr, full=false){
  const max=Math.max(1,...arr.map(x=>x.n));
  return arr.slice(0, full?30:5).map((x,i)=>'<div class="barrow"><div class="barhead"><span>'+medal(i+1)+' '+esc(x.team)+'</span><b>'+x.n+' votos</b></div><div class="bar"><div class="fill" style="width:'+Math.round(x.n/max*100)+'%"></div></div></div>').join('')||'<div class="empty">Sin predicciones de campeón.</div>';
}
function renderGroupButtons(){
  const groups=[...new Set(MATCHES.map(m=>m.grupo).filter(Boolean))].sort();
  document.getElementById('group-buttons').innerHTML=groups.map(g=>'<button class="'+(g===GROUP?'act':'')+'" onclick="GROUP=\''+g+'\';renderGroupButtons();renderGroupPredictions()">Grupo '+g+'</button>').join('');
}
function renderGroupPredictions(){
  const ms=MATCHES.filter(m=>m.grupo===GROUP);
  document.getElementById('group-predictions').innerHTML=ms.map(m=>{
    let local=0,emp=0,visit=0,exactReal=0,total=0;
    PARTICIPANTES.forEach(p=>{
      const pr=p.predicciones?.[m.id];if(!pr)return;total++;
      const o=outcome(+pr.golesLocal,+pr.golesVisitante);
      if(o==='L')local++;else if(o==='V')visit++;else emp++;
      if(m.estado==='finalizado'&&+pr.golesLocal===+m.golesLocal&&+pr.golesVisitante===+m.golesVisitante)exactReal++;
    });
    const result=m.estado==='finalizado'?'<span class="chip gold">'+m.golesLocal+'-'+m.golesVisitante+'</span>':'<span class="chip">pendiente</span>';
    return '<div class="pred-match"><div class="pred-title">'+esc(m.local)+' vs '+esc(m.visitante)+' '+result+'</div><div class="pred-sub">Grupo '+esc(m.grupo)+' · Jornada '+esc(m.jornada)+' · '+total+' predicciones</div>'+
      predBar(m.local,local,total,'')+predBar('Empate',emp,total,'ok')+predBar(m.visitante,visit,total,'violet')+
      (m.estado==='finalizado'?'<div class="chips" style="margin-top:8px"><span class="chip ok">🎯 '+exactReal+' exactos</span><span class="chip">✅ Resultado real: '+esc(outcomeLabel(outcome(+m.golesLocal,+m.golesVisitante),m))+'</span></div>':'')+
    '</div>';
  }).join('')||'<div class="empty">Sin partidos para este grupo.</div>';
}
function predBar(label,n,total,cls){return '<div class="barrow"><div class="barhead"><span>'+esc(label)+'</span><b>'+pct(n,total)+'%</b></div><div class="bar"><div class="fill '+cls+'" style="width:'+pct(n,total)+'%"></div></div></div>'}
function renderTopMeter(){document.getElementById('top-meter').innerHTML=RANKING.slice(0,5).map(p=>'<div class="rank-row" onclick="openProfile(\''+p.id+'\')"><div class="pos">#'+p.pos+'</div><div><div class="name">'+esc(p.nombre)+'</div><div class="chips"><span class="chip">'+p.hit+'/'+PLAYED.length+' aciertos</span><span class="chip">'+p.exact+' exactos</span><span class="chip">'+p.pct+'%</span>'+((p.groupPosPts||0)?'<span class="chip gold">📋 +'+p.groupPosPts+' pos.</span>':'')+'</div></div><div class="pts">'+p.pts+'</div></div>').join('')}
function renderRanking(){const q=norm(document.getElementById('search')?.value||'');const arr=RANKING.filter(p=>!q||norm(p.nombre).includes(q));document.getElementById('ranking-list').innerHTML=arr.map(p=>'<div class="rank-row" onclick="openProfile(\''+p.id+'\')"><div class="pos">'+medal(p.pos)+'</div><div><div class="name">'+esc(p.nombre)+'</div><div class="chips"><span class="chip">🎯 '+p.exact+'</span><span class="chip">✅ '+p.hit+'</span><span class="chip">'+p.pct+'%</span><span class="chip violet">🔥 '+(p.surpriseHits||0)+'</span>'+((p.groupPosPts||0)?'<span class="chip gold">📋 +'+p.groupPosPts+' pos.</span>':'')+'</div></div><div class="pts">'+p.pts+'</div></div>').join('')||'<div class="empty">No encontré participantes.</div>'}
function renderMatches(){
  const liveIds=new Set(currentLiveMatches().map(m=>m.id));
  document.getElementById('played-list').innerHTML=PLAYED.slice().sort((a,b)=>matchTime(a)-matchTime(b)).map(m=>'<div class="match-card"><div><b>'+esc(m.local)+'</b><div class="muted" style="font-size:.68rem">Grupo '+esc(m.grupo)+' · Jornada '+esc(m.jornada)+(fmtTime(m)?' · '+esc(fmtTime(m)):'')+(m.estado==='en_vivo'?' · ranking provisional':'')+'</div><b>'+esc(m.visitante)+'</b></div><div class="score">'+(m.estado==='en_vivo'?'🔴 ':'')+m.golesLocal+' - '+m.golesVisitante+'</div></div>').join('')||'<div class="empty">Sin resultados.</div>';
  document.getElementById('pending-list').innerHTML=PENDING.slice().sort((a,b)=>matchTime(a)-matchTime(b)).slice(0,24).map(m=>'<div class="match-card"><div><b>'+esc(m.local)+'</b><div class="muted" style="font-size:.68rem">Grupo '+esc(m.grupo)+' · Jornada '+esc(m.jornada)+(fmtTime(m)?' · '+esc(fmtTime(m)):'')+'</div><b>'+esc(m.visitante)+'</b></div><div class="score">'+(liveIds.has(m.id)?'🔴 EN VIVO':'⏳')+'</div></div>').join('')||'<div class="empty">No hay pendientes.</div>';
}

function showSub(id,btn){
  document.querySelectorAll('.subpanel').forEach(s=>s.classList.remove('act'));
  const panel=document.getElementById('sub-'+id); if(panel) panel.classList.add('act');
  btn?.parentElement?.querySelectorAll('button').forEach(b=>b.classList.remove('act'));
  btn?.classList.add('act');
}
function matchPredictionStats(m){
  let local=0,emp=0,visit=0,total=0;
  const scoreCounts={};
  PARTICIPANTES.forEach(p=>{
    const pr=p.predicciones?.[m.id]; if(!pr)return;
    total++;
    const gl=+pr.golesLocal, gv=+pr.golesVisitante;
    const o=outcome(gl,gv);
    if(o==='L')local++; else if(o==='V')visit++; else emp++;
    const key=gl+'-'+gv; scoreCounts[key]=(scoreCounts[key]||0)+1;
  });
  const scores=Object.entries(scoreCounts).map(([score,n])=>({score,n})).sort((a,b)=>b.n-a.n||a.score.localeCompare(b.score));
  const leader=[{label:m.local,n:local},{label:'Empate',n:emp},{label:m.visitante,n:visit}].sort((a,b)=>b.n-a.n)[0]||{label:'—',n:0};
  let exact=0,hit=0;
  if(m.estado==='finalizado'){
    RANKING.forEach(p=>{
      const pr=p.predicciones?.[m.id]; if(!pr)return;
      if(+pr.golesLocal===+m.golesLocal&&+pr.golesVisitante===+m.golesVisitante) exact++;
      if(outcome(+pr.golesLocal,+pr.golesVisitante)===outcome(+m.golesLocal,+m.golesVisitante)) hit++;
    });
  }
  return {local,emp,visit,total,scores,leader,exact,hit};
}
function renderMatchPredictionTable(){
  const tbody=document.getElementById('match-pred-table'); if(!tbody)return;
  tbody.innerHTML=MATCHES.slice().sort((a,b)=>matchTime(a)-matchTime(b)).map(m=>{
    const st=matchPredictionStats(m);
    const topScores=st.scores.slice(0,4).map(s=>'<span class="pred-score-chip">'+esc(s.score)+' · '+s.n+'</span>').join(' ');
    const state=m.estado==='finalizado'
      ? '<span class="chip gold">Final: '+m.golesLocal+'-'+m.golesVisitante+'</span><div class="pred-small">✅ '+st.hit+' acertaron resultado · 🎯 '+st.exact+' exactos</div>'
      : (m.estado==='en_vivo' ? '<span class="chip gold">🔴 En vivo: '+m.golesLocal+'-'+m.golesVisitante+'</span><div class="pred-small">Puntaje provisional · ✅ '+st.hit+' resultado · 🎯 '+st.exact+' exactos</div>' : '<span class="chip">Pendiente</span><div class="pred-small">'+st.total+' predicciones cargadas</div>');
    const crowd='<div class="pred-winner">'+esc(st.leader.label)+' '+pct(st.leader.n,st.total)+'%</div><div class="pred-small">'+esc(m.local)+': '+pct(st.local,st.total)+'% · Empate: '+pct(st.emp,st.total)+'% · '+esc(m.visitante)+': '+pct(st.visit,st.total)+'%</div>';
    return '<tr><td><div class="pred-team">'+esc(m.local)+' vs '+esc(m.visitante)+'</div><div class="pred-small">Grupo '+esc(m.grupo)+' · Jornada '+esc(m.jornada)+(fmtTime(m)?' · '+esc(fmtTime(m)):'')+' · '+esc(m.id)+'</div></td><td>'+crowd+'</td><td><span class="pred-score-chip">'+esc(st.scores[0]?.score||'—')+' · '+(st.scores[0]?.n||0)+'</span></td><td>'+topScores+'</td><td>'+state+'</td></tr>';
  }).join('');
}
function jornadaKey(m){return 'J'+(m.jornada||'?')+'-'+(m.grupo||'?')}
function recentJornadaMatches(){
  if(!PLAYED.length)return [];
  const last=PLAYED[PLAYED.length-1];
  const key=jornadaKey(last);
  const same=PLAYED.filter(m=>jornadaKey(m)===key);
  return same.length?same:[last];
}
function jornadaScores(){
  const ms=recentJornadaMatches();
  return RANKING.map(p=>{
    let pts=0,hit=0,exact=0;
    ms.forEach(m=>{
      const pr=p.predicciones?.[m.id]; if(!pr)return;
      const s=points(pr.golesLocal,pr.golesVisitante,m.golesLocal,m.golesVisitante);
      pts+=s;
      const ok=outcome(+pr.golesLocal,+pr.golesVisitante)===outcome(+m.golesLocal,+m.golesVisitante);
      const ex=+pr.golesLocal===+m.golesLocal&&+pr.golesVisitante===+m.golesVisitante;
      if(ok)hit++; if(ex)exact++;
    });
    return {...p,jPts:pts,jHit:hit,jExact:exact,jGames:ms.length};
  }).sort((a,b)=>b.jPts-a.jPts||b.jExact-a.jExact||b.jHit-a.jHit);
}

function renderBadges(){
  const exact=RANKING.slice().sort((a,b)=>b.exact-a.exact)[0]||{};
  const hit=RANKING.slice().sort((a,b)=>b.pct-a.pct||b.hit-a.hit)[0]||{};
  const leader=RANKING[0]||{};
  const jscores=jornadaScores();
  const oracle=jscores[0]||leader;
  const tourist=jscores.slice().reverse().find(p=>p.jGames>0)||jscores[jscores.length-1]||leader;
  const golpe=RANKING.slice().sort((a,b)=>(b.surpriseScore||0)-(a.surpriseScore||0))[0]||leader;
  const batacazoEvent=RARE_EVENTS[0];
  let batacazoWinner=null;
  if(batacazoEvent){
    batacazoWinner=RANKING.find(p=>{
      const pr=p.predicciones?.[batacazoEvent.m.id];
      return pr&&+pr.golesLocal===+batacazoEvent.m.golesLocal&&+pr.golesVisitante===+batacazoEvent.m.golesVisitante;
    });
  }
  const data=[
    ['👑','Oráculo del Día','Mejor puntaje en la jornada más reciente',oracle,(oracle.jPts??0)+' pts · '+(oracle.jHit??0)+' aciertos · '+(oracle.jExact??0)+' exactos'],
    ['🤡','Turista del Mundial','Menor puntaje en la jornada más reciente',tourist,(tourist.jPts??0)+' pts · '+(tourist.jHit??0)+' aciertos'],
    ['🔥','Golpe de Suerte','Más aciertos en marcadores poco predichos',golpe,(golpe.surpriseHits||0)+' sorpresas · '+(golpe.surpriseScore||0)+' rareza'],
    ['🎯','Francotirador','Más marcadores exactos acumulados',exact,(exact.exact||0)+' exactos'],
    ['🐙','Pulpo Paul','Mayor porcentaje de aciertos de resultado',hit,(hit.pct||0)+'% · '+(hit.hit||0)+'/'+PLAYED.length],
    ['🧨','Rey del Batacazo','Acertó el resultado menos predicho del torneo',batacazoWinner||golpe,batacazoEvent?esc(batacazoEvent.m.local)+' '+batacazoEvent.m.golesLocal+'-'+batacazoEvent.m.golesVisitante+' '+esc(batacazoEvent.m.visitante)+' · '+batacazoEvent.exactCount+' exactos':'—'],
    ['🏆','Rey del Mundial','Líder de la clasificación general',leader,(leader.pts||0)+' pts · #1 general']
  ];
  document.getElementById('badges').innerHTML=data.map(x=>'<div class="badge-card"><div class="badge-ico">'+x[0]+'</div><div><div class="badge-title">'+x[1]+'</div><div class="award-desc">'+x[2]+'</div><div class="badge-winner">'+esc(x[3]?.nombre||'—')+' · '+x[4]+'</div></div></div>').join('');
}
function renderRarest(){
  document.getElementById('rarest-results').innerHTML=RARE_EVENTS.slice(0,10).map(e=>'<div class="match-card"><div><b>'+esc(e.m.local)+' '+e.m.golesLocal+'-'+e.m.golesVisitante+' '+esc(e.m.visitante)+'</b><div class="muted" style="font-size:.68rem">Solo '+e.exactCount+' exactos · '+e.outcomeCount+' acertaron resultado</div></div><div class="score">🔥</div></div>').join('')||'<div class="empty">Sin resultados finalizados.</div>';
}
function openProfile(id){
  const p=RANKING.find(x=>x.id===id);if(!p)return;
  document.getElementById('prof-name').textContent=medal(p.pos)+' '+p.nombre;
  document.getElementById('prof-grid').innerHTML=[
    ['Posición','#'+p.pos],['Puntos',p.pts],['Puntos posiciones',p.groupPosPts||0],['Grupos cerrados',p.groupPosClosed||0],['Aciertos',p.hit+'/'+PLAYED.length],['Exactos',p.exact],['Efectividad',p.pct+'%'],['Campeón',cleanHonorTeam(p.honor?.campeon)||'—'],['Subcampeón',cleanHonorTeam(p.honor?.subcampeon)||'—'],['Sorpresas',p.surpriseHits||0]
  ].map(r=>'<div class="prof-stat"><span>'+esc(r[0])+'</span><b>'+esc(r[1])+'</b></div>').join('');
  document.getElementById('prof-matches').innerHTML=p.last.slice(0,10).map(x=>'<div class="match-card"><div><b>'+esc(x.m.local)+' '+x.m.golesLocal+'-'+x.m.golesVisitante+' '+esc(x.m.visitante)+'</b><div class="muted" style="font-size:.68rem">Predijo '+x.pr.golesLocal+'-'+x.pr.golesVisitante+(x.exact?' · exacto':x.ok?' · resultado':'')+'</div></div><div class="score">+'+x.s+'</div></div>').join('')||'<div class="empty">Sin partidos evaluados.</div>';
  document.getElementById('profile').classList.add('act');
}
function closeProfile(){document.getElementById('profile').classList.remove('act')}
function show(id,btn){document.querySelectorAll('.section').forEach(s=>s.classList.remove('act'));document.getElementById(id).classList.add('act');document.querySelectorAll('.tabbtn').forEach(b=>b.classList.remove('act'));btn?.classList.add('act');syncBottom(id)}
function showMobile(id,btn){document.querySelectorAll('.section').forEach(s=>s.classList.remove('act'));document.getElementById(id).classList.add('act');document.querySelectorAll('.bottom button').forEach(b=>b.classList.remove('act'));btn?.classList.add('act');document.querySelectorAll('.tabbtn').forEach(b=>b.classList.remove('act'))}
function syncBottom(id){const buttons=[...document.querySelectorAll('.bottom button')];buttons.forEach(b=>b.classList.remove('act'));const idx={inicio:0,ranking:1,partidos:2,eliminatorias:3,preds:4,salon:5}[id];if(idx!==undefined)buttons[idx].classList.add('act')}

loadData();
// Refresca automáticamente los JSON sin recargar la página.
// Así, cuando GitHub Actions actualice resultados.json, la tabla cambia sola.
setInterval(()=>{
  loadData();
}, 60*1000);
