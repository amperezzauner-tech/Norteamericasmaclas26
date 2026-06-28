#!/usr/bin/env python3
"""Actualiza resultados.json desde el marcador público de ESPN.
No toca predicciones.json ni la lógica de puntajes.
"""
from __future__ import annotations

import json
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from pathlib import Path

RESULTADOS = Path("resultados.json")
ESPN_LEAGUE = "fifa.world"
BASE = f"https://site.api.espn.com/apis/site/v2/sports/soccer/{ESPN_LEAGUE}/scoreboard"

ALIASES = {
    "ee uu": "estados unidos",
    "eeuu": "estados unidos",
    "eua": "estados unidos",
    "usa": "estados unidos",
    "us": "estados unidos",
    "estados unidos": "estados unidos",
    "u s a": "estados unidos",
    "p bajos": "paises bajos",
    "paises bajos": "paises bajos",
    "países bajos": "paises bajos",
    "holanda": "paises bajos",
    "n zelanda": "nueva zelanda",
    "new zealand": "nueva zelanda",
    "c de marfil": "costa de marfil",
    "costa marfil": "costa de marfil",
    "ivory coast": "costa de marfil",
    "czechia": "chequia",
    "czech republic": "chequia",
    "corea sur": "corea del sur",
    "south korea": "corea del sur",
    "saudi arabia": "arabia saudita",
    "cape verde": "cabo verde",
    "uzbekistan": "uzbekistan",
    "uzbekistán": "uzbekistan",
}


def norm(s: str | None) -> str:
    s = s or ""
    s = unicodedata.normalize("NFD", s)
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    s = s.lower().replace(".", " ").replace("&", " and ")
    s = re.sub(r"[^a-z0-9ñ]+", " ", s).strip()
    s = re.sub(r"\s+", " ", s)
    return ALIASES.get(s, s)


def fetch_json(url: str) -> dict | None:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return json.loads(r.read().decode("utf-8"))
    except Exception as exc:
        print(f"WARN no pude leer {url}: {exc}", file=sys.stderr)
        return None


def espn_event_dates() -> list[str]:
    # GitHub Actions corre en UTC. Revisa ayer, hoy, mañana y pasado mañana
    # para cubrir partidos nocturnos y cambios de zona horaria.
    now = datetime.now(timezone.utc)
    days = [now + timedelta(days=d) for d in range(-1, 3)]
    return [d.strftime("%Y%m%d") for d in days]


def read_events() -> list[dict]:
    events: list[dict] = []
    seen = set()
    for date in espn_event_dates():
        url = BASE + "?" + urllib.parse.urlencode({"dates": date, "limit": 200})
        data = fetch_json(url)
        for ev in (data or {}).get("events", []):
            eid = str(ev.get("id", ""))
            if eid and eid not in seen:
                seen.add(eid)
                events.append(ev)
        time.sleep(0.2)
    return events


def event_teams(ev: dict) -> dict:
    comps = (ev.get("competitions") or [{}])[0].get("competitors") or []
    out = {}
    for c in comps:
        team = c.get("team") or {}
        names = [team.get("displayName"), team.get("name"), team.get("shortDisplayName"), team.get("abbreviation")]
        side = c.get("homeAway")
        out[side] = {
            "score": int(c.get("score") or 0),
            "winner": c.get("winner"),
            "names": [n for n in names if n],
            "norms": {norm(n) for n in names if n},
        }
    return out


def event_status(ev: dict) -> str:
    st = ((ev.get("status") or {}).get("type") or {})
    if st.get("completed") or st.get("state") == "post":
        return "finalizado"
    if st.get("state") == "in" or st.get("name") in {"STATUS_IN_PROGRESS", "STATUS_HALFTIME"}:
        return "en_vivo"
    return "pendiente"


def match_event(partido: dict, events: list[dict]) -> dict | None:
    espn_id = str(partido.get("espn_id") or "").strip()
    if espn_id:
        for ev in events:
            if str(ev.get("id")) == espn_id:
                return ev
    a, b = norm(partido.get("local")), norm(partido.get("visitante"))
    if not a or not b:
        return None
    for ev in events:
        teams = event_teams(ev)
        norms = set()
        for info in teams.values():
            norms |= info["norms"]
        if a in norms and b in norms:
            return ev
    return None


def apply_event(partido: dict, ev: dict) -> bool:
    status = event_status(ev)
    teams = event_teams(ev)
    local_n = norm(partido.get("local"))
    visit_n = norm(partido.get("visitante"))
    local_score = visitante_score = None
    for info in teams.values():
        if local_n in info["norms"]:
            local_score = info["score"]
        if visit_n in info["norms"]:
            visitante_score = info["score"]
    if local_score is None or visitante_score is None:
        return False

    changed = False
    if partido.get("estado") != status:
        partido["estado"] = status
        changed = True
    if status in {"finalizado", "en_vivo"}:
        if partido.get("golesLocal") != local_score:
            partido["golesLocal"] = local_score
            changed = True
        if partido.get("golesVisitante") != visitante_score:
            partido["golesVisitante"] = visitante_score
            changed = True
    if not partido.get("espn_id") and ev.get("id"):
        partido["espn_id"] = str(ev.get("id"))
        changed = True
    return changed


def main() -> int:
    if not RESULTADOS.exists():
        print("ERROR: no existe resultados.json en la raíz del repo", file=sys.stderr)
        return 1
    data = json.loads(RESULTADOS.read_text(encoding="utf-8"))
    before = deepcopy(data)
    events = read_events()
    print(f"Eventos ESPN encontrados: {len(events)}")

    updates = []
    for p in data.get("partidos", []):
        ev = match_event(p, events)
        if ev and apply_event(p, ev):
            updates.append(f"{p.get('id')} {p.get('local')} {p.get('golesLocal')}-{p.get('golesVisitante')} {p.get('visitante')} [{p.get('estado')}]")

    meta = data.setdefault("_meta", {})
    partidos = data.get("partidos", [])
    meta["jugados"] = sum(1 for p in partidos if p.get("estado") == "finalizado")
    meta["pendientes"] = sum(1 for p in partidos if p.get("estado") == "pendiente")
    meta["en_vivo"] = sum(1 for p in partidos if p.get("estado") == "en_vivo")
    now_iso = datetime.now(timezone.utc).isoformat()
    meta["ultima_revision_auto"] = now_iso
    if updates:
        meta["ultima_actualizacion_auto"] = now_iso
        meta["fuente_auto"] = "ESPN public scoreboard"
        meta["nota_auto"] = "; ".join(updates[:12])

    if data != before:
        RESULTADOS.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("Cambios aplicados:")
        for u in updates or ["solo metadatos de revisión"]:
            print(" -", u)
    else:
        print("Sin cambios en resultados.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
