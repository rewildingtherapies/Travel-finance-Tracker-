"use strict";
/* ============================================================
   Wilderness India: travel companion app
   Plain JS, no build step. All data lives in localStorage on this device.
   ============================================================ */

const STORE_KEY = "wild-india-v1";
const OLD_BUDGET_KEY = "sib-local-v1";   // the earlier budget-only tracker on this site

/* ---------- Utilities ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const DAY = 86400000;
// Dates are plain "YYYY-MM-DD" strings handled in UTC, so the UK/India time difference never shifts a day.
const parse = s => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
const iso = t => new Date(t).toISOString().slice(0, 10);
const addDays = (s, n) => iso(parse(s) + n * DAY);
const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / DAY);
const fmt = (s, o) => new Date(parse(s)).toLocaleDateString("en-GB", { timeZone: "UTC", ...o });
const fmtShort = s => fmt(s, { day: "numeric", month: "short" });
const fmtDay = s => fmt(s, { weekday: "short", day: "numeric", month: "short" });
const fmtLong = s => fmt(s, { weekday: "long", day: "numeric", month: "long" });
const gbp = n => (n < 0 ? "−£" : "£") + Math.abs(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const gbp0 = n => (n < 0 ? "−£" : "£") + Math.abs(Math.round(n)).toLocaleString("en-GB");
const inr = n => "₹" + Math.round(n).toLocaleString("en-IN");
const plural = (n, w, p) => `${n} ${n === 1 ? w : (p || w + "s")}`;
function realToday() { const d = new Date(); return iso(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); }
const todayISO = () => state.settings.previewDate || realToday();

/* ---------- Icons (24px stroke) ---------- */
const IC = {
  today: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  itin: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
  todo: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m8 12 3 3 5-6"/>',
  budget: '<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .9 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  tick: '<path d="m5 12 5 5 9-10"/>',
  half: '<path d="M6 12h12"/>',
  bike: '<circle cx="5.5" cy="16.5" r="3.5"/><circle cx="18.5" cy="16.5" r="3.5"/><path d="M5.5 16.5 9 10h5l4.5 6.5M14 10l-2-4h-3M15 6h3"/>',
  plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.4 5.1-6C9.5 14.5 12 13 13 12"/>',
  wave: '<path d="M2 7c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M2 13c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M2 19c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/>',
  temple: '<path d="M3 21h18M5 21V10M19 21V10M9 21v-6h6v6M2 10l10-6 10 6"/>',
  bowl: '<path d="M3 11h18a9 9 0 0 1-18 0Z"/><path d="M8 7c0-1 1-1 1-2s-1-1-1-2M12 7c0-1 1-1 1-2s-1-1-1-2M16 7c0-1 1-1 1-2s-1-1-1-2"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.4.6 4 2.6 4 6"/>',
  lotus: '<path d="M12 20c-4 0-8-3-9-8 3 0 6 1.5 9 5 3-3.5 6-5 9-5-1 5-5 8-9 8Z"/><path d="M12 17c-2-3-2-7 0-11 2 4 2 8 0 11Z"/>',
  camera: '<path d="M15 10 21 7v10l-6-3"/><rect x="2" y="6" width="13" height="12" rx="2"/>',
  admin: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  note: '<path d="M4 4h12l4 4v12H4z"/><path d="M8 12h8M8 16h5"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  bed: '<path d="M3 18V7M3 13h18v5M21 13a3 3 0 0 0-3-3h-7v3"/><circle cx="7" cy="10.5" r="1.5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
};
const icon = (k, cls) => `<svg class="i ${cls || ""}" viewBox="0 0 24 24" aria-hidden="true">${IC[k] || ""}</svg>`;

/* ---------- Categories ---------- */
const ACT_CATS = {
  travel: { name: "Travel", c: "#3d7fb8", i: "bike" }, flight: { name: "Flight", c: "#e07a3f", i: "plane" },
  nature: { name: "Nature", c: "#2f8a55", i: "leaf" }, water: { name: "Water", c: "#2c9c97", i: "wave" },
  culture: { name: "Culture", c: "#a0602a", i: "temple" }, food: { name: "Food", c: "#c0472f", i: "bowl" },
  rest: { name: "Rest", c: "#7b6fa6", i: "moon" }, social: { name: "Social", c: "#c85d8a", i: "people" },
  wellness: { name: "Yoga & movement", c: "#7b5ea7", i: "lotus" }, filming: { name: "Filming", c: "#56708f", i: "camera" },
  admin: { name: "Admin", c: "#76817b", i: "admin" },
};
const ACT_STATUS = { planned: "Planned", optional: "Optional", proposed: "To confirm" };
const SHOT_CATS = { establishing: "Establishing shot", landscape: "Landscape / nature", travel: "Travel / motorbike", people: "People / community",
  interview: "Interview", sound: "Natural sound", reflection: "Personal reflection", broll: "B-roll" };
const EXP_CATS = {
  accommodation: { name: "Accommodation", c: "#2c5a4a" }, food: { name: "Food & drinks", c: "#c0472f" },
  motorbike: { name: "Motorbike rental", c: "#b7791f" }, fuel: { name: "Fuel", c: "#8a6a3a" },
  activities: { name: "Activities & guides", c: "#4f9a94" }, flights: { name: "Domestic flights", c: "#e07a3f" },
  transport: { name: "Other transport", c: "#3d7fb8" }, shopping: { name: "Shopping & gifts", c: "#c85d8a" },
  misc: { name: "Miscellaneous", c: "#76817b" }, emergency: { name: "Emergency (from reserve)", c: "#7b5ea7" },
};
const TASK_CATS = { accommodation: "Accommodation", flights: "Flights", motorbike: "Motorbike", activities: "Activities", documentary: "Documentary", equipment: "Equipment", general: "General" };
const TASK_STATUS = { todo: "To do", progress: "In progress", done: "Completed" };
const PRIORITY = { high: "High", medium: "Medium", low: "Low" };
const STAY_STATUS = { booked: "Booked", tobook: "To book", proposed: "Proposed", enquiry: "Enquiry needed" };
const JOURNAL_QS = ["What surprised me today?", "Who did I meet and what did I learn?", "What did I notice about my relationship with nature?",
  "What felt meaningful or challenging?", "What story or question should I explore further?"];
// Loose times sort where they'd fall in the day.
const LABEL_TIME = { "all day": "00:00", "in transit": "06:00", morning: "08:00", day: "10:00", "late morning": "11:00", "flight dependent": "12:00",
  afternoon: "14:00", sunset: "17:30", evening: "19:00", "late evening": "21:30" };

/* ---------- State + storage ---------- */
let state;
function seedState() {
  const S = window.SEED;
  const s = { v: 1, trip: { ...S.trip }, places: S.places.map(p => ({ ...p })), route: S.route.map(r => ({ ...r })),
    stays: S.stays.map(x => ({ id: uid(), ref: "", notes: "", ...x })), days: {}, activities: [], shots: [], tasks: [], expenses: [],
    catBudgets: {}, settings: { previewDate: "" }, meta: { created: Date.now() } };
  let ord = 0;
  Object.entries(S.days).forEach(([date, d]) => {
    s.days[date] = { place: d.place, title: d.title || "", summary: d.summary || "", travel: d.travel || "", weather: "", notes: "",
      permit: d.permit || "", film: { ideas: d.film?.ideas || "", interviews: d.film?.interviews || "", themes: d.film?.themes || "" }, journal: {} };
    (d.acts || []).forEach(([time, end, title, cat, x]) => s.activities.push({ id: uid(), date, time, end, label: x?.label || "", title, cat,
      status: x?.status || "planned", desc: x?.desc || "", loc: x?.loc || "", notes: "", done: false, ord: ord++ }));
    (d.film?.shots || []).forEach(([cat, text]) => s.shots.push({ id: uid(), date, cat, text, done: false }));
  });
  s.tasks = S.tasks.map(t => ({ id: uid(), description: "", due: "", tripDate: "", place: "", priority: "medium", status: "todo", ref: "", link: "", notes: "", ...t }));
  return s;
}
function load() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) { const s = JSON.parse(raw); if (s && s.trip && s.days) return s; } } catch (e) {}
  return null;
}
let saveTimer;
function save(now) {
  clearTimeout(saveTimer);
  const write = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { toast("Couldn't save. Storage may be full or blocked."); } };
  if (now) write(); else saveTimer = setTimeout(write, 250);
}
// Bring over expenses from the earlier budget-only tracker that lived at this address.
function migrateOldBudget() {
  if (state.meta.migratedOld) return;
  state.meta.migratedOld = true;
  let old; try { old = JSON.parse(localStorage.getItem(OLD_BUDGET_KEY) || "null"); } catch (e) { old = null; }
  if (!old || !Array.isArray(old.expenses) || !old.expenses.length) return;
  const catMap = { accommodation: "accommodation", motorbike: "motorbike", transport: "transport", food: "food", experiences: "activities",
    entertainment: "misc", gifts: "shopping", misc: "misc", emergency: "emergency" };
  old.expenses.forEach(e => state.expenses.push({ id: uid(), date: e.date, amount: e.amount, currency: e.currency || "GBP", rate: e.rate || null, gbp: e.gbp,
    category: catMap[e.category] || "misc", place: guessPlace(e.location || ""), note: [e.note, e.location && !guessPlace(e.location) ? e.location : ""].filter(Boolean).join(" · "), created: e.created || Date.now() }));
  if (old.settings) {
    ["inrPerGbp", "reserve", "includeReserve"].forEach(k => { if (old.settings[k] != null) state.trip[k] = old.settings[k]; });
  }
  toast(`Brought over ${plural(old.expenses.length, "expense")} from your budget tracker`);
}
function guessPlace(text) {
  const t = text.toLowerCase();
  const p = state.places.find(p => t.includes(p.name.toLowerCase().split(/[ /(]/)[0]));
  return p ? p.id : "";
}

/* ---------- Derived trip data ---------- */
const placeById = id => state.places.find(p => p.id === id);
function tripDates() { const out = []; for (let d = state.trip.start; d <= state.trip.end; d = addDays(d, 1)) out.push(d); return out; }
const dayNum = date => diffDays(state.trip.start, date) + 1;
const tripLength = () => diffDays(state.trip.start, state.trip.end) + 1;
const inTrip = date => date >= state.trip.start && date <= state.trip.end;
function phase() { const t = todayISO(); return t < state.trip.start ? "before" : t > state.trip.end ? "after" : "during"; }
function stayFor(date) { return state.stays.find(s => s.checkIn <= date && date < s.checkOut) || null; }
function dayRec(date) {
  if (!state.days[date]) {
    const st = stayFor(date) || stayFor(addDays(date, -1));
    state.days[date] = { place: st ? st.place : "", title: "", summary: "", travel: "", weather: "", notes: "", permit: "", film: { ideas: "", interviews: "", themes: "" }, journal: {} };
  }
  return state.days[date];
}
const placeOf = date => placeById((state.days[date] || {}).place || (stayFor(date) || {}).place) || null;
function actSortKey(a) { return a.time || LABEL_TIME[(a.label || "").toLowerCase()] || "12:00"; }
const actsFor = date => state.activities.filter(a => a.date === date).sort((a, b) => actSortKey(a).localeCompare(actSortKey(b)) || (a.ord || 0) - (b.ord || 0));
const shotsFor = date => state.shots.filter(s => s.date === date);
function nextDestination(date) {
  const here = placeOf(date);
  for (let d = addDays(date, 1); d <= state.trip.end; d = addDays(d, 1)) { const p = placeOf(d); if (p && (!here || p.id !== here.id)) return { place: p, date: d }; }
  return null;
}
const isTravelDay = date => !!(state.days[date] && state.days[date].travel) || state.activities.some(a => a.date === date && (a.cat === "travel" || a.cat === "flight") && /ride|fly|transfer|depart/i.test(a.title));
const statusChip = st => `<span class="chip st-${st}">${esc(STAY_STATUS[st] || st)}</span>`;
const placeChip = p => p ? `<span class="chip place-chip" style="--c:${p.color}"><span class="dot"></span>${esc(p.name)}</span>` : "";

/* ---------- Budget maths ---------- */
// Today's budget is set from what was left at the start of today and holds steady all day.
function budget() {
  const t = state.trip, N = Math.max(1, tripLength()), today = todayISO(), ph = phase();
  const idx = diffDays(t.start, today) + 1;
  const remainingDays = ph === "before" ? N : ph === "after" ? 0 : N - idx + 1;
  const completedDays = ph === "before" ? 0 : ph === "after" ? N : idx - 1;
  const isEm = e => e.category === "emergency";
  const sum = l => l.reduce((a, e) => a + (+e.gbp || 0), 0);
  const reserve = Math.max(0, +t.reserve || 0);
  const pool = t.includeReserve ? +t.budget : t.budget - reserve;
  const poolSpent = l => t.includeReserve ? sum(l) : sum(l.filter(e => !isEm(e))) + Math.max(0, sum(l.filter(isEm)) - reserve);
  const ex = state.expenses;
  const totalSpent = sum(ex);
  const spent = poolSpent(ex);
  const emergencySpent = sum(ex.filter(isEm));
  const remaining = pool - spent;
  const spentExceptToday = poolSpent(ex.filter(e => e.date !== today));
  const spentToday = spent - spentExceptToday;
  const daily = remainingDays > 0 ? (pool - spentExceptToday) / remainingDays : null;
  const leftToday = ph === "during" ? daily - spentToday : null;
  const baseline = pool / N;
  const diff = daily == null ? 0 : daily - baseline;
  const status = daily == null ? "done" : Math.abs(diff) < 0.5 ? "track" : diff > 0 ? "ahead" : "behind";
  const average = completedDays > 0 ? poolSpent(ex.filter(e => e.date < today)) / completedDays : null;
  return { N, ph, today, remainingDays, completedDays, pool, spent, totalSpent, remaining, daily, leftToday, spentToday, baseline, diff, status, average,
    reserve, reserveLeft: t.includeReserve ? null : Math.max(0, reserve - emergencySpent), emergencySpent, pct: t.budget ? totalSpent / t.budget : 0 };
}
function budgetChip(b) {
  if (b.status === "done") return `<span class="chip st-proposed">Trip complete</span>`;
  if (b.status === "track") return `<span class="chip st-booked">✓ On track</span>`;
  return b.status === "ahead" ? `<span class="chip st-booked">↑ Ahead · ${gbp(Math.abs(b.diff))} more per day</span>`
    : `<span class="chip st-enquiry">↓ Behind · ${gbp(Math.abs(b.diff))} less per day</span>`;
}

/* ---------- UI state ---------- */
const ui = { view: "today", itin: "day", date: null, week: 0, todo: "tasks", filter: "all", budgetTab: "overview" };
try { Object.assign(ui, JSON.parse(sessionStorage.getItem("wild-ui") || "{}")); } catch (e) {}
const keepUi = () => { try { sessionStorage.setItem("wild-ui", JSON.stringify(ui)); } catch (e) {} };

/* ---------- Shell ---------- */
const VIEWS = [["today", "Today", "today"], ["itinerary", "Itinerary", "itin"], ["map", "Map", "map"], ["todos", "To-Dos", "todo"], ["budget", "Budget", "budget"]];
function renderTabs() {
  $("tabs").innerHTML = VIEWS.map(([id, label, ic]) => `<button class="tab" data-act="go" data-view="${id}" ${ui.view === id ? 'aria-current="page"' : ""}>${icon(ic)}<span>${label}</span></button>`).join("");
}
function render() {
  if (!ui.date || !inTrip(ui.date)) ui.date = inTrip(todayISO()) ? todayISO() : state.trip.start;
  renderTabs();
  $("top-title").textContent = { today: state.trip.short || "Today", itinerary: "Itinerary", map: "Route map", todos: "To-Dos & bookings", budget: "Budget" }[ui.view];
  const m = $("main");
  const html = { today: viewToday, itinerary: viewItinerary, map: viewMap, todos: viewTodos, budget: viewBudget }[ui.view]();
  m.innerHTML = html;
  m.classList.remove("view-enter"); void m.offsetWidth; m.classList.add("view-enter");
  if (ui.view === "map") mountMap();
  keepUi();
}
function go(view, opts) { Object.assign(ui, { view }, opts || {}); render(); window.scrollTo(0, 0); }

/* ---------- Timeline ---------- */
function timeline(date, opts = {}) {
  const acts = actsFor(date);
  if (!acts.length) return `<div class="empty small">Nothing scheduled. ${opts.noAdd ? "" : `<button class="link-btn" data-act="addAct" data-date="${date}">Add an activity</button>`}</div>`;
  const list = opts.limit ? acts.slice(0, opts.limit) : acts;
  return `<div class="tl">${list.map(a => {
    const c = ACT_CATS[a.cat] || ACT_CATS.admin;
    const t = a.time ? `${esc(a.time)}${a.end ? `<small>${esc(a.end)}</small>` : ""}` : esc(a.label || "Any time");
    const st = a.status !== "planned" ? ` <span class="chip st-${a.status}">${ACT_STATUS[a.status]}</span>` : "";
    return `<div class="act ${a.done ? "done" : ""}">
      <div class="time">${t}</div>
      <button class="act-main" data-act="editAct" data-id="${a.id}" style="--c:${c.c}">
        <span class="cat-ic">${icon(c.i)}</span>
        <span style="min-width:0"><span class="act-title">${esc(a.title)}</span>${st}
        ${a.desc || a.loc ? `<div class="act-desc">${esc([a.loc, a.desc].filter(Boolean).join(" · "))}</div>` : ""}
        ${a.notes ? `<div class="act-desc">${esc(a.notes)}</div>` : ""}</span>
      </button>
      <button class="check ${a.done ? "on" : ""}" data-act="toggleAct" data-id="${a.id}" aria-label="${a.done ? "Mark not done" : "Mark done"}: ${esc(a.title)}">${icon("tick")}</button>
    </div>`;
  }).join("")}${opts.limit && acts.length > opts.limit ? `<div class="small muted" style="padding-top:8px">+ ${plural(acts.length - opts.limit, "more activity", "more activities")}</div>` : ""}</div>`;
}

/* ---------- Today ---------- */
function viewToday() {
  const t = state.trip, today = todayISO(), ph = phase(), b = budget();
  let hero;
  if (ph === "before") {
    const days = diffDays(today, t.start), booked = state.stays.filter(s => s.status === "booked").length;
    const open = state.tasks.filter(x => x.status !== "done").length;
    hero = `<section class="hero">
      <div class="eyebrow">${esc(t.title)}</div>
      <div><div class="big-count">${days}</div><div class="sub">${days === 1 ? "day" : "days"} until departure · ${fmtLong(t.start)}</div></div>
      <div class="hero-stats">
        <div class="hs"><div class="k">Trip</div><div class="v">${tripLength()} days, ${fmtShort(t.start)} – ${fmtShort(t.end)}</div></div>
        <div class="hs"><div class="k">First stop</div><div class="v">${esc((placeOf(t.start) || {}).name || "—")}</div></div>
        <div class="hs"><div class="k">Stays booked</div><div class="v">${booked} of ${state.stays.length}</div></div>
        <div class="hs"><div class="k">Open to-dos</div><div class="v">${open}</div></div>
      </div></section>`;
  } else if (ph === "after") {
    const shots = state.shots.filter(s => s.done).length, journals = Object.values(state.days).filter(d => d.journal && Object.values(d.journal).some(Boolean)).length;
    hero = `<section class="hero">
      <div class="eyebrow">${esc(t.title)}</div><h2>Trip complete</h2>
      <div class="sub">${fmtLong(t.start)} – ${fmtLong(t.end)}</div>
      <div class="hero-stats">
        <div class="hs"><div class="k">Days</div><div class="v">${tripLength()}</div></div>
        <div class="hs"><div class="k">Spent</div><div class="v">${gbp(b.totalSpent)} of ${gbp0(t.budget)}</div></div>
        <div class="hs"><div class="k">Shots ticked</div><div class="v">${shots}</div></div>
        <div class="hs"><div class="k">Journal days</div><div class="v">${journals}</div></div>
      </div></section>`;
  } else {
    const p = placeOf(today), st = stayFor(today), nx = nextDestination(today);
    hero = `<section class="hero">
      <div class="eyebrow">${esc(t.title)}</div>
      <div><h2>Day ${dayNum(today)} of ${tripLength()}</h2><div class="sub">${fmtLong(today)}</div></div>
      <div class="hero-stats">
        <div class="hs"><div class="k">Where</div><div class="v">${esc(p ? p.name : "—")}</div></div>
        <div class="hs"><div class="k">Days left</div><div class="v">${diffDays(today, t.end)}</div></div>
        <div class="hs"><div class="k">Tonight</div><div class="v">${st ? `${esc(st.name)} · ${esc(STAY_STATUS[st.status])}` : (today === t.end ? "Flying home" : "Not set")}</div></div>
        <div class="hs"><div class="k">Next</div><div class="v">${nx ? `${esc(nx.place.name)}, ${fmtShort(nx.date)}` : "Home"}</div></div>
      </div></section>`;
  }
  const money = ph === "after" ? "" : `<button class="card" data-act="go" data-view="budget" style="text-align:left;cursor:pointer">
      <div class="card-h"><div><div class="eyebrow">${ph === "during" ? "Today's budget" : "Daily budget"}</div>
        <div style="font-family:var(--display);font-size:28px">${b.daily == null ? "—" : gbp(b.daily)}<span class="muted small" style="font-family:var(--body)">/day</span></div></div>
        ${b.leftToday != null ? `<div style="text-align:right"><div class="eyebrow">${b.leftToday < 0 ? "Over today" : "Left today"}</div><div style="font-family:var(--display);font-size:24px;color:${b.leftToday < 0 ? "var(--bad)" : "inherit"}">${gbp(Math.abs(b.leftToday))}</div></div>` : `<div>${budgetChip(b)}</div>`}
      </div></button>`;
  const quick = `<div class="quick">
      <button class="qa" data-act="addAct" data-date="${inTrip(today) ? today : ui.date}">${icon("plus")}Activity</button>
      <button class="qa" data-act="addExpense">${icon("budget")}Expense</button>
      <button class="qa" data-act="addTask">${icon("todo")}To-do</button>
      <button class="qa" data-act="addShot" data-date="${inTrip(today) ? today : ui.date}">${icon("camera")}Filming</button></div>`;
  let schedule = "", tomorrow = "";
  if (ph === "during") {
    const d = dayRec(today), p = placeOf(today);
    schedule = `<section class="card">
      <div class="card-h"><div><div class="eyebrow">Today's schedule</div><h2 style="font-family:var(--display);font-size:20px">${esc(d.title || fmtLong(today))}</h2></div>
        <button class="link-btn" data-act="openDay" data-date="${today}">Day view</button></div>
      ${p ? `<div class="row">${placeChip(p)}</div>` : ""}
      ${d.travel ? `<div class="note-box">${icon("bike")} ${esc(d.travel)}</div>` : ""}
      ${d.summary ? `<div class="small muted">${esc(d.summary)}</div>` : ""}
      ${timeline(today)}</section>`;
    if (today < t.end) {
      const tm = addDays(today, 1), dt = dayRec(tm), tp = placeOf(tm);
      tomorrow = `<button class="card" data-act="openDay" data-date="${tm}" style="text-align:left">
        <div class="card-h"><div><div class="eyebrow">Tomorrow · ${fmtDay(tm)}</div><div style="font-weight:700">${esc(dt.title || (tp ? tp.name : ""))}</div></div>${tp ? placeChip(tp) : ""}</div>
        ${dt.travel ? `<div class="small">${esc(dt.travel)}</div>` : ""}
        ${timeline(tm, { limit: 3, noAdd: true })}</button>`;
    }
  } else if (ph === "before") {
    const next = state.tasks.filter(x => x.status !== "done").sort((a, b) => (PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority]) || (a.tripDate || "9").localeCompare(b.tripDate || "9")).slice(0, 4);
    schedule = `<section class="card"><div class="card-h"><h2>Next to sort</h2><button class="link-btn" data-act="go" data-view="todos">All to-dos</button></div>
      <div>${next.map(taskRow).join("") || `<div class="empty">Everything's done.</div>`}</div></section>`;
    tomorrow = `<button class="card" data-act="openDay" data-date="${t.start}" style="text-align:left">
      <div class="card-h"><div><div class="eyebrow">Day 1 · ${fmtDay(t.start)}</div><div style="font-weight:700">${esc(dayRec(t.start).title)}</div></div></div>
      ${timeline(t.start, { limit: 3, noAdd: true })}</button>`;
  }
  return hero + money + quick + schedule + tomorrow;
}
const PRIO_ORDER = { high: 0, medium: 1, low: 2 };

/* ---------- Itinerary ---------- */
function viewItinerary() {
  const seg = `<div class="seg" role="group" aria-label="Itinerary view">${[["day", "Day"], ["week", "Week"], ["cal", "Calendar"], ["trip", "Trip"]].map(([k, l]) =>
    `<button data-act="itin" data-mode="${k}" aria-pressed="${ui.itin === k}">${l}</button>`).join("")}</div>`;
  return seg + ({ day: itinDay, week: itinWeek, cal: itinCal, trip: itinTrip }[ui.itin] || itinDay)();
}
function itinDay() {
  const date = ui.date, d = dayRec(date), p = placeOf(date), st = stayFor(date), shots = shotsFor(date), today = todayISO();
  const first = date === state.trip.start, last = date === state.trip.end;
  const journalFilled = JOURNAL_QS.some((_, i) => d.journal && d.journal["q" + i]);
  return `
  <div class="daynav">
    <button class="icon-btn" data-act="dayStep" data-n="-1" ${first ? "disabled style='opacity:.3'" : ""} aria-label="Previous day">${icon("left")}</button>
    <div class="mid"><div class="eyebrow">Day ${dayNum(date)} of ${tripLength()}${date === today ? " · Today" : ""}</div><h2>${fmtDay(date)}</h2></div>
    <button class="icon-btn" data-act="dayStep" data-n="1" ${last ? "disabled style='opacity:.3'" : ""} aria-label="Next day">${icon("right")}</button>
  </div>
  <section class="card day-head" style="--c:${p ? p.color : "var(--line)"}" id="swipe-zone">
    <div class="card-h"><div class="row">${placeChip(p)}</div><button class="link-btn" data-act="editDay" data-date="${date}">Edit day</button></div>
    <h2 style="font-family:var(--display);font-size:24px">${esc(d.title || (p ? p.name : fmtLong(date)))}</h2>
    ${d.summary ? `<div class="muted">${esc(d.summary)}</div>` : ""}
    <dl class="kv">
      <dt>Stay</dt><dd>${st ? `<button class="link-btn" style="padding:0" data-act="editStay" data-id="${st.id}">${esc(st.name)}</button> ${statusChip(st.status)}` : (last ? "Flying home" : first ? "In transit" : `<button class="link-btn" style="padding:0" data-act="addStay" data-date="${date}">Add a stay</button>`)}</dd>
      ${d.travel ? `<dt>Travel</dt><dd>${esc(d.travel)}</dd>` : ""}
      <dt>Weather</dt><dd>${d.weather ? esc(d.weather) : `<span class="muted">Check the forecast nearer the time</span>`}</dd>
    </dl>
  </section>
  <section class="card">
    <div class="card-h"><h2>Schedule</h2><button class="link-btn" data-act="addAct" data-date="${date}">+ Add</button></div>
    ${timeline(date)}
  </section>
  <section class="card">
    <details class="fold" ${shots.length || d.film.ideas ? "open" : ""}><summary>Filming</summary>
      <div style="display:flex;flex-direction:column;gap:12px;margin-top:12px">
        ${d.permit ? `<div class="warn-box"><strong>Permissions:</strong> ${esc(d.permit)}</div>` : ""}
        ${d.film.ideas ? `<div><div class="eyebrow">Locations & shot ideas</div><div>${esc(d.film.ideas)}</div></div>` : ""}
        ${d.film.interviews ? `<div><div class="eyebrow">Interview opportunities</div><div>${esc(d.film.interviews)}</div></div>` : ""}
        ${d.film.themes ? `<div><div class="eyebrow">Story themes</div><div>${esc(d.film.themes)}</div></div>` : ""}
        <div><div class="card-h"><div class="eyebrow">Shot list</div><button class="link-btn" data-act="addShot" data-date="${date}">+ Shot</button></div>
          ${shots.length ? shots.map(s => `<div class="shot ${s.done ? "done" : ""}">
            <button class="check ${s.done ? "on" : ""}" data-act="toggleShot" data-id="${s.id}" aria-label="Toggle shot">${icon("tick")}</button>
            <button class="act-main" data-act="editShot" data-id="${s.id}" style="flex-direction:column;gap:0"><span class="shot-cat">${esc(SHOT_CATS[s.cat] || s.cat)}</span><span class="t">${esc(s.text)}</span></button><span></span>
          </div>`).join("") : `<div class="small muted">No shots yet.</div>`}</div>
        <div class="btns"><button class="btn sec" data-act="editFilm" data-date="${date}">Edit filming notes</button></div>
        <div class="hint">Get consent before filming identifiable people. Respect sacred spaces, private property and wildlife.</div>
      </div></details>
  </section>
  <section class="card">
    <details class="fold" ${journalFilled ? "open" : ""}><summary>Reflection journal</summary>
      <div style="display:flex;flex-direction:column;gap:14px;margin-top:12px">
        ${JOURNAL_QS.map((q, i) => `<div class="q field"><label for="j${i}">${i + 1}. ${q}</label><textarea id="j${i}" data-journal="${i}" data-date="${date}" rows="2">${esc((d.journal || {})["q" + i] || "")}</textarea></div>`).join("")}
        <div class="hint">Saves as you type.</div>
      </div></details>
  </section>
  <section class="card">
    <div class="field"><label for="day-notes" style="font-family:var(--display);font-size:19px;color:var(--ink);font-weight:400">Notes</label>
    <textarea id="day-notes" data-daynote="${date}" rows="3" placeholder="Anything to remember about this day">${esc(d.notes)}</textarea></div>
  </section>`;
}
function itinWeek() {
  const dates = tripDates(), weeks = Math.ceil(dates.length / 7);
  ui.week = Math.max(0, Math.min(weeks - 1, ui.week));
  const list = dates.slice(ui.week * 7, ui.week * 7 + 7), today = todayISO();
  return `<div class="daynav">
    <button class="icon-btn" data-act="weekStep" data-n="-1" ${ui.week === 0 ? "disabled style='opacity:.3'" : ""} aria-label="Previous week">${icon("left")}</button>
    <div class="mid"><div class="eyebrow">Week ${ui.week + 1} of ${weeks}</div><h2>${fmtShort(list[0])} – ${fmtShort(list[list.length - 1])}</h2></div>
    <button class="icon-btn" data-act="weekStep" data-n="1" ${ui.week === weeks - 1 ? "disabled style='opacity:.3'" : ""} aria-label="Next week">${icon("right")}</button>
  </div>
  <div class="weekgrid">${list.map(date => {
    const d = dayRec(date), p = placeOf(date), st = stayFor(date), acts = actsFor(date);
    const main = d.title || (acts.find(a => a.cat !== "food" && a.cat !== "admin") || {}).title || "Free day";
    const travel = isTravelDay(date) ? (acts.some(a => a.cat === "flight") ? icon("plane") + " Flight" : icon("bike") + " Travel") : "";
    return `<button class="wday ${date === today ? "today" : ""}" style="--c:${p ? p.color : "var(--line)"}" data-act="openDay" data-date="${date}">
      <div class="d"><span>${fmtDay(date)}</span><span class="muted small">Day ${dayNum(date)}</span></div>
      <div class="m"><strong>${esc(p ? p.name : "")}</strong> · ${esc(main)}</div>
      <div class="s">${icon("bed")} ${st ? `${esc(st.name)} ${statusChip(st.status)}` : (date === state.trip.end ? "Flying home" : "In transit")}</div>
      ${travel ? `<div class="s" style="color:var(--sunset)">${travel}</div>` : ""}
    </button>`;
  }).join("")}</div>`;
}
function itinCal() {
  const t = state.trip, today = todayISO();
  const months = []; let m = t.start.slice(0, 7) + "-01";
  while (m <= t.end) { months.push(m); const [y, mo] = m.split("-").map(Number); m = iso(Date.UTC(mo === 12 ? y + 1 : y, mo === 12 ? 0 : mo, 1)); }
  const used = []; tripDates().forEach(d => { const p = placeOf(d); if (p && !used.includes(p)) used.push(p); });
  const legend = `<div class="legend">${used.map(placeChip).join("")}</div>`;
  return legend + months.map(first => {
    const [y, mo] = first.split("-").map(Number);
    const lead = (new Date(parse(first)).getUTCDay() + 6) % 7; // Monday first
    const daysIn = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(`<div></div>`);
    for (let n = 1; n <= daysIn; n++) {
      const date = `${y}-${String(mo).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
      if (!inTrip(date)) { cells.push(`<div class="cell out"><span class="n">${n}</span></div>`); continue; }
      const p = placeOf(date), acts = actsFor(date).length, tr = isTravelDay(date);
      cells.push(`<button class="cell trip ${date === today ? "today" : ""}" style="--c:${p ? p.color : "var(--line)"}" data-act="openDay" data-date="${date}" aria-label="${fmtLong(date)}${p ? ", " + esc(p.name) : ""}">
        <span class="n">${n}</span><span class="p">${esc(p ? p.name.split(" (")[0] : "")}</span>
        <span class="marks">${acts ? "<i></i>" : ""}${tr ? '<i class="tr"></i>' : ""}</span></button>`);
    }
    return `<section class="card"><h2 style="font-family:var(--display);font-size:20px">${new Date(parse(first)).toLocaleDateString("en-GB", { timeZone: "UTC", month: "long", year: "numeric" })}</h2>
      <div class="cal">${["M", "T", "W", "T", "F", "S", "S"].map(x => `<div class="dow">${x}</div>`).join("")}${cells.join("")}</div></section>`;
  }).join("") + `<div class="small muted">Dark dot: activities planned. Orange dot: travel day.</div>`;
}
function itinTrip() {
  // Continuous journey: consecutive days at the same place become one segment.
  const segs = [];
  tripDates().forEach(date => {
    const p = placeOf(date), last = segs[segs.length - 1];
    if (last && p && last.place === p) last.to = date; else segs.push({ place: p, from: date, to: date });
  });
  return `<section class="card"><h2 style="font-family:var(--display);font-size:20px">The whole journey</h2>
    <div style="display:flex;flex-direction:column;gap:8px">${segs.map(s => {
      const stays = state.stays.filter(x => x.checkIn <= s.to && x.checkOut > s.from && (!s.place || x.place === s.place.id));
      const nights = stays.reduce((a, x) => a + diffDays(x.checkIn, x.checkOut), 0);
      return `<button class="over-row" data-act="openDay" data-date="${s.from}" style="--c:${s.place ? s.place.color : "var(--line)"}">
        <div class="dates">${fmtShort(s.from)}${s.to !== s.from ? `<br>– ${fmtShort(s.to)}` : ""}</div>
        <div class="seg-card"><strong>${esc(s.place ? s.place.name : "Travel")}</strong> <span class="small muted">${nights ? plural(nights, "night") : ""}</span>
          <div class="small">${stays.map(x => `${esc(x.name)} ${statusChip(x.status)}`).join("<br>") || (s.from === state.trip.start ? "In transit from the UK" : "Flying home")}</div></div>
      </button>`;
    }).join("")}</div></section>`;
}

/* ---------- Map ---------- */
let mapObj = null;
function viewMap() {
  return `<div id="map" role="application" aria-label="Route map"></div>
    <div class="small muted">Approximate route: straight lines between town centres, not road directions. Map tiles need a connection.</div>
    <div class="legend"><span class="chip place-chip" style="--c:#2f8a55"><span class="dot"></span>Motorbike</span><span class="chip place-chip" style="--c:#e07a3f"><span class="dot"></span>Flight</span><span class="chip place-chip" style="--c:#76817b"><span class="dot"></span>Road transfer</span></div>
    <section class="card"><h2 style="font-family:var(--display);font-size:20px">Stops</h2><div class="stop-list">${stopNumbers().map(({ place, n }) => {
      const r = placeRanges(place.id);
      return `<button class="stop" data-act="placeInfo" data-id="${place.id}"><span class="pin" style="--c:${place.color}">${n}</span>
        <span><strong>${esc(place.name)}</strong><div class="small muted">${r.map(x => x.from === x.to ? fmtShort(x.from) : `${fmtShort(x.from)} – ${fmtShort(x.to)}`).join(", ")}</div></span>${icon("right")}</button>`;
    }).join("")}</div></section>`;
}
function stopNumbers() { const seen = []; state.route.forEach(r => { const p = placeById(r.place); if (p && !seen.some(s => s.place === p)) seen.push({ place: p, n: seen.length + 1 }); }); return seen; }
function placeRanges(id) {
  const out = []; tripDates().forEach(d => { const p = placeOf(d); if (p && p.id === id) { const last = out[out.length - 1]; if (last && addDays(last.to, 1) === d) last.to = d; else out.push({ from: d, to: d }); } });
  return out;
}
function mountMap() {
  const el = $("map");
  if (mapObj) { mapObj.remove(); mapObj = null; }
  if (!window.L) { el.innerHTML = `<div class="empty" style="padding-top:40px">The map needs a connection the first time it loads. The stops are listed below.</div>`; return; }
  mapObj = L.map(el, { scrollWheelZoom: false, zoomControl: true });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(mapObj);
  const pts = [];
  state.route.forEach((r, i) => {
    const p = placeById(r.place); if (!p) return;
    if (i > 0) {
      const prev = placeById(state.route[i - 1].place);
      if (prev) {
        const style = r.mode === "flight" ? { color: "#e07a3f", dashArray: "8 8", weight: 3 } : r.mode === "road" ? { color: "#76817b", dashArray: "4 6", weight: 3 } : { color: "#2f8a55", dashArray: "10 6", weight: 4 };
        L.polyline([[prev.lat, prev.lng], [p.lat, p.lng]], style).addTo(mapObj);
      }
    }
    pts.push([p.lat, p.lng]);
  });
  stopNumbers().forEach(({ place, n }) => {
    const m = L.marker([place.lat, place.lng], { icon: L.divIcon({ className: "", html: `<div class="pin" style="--c:${place.color}">${n}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] }), title: place.name }).addTo(mapObj);
    m.on("click", () => placeInfo(place.id));
  });
  mapObj.fitBounds(L.latLngBounds(pts), { padding: [24, 24] });
  setTimeout(() => mapObj && mapObj.invalidateSize(), 60);
}
function placeInfo(id) {
  const p = placeById(id), ranges = placeRanges(id), stays = state.stays.filter(s => s.place === id);
  const dates = new Set(tripDates().filter(d => (placeOf(d) || {}).id === id));
  const acts = state.activities.filter(a => dates.has(a.date) && a.cat !== "food" && a.cat !== "admin");
  const nights = stays.reduce((a, s) => a + diffDays(s.checkIn, s.checkOut), 0);
  openSheet(`<div class="sheet-h"><h2>${esc(p.name)}</h2><button class="icon-btn" data-act="closeSheet" aria-label="Close">✕</button></div>
    <dl class="kv"><dt>Dates</dt><dd>${ranges.map(r => r.from === r.to ? fmtDay(r.from) : `${fmtDay(r.from)} – ${fmtDay(r.to)}`).join("<br>") || "—"}</dd>
      <dt>Nights</dt><dd>${nights}</dd>
      <dt>Stays</dt><dd>${stays.map(s => `${esc(s.name)} ${statusChip(s.status)}`).join("<br>") || "—"}</dd></dl>
    ${p.notes ? `<div class="note-box">${esc(p.notes)}</div>` : ""}
    <div><div class="eyebrow">Planned here</div>${acts.slice(0, 12).map(a => `<div class="small">${fmtShort(a.date)} · ${esc(a.title)}${a.status !== "planned" ? ` <span class="muted">(${ACT_STATUS[a.status].toLowerCase()})</span>` : ""}</div>`).join("") || `<div class="small muted">Nothing yet.</div>`}</div>
    <div class="btns"><button class="btn" data-act="openDay" data-date="${ranges[0] ? ranges[0].from : state.trip.start}">Open first day</button><button class="btn sec" data-act="editPlace" data-id="${id}">Edit notes</button></div>`);
}

/* ---------- To-dos + bookings ---------- */
function taskRow(t) {
  const p = placeById(t.place), when = t.due ? `Due ${fmtShort(t.due)}` : t.tripDate ? `For ${fmtShort(t.tripDate)}` : "";
  const cls = t.status === "done" ? "on" : t.status === "progress" ? "prog" : "";
  return `<div class="task ${t.status === "done" ? "done" : ""}">
    <button class="check ${cls}" data-act="toggleTask" data-id="${t.id}" aria-label="${t.status === "done" ? "Reopen" : "Complete"}: ${esc(t.title)}">${icon(t.status === "progress" ? "half" : "tick")}</button>
    <button class="task-main" data-act="editTask" data-id="${t.id}"><span class="task-title">${esc(t.title)}</span>
      <span class="task-meta">${t.priority === "high" ? `<span class="pri-high">High</span>` : ""}${t.status === "progress" ? `<span>In progress</span>` : ""}${when ? `<span>${when}</span>` : ""}${p ? `<span>${esc(p.name)}</span>` : ""}${t.ref ? `<span>Ref ${esc(t.ref)}</span>` : ""}</span></button>
  </div>`;
}
function viewTodos() {
  const seg = `<div class="seg" role="group" aria-label="To-do view"><button data-act="todoMode" data-mode="tasks" aria-pressed="${ui.todo === "tasks"}">Tasks</button><button data-act="todoMode" data-mode="bookings" aria-pressed="${ui.todo === "bookings"}">Bookings</button></div>`;
  if (ui.todo === "bookings") {
    const nights = state.stays.reduce((a, s) => a + diffDays(s.checkIn, s.checkOut), 0);
    const booked = state.stays.filter(s => s.status === "booked").reduce((a, s) => a + diffDays(s.checkIn, s.checkOut), 0);
    const sorted = [...state.stays].sort((a, b) => a.checkIn.localeCompare(b.checkIn));
    return seg + `<section class="card"><div class="card-h"><div><div class="eyebrow">Accommodation</div><div style="font-family:var(--display);font-size:24px">${booked} of ${nights} nights booked</div></div></div>
      <div class="meter"><i style="width:${nights ? booked / nights * 100 : 0}%"></i></div>
      <div>${sorted.map(s => { const p = placeById(s.place); return `<button class="stay" data-act="editStay" data-id="${s.id}">
        <span><strong>${esc(s.name)}</strong><div class="small muted">${fmtShort(s.checkIn)} – ${fmtShort(s.checkOut)} · ${plural(diffDays(s.checkIn, s.checkOut), "night")}${p ? " · " + esc(p.name) : ""}${s.ref ? " · Ref " + esc(s.ref) : ""}</div>${s.notes ? `<div class="small muted">${esc(s.notes)}</div>` : ""}</span>
        ${statusChip(s.status)}</button>`; }).join("")}</div>
      <button class="btn sec" data-act="addStay">Add a stay</button></section>
      <div class="small muted">Flights aren't booked yet. Track them as tasks under Flights.</div>`;
  }
  const all = state.tasks, done = all.filter(t => t.status === "done").length;
  let list = all;
  if (ui.filter === "upcoming") list = all.filter(t => t.status !== "done" && (t.due || t.tripDate)).sort((a, b) => (a.due || a.tripDate).localeCompare(b.due || b.tripDate));
  else if (ui.filter === "high") list = all.filter(t => t.status !== "done" && t.priority === "high");
  else if (ui.filter === "done") list = all.filter(t => t.status === "done");
  else list = [...all].sort((a, b) => (a.status === "done") - (b.status === "done"));
  const grouped = ui.filter === "all" || ui.filter === "done";
  let body;
  if (!list.length) body = `<div class="empty">${ui.filter === "done" ? "Nothing completed yet." : "Nothing here."}</div>`;
  else if (grouped) body = Object.entries(TASK_CATS).map(([k, name]) => { const l = list.filter(t => t.category === k); return l.length ? `<section class="card"><h2 style="font-family:var(--display);font-size:19px">${name}</h2><div>${l.map(taskRow).join("")}</div></section>` : ""; }).join("");
  else body = `<section class="card"><div>${list.map(taskRow).join("")}</div></section>`;
  return seg + `<section class="card"><div class="card-h"><div><div class="eyebrow">Progress</div><div style="font-family:var(--display);font-size:24px">${done} of ${all.length} done</div></div><button class="btn" data-act="addTask" style="min-height:44px;padding:10px 14px">+ Task</button></div>
    <div class="meter"><i style="width:${all.length ? done / all.length * 100 : 0}%"></i></div></section>
    <div class="filters" role="group" aria-label="Filter tasks">${[["all", "All"], ["upcoming", "Upcoming"], ["high", "High priority"], ["done", "Completed"]].map(([k, l]) => `<button data-act="filter" data-f="${k}" aria-pressed="${ui.filter === k}">${l}</button>`).join("")}</div>
    ${body}`;
}

/* ---------- Budget ---------- */
function viewBudget() {
  const b = budget(), t = state.trip;
  const seg = `<div class="seg" role="group" aria-label="Budget view"><button data-act="budTab" data-tab="overview" aria-pressed="${ui.budgetTab === "overview"}">Overview</button><button data-act="budTab" data-tab="spending" aria-pressed="${ui.budgetTab === "spending"}">Expenses</button><button data-act="budTab" data-tab="plan" aria-pressed="${ui.budgetTab === "plan"}">vs plan</button></div>`;
  if (ui.budgetTab === "spending") return seg + expenseList();
  if (ui.budgetTab === "plan") return seg + budgetVsPlan(b);
  const hero = `<section class="hero">
    <div class="eyebrow">${b.ph === "during" ? `Day ${dayNum(b.today)} of ${b.N}` : b.ph === "before" ? "Before the trip" : "Trip finished"}</div>
    <div class="row" style="align-items:baseline;gap:8px"><span style="font-family:var(--display);font-size:28px">${gbp(b.remaining)}</span><span class="sub">remaining${t.includeReserve ? "" : " to spend"}</span></div>
    <div class="bud-row">
      <div><div class="eyebrow" style="color:var(--hero-muted)">${b.ph === "during" ? "Today's budget" : b.ph === "before" ? "Starting daily budget" : "Daily budget"}</div>
        <div class="bud-big">${b.daily == null ? "—" : gbp(b.daily)}<small>/day</small></div></div>
      ${b.leftToday != null ? `<div class="left-today"><div class="eyebrow" style="color:var(--hero-muted)">${b.leftToday < 0 ? "Over today" : "Left today"}</div><div class="v ${b.leftToday < 0 ? "over" : ""}">${gbp(Math.abs(b.leftToday))}</div><div class="sub small">${gbp(b.spentToday)} spent</div></div>` : ""}
    </div>
    ${b.leftToday != null ? `<div class="hero-meter ${b.leftToday < 0 ? "over" : ""}"><i style="width:${b.daily > 0 ? Math.min(100, Math.max(0, b.spentToday / b.daily * 100)) : 100}%"></i></div>` : ""}
    <div>${budgetChip(b)}</div>
    <div class="sub small">Compared with your ${gbp(b.baseline)}/day starting allowance (${gbp0(b.pool)} ÷ ${b.N} days${t.includeReserve ? "" : `, ${gbp0(b.reserve)} reserve kept aside`}). Set at the start of each day.</div>
  </section>`;
  const stats = `<section class="card"><div class="grid2">
    <div class="stat"><div class="k">Total budget</div><div class="v">${gbp0(t.budget)}</div><div class="s">excl. international flights</div></div>
    <div class="stat"><div class="k">Spent</div><div class="v">${gbp(b.totalSpent)}</div><div class="s">${Math.round(b.pct * 100)}% of budget</div></div>
    <div class="stat"><div class="k">Days remaining</div><div class="v">${b.remainingDays}</div><div class="s">today included</div></div>
    <div class="stat"><div class="k">Average per day</div><div class="v">${b.average == null ? "—" : gbp(b.average)}</div><div class="s">${b.completedDays ? `over ${plural(b.completedDays, "completed day")}` : "shows after day 1"}</div></div>
  </div><div class="meter ${b.remaining < 0 ? "over" : ""}"><i style="width:${Math.min(100, b.pct * 100)}%"></i></div></section>`;
  const reserve = `<section class="card"><div class="toggle-row"><label for="inc-res"><strong>Include contingency in daily budget</strong><div class="hint">${t.includeReserve ? "The reserve counts as spending money." : `${gbp(b.reserveLeft)} of ${gbp0(b.reserve)} emergency reserve protected. Log emergencies under "Emergency".`}</div></label>
    <input type="checkbox" id="inc-res" data-act="toggleReserve" ${t.includeReserve ? "checked" : ""}></div></section>`;
  const cats = catTotals();
  const max = Math.max(1, ...Object.values(cats));
  const chart = `<section class="card"><div class="card-h"><h2>By category</h2><button class="link-btn" data-act="budTab" data-tab="plan">Budget vs actual</button></div>
    ${Object.keys(cats).length ? `<div class="bars">${Object.entries(EXP_CATS).filter(([k]) => cats[k]).sort((a, z) => cats[z[0]] - cats[a[0]]).map(([k, c]) => `<div class="bar-row" style="--c:${c.c}"><span>${c.name}</span><strong>${gbp(cats[k])}</strong><div class="track"><i style="width:${cats[k] / max * 100}%"></i></div></div>`).join("")}</div>`
    : `<div class="empty">No expenses yet. Tap + to log one in rupees or pounds.</div>`}</section>`;
  const recent = [...state.expenses].sort((a, z) => z.date.localeCompare(a.date) || (z.created || 0) - (a.created || 0)).slice(0, 5);
  const recentCard = recent.length ? `<section class="card"><div class="card-h"><h2>Recent</h2><button class="link-btn" data-act="budTab" data-tab="spending">All expenses</button></div><div>${recent.map(expRow).join("")}</div></section>` : "";
  return seg + hero + `<div class="btns"><button class="btn" data-act="addExpense">+ Add expense</button></div>` + stats + reserve + chart + recentCard +
    `<div class="small muted">Exchange rate ₹${esc(t.inrPerGbp)} = £1, set by you. <button class="link-btn" data-act="settings">Change</button></div>`;
}
function catTotals() { const o = {}; state.expenses.forEach(e => { o[e.category] = (o[e.category] || 0) + (+e.gbp || 0); }); return o; }
function expRow(e) {
  const c = EXP_CATS[e.category] || EXP_CATS.misc, p = placeById(e.place);
  return `<button class="exp" data-act="editExpense" data-id="${e.id}"><span class="cat-ic" style="--c:${c.c}">${icon("budget")}</span>
    <span style="min-width:0"><div style="font-weight:600;overflow-wrap:anywhere">${esc(e.note || c.name)}</div><div class="small muted">${fmtDay(e.date)} · ${c.name}${p ? " · " + esc(p.name) : ""}</div></span>
    <span class="amt">${gbp(+e.gbp)}${e.currency === "INR" ? `<small>${inr(e.amount)}</small>` : ""}</span></button>`;
}
function expenseList() {
  if (!state.expenses.length) return `<section class="card"><div class="empty">No expenses yet.</div><button class="btn" data-act="addExpense">+ Add expense</button></section>`;
  const groups = {};
  [...state.expenses].sort((a, z) => z.date.localeCompare(a.date) || (z.created || 0) - (a.created || 0)).forEach(e => (groups[e.date] = groups[e.date] || []).push(e));
  return `<div class="btns"><button class="btn" data-act="addExpense">+ Add expense</button><button class="btn sec" data-act="csv">Export CSV</button></div>` +
    Object.entries(groups).map(([date, l]) => `<section class="card"><div class="card-h"><strong>${fmtDay(date)}${inTrip(date) ? ` · Day ${dayNum(date)}` : ""}</strong><span class="muted">${gbp(l.reduce((a, e) => a + (+e.gbp || 0), 0))}</span></div><div>${l.map(expRow).join("")}</div></section>`).join("");
}
function budgetVsPlan(b) {
  const cats = catTotals(), plan = state.catBudgets || {};
  const planned = Object.values(plan).reduce((a, v) => a + (+v || 0), 0);
  const rows = Object.entries(EXP_CATS).filter(([k]) => k !== "emergency" || cats[k]).map(([k, c]) => {
    const act = cats[k] || 0, pl = +plan[k] || 0, top = Math.max(act, pl, 1);
    return `<div class="bar-row" style="--c:${pl && act > pl ? "var(--bad)" : c.c}"><span>${c.name}</span><span><strong>${gbp0(act)}</strong>${pl ? ` <span class="muted">of ${gbp0(pl)}</span>` : ""}</span>
      <div class="track"><i style="width:${act / top * 100}%"></i>${pl ? `<b style="left:calc(${pl / top * 100}% - 1px)"></b>` : ""}</div></div>`;
  }).join("");
  const byPlace = {};
  state.expenses.forEach(e => { const k = e.place || "_"; byPlace[k] = (byPlace[k] || 0) + (+e.gbp || 0); });
  const pm = Math.max(1, ...Object.values(byPlace));
  return `<section class="card"><div class="card-h"><h2>Budget vs actual</h2><button class="link-btn" data-act="editPlan">Set budgets</button></div>
    <div class="small muted">${planned ? `${gbp0(planned)} planned across categories, of ${gbp0(state.trip.budget)}.` : "No category budgets yet. Set them to see a line for each plan on the bars."}</div>
    <div class="bars">${rows}</div></section>
    <section class="card"><h2 style="font-family:var(--display);font-size:19px">By location</h2>${Object.keys(byPlace).length ? `<div class="bars">${Object.entries(byPlace).sort((a, z) => z[1] - a[1]).map(([k, v]) => { const p = placeById(k);
      return `<div class="bar-row" style="--c:${p ? p.color : "#76817b"}"><span>${esc(p ? p.name : "No location")}</span><strong>${gbp(v)}</strong><div class="track"><i style="width:${v / pm * 100}%"></i></div></div>`; }).join("")}</div>` : `<div class="empty">Nothing logged yet.</div>`}</section>
    <section class="card"><div class="grid2"><div class="stat"><div class="k">Starting allowance</div><div class="v">${gbp(b.baseline)}</div><div class="s">per day</div></div><div class="stat"><div class="k">Today's budget</div><div class="v">${b.daily == null ? "—" : gbp(b.daily)}</div><div class="s">per day</div></div></div></section>`;
}

/* ---------- Sheets and forms ---------- */
let sheetCleanup = null;
function openSheet(html, onMount) {
  $("sheet").innerHTML = html; $("scrim").hidden = false; document.body.style.overflow = "hidden";
  if (onMount) sheetCleanup = onMount($("sheet")) || null;
  const f = $("sheet").querySelector("input:not([type=checkbox]):not([type=date]):not([type=time]), textarea"); if (f && !matchMedia("(pointer: coarse)").matches) f.focus();
}
function closeSheet() { $("scrim").hidden = true; $("sheet").innerHTML = ""; document.body.style.overflow = ""; if (typeof sheetCleanup === "function") sheetCleanup(); sheetCleanup = null; }
const opts = (obj, v) => Object.entries(obj).map(([k, l]) => `<option value="${esc(k)}" ${k === v ? "selected" : ""}>${esc(typeof l === "object" ? l.name : l)}</option>`).join("");
const placeOpts = (v, blank) => (blank ? `<option value="">${blank}</option>` : "") + state.places.map(p => `<option value="${p.id}" ${p.id === v ? "selected" : ""}>${esc(p.name)}</option>`).join("");
const dateOpts = v => tripDates().map(d => `<option value="${d}" ${d === v ? "selected" : ""}>Day ${dayNum(d)} · ${fmtDay(d)}</option>`).join("");
// Generic form: fields = [{k, label, type, options(html), value, half, hint, required, rows}]
function form({ title, fields, onSave, onDelete, saveLabel }) {
  let html = `<form id="f" novalidate><div class="sheet-h"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-act="closeSheet" aria-label="Close">✕</button></div>`;
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i], nx = fields[i + 1];
    if (f.half && nx && nx.half) { html += `<div class="fields2">${fieldHtml(f)}${fieldHtml(nx)}</div>`; i++; } else html += fieldHtml(f);
  }
  html += `<div class="err" id="f-err"></div><div class="btns"><button class="btn" type="submit">${esc(saveLabel || "Save")}</button>${onDelete ? `<button class="btn danger" type="button" id="f-del">Delete</button>` : ""}</div></form>`;
  openSheet(html, sheet => {
    const fm = sheet.querySelector("#f");
    fm.addEventListener("submit", ev => {
      ev.preventDefault();
      const v = {};
      fields.forEach(f => { const el = fm.querySelector(`[name="${f.k}"]`); if (el) v[f.k] = f.type === "toggle" ? el.checked : el.value.trim(); });
      const missing = fields.find(f => f.required && !v[f.k]);
      if (missing) { $("f-err").textContent = `${missing.label} is needed.`; return; }
      const err = onSave(v);
      if (err) { $("f-err").textContent = err; return; }
      closeSheet(); save(); render();
    });
    const del = sheet.querySelector("#f-del");
    if (del) del.addEventListener("click", () => {
      if (!del.classList.contains("armed")) { del.classList.add("armed"); del.textContent = "Tap again to delete"; return; }
      onDelete(); closeSheet(); save(); render(); toast("Deleted");
    });
  });
}
function fieldHtml(f) {
  const id = "f_" + f.k, v = f.value == null ? "" : f.value;
  let input;
  if (f.type === "textarea") input = `<textarea id="${id}" name="${f.k}" rows="${f.rows || 3}">${esc(v)}</textarea>`;
  else if (f.type === "select") input = `<select id="${id}" name="${f.k}">${f.options}</select>`;
  else if (f.type === "toggle") return `<div class="toggle-row"><label for="${id}"><strong>${esc(f.label)}</strong>${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ""}</label><input type="checkbox" id="${id}" name="${f.k}" ${v ? "checked" : ""}></div>`;
  else input = `<input id="${id}" name="${f.k}" type="${f.type || "text"}" value="${esc(v)}" ${f.type === "number" ? 'inputmode="decimal" step="any"' : ""} ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ""} autocomplete="off">`;
  return `<div class="field"><label for="${id}">${esc(f.label)}</label>${input}${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ""}</div>`;
}

/* Activity */
function activityForm(a, date) {
  const isNew = !a; a = a || { date: date || ui.date, time: "", end: "", label: "", title: "", cat: "nature", status: "planned", loc: "", desc: "", notes: "" };
  form({ title: isNew ? "Add activity" : "Edit activity", fields: [
    { k: "title", label: "Title", value: a.title, required: true },
    { k: "date", label: "Day", type: "select", options: dateOpts(a.date), hint: isNew ? "" : "Change the day to move this activity." },
    { k: "time", label: "Start", type: "time", value: a.time, half: true }, { k: "end", label: "End", type: "time", value: a.end, half: true },
    { k: "label", label: "Or a loose time", value: a.label, placeholder: "e.g. Evening", hint: "Used when there's no start time." },
    { k: "cat", label: "Category", type: "select", options: opts(ACT_CATS, a.cat), half: true }, { k: "status", label: "Status", type: "select", options: opts(ACT_STATUS, a.status), half: true },
    { k: "loc", label: "Location", value: a.loc }, { k: "desc", label: "Description", type: "textarea", value: a.desc, rows: 2 }, { k: "notes", label: "Notes", type: "textarea", value: a.notes, rows: 2 },
  ], onSave: v => {
    if (v.end && v.time && v.end < v.time) return "End time is before the start time.";
    if (isNew) state.activities.push({ id: uid(), done: false, ord: Date.now(), ...v }); else Object.assign(a, v);
    toast(isNew ? "Activity added" : v.date !== a.date ? "Activity moved" : "Activity saved");
  }, onDelete: isNew ? null : () => { state.activities = state.activities.filter(x => x !== a); } });
}
/* Expense */
function expenseForm(e) {
  const isNew = !e, t = state.trip, today = todayISO();
  const d0 = e ? e.date : today;
  e = e || { date: d0, amount: "", currency: "INR", category: "food", place: (placeOf(inTrip(today) ? today : t.start) || {}).id || "", note: "" };
  let cur = e.currency;
  const html = `<form id="f" novalidate><div class="sheet-h"><h2>${isNew ? "Add expense" : "Edit expense"}</h2><button type="button" class="icon-btn" data-act="closeSheet" aria-label="Close">✕</button></div>
    <div class="field"><label for="x-amt">Amount</label><div class="amt-row"><input id="x-amt" inputmode="decimal" value="${esc(e.amount)}" placeholder="0" autocomplete="off">
      <div class="seg" style="min-width:110px"><button type="button" id="x-inr" aria-pressed="${cur === "INR"}">₹ INR</button><button type="button" id="x-gbp" aria-pressed="${cur === "GBP"}">£ GBP</button></div></div><div class="hint" id="x-conv"></div></div>
    <div class="fields2"><div class="field"><label for="x-cat">Category</label><select id="x-cat">${opts(EXP_CATS, e.category)}</select></div>
      <div class="field"><label for="x-date">Date</label><input id="x-date" type="date" value="${esc(e.date)}"></div></div>
    <div class="field"><label for="x-place">Location</label><select id="x-place">${placeOpts(e.place, "No location")}</select></div>
    <div class="field"><label for="x-note">Note</label><input id="x-note" value="${esc(e.note)}" placeholder="e.g. Thali in Fort Kochi" autocomplete="off"></div>
    <div class="err" id="f-err"></div>
    <div class="btns"><button class="btn" type="submit">Save expense</button>${isNew ? "" : `<button class="btn danger" type="button" id="f-del">Delete</button>`}</div></form>`;
  openSheet(html, s => {
    const amt = s.querySelector("#x-amt"), conv = s.querySelector("#x-conv");
    const rate = () => (!isNew && e.currency === "INR" && cur === "INR" && e.rate) ? e.rate : +t.inrPerGbp;
    const upd = () => { const v = parseFloat(amt.value.replace(/,/g, "")); conv.textContent = !(v > 0) ? (cur === "INR" ? `At ₹${rate()} per £1` : "") : cur === "INR" ? `= ${gbp(v / rate())} at ₹${rate()} per £1` : `≈ ${inr(v * t.inrPerGbp)}`; };
    const setCur = c => { cur = c; s.querySelector("#x-inr").setAttribute("aria-pressed", c === "INR"); s.querySelector("#x-gbp").setAttribute("aria-pressed", c === "GBP"); upd(); };
    s.querySelector("#x-inr").onclick = () => setCur("INR"); s.querySelector("#x-gbp").onclick = () => setCur("GBP");
    amt.addEventListener("input", upd); upd();
    // Location follows the date unless picked by hand.
    let placeTouched = !isNew;
    s.querySelector("#x-place").addEventListener("change", () => { placeTouched = true; });
    s.querySelector("#x-date").addEventListener("change", ev => { if (!placeTouched && ev.target.value) { const p = placeOf(ev.target.value); s.querySelector("#x-place").value = p ? p.id : ""; } });
    s.querySelector("#f").addEventListener("submit", ev => {
      ev.preventDefault();
      const amount = parseFloat(amt.value.replace(/,/g, ""));
      if (!(amount > 0)) { $("f-err").textContent = "Enter an amount above zero."; return; }
      const date = s.querySelector("#x-date").value; if (!date) { $("f-err").textContent = "Pick a date."; return; }
      const r = rate();
      const v = { date, amount, currency: cur, rate: cur === "INR" ? r : null, gbp: Math.round((cur === "INR" ? amount / r : amount) * 100) / 100,
        category: s.querySelector("#x-cat").value, place: s.querySelector("#x-place").value, note: s.querySelector("#x-note").value.trim().slice(0, 140) };
      if (isNew) state.expenses.push({ id: uid(), created: Date.now(), ...v }); else Object.assign(e, v);
      closeSheet(); save(); render(); toast(isNew ? `Added ${gbp(v.gbp)}` : "Expense saved");
    });
    const del = s.querySelector("#f-del");
    if (del) del.onclick = () => { if (!del.classList.contains("armed")) { del.classList.add("armed"); del.textContent = "Tap again to delete"; return; }
      state.expenses = state.expenses.filter(x => x !== e); closeSheet(); save(); render(); toast("Expense deleted"); };
  });
}
/* Task */
function taskForm(t) {
  const isNew = !t; t = t || { title: "", category: "general", status: "todo", priority: "medium", due: "", place: "", ref: "", link: "", description: "", notes: "" };
  form({ title: isNew ? "Add to-do" : "Edit to-do", fields: [
    { k: "title", label: "Title", value: t.title, required: true },
    { k: "category", label: "Category", type: "select", options: opts(TASK_CATS, t.category), half: true }, { k: "priority", label: "Priority", type: "select", options: opts(PRIORITY, t.priority), half: true },
    { k: "status", label: "Status", type: "select", options: opts(TASK_STATUS, t.status), half: true }, { k: "due", label: "Due date", type: "date", value: t.due, half: true },
    { k: "place", label: "Destination", type: "select", options: placeOpts(t.place, "Not linked to a place") },
    { k: "ref", label: "Booking reference", value: t.ref, half: true }, { k: "link", label: "Link", type: "url", value: t.link, half: true, placeholder: "https://" },
    { k: "description", label: "Description", type: "textarea", value: t.description, rows: 2 }, { k: "notes", label: "Notes", type: "textarea", value: t.notes, rows: 2 },
  ], onSave: v => {
    if (v.link && !/^https?:\/\//i.test(v.link)) v.link = "https://" + v.link;
    if (isNew) state.tasks.push({ id: uid(), tripDate: "", ...v }); else Object.assign(t, v);
  }, onDelete: isNew ? null : () => { state.tasks = state.tasks.filter(x => x !== t); } });
  if (!isNew && t.link) $("f").insertAdjacentHTML("beforeend", `<a href="${esc(t.link)}" target="_blank" rel="noopener" class="small">Open link ↗</a>`);
}
/* Stay */
function stayForm(s, date) {
  const isNew = !s; s = s || { name: "", place: (placeOf(date || ui.date) || {}).id || "", checkIn: date || ui.date, checkOut: addDays(date || ui.date, 1), status: "tobook", ref: "", notes: "" };
  form({ title: isNew ? "Add a stay" : "Edit stay", fields: [
    { k: "name", label: "Accommodation", value: s.name, required: true },
    { k: "place", label: "Destination", type: "select", options: placeOpts(s.place) },
    { k: "checkIn", label: "Check-in", type: "date", value: s.checkIn, half: true, required: true }, { k: "checkOut", label: "Check-out", type: "date", value: s.checkOut, half: true, required: true },
    { k: "status", label: "Booking status", type: "select", options: opts(STAY_STATUS, s.status), half: true }, { k: "ref", label: "Booking reference", value: s.ref, half: true },
    { k: "notes", label: "Notes", type: "textarea", value: s.notes, rows: 2 },
  ], onSave: v => {
    if (v.checkOut <= v.checkIn) return "Check-out must be after check-in.";
    const clash = state.stays.find(x => x !== s && x.checkIn < v.checkOut && v.checkIn < x.checkOut);
    if (isNew) state.stays.push({ id: uid(), ...v }); else Object.assign(s, v);
    if (clash) setTimeout(() => toast(`Overlaps with ${clash.name}. Check the dates.`), 300);
  }, onDelete: isNew ? null : () => { state.stays = state.stays.filter(x => x !== s); } });
}
/* Day */
function dayForm(date) {
  const d = dayRec(date);
  form({ title: `Edit ${fmtDay(date)}`, fields: [
    { k: "place", label: "Destination", type: "select", options: placeOpts(d.place, "Not set") },
    { k: "title", label: "Title", value: d.title }, { k: "summary", label: "Summary", type: "textarea", value: d.summary, rows: 2 },
    { k: "travel", label: "Travel", type: "textarea", value: d.travel, rows: 2, hint: "Leave empty on days you're not moving." },
    { k: "weather", label: "Weather note", value: d.weather, placeholder: "Add from a forecast nearer the time" },
    { k: "permit", label: "Permissions reminder", type: "textarea", value: d.permit, rows: 2 },
  ], onSave: v => { Object.assign(d, v); } });
}
function filmForm(date) {
  const d = dayRec(date);
  form({ title: "Filming notes", fields: [
    { k: "ideas", label: "Locations & shot ideas", type: "textarea", value: d.film.ideas }, { k: "interviews", label: "Interview opportunities", type: "textarea", value: d.film.interviews, rows: 2 },
    { k: "themes", label: "Story themes", type: "textarea", value: d.film.themes, rows: 2 }, { k: "permit", label: "Permissions reminder", type: "textarea", value: d.permit, rows: 2 },
  ], onSave: v => { d.permit = v.permit; Object.assign(d.film, { ideas: v.ideas, interviews: v.interviews, themes: v.themes }); } });
}
function shotForm(s, date) {
  const isNew = !s; s = s || { date: date || ui.date, cat: "landscape", text: "" };
  form({ title: isNew ? "Add filming note" : "Edit shot", fields: [
    { k: "text", label: "Shot or note", type: "textarea", value: s.text, rows: 2, required: true },
    { k: "cat", label: "Shot type", type: "select", options: opts(SHOT_CATS, s.cat), half: true }, { k: "date", label: "Day", type: "select", options: dateOpts(s.date), half: true },
  ], saveLabel: isNew ? "Add to shot list" : "Save", onSave: v => { if (isNew) state.shots.push({ id: uid(), done: false, ...v }); else Object.assign(s, v); },
    onDelete: isNew ? null : () => { state.shots = state.shots.filter(x => x !== s); } });
}
function planForm() {
  const p = state.catBudgets || (state.catBudgets = {});
  form({ title: "Category budgets", fields: Object.entries(EXP_CATS).filter(([k]) => k !== "emergency").map(([k, c]) => ({ k, label: `${c.name} (£)`, type: "number", value: p[k] || "", half: true })),
    onSave: v => { Object.entries(v).forEach(([k, x]) => { const n = parseFloat(x); if (n > 0) p[k] = n; else delete p[k]; }); } });
  $("f").insertAdjacentHTML("afterbegin", `<div class="hint" style="margin-bottom:8px">Your own estimates. Leave a category empty if you don't want a target.</div>`);
}
function placeForm(id) {
  const p = placeById(id);
  form({ title: "Edit destination", fields: [{ k: "name", label: "Name", value: p.name, required: true }, { k: "notes", label: "Notes", type: "textarea", value: p.notes }],
    onSave: v => Object.assign(p, v) });
}
function quickAdd() {
  const d = inTrip(todayISO()) ? todayISO() : ui.date;
  openSheet(`<div class="sheet-h"><h2>Add</h2><button class="icon-btn" data-act="closeSheet" aria-label="Close">✕</button></div>
    <div class="choice-list">
      <button class="choice" data-act="addExpense">${icon("budget")}Expense</button>
      <button class="choice" data-act="addAct" data-date="${d}">${icon("itin")}Activity on ${fmtDay(d)}</button>
      <button class="choice" data-act="addTask">${icon("todo")}To-do</button>
      <button class="choice" data-act="addShot" data-date="${d}">${icon("camera")}Filming note</button>
    </div>`);
}

/* ---------- Settings, backup ---------- */
function settingsSheet() {
  const t = state.trip;
  form({ title: "Trip settings", saveLabel: "Save settings", fields: [
    { k: "title", label: "Trip name", value: t.title, required: true },
    { k: "start", label: "First day", type: "date", value: t.start, half: true, required: true }, { k: "end", label: "Last day", type: "date", value: t.end, half: true, required: true },
    { k: "budget", label: "Total budget (£)", type: "number", value: t.budget, half: true, required: true }, { k: "reserve", label: "Emergency reserve (£)", type: "number", value: t.reserve, half: true },
    { k: "includeReserve", label: "Include contingency in daily budget", type: "toggle", value: t.includeReserve },
    { k: "inrPerGbp", label: "Exchange rate (₹ per £1)", type: "number", value: t.inrPerGbp, hint: "Set by you. Saved expenses keep the rate they were entered with.", required: true },
    { k: "previewDate", label: "Preview as if today is", type: "date", value: state.settings.previewDate, hint: "Leave empty to use the real date." },
  ], onSave: v => {
    if (v.end < v.start) return "The last day must be after the first day.";
    const nb = parseFloat(v.budget), nr = parseFloat(v.reserve || "0"), rate = parseFloat(v.inrPerGbp);
    if (!(nb > 0) || nr < 0 || !(rate > 0)) return "Budget and exchange rate must be positive numbers.";
    Object.assign(t, { title: v.title, start: v.start, end: v.end, budget: nb, reserve: nr, includeReserve: v.includeReserve, inrPerGbp: rate });
    state.settings.previewDate = v.previewDate || "";
    toast("Settings saved");
  } });
  $("f").insertAdjacentHTML("beforeend", `<div class="card" style="box-shadow:none;margin-top:6px"><h2 style="font-family:var(--display);font-size:19px">Backup</h2>
    <div class="hint">Everything is saved on this device only. Nothing syncs between your phone and laptop. Export a backup now and then, and import it on another device to move your data.</div>
    <div class="btns"><button type="button" class="btn sec" data-act="exportJson">Export backup (JSON)</button><button type="button" class="btn sec" data-act="importJson">Import backup</button></div>
    <div class="btns"><button type="button" class="btn sec" data-act="csv">Export expenses (CSV)</button></div>
    <input type="file" id="import-file" accept="application/json,.json" hidden>
    <button type="button" class="btn danger" id="reset-btn">Reset to the original itinerary</button>
    <div class="hint">Reset clears all your edits, expenses, notes and ticks on this device.</div></div>`);
  $("import-file").addEventListener("change", importJson);
  const r = $("reset-btn");
  r.addEventListener("click", () => { if (!r.classList.contains("armed")) { r.classList.add("armed"); r.textContent = "Tap again to erase and reset"; return; }
    state = seedState(); state.meta.migratedOld = true; save(true); closeSheet(); render(); toast("Reset to the original itinerary"); });
}
function download(name, text, type) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
function exportJson() { download(`india-trip-backup-${realToday()}.json`, JSON.stringify(state, null, 2), "application/json"); toast("Backup downloaded"); }
function importJson(ev) {
  const file = ev.target.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const s = JSON.parse(r.result);
      if (!s || !s.trip || !s.days || !Array.isArray(s.activities) || !Array.isArray(s.tasks) || !Array.isArray(s.expenses)) throw new Error("shape");
      state = normalise(s); save(true); closeSheet(); render(); toast("Backup imported");
    } catch (e) { $("f-err").textContent = "That file isn't a backup from this app."; }
  };
  r.readAsText(file);
}
function exportCsv() {
  const q = v => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const rows = [["Date", "Trip day", "Location", "Category", "Note", "Amount", "Currency", "Rate (INR per GBP)", "GBP"]];
  [...state.expenses].sort((a, b) => a.date.localeCompare(b.date)).forEach(e => rows.push([e.date, inTrip(e.date) ? dayNum(e.date) : "", (placeById(e.place) || {}).name || "",
    (EXP_CATS[e.category] || EXP_CATS.misc).name, e.note, e.amount, e.currency, e.rate || "", (+e.gbp || 0).toFixed(2)]));
  download(`india-expenses-${realToday()}.csv`, rows.map(r => r.map(q).join(",")).join("\r\n") + "\r\n", "text/csv");
}
function normalise(s) {
  const base = seedState();
  ["stays", "activities", "shots", "tasks", "expenses", "places", "route"].forEach(k => { if (!Array.isArray(s[k])) s[k] = base[k]; });
  s.catBudgets = s.catBudgets || {}; s.settings = s.settings || { previewDate: "" }; s.meta = s.meta || { migratedOld: true };
  Object.values(s.days).forEach(d => { d.film = d.film || { ideas: "", interviews: "", themes: "" }; d.journal = d.journal || {}; });
  return s;
}

/* ---------- Events ---------- */
const actions = {
  go: el => go(el.dataset.view),
  itin: el => { ui.itin = el.dataset.mode; if (ui.itin === "week") ui.week = Math.floor(diffDays(state.trip.start, ui.date) / 7); render(); },
  dayStep: el => { const d = addDays(ui.date, +el.dataset.n); if (inTrip(d)) { ui.date = d; render(); } },
  weekStep: el => { ui.week += +el.dataset.n; render(); },
  openDay: el => { closeSheet(); go("itinerary", { itin: "day", date: el.dataset.date }); },
  toggleAct: el => { const a = state.activities.find(x => x.id === el.dataset.id); if (a) { a.done = !a.done; save(); render(); } },
  editAct: el => activityForm(state.activities.find(x => x.id === el.dataset.id)),
  addAct: el => { closeSheet(); activityForm(null, el.dataset.date); },
  addExpense: () => { closeSheet(); expenseForm(); },
  editExpense: el => expenseForm(state.expenses.find(x => x.id === el.dataset.id)),
  addTask: () => { closeSheet(); taskForm(); },
  editTask: el => taskForm(state.tasks.find(x => x.id === el.dataset.id)),
  toggleTask: el => { const t = state.tasks.find(x => x.id === el.dataset.id); if (t) { t.status = t.status === "done" ? "todo" : "done"; save(); render(); } },
  addShot: el => { closeSheet(); shotForm(null, el.dataset.date); },
  editShot: el => shotForm(state.shots.find(x => x.id === el.dataset.id)),
  toggleShot: el => { const s = state.shots.find(x => x.id === el.dataset.id); if (s) { s.done = !s.done; save(); render(); } },
  editDay: el => dayForm(el.dataset.date),
  editFilm: el => filmForm(el.dataset.date),
  editStay: el => stayForm(state.stays.find(x => x.id === el.dataset.id)),
  addStay: el => stayForm(null, el.dataset.date),
  todoMode: el => { ui.todo = el.dataset.mode; render(); },
  filter: el => { ui.filter = el.dataset.f; render(); },
  budTab: el => { ui.budgetTab = el.dataset.tab; render(); window.scrollTo(0, 0); },
  editPlan: () => planForm(),
  placeInfo: el => placeInfo(el.dataset.id),
  editPlace: el => { closeSheet(); placeForm(el.dataset.id); },
  closeSheet: () => closeSheet(),
  settings: () => settingsSheet(),
  exportJson: () => exportJson(),
  importJson: () => $("import-file").click(),
  csv: () => exportCsv(),
};
document.addEventListener("click", ev => {
  const el = ev.target.closest("[data-act]");
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (fn && el.dataset.act !== "toggleReserve") { ev.preventDefault(); fn(el); }
});
document.addEventListener("change", ev => {
  if (ev.target.id === "inc-res") { state.trip.includeReserve = ev.target.checked; save(); render(); }
});
// Journal and notes save as you type.
document.addEventListener("input", ev => {
  const el = ev.target;
  if (el.dataset.journal != null) { const d = dayRec(el.dataset.date); d.journal = d.journal || {}; d.journal["q" + el.dataset.journal] = el.value; save(); }
  else if (el.dataset.daynote) { dayRec(el.dataset.daynote).notes = el.value; save(); }
});
$("scrim").addEventListener("click", ev => { if (ev.target === $("scrim")) closeSheet(); });
document.addEventListener("keydown", ev => {
  if (ev.key === "Escape" && !$("scrim").hidden) closeSheet();
  if (ui.view === "itinerary" && ui.itin === "day" && $("scrim").hidden && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
    if (ev.key === "ArrowLeft") actions.dayStep({ dataset: { n: -1 } });
    if (ev.key === "ArrowRight") actions.dayStep({ dataset: { n: 1 } });
  }
});
// Swipe between days in Day view.
let touch = null;
$("main").addEventListener("touchstart", ev => { if (ui.view === "itinerary" && ui.itin === "day" && ev.touches.length === 1 && !ev.target.closest("textarea,input,#map")) touch = { x: ev.touches[0].clientX, y: ev.touches[0].clientY }; }, { passive: true });
$("main").addEventListener("touchend", ev => {
  if (!touch) return;
  const dx = ev.changedTouches[0].clientX - touch.x, dy = ev.changedTouches[0].clientY - touch.y; touch = null;
  if (Math.abs(dx) > 70 && Math.abs(dy) < 50) actions.dayStep({ dataset: { n: dx < 0 ? 1 : -1 } });
}, { passive: true });

let toastT;
function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2400); }

/* ---------- Boot ---------- */
function boot() {
  state = load();
  if (state) state = normalise(state); else state = seedState();
  migrateOldBudget();
  save(true);
  $("settings-btn").innerHTML = icon("gear");
  $("settings-btn").addEventListener("click", settingsSheet);
  $("fab").innerHTML = icon("plus");
  $("fab").addEventListener("click", quickAdd);
  const net = () => { $("offline").hidden = navigator.onLine; };
  addEventListener("online", net); addEventListener("offline", net); net();
  render();
  // Re-render at midnight so "today" moves on while the app stays open.
  setInterval(() => { if (render.lastDay !== todayISO()) { render.lastDay = todayISO(); if ($("scrim").hidden) render(); } }, 60000);
  render.lastDay = todayISO();
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
