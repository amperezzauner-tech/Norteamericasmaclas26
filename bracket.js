/**
 * bracket.js — 🏆 Camino al Campeonato · Mundial 2026
 * =====================================================
 * Módulo independiente. Lee exclusivamente de resultados.json
 * (ya cargado en la variable global RES / MATCHES de script.js).
 *
 * Funciones públicas:
 *   generateBracket()        — punto de entrada principal
 *   calculateQualifiedTeams()— calcula clasificados de grupos
 *   advanceWinner()          — determina ganador de un partido KO
 *   renderBracket()          — dibuja el árbol completo
 *   updateBracket()          — actualiza árbol con datos nuevos
 *   refreshBracket()         — recarga datos y re-renderiza
 *
 * Se auto-actualiza cuando script.js termina de cargar datos.
 */

/* ── Banderas por equipo ────────────────────────────────────── */
const BRACKET_FLAGS = {
  'México':          '🇲🇽', 'Sudáfrica':       '🇿🇦', 'Corea del Sur':   '🇰🇷',
  'Chequia':         '🇨🇿', 'Canadá':          '🇨🇦', 'Bosnia':          '🇧🇦',
  'Qatar':           '🇶🇦', 'Suiza':           '🇨🇭', 'Haití':           '🇭🇹',
  'Escocia':         '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Brasil':          '🇧🇷', 'Marruecos':       '🇲🇦',
  'EE.UU.':          '🇺🇸', 'Paraguay':        '🇵🇾', 'Australia':       '🇦🇺',
  'Turquía':         '🇹🇷', 'C. de Marfil':    '🇨🇮', 'Ecuador':         '🇪🇨',
  'Alemania':        '🇩🇪', 'Curazao':         '🇨🇼', 'P. Bajos':        '🇳🇱',
  'Japón':           '🇯🇵', 'Suecia':          '🇸🇪', 'Túnez':           '🇹🇳',
  'Egipto':          '🇪🇬', 'Irán':            '🇮🇷', 'Bélgica':         '🇧🇪',
  'N. Zelanda':      '🇳🇿', 'España':          '🇪🇸', 'Uruguay':         '🇺🇾',
  'Cabo Verde':      '🇨🇻', 'Arabia Saudita':  '🇸🇦', 'Francia':         '🇫🇷',
  'Noruega':         '🇳🇴', 'Senegal':         '🇸🇳', 'Irak':            '🇮🇶',
  'Argentina':       '🇦🇷', 'Austria':         '🇦🇹', 'Argelia':         '🇩🇿',
  'Jordania':        '🇯🇴', 'Colombia':        '🇨🇴', 'Portugal':        '🇵🇹',
  'Congo':           '🇨🇩', 'Uzbekistán':      '🇺🇿', 'Inglaterra':      '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Ghana':           '🇬🇭', 'Croacia':         '🇭🇷', 'Panamá':          '🇵🇦',
};

/**
 * Devuelve la bandera de un equipo, o un emoji genérico si no se conoce.
 * @param {string} team
 * @returns {string}
 */
function brFlag(team) {
  return BRACKET_FLAGS[team] || '🏳';
}

/* ── Definición oficial del bracket FIFA 2026 ───────────────── */
/**
 * R32_BRACKET: los 16 cruces de dieciseisavos de final.
 * Basado en la llave oficial FIFA para el Mundial 2026 de 48 equipos.
 * Reutiliza R32_SLOTS de script.js si está disponible.
 * id: identificador del partido KO (p073..p088)
 * a/b: {group, pos} para 1.º/2.º, o {third:[...]} para 3.º clasificado
 */
const BR_R32 = (typeof R32_SLOTS !== 'undefined') ? R32_SLOTS.map((s, i) => ({
  matchId: `p${String(73 + i).padStart(3,'0')}`,
  bracketId: s.id,
  a: s.a,
  b: s.b,
})) : [];

/** Fases del bracket y sus IDs de partido en resultados.json */
const BR_PHASES = [
  {
    key: 'r32',
    label: '16avos',
    matchIds: ['p073','p074','p075','p076','p077','p078','p079','p080',
               'p081','p082','p083','p084','p085','p086','p087','p088'],
    nextPhase: 'r16',
    matchesCount: 16,
  },
  {
    key: 'r16',
    label: 'Octavos',
    matchIds: ['p089','p090','p091','p092','p093','p094','p095','p096'],
    nextPhase: 'qf',
    matchesCount: 8,
  },
  {
    key: 'qf',
    label: 'Cuartos',
    matchIds: ['p097','p098','p099','p100'],
    nextPhase: 'sf',
    matchesCount: 4,
  },
  {
    key: 'sf',
    label: 'Semis',
    matchIds: ['p101','p102'],
    nextPhase: 'final',
    matchesCount: 2,
  },
  {
    key: 'final',
    label: 'Final',
    matchIds: ['p103'],
    nextPhase: null,
    matchesCount: 1,
  },
];

/* ── Helpers ─────────────────────────────────────────────────── */

/**
 * Escapa HTML para evitar XSS.
 * Reutiliza esc() de script.js si existe.
 */
function brEsc(s) {
  if (typeof esc === 'function') return esc(s);
  return String(s ?? '').replace(/[&<>"']/g, m =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])
  );
}

/**
 * Normaliza nombre de equipo para comparación insensible a tilde/case.
 * Reutiliza norm() de script.js si existe.
 */
function brNorm(s) {
  if (typeof norm === 'function') return norm(s);
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Obtiene todos los partidos del JSON global (cargado por script.js) */
function brGetAllMatches() {
  // MATCHES es la variable global de script.js
  if (typeof MATCHES !== 'undefined' && MATCHES.length) return MATCHES;
  // Fallback: intentar leer desde RES global
  if (typeof RES !== 'undefined' && RES?.partidos) return RES.partidos;
  return [];
}

/** Busca un partido por su id */
function brFindMatch(id) {
  return brGetAllMatches().find(m => m.id === id) || null;
}

/** Determina si un partido ya tiene resultado definitivo */
function brIsFinished(m) {
  return m && m.estado === 'finalizado' && m.golesLocal != null && m.golesVisitante != null;
}

/** Determina si un partido está en juego */
function brIsLive(m) {
  return m && m.estado === 'en_vivo';
}

/* ── calculateQualifiedTeams ─────────────────────────────────── */

/**
 * Calcula la tabla de posiciones real de un grupo a partir de los partidos finalizados.
 * Reutiliza actualGroupStanding() de script.js si está disponible.
 * @param {string} group   — letra del grupo, ej. 'A'
 * @returns {Array<{team,pts,gf,gc,gd,pj}>} ordenado 1.º→4.º
 */
function brGroupStanding(group) {
  // Preferir función ya calculada por script.js
  if (typeof actualGroupStanding === 'function') {
    const st = actualGroupStanding(group);
    if (st && st.length) return st;
  }

  const matches = brGetAllMatches().filter(m => m.grupo === group);
  const teams = {};

  matches.forEach(m => {
    [m.local, m.visitante].forEach(t => {
      if (!teams[t]) teams[t] = { team: t, pts: 0, gf: 0, gc: 0, gd: 0, pj: 0 };
    });
    if (!brIsFinished(m)) return;
    const gl = +m.golesLocal, gv = +m.golesVisitante;
    teams[m.local].gf += gl; teams[m.local].gc += gv; teams[m.local].pj++;
    teams[m.visitante].gf += gv; teams[m.visitante].gc += gl; teams[m.visitante].pj++;
    if (gl > gv)      { teams[m.local].pts += 3; }
    else if (gv > gl) { teams[m.visitante].pts += 3; }
    else              { teams[m.local].pts += 1; teams[m.visitante].pts += 1; }
  });

  Object.values(teams).forEach(t => { t.gd = t.gf - t.gc; });

  return Object.values(teams).sort((a, b) =>
    (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf) || (a.gc - b.gc)
  );
}

/**
 * Obtiene todos los grupos disponibles.
 * Reutiliza groupLetters() de script.js si está disponible.
 * @returns {string[]}
 */
function brGetGroups() {
  if (typeof groupLetters === 'function') return groupLetters();
  const gs = new Set(brGetAllMatches().map(m => m.grupo).filter(Boolean));
  return [...gs].sort();
}

/**
 * Calcula los 8 mejores terceros entre todos los grupos.
 * Reutiliza bestThirdsForBracket() de script.js si está disponible.
 * @returns {{thirds: Array, complete: boolean}}
 */
function brBestThirds() {
  if (typeof bestThirdsForBracket === 'function') {
    return bestThirdsForBracket(null);
  }
  const groups = brGetGroups();
  const thirds = [];
  let closedGroups = 0;

  groups.forEach(g => {
    const st = brGroupStanding(g);
    if (st.length >= 3 && st[2].pj >= 3) {
      closedGroups++;
      thirds.push({ ...st[2], grupo: g });
    }
  });

  thirds.sort((a, b) =>
    (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf) || (a.gc - b.gc)
  );

  return {
    thirds: thirds.slice(0, 8),
    complete: closedGroups === groups.length,
    closed: closedGroups,
    total: groups.length,
  };
}

/**
 * calculateQualifiedTeams — resuelve qué equipo ocupa cada slot del bracket R32.
 * @returns {Object} mapa de bracketId → {teamA, teamB, sourceA, sourceB}
 */
function calculateQualifiedTeams() {
  const usedThirdGroups = new Set();
  const result = {};
  const { thirds, complete: thirdsComplete } = brBestThirds();

  BR_R32.forEach(slot => {
    const resolve = side => {
      if (side.group) {
        const st = brGroupStanding(side.group);
        const entry = st[side.pos - 1];
        if (!entry) return null;
        return { team: entry.team, source: `${side.pos}° Gr. ${side.group}` };
      }
      if (side.third) {
        if (!thirdsComplete) return null;
        const found = thirds.find(
          x => side.third.includes(x.grupo) && !usedThirdGroups.has(x.grupo)
        );
        if (!found) return null;
        usedThirdGroups.add(found.grupo);
        return { team: found.team, source: `3° Gr. ${found.grupo}` };
      }
      return null;
    };

    const a = resolve(slot.a);
    const b = resolve(slot.b);
    result[slot.bracketId] = {
      teamA: a?.team || null,
      teamB: b?.team || null,
      sourceA: a?.source || brSlotLabel(slot.a),
      sourceB: b?.source || brSlotLabel(slot.b),
    };
  });

  return result;
}

/**
 * Genera la etiqueta descriptiva de un slot sin equipo resuelto.
 * Ej: {group:'A', pos:1} → "1° Grupo A"
 */
function brSlotLabel(slot) {
  if (slot.group) return `${slot.pos}° Grupo ${slot.group}`;
  if (slot.third) return `3° mejor (Gr. ${slot.third.join('/')})`;
  return '?';
}

/* ── advanceWinner ───────────────────────────────────────────── */

/**
 * advanceWinner — determina el equipo ganador de un partido KO ya finalizado.
 * @param {Object} match — objeto partido de resultados.json
 * @returns {string|null} nombre del equipo ganador, o null si no hay resultado
 */
function advanceWinner(match) {
  if (!brIsFinished(match)) return null;
  const gl = +match.golesLocal, gv = +match.golesVisitante;
  // En eliminatorias no hay empates; si los goles son iguales se asume penales
  // y el ganador debe estar marcado. Por ahora asumimos que golesLocal > golesVisitante
  // o viceversa (el json ya refleja el resultado final incluido penales).
  if (gl > gv) return match.local;
  if (gv > gl) return match.visitante;
  // Empate exacto → partido no resuelto aún (fase grupos) o penales no marcados
  return null;
}

/**
 * Construye el estado completo del bracket para todas las fases.
 * Cada fase se alimenta de los ganadores de la fase anterior.
 *
 * @returns {Array} array de fases con sus partidos resueltos
 */
function buildBracketState() {
  // Paso 1: resolver slots de R32 con clasificados de grupos
  const qualifiedSlots = calculateQualifiedTeams();

  // Paso 2: construir lista de partidos por fase
  const phases = BR_PHASES.map(phase => {
    const matches = phase.matchIds.map((id, idx) => {
      const real = brFindMatch(id);

      // Para R32 usamos los slots de grupos calculados arriba
      if (phase.key === 'r32') {
        const slot = BR_R32[idx];
        const q = slot ? qualifiedSlots[slot.bracketId] : null;
        const teamA = real?.local    || q?.teamA || null;
        const teamB = real?.visitante || q?.teamB || null;
        const sourceA = q?.sourceA || brSlotLabel(slot?.a || {});
        const sourceB = q?.sourceB || brSlotLabel(slot?.b || {});
        return {
          id,
          idx,
          teamA,   teamB,
          sourceA, sourceB,
          scoreA: real?.golesLocal    ?? null,
          scoreB: real?.golesVisitante ?? null,
          estado: real?.estado || 'pendiente',
          winner: advanceWinner(real),
        };
      }

      // Fases posteriores: equipo viene del JSON directamente
      return {
        id,
        idx,
        teamA: real?.local     || null,
        teamB: real?.visitante  || null,
        sourceA: null,
        sourceB: null,
        scoreA: real?.golesLocal    ?? null,
        scoreB: real?.golesVisitante ?? null,
        estado: real?.estado || 'pendiente',
        winner: advanceWinner(real),
      };
    });

    return { ...phase, matches };
  });

  // Paso 3: determinar el campeón (ganador de la final)
  const finalMatch = phases.find(p => p.key === 'final')?.matches[0];
  const champion = finalMatch?.winner || null;

  return { phases, champion };
}

/* ── renderBracket ───────────────────────────────────────────── */

/**
 * renderBracket — dibuja el bracket completo en el contenedor dado.
 * @param {HTMLElement} container — elemento donde se renderiza
 * @param {Object} state — resultado de buildBracketState()
 */
function renderBracket(container, state) {
  const { phases, champion } = state;

  // Actualizar timestamp
  const ts = container.querySelector('#br-timestamp');
  if (ts) {
    const now = new Date();
    ts.textContent = now.toLocaleString('es-CO', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  // Buscar el contenedor del track
  const track = container.querySelector('.bracket-track');
  if (!track) return;

  track.innerHTML = '';

  phases.forEach((phase, phaseIdx) => {
    const col = document.createElement('div');
    col.className = 'br-col';
    col.dataset.phase = phase.key;

    // Etiqueta de fase
    const label = document.createElement('div');
    label.className = 'br-phase-label';
    label.textContent = phase.label;
    col.appendChild(label);

    // Contenedor de matches
    const matchesWrap = document.createElement('div');
    matchesWrap.className = 'br-col-matches';

    phase.matches.forEach(m => {
      matchesWrap.appendChild(buildMatchCard(m, phase));
    });

    col.appendChild(matchesWrap);
    track.appendChild(col);

    // Conector SVG entre esta columna y la siguiente
    if (phaseIdx < phases.length - 1) {
      track.appendChild(buildConnector(phase));
    }
  });

  // Columna del campeón
  track.appendChild(buildChampionCard(champion));
}

/**
 * Construye la tarjeta HTML de un partido.
 * @param {Object} m     — datos del partido (de buildBracketState)
 * @param {Object} phase — metadatos de la fase
 * @returns {HTMLElement}
 */
function buildMatchCard(m, phase) {
  const card = document.createElement('div');
  card.className = 'br-match';
  card.dataset.matchId = m.id;
  if (m.estado === 'en_vivo')    card.classList.add('live');
  if (m.estado === 'finalizado') card.classList.add('done');

  // Badge de estado
  const badge = document.createElement('div');
  badge.className = 'br-match-badge';
  let badgeText = '';
  if (m.estado === 'en_vivo')    badgeText = '⚽ En juego';
  else if (m.estado === 'finalizado') badgeText = '✔ Finalizado';
  else                                badgeText = 'Pendiente';
  badge.innerHTML = `<span>${badgeText}</span><span class="br-match-id">${m.id}</span>`;
  card.appendChild(badge);

  // Equipo A
  card.appendChild(buildTeamRow(m.teamA, m.scoreA, m.winner, m.teamA, m.sourceA));
  // Equipo B
  card.appendChild(buildTeamRow(m.teamB, m.scoreB, m.winner, m.teamB, m.sourceB));

  return card;
}

/**
 * Construye la fila de un equipo dentro del partido.
 * @param {string|null} team     — nombre del equipo
 * @param {number|null} score    — goles
 * @param {string|null} winner   — nombre del ganador del partido
 * @param {string|null} thisTeam — nombre de este equipo (para comparar)
 * @param {string}      source   — etiqueta de origen ("1° Grupo A", etc.)
 * @returns {HTMLElement}
 */
function buildTeamRow(team, score, winner, thisTeam, source) {
  const row = document.createElement('div');
  row.className = 'br-team';

  if (winner && team) {
    if (brNorm(team) === brNorm(winner)) row.classList.add('winner');
    else                                  row.classList.add('loser');
  }

  const flag = document.createElement('span');
  flag.className = 'br-team-flag';
  flag.textContent = team ? brFlag(team) : '—';

  const name = document.createElement('span');
  name.className = 'br-team-name';
  if (team) {
    name.textContent = team;
    name.title = team;
  } else {
    name.textContent = source || '—';
    name.classList.add('placeholder');
  }

  const scoreEl = document.createElement('span');
  scoreEl.className = 'br-team-score';
  if (score !== null && score !== undefined) {
    scoreEl.textContent = score;
  }

  row.appendChild(flag);
  row.appendChild(name);
  row.appendChild(scoreEl);
  return row;
}

/**
 * Construye el conector SVG entre dos columnas.
 * Para cada par de partidos de la columna izquierda
 * dibuja dos líneas que convergen en el partido de la derecha.
 * @param {Object} phase — fase actual (izquierda del conector)
 * @returns {HTMLElement}
 */
function buildConnector(phase) {
  const wrap = document.createElement('div');
  wrap.className = 'br-connectors';
  // El SVG se genera con JS después del render para poder medir posiciones.
  // Por ahora solo devolvemos el contenedor vacío; las líneas se añaden en updateConnectors().
  wrap.dataset.forPhase = phase.key;
  return wrap;
}

/**
 * Construye la tarjeta del campeón.
 * @param {string|null} champion
 * @returns {HTMLElement}
 */
function buildChampionCard(champion) {
  const col = document.createElement('div');
  col.className = 'br-champion-col';
  col.dataset.phase = 'champion';

  const phaseLabel = document.createElement('div');
  phaseLabel.className = 'br-phase-label';
  phaseLabel.textContent = 'Campeón';
  col.appendChild(phaseLabel);

  const card = document.createElement('div');
  card.className = 'br-champion-card';

  const trophy = document.createElement('span');
  trophy.className = 'br-champion-trophy';
  trophy.textContent = '🏆';
  card.appendChild(trophy);

  const label = document.createElement('div');
  label.className = 'br-champion-label';
  label.textContent = 'CAMPEÓN MUNDIAL';
  card.appendChild(label);

  if (champion) {
    const flag = document.createElement('span');
    flag.className = 'br-champion-flag';
    flag.textContent = brFlag(champion);
    card.appendChild(flag);

    const name = document.createElement('div');
    name.className = 'br-champion-name';
    name.textContent = champion;
    card.appendChild(name);
  } else {
    const flag = document.createElement('span');
    flag.className = 'br-champion-flag';
    flag.textContent = '❓';
    card.appendChild(flag);

    const name = document.createElement('div');
    name.className = 'br-champion-name placeholder';
    name.textContent = 'Por definir';
    card.appendChild(name);
  }

  col.appendChild(card);
  return col;
}

/**
 * Dibuja las líneas SVG de conexión entre columnas.
 * Se llama después de que el DOM esté renderizado.
 * @param {HTMLElement} track — .bracket-track
 */
function updateConnectors(track) {
  const connectors = track.querySelectorAll('.br-connectors');
  const trackRect = track.getBoundingClientRect();

  connectors.forEach(conn => {
    const forPhase = conn.dataset.forPhase;
    const leftCol  = track.querySelector(`.br-col[data-phase="${forPhase}"]`);

    // Encontrar la siguiente columna (no conector)
    let nextCol = conn.nextElementSibling;
    while (nextCol && !nextCol.classList.contains('br-col') && !nextCol.classList.contains('br-champion-col')) {
      nextCol = nextCol.nextElementSibling;
    }

    if (!leftCol || !nextCol) return;

    const leftMatches  = leftCol.querySelectorAll('.br-match');
    const rightMatches = nextCol.querySelectorAll('.br-match');

    conn.innerHTML = '';
    if (!leftMatches.length || !rightMatches.length) return;

    const connRect = conn.getBoundingClientRect();
    const connH = conn.offsetHeight || 400;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', connH);
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.overflow = 'visible';

    // Agrupar matches de izquierda de a 2 → conectan a 1 match derecha
    const pairsCount = Math.floor(leftMatches.length / 2);

    for (let i = 0; i < pairsCount; i++) {
      const mA = leftMatches[i * 2];
      const mB = leftMatches[i * 2 + 1];
      const mR = rightMatches[i];
      if (!mA || !mB || !mR) continue;

      const rA = mA.getBoundingClientRect();
      const rB = mB.getBoundingClientRect();
      const rR = mR.getBoundingClientRect();

      const yA = rA.top + rA.height / 2 - connRect.top;
      const yB = rB.top + rB.height / 2 - connRect.top;
      const yR = rR.top + rR.height / 2 - connRect.top;

      const x0 = 0;
      const xM = connRect.width / 2;
      const x1 = connRect.width;

      // Línea de mA al punto medio
      drawLine(svg, x0, yA, xM, yA, '#1f5f7a');
      drawLine(svg, x0, yB, xM, yB, '#1f5f7a');
      // Línea vertical uniendo A y B
      drawLine(svg, xM, yA, xM, yB, '#1f5f7a');
      // Línea del centro al partido derecho
      drawLine(svg, xM, (yA + yB) / 2, x1, yR, '#1f5f7a');
    }

    conn.appendChild(svg);
  });
}

/**
 * Dibuja una línea en un SVG.
 */
function drawLine(svg, x1, y1, x2, y2, color) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', x1); line.setAttribute('y1', y1);
  line.setAttribute('x2', x2); line.setAttribute('y2', y2);
  line.setAttribute('stroke', color);
  line.setAttribute('stroke-width', '1.5');
  line.setAttribute('stroke-linecap', 'round');
  svg.appendChild(line);
}

/* ── updateBracket ───────────────────────────────────────────── */

/**
 * updateBracket — recalcula el estado y actualiza el DOM sin recargar la página.
 * Aplica animaciones de transición suaves para los ganadores que avanzan.
 * @param {HTMLElement} container
 */
function updateBracket(container) {
  if (!container) return;

  // Guardar nombres actuales para detectar cambios
  const prevNames = {};
  container.querySelectorAll('.br-team-name:not(.placeholder)').forEach(el => {
    const card = el.closest('.br-match');
    if (card) prevNames[`${card.dataset.matchId}-${el.closest('.br-team').dataset.side}`] = el.textContent;
  });

  const state = buildBracketState();
  renderBracket(container, state);

  // Aplicar animación a equipos que aparecieron nuevos
  container.querySelectorAll('.br-team-name:not(.placeholder)').forEach(el => {
    const card = el.closest('.br-match');
    if (!card) return;
    const side = el.closest('.br-team')?.dataset?.side;
    const key = `${card.dataset.matchId}-${side}`;
    if (!prevNames[key] || prevNames[key] !== el.textContent) {
      el.classList.remove('advancing');
      void el.offsetWidth; // forzar reflow
      el.classList.add('advancing');
    }
  });

  // Actualizar conectores SVG después del render
  requestAnimationFrame(() => {
    const track = container.querySelector('.bracket-track');
    if (track) updateConnectors(track);
  });
}

/* ── generateBracket ─────────────────────────────────────────── */

/**
 * generateBracket — punto de entrada principal.
 * Crea la estructura HTML base del módulo y lo inicializa.
 * @param {string} containerId — id del elemento donde se montará el bracket
 */
function generateBracket(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn('[bracket.js] Contenedor no encontrado:', containerId);
    return;
  }

  // Agregar clase raíz para estilos
  container.classList.add('bracket-root');

  // Estructura base
  container.innerHTML = `
    <div class="bracket-header">
      <h2>🏆 Camino al Campeonato</h2>
      <p>Actualizado automáticamente &nbsp;·&nbsp; Última actualización: <span id="br-timestamp">—</span></p>
    </div>
    <div class="bracket-legend">
      <div class="br-legend-item"><div class="br-legend-dot pending"></div>Pendiente</div>
      <div class="br-legend-item"><div class="br-legend-dot live"></div>En juego</div>
      <div class="br-legend-item"><div class="br-legend-dot done"></div>Finalizado</div>
    </div>
    <div class="bracket-scroll-wrap">
      <div class="bracket-track"></div>
    </div>
  `;

  // Renderizado inicial
  updateBracket(container);

  // Reconectar en resize para actualizar líneas SVG
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const track = container.querySelector('.bracket-track');
      if (track) updateConnectors(track);
    }, 120);
  });

  console.log('[bracket.js] Bracket inicializado en #' + containerId);
}

/* ── refreshBracket ──────────────────────────────────────────── */

/**
 * refreshBracket — recarga datos externos y re-renderiza.
 * Puede llamarse desde script.js cuando termina de cargar resultados.json.
 * @param {string} [containerId='bracket-section-body']
 */
function refreshBracket(containerId) {
  const id = containerId || 'bracket-section-body';
  const container = document.getElementById(id);
  if (!container) return;
  updateBracket(container);
}

/* ── Auto-init ───────────────────────────────────────────────── */

/**
 * Se ejecuta cuando el DOM está listo.
 * Busca el contenedor del bracket y lo inicializa.
 * Si MATCHES aún no está cargado, espera a que script.js lo cargue.
 */
(function autoInit() {
  function tryInit() {
    // Solo inicializar si hay datos cargados
    const allMatches = brGetAllMatches();
    if (allMatches.length === 0) {
      // Reintentar después de que script.js cargue los datos
      setTimeout(tryInit, 350);
      return;
    }
    generateBracket('bracket-section-body');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    tryInit();
  }
})();
