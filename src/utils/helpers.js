// ── Costanti ─────────────────────────────────────────────────────────────────
export const CAT_COLORS = {
  Strutture:  { bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE" },
  Trasporto:  { bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0" },
  "Attività": { bg: "#FFF7ED", text: "#92400E", border: "#FDE68A" },
};

export const CATEGORIE = ["Strutture", "Trasporto", "Attività"];
export const MODALITA  = ["Carta Aziendale", "Carta personale Admin / dipendente", "Bonifico"];

// ── Funzioni di utilità ───────────────────────────────────────────────────────
export function fmt(n) {
  return Number(n).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y.slice(2)}`;
}

// Durata di un turno: giorni di viaggio (estremi inclusi) e notti
export function durataTurno(dataIn, dataOut) {
  if (!dataIn || !dataOut) return null;
  const inizio = new Date(dataIn), fine = new Date(dataOut);
  if (isNaN(inizio) || isNaN(fine)) return null;
  const notti = Math.round((fine - inizio) / 86400000);
  if (notti < 0) return { errore: true };
  return { giorni: notti + 1, notti };
}

export function testoDurata(dataIn, dataOut) {
  const d = durataTurno(dataIn, dataOut);
  if (!d) return "";
  if (d.errore) return "date invertite";
  return `${d.giorni} ${d.giorni === 1 ? "giorno" : "giorni"} · ${d.notti} ${d.notti === 1 ? "notte" : "notti"}`;
}

export function newId() {
  return Date.now() + Math.random();
}

export const STATI_DOC = {
  caricato:         "Caricato",
  in_attesa:        "In attesa",
  non_recuperabile: "Non recuperabile",
  senza_storno:     "Storno non recuperabile",
};

// Importo ancora rimborsabile di un pagamento (importo − rimborsi già registrati)
export function residuoRimborsabile(pagamento, spese) {
  const rimborsato = spese
    .filter(s => s.tipo === "rimborso" && s.origineId === pagamento.id)
    .reduce((a, s) => a + Math.abs(s.importo), 0);
  return Math.round((pagamento.importo - rimborsato) * 100) / 100;
}
