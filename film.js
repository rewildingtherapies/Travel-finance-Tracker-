"use strict";
/* ============================================================
   Filming tab: daily shot lists, story, interviews, journal, footage.
   Uses the itinerary's dates, places and activities from app.js; data lives in state.film.
   ============================================================ */

const FILM_CATS = {
  establishing: { name: "Establishing", purpose: "Where are we?", tip: "establishing" },
  wide: { name: "Wide landscape", purpose: "Sense of place and scale", tip: "static" },
  medium: { name: "Medium observational", purpose: "What is happening?", tip: "observe" },
  detail: { name: "Close-up detail", purpose: "What does it feel like?", tip: "detail" },
  movement: { name: "Movement & travel", purpose: "Journey and momentum", tip: "walk" },
  pov: { name: "POV / immersive", purpose: "Puts the viewer in my seat", tip: "ride" },
  people: { name: "People & community", purpose: "Who is involved?", tip: "people" },
  interview: { name: "Interview", purpose: "Other voices and perspectives", tip: "conversation" },
  reflection: { name: "Personal reflection", purpose: "What does it mean?", tip: "reflection" },
  sound: { name: "Natural sound", purpose: "Atmosphere for the edit", tip: "sound" },
  transition: { name: "Transition", purpose: "How we leave and arrive", tip: "transition" },
  unexpected: { name: "Unexpected moment", purpose: "The moments a plan can't predict", tip: "unexpected" },
};
const CAMS = { x4: "Insta360 X4 Air", iphone: "iPhone", mic: "iPhone + external mic", either: "iPhone or X4 Air" };
const SHOT_PRI = { e: "Essential", n: "Nice to have", o: "Optional" };
const SHOT_STATUS = { planned: "Planned", captured: "Captured", missed: "Missed", na: "Not applicable" };
const THEMES = ["Nature & wellbeing", "Traditional ecological knowledge", "Community & belonging", "Healing practices", "Spirituality & consciousness",
  "Conservation & livelihoods", "Movement & the body", "Modern life & disconnection", "Awe & attention", "Humour & mishaps"];
const MOMENT_POS = { open: "Opening", early: "Early in a chapter", turn: "Turning point", link: "Link between chapters", close: "Closing", unsure: "Not sure yet" };
const REC_STATUS = { planned: "Planned", recorded: "Recorded", declined: "Declined", notneeded: "Not needed" };
const BACKUP = { card: "On camera/card", primary: "Copied to primary drive", verified: "Verified on backup drive", ready: "Ready for editing" };
const BACKUP_ORDER = ["card", "primary", "verified", "ready"];
const REEL_STATUS = { idea: "Idea", filmed: "Filmed", editing: "Editing", published: "Published" };
const CONSENT = [["cExplained", "Explained the project and where it may be shown"], ["cFilm", "Agreed to be filmed or recorded"], ["cPublish", "Agreed to public release (separate from filming)"],
  ["cName", "Agreed how they're named (real name or pseudonym)"], ["cWithdraw", "Knows they can withdraw"], ["cContact", "Contact details noted for follow-up"]];
const UNIVERSAL_QS = ["What surprised me today?", "Who did I meet, and what did I learn?", "What did I notice about my relationship with nature?",
  "What felt meaningful, challenging or uncomfortable?", "What story or question should I explore further?"];
const ETHICS = ["Check protected-area rules before filming in sanctuaries and reserves.", "Get consent before filming identifiable people; publishing needs separate permission.",
  "Respect sacred and private places. Ask, and accept no.", "Some community knowledge isn't for sharing. Let people decide what's shown.",
  "Never disturb wildlife for a shot.", "Don't film vulnerable people without appropriate consent.", "Never film secretly or record restricted activities."];
const AUDIO_CHECK = ["Check the microphone connection", "Check for wind noise", "Record a short test", "Listen back before starting", "Record a little room tone or ambient sound"];
const TIPS = {
  ride: { cam: "Insta360 X4 Air", capture: "Secure mount on the bike or helmet. Start recording before you set off and keep clips short on scenic stretches.", edit: "Reframe into forward, side and follow views in Insta360 Studio.", safety: "Never operate the camera while riding. Stop to change anything." },
  walk: { cam: "Insta360 X4 Air", capture: "Mix walking, following, revealing and stationary perspectives. A selfie stick gives a third-person view.", edit: "Immersive movement and continuity between scenes." },
  static: { cam: "iPhone or X4 Air on a steady surface", capture: "One static composition, 30–60 seconds. Don't move or talk; let the place unfold.", edit: "Transitions, breathing space and emotional pacing." },
  establishing: { cam: "iPhone (or X4 Air for a 360 wide)", capture: "Hold at least 10 seconds. Wide first, then a little tighter. Avoid fast pans.", edit: "Tells the viewer where we are." },
  observe: { cam: "iPhone", capture: "Watch before filming. Medium framing, let actions finish, don't direct people.", edit: "Shows what's happening without explaining it." },
  detail: { cam: "iPhone", capture: "Get close, hold steady 5–10 seconds, several angles, keep the natural sound.", edit: "Texture and feel; cutaways for any scene." },
  people: { cam: "iPhone", capture: "Ask first. Observe rather than direct. Medium shots, and let moments run.", edit: "Human scenes.", safety: "Consent to film is not consent to publish. Note both." },
  conversation: { cam: "iPhone", audio: "External microphone if compatible", capture: "Stable framing at eye level, audio checked, plenty of uninterrupted recording. Keep rolling a few seconds after they finish.", edit: "A human-centred documentary scene." },
  reflection: { cam: "iPhone + mic, or X4 Air on a stick", capture: "Quiet spot, eye level, talk to one person. Short and unscripted.", edit: "On-camera thread or voiceover." },
  sound: { cam: "iPhone + external mic", capture: "30–60 seconds of clean ambience. Stay still and quiet, note any wind.", edit: "Atmosphere beds and transitions." },
  transition: { cam: "Insta360 X4 Air", capture: "Leaving shots: walking away, doors closing, vehicles pulling off, light changing.", edit: "Bridges between places and chapters." },
  unexpected: { cam: "Whatever's in your hand", capture: "Keep a camera accessible. Don't stage it. Log it as a Story Moment straight after.", edit: "Humour, honesty and surprise: the film's texture." },
};
const GENERAL_TIP = "Pick one frame rate (for example 25 or 30 fps) and use it across both cameras. Most shots don't need the highest resolution; reliable, manageable files matter more.";

/* ---------- Data ---------- */
// Adds filming data to a saved trip without touching itinerary, budget or to-dos.
function filmEnsure(s) {
  if (s.film) return s;
  const F = window.FILM_SEED;
  const film = { v: 1, shots: [], reflections: [], moments: [], interviews: [], footage: [], reels: [], sequences: [], sounds: [], chapterNotes: {},
    placeStory: JSON.parse(JSON.stringify(F.places)), dayStory: JSON.parse(JSON.stringify(F.dayStory)), chapters: F.chapters.map(c => ({ ...c })) };
  const actFor = (date, link) => { if (!link) return null; const l = link.toLowerCase(); return (s.activities || []).find(a => a.date === date && a.title.toLowerCase().includes(l)) || null; };
  const story = date => film.dayStory[date] || film.placeStory[(s.days[date] || {}).place] || {};
  let ord = 0;
  F.shots.forEach(([date, title, cat, cam, pri, when, link, desc, tip]) => {
    const a = actFor(date, link);
    film.shots.push({ id: uid(), date, title, desc: desc || "", loc: a ? (a.loc || "") : "", when: when || "", cam, cat, purpose: FILM_CATS[cat].purpose, pri,
      status: "planned", notes: "", actId: a ? a.id : "", chapter: story(date).chapter || 3, ord: ord++, tip: tip || "" });
  });
  // Shots from the earlier, simpler shot list: drop untouched originals, keep anything the user added or ticked.
  const legacy = new Set(); Object.values((window.SEED || {}).days || {}).forEach(d => (d.film && d.film.shots || []).forEach(([, t]) => legacy.add(t)));
  const catMap = { establishing: "establishing", landscape: "wide", travel: "movement", people: "people", interview: "interview", sound: "sound", reflection: "reflection", broll: "detail" };
  (s.shots || []).forEach(o => {
    if (legacy.has(o.text) && !o.done) return;
    film.shots.push({ id: o.id || uid(), date: o.date, title: o.text, desc: "", loc: "", when: "", cam: "either", cat: catMap[o.cat] || "detail", purpose: FILM_CATS[catMap[o.cat] || "detail"].purpose,
      pri: "n", status: o.done ? "captured" : "planned", notes: "", actId: "", chapter: story(o.date).chapter || 3, ord: ord++, tip: "" });
  });
  s.shots = [];
  film.reels = F.reels.map(([place, title, hook, clips, vo, duration]) => ({ id: uid(), place, title, hook, clips: clips.join("\n"), vo, duration, status: "idea" }));
  film.sequences = F.sequences.map(q => ({ id: uid(), name: q.name, steps: [...q.steps] }));
  film.sounds = F.sounds.map(name => ({ id: uid(), name, done: false, date: "", place: "", notes: "" }));
  film.questionBank = [...F.questionBank];
  s.film = film;
  return s;
}
const F = () => state.film;
function storyFor(date) {
  const p = placeOf(date), f = F();
  return f.dayStory[date] || (p && f.placeStory[p.id]) || { theme: "", short: p ? p.name : "", chapter: 3, qs: [] };
}
const filmShotsFor = date => F().shots.filter(s => s.date === date).sort((a, b) => (a.ord || 0) - (b.ord || 0));
const actById = id => state.activities.find(a => a.id === id);
const chapterOpts = v => F().chapters.map(c => `<option value="${c.n}" ${+v === c.n ? "selected" : ""}>${c.n}. ${esc(c.title)}</option>`).join("");
const themeOpts = v => `<option value="">No theme</option>` + THEMES.map(t => `<option ${t === v ? "selected" : ""}>${esc(t)}</option>`).join("");
const filmDate = () => { if (!ui.filmDate || !inTrip(ui.filmDate)) ui.filmDate = inTrip(todayISO()) ? todayISO() : state.trip.start; return ui.filmDate; };
const isConsented = iv => iv.cFilm && iv.cPublish;
function consentChip(iv) {
  if (isConsented(iv)) return `<span class="chip st-booked">Consent to publish</span>`;
  if (iv.cFilm) return `<span class="chip st-tobook">Filming only</span>`;
  return `<span class="chip st-enquiry">No consent yet</span>`;
}
function backupLevel(entries) { return entries.reduce((m, e) => Math.min(m, BACKUP_ORDER.indexOf(e.backup)), 3); }
function progress() {
  const f = F(), today = todayISO();
  const filmedDays = new Set([...f.shots.filter(s => s.status === "captured").map(s => s.date), ...f.footage.map(e => e.date)].filter(d => d <= today && inTrip(d)));
  const notBacked = [...filmedDays].filter(d => { const e = f.footage.filter(x => x.date === d); return !e.length || backupLevel(e) < 2; });
  const themes = new Set([...f.reflections, ...f.moments, ...f.interviews].map(x => x.theme).filter(Boolean));
  return { days: filmedDays.size, captured: f.shots.filter(s => s.status === "captured").length, total: f.shots.length,
    interviews: f.interviews.filter(i => i.rec === "recorded").length, themes: themes.size, notBacked };
}

/* ---------- View ---------- */
const FILM_TABS = [["today", "Today"], ["shots", "Shots"], ["story", "Story"], ["interviews", "Interviews"], ["journal", "Journal"], ["footage", "Footage"]];
function viewFilming() {
  ui.film = ui.film || "today";
  const nav = `<div class="filters" role="group" aria-label="Filming sections" style="display:grid;grid-template-columns:repeat(3,1fr);overflow:visible">${FILM_TABS.map(([k, l]) => `<button data-act="filmTab" data-tab="${k}" aria-pressed="${ui.film === k}">${l}</button>`).join("")}</div>`;
  return nav + ({ today: filmToday, shots: filmShots, story: filmStory, interviews: filmInterviews, journal: filmJournal, footage: filmFootage }[ui.film] || filmToday)();
}
function dateNav() {
  const d = filmDate(), p = placeOf(d);
  return `<div class="daynav">
    <button class="icon-btn" data-act="filmStep" data-n="-1" ${d === state.trip.start ? "disabled style='opacity:.3'" : ""} aria-label="Previous day">${icon("left")}</button>
    <div class="mid"><div class="eyebrow">Day ${dayNum(d)}${d === todayISO() ? " · Today" : ""}</div><h2>${fmt(d, { day: "numeric", month: "long" })}${p ? ` — ${esc(p.name.split(" (")[0])}` : ""}</h2></div>
    <button class="icon-btn" data-act="filmStep" data-n="1" ${d === state.trip.end ? "disabled style='opacity:.3'" : ""} aria-label="Next day">${icon("right")}</button></div>`;
}
function shotRow(s, opts = {}) {
  const c = FILM_CATS[s.cat] || FILM_CATS.detail, a = actById(s.actId);
  const st = s.status === "captured" ? "on" : "";
  const mark = s.status === "missed" ? `<span class="chip st-enquiry">Missed</span>` : s.status === "na" ? `<span class="chip st-proposed">N/A</span>` : "";
  return `<div class="task ${s.status === "captured" ? "done" : ""}" ${opts.hl && s.actId === opts.hl ? 'style="background:var(--sand-2);border-radius:12px"' : ""}>
    <button class="check ${st}" data-act="shotCycle" data-id="${s.id}" aria-label="${s.status === "captured" ? "Mark not captured" : "Mark captured"}: ${esc(s.title)}">${icon("tick")}</button>
    <div style="display:grid;grid-template-columns:1fr auto;gap:6px;min-width:0">
      <button class="task-main" data-act="editFilmShot" data-id="${s.id}"><span class="task-title">${esc(s.title)}</span>
        <span class="task-meta">${s.pri === "e" ? `<span class="pri-high">Essential</span>` : s.pri === "o" ? `<span>Optional</span>` : ""}<span>${c.name}</span><span>${esc(CAMS[s.cam] || "")}</span>${s.when ? `<span>${esc(s.when)}</span>` : ""}${mark}</span>
        ${opts.showAct && a ? `<span class="task-meta">${icon("itin")} ${esc(a.title)}</span>` : ""}</button>
      ${opts.reorder ? `<span class="row" style="flex-wrap:nowrap;gap:2px"><button class="icon-btn" style="width:36px;height:36px" data-act="shotMove" data-id="${s.id}" data-n="-1" aria-label="Move up">↑</button><button class="icon-btn" style="width:36px;height:36px" data-act="shotMove" data-id="${s.id}" data-n="1" aria-label="Move down">↓</button></span>` : "<span></span>"}
    </div></div>`;
}

function filmToday() {
  const d = filmDate(), st = storyFor(d), all = filmShotsFor(d), f = F();
  const done = all.filter(s => s.status === "captured").length;
  const rank = { e: 0, n: 1, o: 2 };
  const top = all.filter(s => s.status === "planned").sort((a, b) => rank[a.pri] - rank[b.pri] || a.ord - b.ord).slice(0, 5);
  const ivs = f.interviews.filter(i => i.date === d);
  const dayIv = (state.days[d] && state.days[d].film && state.days[d].film.interviews) || "";
  const qs = st.qs && st.qs.length ? st.qs : UNIVERSAL_QS;
  const q = qs[(dayNum(d) - 1) % qs.length];
  const pr = progress();
  const permit = state.days[d] && state.days[d].permit;
  return `${dateNav()}
  <section class="hero">
    <div class="eyebrow">Today's story</div>
    <h2>${esc(st.short || "")}</h2>
    ${st.theme ? `<div class="sub">${esc(st.theme)}</div>` : ""}
    <div class="row" style="justify-content:space-between"><span class="sub small">${done} of ${all.length} shots captured</span><span class="sub small">Chapter ${st.chapter}: ${esc((f.chapters.find(c => c.n === st.chapter) || {}).title || "")}</span></div>
    <div class="hero-meter"><i style="width:${all.length ? done / all.length * 100 : 0}%"></i></div>
  </section>
  <button class="btn" data-act="addMoment" data-date="${d}" style="background:var(--sunset);color:#1e1208;min-height:56px;font-size:17px">Capture a story moment</button>
  <div class="quick">
    <button class="qa" data-act="addFilmShot" data-date="${d}">${icon("camera")}Shot</button>
    <button class="qa" data-act="addInterview" data-date="${d}">${icon("people")}Interview</button>
    <button class="qa" data-act="filmTab" data-tab="journal">${icon("note")}Reflection</button>
    <button class="qa" data-act="addFootage" data-date="${d}">${icon("admin")}Log footage</button>
  </div>
  ${permit ? `<div class="warn-box"><strong>Permissions:</strong> ${esc(permit)}</div>` : ""}
  <section class="card"><div class="card-h"><h2>Priority shots</h2><button class="link-btn" data-act="filmTab" data-tab="shots">All ${all.length}</button></div>
    <div>${top.length ? top.map(s => shotRow(s, { showAct: true })).join("") : `<div class="empty small">${all.length ? "Everything planned for today is captured or set aside." : "No shots planned. Add one, or just be here."}</div>`}</div></section>
  ${ivs.length || dayIv ? `<section class="card"><h2 style="font-family:var(--display);font-size:19px">Possible encounters</h2>
    ${dayIv ? `<div class="small">${esc(dayIv)}</div>` : ""}
    ${ivs.map(i => `<button class="stay" data-act="editInterview" data-id="${i.id}"><span><strong>${esc(i.name || "Unnamed")}</strong><div class="small muted">${esc(i.topic || i.role || "")}</div></span>${consentChip(i)}</button>`).join("")}</section>` : ""}
  <section class="card"><div class="eyebrow">Reflection</div><div style="font-family:var(--display);font-size:20px">${esc(q)}</div>
    <textarea id="r60" rows="3" placeholder="A few sentences is plenty." style="width:100%;background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:12px;font-size:16px"></textarea>
    <div class="btns"><button class="btn sec" data-act="saveR60" data-q="${esc(q)}" data-date="${d}">Save reflection</button></div></section>
  <section class="card"><h2 style="font-family:var(--display);font-size:19px">Documentary so far</h2>
    <div class="grid2">
      <div class="stat"><div class="k">Filming days</div><div class="v">${pr.days}</div></div>
      <div class="stat"><div class="k">Shots captured</div><div class="v">${pr.captured}</div><div class="s">of ${pr.total} planned</div></div>
      <div class="stat"><div class="k">Interviews recorded</div><div class="v">${pr.interviews}</div></div>
      <div class="stat"><div class="k">Themes explored</div><div class="v">${pr.themes}</div><div class="s">from tagged notes</div></div>
    </div>
    ${pr.notBacked.length ? `<button class="warn-box" data-act="filmTab" data-tab="footage" style="border:0;text-align:left">${plural(pr.notBacked.length, "filming day")} not yet verified on a backup drive. Log and confirm backups in Footage.</button>` : `<div class="small muted">Back up and verify footage before each move.</div>`}
  </section>
  <section class="card"><details class="fold"><summary>Filming ethics</summary><ul style="margin:10px 0 0;padding-left:20px;display:flex;flex-direction:column;gap:6px">${ETHICS.map(e => `<li>${esc(e)}</li>`).join("")}</ul></details></section>`;
}

function filmShots() {
  const d = filmDate(), st = storyFor(d), list = filmShotsFor(d);
  let shown = list, banner = "";
  if (ui.filmAct) {
    const a = actById(ui.filmAct);
    if (a && a.date === d) { shown = list.filter(s => s.actId === a.id); banner = `<div class="note-box row" style="justify-content:space-between"><span>Shots for <strong>${esc(a.title)}</strong></span><button class="link-btn" data-act="filmActClear">Show all</button></div>`; }
    else ui.filmAct = "";
  }
  const sig = list.some(s => s.cat === "sound");
  return `${dateNav()}
  <div class="small muted">${esc(st.theme || "")}</div>
  <div class="btns"><button class="btn" data-act="addFilmShot" data-date="${d}">+ Shot</button><button class="btn sec" data-act="buildSeq" data-date="${d}">Build a sequence</button></div>
  ${banner}
  <section class="card"><div class="card-h"><h2>Shot list</h2><button class="link-btn" data-act="toggleReorder">${ui.reorder ? "Done" : "Reorder"}</button></div>
    <div>${shown.length ? shown.map(s => shotRow(s, { showAct: true, reorder: ui.reorder && !ui.filmAct })).join("") : `<div class="empty small">No shots for this ${ui.filmAct ? "activity" : "day"} yet.</div>`}</div>
    <div class="hint">Tap the box when captured. Open a shot to mark it missed or not applicable, see how to film it, or link it to an activity.</div></section>
  <section class="card"><div class="card-h"><h2>Sound</h2><button class="link-btn" data-act="soundLib">Sound library</button></div>
    <div class="small">${sig ? "There's a sound shot planned today. " : ""}At significant places, record 30–60 seconds of clean natural ambience where it's allowed.</div></section>
  <div class="small muted">${esc(GENERAL_TIP)}</div>`;
}

function chapterStats(n) {
  const f = F();
  const shots = f.shots.filter(s => +s.chapter === n && s.status === "captured").length;
  const ivs = f.interviews.filter(i => +i.chapter === n && i.rec === "recorded").length;
  const refl = f.reflections.filter(r => +r.chapter === n).length;
  const mom = f.moments.filter(m => +m.chapter === n).length;
  const total = shots + ivs * 3 + refl + mom * 2;
  const level = total >= 20 ? ["Plenty to review", "st-booked"] : total >= 6 ? ["Building", "st-tobook"] : ["Needs material", "st-enquiry"];
  return { shots, ivs, refl, mom, level };
}
function filmStory() {
  const f = F();
  const moments = [...f.moments].sort((a, b) => b.date.localeCompare(a.date) || (b.created || 0) - (a.created || 0));
  return `<button class="btn" data-act="addMoment" style="background:var(--sunset);color:#1e1208;min-height:56px;font-size:17px">Capture a story moment</button>
  <section class="card"><h2 style="font-family:var(--display);font-size:20px">Chapters</h2>
    <div class="hint">A rough shape for a 60-minute film, not a script. Counts show material, not quality: review the footage before you decide a chapter works.</div>
    <div style="display:flex;flex-direction:column;gap:8px">${f.chapters.map(c => { const s = chapterStats(c.n);
      return `<button class="stay" data-act="chapter" data-n="${c.n}"><span><strong>${c.n}. ${esc(c.title)}</strong><div class="small muted">${esc(c.sub)}</div>
        <div class="small muted">${plural(s.shots, "shot")} · ${plural(s.ivs, "interview")} · ${plural(s.refl, "reflection")} · ${plural(s.mom, "moment")}</div></span><span class="chip ${s.level[1]}">${s.level[0]}</span></button>`; }).join("")}</div></section>
  <section class="card"><div class="card-h"><h2>Story moments</h2><button class="link-btn" data-act="addMoment">+ Add</button></div>
    ${moments.length ? `<div>${moments.map(m => `<button class="stay" data-act="editMoment" data-id="${m.id}"><span><strong>${esc(m.title)}</strong><div class="small muted">${fmtShort(m.date)}${m.place && placeById(m.place) ? " · " + esc(placeById(m.place).name) : ""}${m.theme ? " · " + esc(m.theme) : ""}</div>${m.what ? `<div class="small">${esc(m.what.slice(0, 140))}</div>` : ""}</span><span class="chip st-proposed">${esc(MOMENT_POS[m.position] || "")}</span></button>`).join("")}</div>`
      : `<div class="small muted">The unplanned conversation, the mishap, the moment something didn't fit your expectations. These are what stop the film becoming a list of sights.</div>`}</section>
  <section class="card"><div class="card-h"><h2>Reels</h2><button class="link-btn" data-act="addReel">+ Idea</button></div>
    <div class="hint">Optional. Let reels come out of footage you're already shooting for the film.</div>
    <div>${f.reels.map(r => `<button class="stay" data-act="editReel" data-id="${r.id}"><span><strong>${esc(r.title)}</strong><div class="small muted">${esc((placeById(r.place) || {}).name || "")} · ~${esc(r.duration)}s · Hook: “${esc(r.hook)}”</div></span><span class="chip ${r.status === "published" ? "st-booked" : r.status === "idea" ? "st-proposed" : "st-tobook"}">${REEL_STATUS[r.status]}</span></button>`).join("")}</div></section>`;
}

function filmInterviews() {
  const f = F(), list = [...f.interviews].sort((a, b) => (a.date || "9").localeCompare(b.date || "9"));
  return `<div class="btns"><button class="btn" data-act="addInterview">+ Interview</button></div>
  <section class="card"><h2 style="font-family:var(--display);font-size:20px">Interviews</h2>
    ${list.length ? `<div>${list.map(i => `<button class="stay" data-act="editInterview" data-id="${i.id}"><span><strong>${esc(i.name || "Unnamed")}</strong>
      <div class="small muted">${[i.role, i.date ? fmtShort(i.date) : "", (placeById(i.place) || {}).name].filter(Boolean).map(esc).join(" · ")}</div>
      <div class="small muted">${REC_STATUS[i.rec] || ""}${i.topic ? " · " + esc(i.topic) : ""}</div></span>${consentChip(i)}</button>`).join("")}</div>`
      : `<div class="small muted">Plan conversations here: who, where, what you're curious about, and consent.</div>`}</section>
  <section class="card"><details class="fold"><summary>Question bank</summary><div style="margin-top:10px;display:flex;flex-direction:column;gap:8px">
    ${f.questionBank.map(q => `<div class="small">“${esc(q)}”</div>`).join("")}
    <div class="hint">Use these as openings, not a script. Follow what's interesting: “Can you say more?” “What happened next?” “Can you show me?”</div></div></details></section>
  <section class="card"><details class="fold"><summary>Themes to listen for</summary><div class="legend" style="margin-top:10px">${THEMES.slice(0, 8).map(t => `<span class="chip st-proposed">${esc(t)}</span>`).join("")}</div></details></section>
  <section class="card"><details class="fold"><summary>Consent checklist</summary><ul style="margin:10px 0 0;padding-left:20px;display:flex;flex-direction:column;gap:6px">${CONSENT.map(([, l]) => `<li>${esc(l)}</li>`).join("")}</ul>
    <div class="hint" style="margin-top:8px">An informal chat is not permission to publish someone's image or words.</div></details></section>
  <section class="card"><details class="fold"><summary>Audio check before recording</summary><ul style="margin:10px 0 0;padding-left:20px;display:flex;flex-direction:column;gap:6px">${AUDIO_CHECK.map(a => `<li>${esc(a)}</li>`).join("")}</ul></details></section>`;
}

function filmJournal() {
  const d = filmDate(), st = storyFor(d), f = F(), dr = dayRec(d);
  ui.r60i = ui.r60i || 0;
  const pool = [...(st.qs || []), ...UNIVERSAL_QS];
  const q = pool[ui.r60i % pool.length];
  const list = [...f.reflections].filter(r => !ui.voOnly || r.vo).sort((a, b) => b.date.localeCompare(a.date) || (b.created || 0) - (a.created || 0));
  return `${dateNav()}
  <section class="card"><div class="card-h"><div class="eyebrow">60-second reflection</div><button class="link-btn" data-act="r60next">Another question</button></div>
    <div style="font-family:var(--display);font-size:21px">${esc(q)}</div>
    <textarea id="r60" rows="4" placeholder="Type, or paste a voice-note transcript." style="width:100%;background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:12px;font-size:16px"></textarea>
    <div class="btns"><button class="btn" data-act="saveR60" data-q="${esc(q)}" data-date="${d}">Save</button><button class="btn sec" data-act="addReflection" data-date="${d}">Spontaneous thought</button></div></section>
  ${st.qs && st.qs.length ? `<section class="card"><div class="eyebrow">Questions for ${esc((placeOf(d) || {}).name || "this place")}</div>${st.qs.map((x, i) => `<button class="link-btn" style="text-align:left;color:var(--ink);font-weight:500" data-act="r60pick" data-i="${i}">“${esc(x)}”</button>`).join("")}</section>` : ""}
  <section class="card"><details class="fold" ${UNIVERSAL_QS.some((_, i) => dr.journal && dr.journal["q" + i]) ? "open" : ""}><summary>Daily questions</summary>
    <div style="display:flex;flex-direction:column;gap:14px;margin-top:12px">
      ${UNIVERSAL_QS.map((x, i) => `<div class="q field"><label for="fj${i}">${i + 1}. ${esc(x)}</label><textarea id="fj${i}" data-journal="${i}" data-date="${d}" rows="2">${esc((dr.journal || {})["q" + i] || "")}</textarea></div>`).join("")}
      <div class="hint">Optional, never required. Saves as you type, and also shows in the Itinerary day view.</div></div></details></section>
  <section class="card"><div class="card-h"><h2>Reflections</h2><button class="link-btn" data-act="voOnly">${ui.voOnly ? "Show all" : "Voiceover only"}</button></div>
    ${list.length ? `<div>${list.map(r => `<button class="stay" data-act="editReflection" data-id="${r.id}"><span>${r.q ? `<div class="small muted">${esc(r.q)}</div>` : ""}<div style="overflow-wrap:anywhere">${esc(r.text.slice(0, 220))}${r.text.length > 220 ? "…" : ""}</div>
      <div class="small muted">${fmtShort(r.date)}${r.theme ? " · " + esc(r.theme) : ""}</div></span>${r.vo ? `<span class="chip st-booked">Voiceover</span>` : "<span></span>"}</button>`).join("")}</div>`
      : `<div class="small muted">${ui.voOnly ? "Nothing marked for voiceover yet." : "Nothing yet. One honest sentence is a good start."}</div>`}</section>`;
}

function filmFootage() {
  const f = F(), list = [...f.footage].sort((a, b) => b.date.localeCompare(a.date));
  const counts = BACKUP_ORDER.map(k => [k, f.footage.filter(e => e.backup === k).length]);
  const pr = progress();
  return `<div class="btns"><button class="btn" data-act="addFootage">+ Log footage</button></div>
  ${pr.notBacked.length ? `<div class="warn-box">Not yet verified on a backup drive: ${pr.notBacked.map(fmtShort).join(", ")}.</div>` : ""}
  <section class="card"><h2 style="font-family:var(--display);font-size:20px">Backups</h2>
    <div class="grid2">${counts.map(([k, n]) => `<div class="stat"><div class="k">${BACKUP[k]}</div><div class="v">${n}</div></div>`).join("")}</div>
    <div class="hint">Nothing is marked as backed up unless you confirm it. Workflow: card → MacBook → verified backup → Insta360 Studio reframe → DaVinci Resolve.</div></section>
  <section class="card"><h2 style="font-family:var(--display);font-size:20px">Footage log</h2>
    ${list.length ? `<div>${list.map(e => `<button class="stay" data-act="editFootage" data-id="${e.id}"><span><strong>${esc(e.desc || "Footage")}</strong>
      <div class="small muted">${fmtShort(e.date)} · ${esc(CAMS[e.cam] || "")}${e.ref ? " · " + esc(e.ref) : ""}${e.reviewed ? " · Reviewed" : ""}</div>${e.best ? `<div class="small">Best: ${esc(e.best)}</div>` : ""}</span>
      <span class="chip ${BACKUP_ORDER.indexOf(e.backup) >= 2 ? "st-booked" : "st-tobook"}">${BACKUP[e.backup]}</span></button>`).join("")}</div>`
      : `<div class="small muted">Log each card or batch of files: what's on it and where it's backed up. The app never stores video.</div>`}</section>
  <section class="card"><h2 style="font-family:var(--display);font-size:20px">Export</h2>
    <div class="btns"><button class="btn sec" data-act="filmJson">All filming data (JSON)</button></div>
    <div class="btns"><button class="btn sec" data-act="filmCsv" data-kind="shots">Shot list (CSV)</button><button class="btn sec" data-act="filmCsv" data-kind="footage">Footage log (CSV)</button></div>
    <div class="btns"><button class="btn sec" data-act="filmCsv" data-kind="notes">Reflections & moments (CSV)</button></div></section>`;
}

/* ---------- Forms ---------- */
function filmShotForm(s, date) {
  const isNew = !s;
  s = s || { date: date || filmDate(), title: "", desc: "", loc: "", when: "", cam: "iphone", cat: "medium", purpose: "", pri: "n", status: "planned", notes: "", actId: ui.filmAct || "", chapter: storyFor(date || filmDate()).chapter };
  const acts = actsFor(s.date);
  const tip = TIPS[s.tip || (FILM_CATS[s.cat] || {}).tip] || null;
  const a = actById(s.actId), p = placeOf(s.date);
  form({ title: isNew ? "Add shot" : "Edit shot", fields: [
    { k: "title", label: "Shot", value: s.title, required: true },
    { k: "desc", label: "Description", type: "textarea", value: s.desc, rows: 2 },
    { k: "cat", label: "Shot type", type: "select", options: opts(Object.fromEntries(Object.entries(FILM_CATS).map(([k, v]) => [k, v.name])), s.cat), half: true },
    { k: "cam", label: "Camera", type: "select", options: opts(CAMS, s.cam), half: true },
    { k: "pri", label: "Priority", type: "select", options: opts(SHOT_PRI, s.pri), half: true }, { k: "status", label: "Status", type: "select", options: opts(SHOT_STATUS, s.status), half: true },
    { k: "when", label: "Time of day", value: s.when, half: true, placeholder: "e.g. Sunrise" }, { k: "loc", label: "Location", value: s.loc, half: true, placeholder: p ? p.name : "" },
    { k: "date", label: "Day", type: "select", options: dateOpts(s.date), half: true }, { k: "chapter", label: "Chapter", type: "select", options: chapterOpts(s.chapter), half: true },
    { k: "actId", label: "Linked activity", type: "select", options: `<option value="">None</option>` + acts.map(x => `<option value="${x.id}" ${x.id === s.actId ? "selected" : ""}>${esc((x.time || x.label || "") + " " + x.title)}</option>`).join(""), hint: "Activities on this shot's day. Change the day and save first to link one on another day." },
    { k: "purpose", label: "Storytelling purpose", value: s.purpose, placeholder: (FILM_CATS[s.cat] || {}).purpose },
    { k: "notes", label: "Notes", type: "textarea", value: s.notes, rows: 2 },
  ], onSave: v => {
    v.chapter = +v.chapter;
    if (v.date !== s.date && v.actId && (actById(v.actId) || {}).date !== v.date) v.actId = "";
    if (!v.purpose) v.purpose = (FILM_CATS[v.cat] || {}).purpose || "";
    if (isNew) F().shots.push({ id: uid(), ord: Date.now(), tip: "", ...v }); else Object.assign(s, v);
    toast(isNew ? "Shot added" : "Shot saved");
  }, onDelete: isNew ? null : () => { F().shots = F().shots.filter(x => x !== s); } });
  const extra = [];
  if (a || p) extra.push(`<div class="note-box">${a ? `${icon("itin")} <strong>${esc(a.title)}</strong> · ${esc([a.time || a.label, a.loc].filter(Boolean).join(" · "))}<br>` : ""}${p ? `${icon("pin")} ${esc(p.name)} · ${fmtDay(s.date)}` : ""}
    <div><button type="button" class="link-btn" data-act="openDay" data-date="${s.date}">Open in itinerary</button></div></div>`);
  if (tip) extra.push(`<details class="fold card" style="box-shadow:none"><summary style="font-size:17px">How to capture</summary><dl class="kv" style="margin-top:10px">
    <dt>Camera</dt><dd>${esc(tip.cam)}</dd>${tip.audio ? `<dt>Audio</dt><dd>${esc(tip.audio)}</dd>` : ""}<dt>Capture</dt><dd>${esc(tip.capture)}</dd><dt>In the edit</dt><dd>${esc(tip.edit)}</dd>${tip.safety ? `<dt>Safety</dt><dd>${esc(tip.safety)}</dd>` : ""}</dl></details>`);
  $("f").querySelector(".field").insertAdjacentHTML("beforebegin", extra.join(""));
}
function momentForm(m, date) {
  const isNew = !m, d = date || filmDate();
  m = m || { date: inTrip(todayISO()) ? todayISO() : d, place: "", title: "", what: "", why: "", footage: "", theme: "", chapter: "", position: "unsure" };
  if (isNew) { m.place = (placeOf(m.date) || {}).id || ""; m.chapter = storyFor(m.date).chapter; }
  form({ title: isNew ? "Story moment" : "Edit story moment", saveLabel: isNew ? "Save moment" : "Save", fields: [
    { k: "title", label: "Short title", value: m.title, required: true, placeholder: "e.g. The chai seller who laughed at my helmet" },
    { k: "what", label: "What happened", type: "textarea", value: m.what, rows: 3 },
    { k: "why", label: "Why it matters", type: "textarea", value: m.why, rows: 2 },
    { k: "date", label: "Date", type: "select", options: dateOpts(m.date), half: true }, { k: "place", label: "Location", type: "select", options: placeOpts(m.place, "Not set"), half: true },
    { k: "footage", label: "Related footage or filename", value: m.footage, placeholder: "e.g. VID_20261216_1432, card 2" },
    { k: "theme", label: "Story theme", type: "select", options: themeOpts(m.theme), half: true }, { k: "chapter", label: "Chapter", type: "select", options: chapterOpts(m.chapter), half: true },
    { k: "position", label: "Possible place in the film", type: "select", options: opts(MOMENT_POS, m.position) },
  ], onSave: v => { v.chapter = +v.chapter; if (isNew) F().moments.push({ id: uid(), created: Date.now(), ...v }); else Object.assign(m, v); toast(isNew ? "Moment saved" : "Saved"); },
    onDelete: isNew ? null : () => { F().moments = F().moments.filter(x => x !== m); } });
}
function reflectionForm(r, date) {
  const isNew = !r, d = date || filmDate();
  r = r || { date: d, q: "", text: "", vo: false, theme: "", chapter: storyFor(d).chapter };
  form({ title: isNew ? "Spontaneous thought" : "Edit reflection", fields: [
    { k: "q", label: "Question (optional)", value: r.q },
    { k: "text", label: "Reflection", type: "textarea", value: r.text, rows: 5, required: true, hint: "Type, or paste a voice-note transcript." },
    { k: "date", label: "Date", type: "select", options: dateOpts(r.date), half: true }, { k: "theme", label: "Story theme", type: "select", options: themeOpts(r.theme), half: true },
    { k: "chapter", label: "Chapter", type: "select", options: chapterOpts(r.chapter) },
    { k: "vo", label: "Useful for voiceover", type: "toggle", value: r.vo },
  ], onSave: v => { v.chapter = +v.chapter; if (isNew) F().reflections.push({ id: uid(), created: Date.now(), place: (placeOf(v.date) || {}).id || "", ...v }); else Object.assign(r, v, { place: (placeOf(v.date) || {}).id || "" }); },
    onDelete: isNew ? null : () => { F().reflections = F().reflections.filter(x => x !== r); } });
}
function interviewForm(iv, date) {
  const isNew = !iv, d = date || "";
  iv = iv || { name: "", role: "", place: d ? (placeOf(d) || {}).id || "" : "", date: d, topic: "", questions: "", rec: "planned", notes: "", followups: "", insights: "", relevance: "", theme: "", chapter: d ? storyFor(d).chapter : 4 };
  form({ title: isNew ? "Add interview" : "Edit interview", fields: [
    { k: "name", label: "Name or pseudonym", value: iv.name, required: true }, { k: "role", label: "Role and organisation", value: iv.role },
    { k: "date", label: "Proposed date", type: "date", value: iv.date, half: true }, { k: "place", label: "Location", type: "select", options: placeOpts(iv.place, "Not set"), half: true },
    { k: "topic", label: "Topic", value: iv.topic },
    { k: "questions", label: "Questions", type: "textarea", value: iv.questions, rows: 4, hint: "Openings, not a script. Add from the bank below." },
    { k: "rec", label: "Recording status", type: "select", options: opts(REC_STATUS, iv.rec), half: true }, { k: "theme", label: "Theme", type: "select", options: themeOpts(iv.theme), half: true },
    ...CONSENT.map(([k, l]) => ({ k, label: l, type: "toggle", value: !!iv[k] })),
    { k: "followups", label: "Follow-up questions", type: "textarea", value: iv.followups, rows: 2 },
    { k: "insights", label: "Memorable insights", type: "textarea", value: iv.insights, rows: 2 },
    { k: "relevance", label: "Relevance to the documentary", type: "textarea", value: iv.relevance, rows: 2 },
    { k: "chapter", label: "Chapter", type: "select", options: chapterOpts(iv.chapter) },
    { k: "notes", label: "Notes", type: "textarea", value: iv.notes, rows: 2 },
  ], onSave: v => { v.chapter = +v.chapter; if (isNew) F().interviews.push({ id: uid(), ...v }); else Object.assign(iv, v); },
    onDelete: isNew ? null : () => { F().interviews = F().interviews.filter(x => x !== iv); } });
  const qf = $("f_questions");
  qf.closest(".field").insertAdjacentHTML("beforeend", `<select id="qbank" aria-label="Add a question from the bank"><option value="">+ Add from question bank</option>${F().questionBank.map((q, i) => `<option value="${i}">${esc(q)}</option>`).join("")}</select>`);
  $("qbank").addEventListener("change", ev => { const q = F().questionBank[+ev.target.value]; if (q) qf.value = (qf.value ? qf.value.replace(/\s*$/, "\n") : "") + "• " + q; ev.target.value = ""; });
  $("f_cExplained").closest(".toggle-row").insertAdjacentHTML("beforebegin", `<div class="eyebrow" style="margin-top:4px">Consent</div><div class="hint">Filming permission and permission to publish are separate. Don't treat a chat as consent.</div>`);
}
function footageForm(e, date) {
  const isNew = !e, d = date || (inTrip(todayISO()) ? todayISO() : filmDate());
  e = e || { date: d, place: (placeOf(d) || {}).id || "", cam: "x4", ref: "", desc: "", best: "", audio: "", backup: "card", reviewed: false, useDoc: true, useReels: false };
  form({ title: isNew ? "Log footage" : "Edit footage", fields: [
    { k: "desc", label: "Description", value: e.desc, required: true, placeholder: "e.g. Canoe trip, morning" },
    { k: "date", label: "Date", type: "select", options: dateOpts(e.date), half: true }, { k: "place", label: "Location", type: "select", options: placeOpts(e.place, "Not set"), half: true },
    { k: "cam", label: "Camera", type: "select", options: opts(CAMS, e.cam), half: true }, { k: "ref", label: "Card or file reference", value: e.ref, half: true, placeholder: "e.g. SD2, VID_0045–0061" },
    { k: "best", label: "Best moments", type: "textarea", value: e.best, rows: 2 }, { k: "audio", label: "Audio quality notes", value: e.audio },
    { k: "backup", label: "Backup status", type: "select", options: opts(BACKUP, e.backup), hint: "Only move this on once you've actually checked the copy." },
    { k: "reviewed", label: "Footage reviewed", type: "toggle", value: e.reviewed },
    { k: "useDoc", label: "Useful for the documentary", type: "toggle", value: e.useDoc }, { k: "useReels", label: "Useful for Reels", type: "toggle", value: e.useReels },
  ], onSave: v => { if (isNew) F().footage.push({ id: uid(), ...v }); else Object.assign(e, v); toast(isNew ? "Footage logged" : "Saved"); },
    onDelete: isNew ? null : () => { F().footage = F().footage.filter(x => x !== e); } });
}
function reelForm(r) {
  const isNew = !r; r = r || { place: (placeOf(filmDate()) || {}).id || "", title: "", hook: "", clips: "", vo: "", duration: 45, status: "idea" };
  form({ title: isNew ? "Reel idea" : "Edit reel", fields: [
    { k: "title", label: "Idea", value: r.title, required: true }, { k: "hook", label: "Hook (first line or image)", value: r.hook },
    { k: "clips", label: "Clips (3–6, one per line)", type: "textarea", value: r.clips, rows: 4 }, { k: "vo", label: "Voiceover angle (optional)", value: r.vo },
    { k: "place", label: "Location", type: "select", options: placeOpts(r.place, "Any"), half: true }, { k: "duration", label: "Length (seconds)", type: "number", value: r.duration, half: true },
    { k: "status", label: "Status", type: "select", options: opts(REEL_STATUS, r.status) },
  ], onSave: v => { v.duration = Math.min(90, Math.max(5, parseInt(v.duration, 10) || 45)); if (isNew) F().reels.push({ id: uid(), ...v }); else Object.assign(r, v); },
    onDelete: isNew ? null : () => { F().reels = F().reels.filter(x => x !== r); } });
}
function chapterSheet(n) {
  const c = F().chapters.find(x => x.n === n), f = F(), s = chapterStats(n);
  const shots = f.shots.filter(x => +x.chapter === n && x.status === "captured");
  const ivs = f.interviews.filter(x => +x.chapter === n), refl = f.reflections.filter(x => +x.chapter === n), mom = f.moments.filter(x => +x.chapter === n);
  const line = (t, act, id) => `<button class="link-btn" style="text-align:left;color:var(--ink);font-weight:500;padding:4px 0" data-act="${act}" data-id="${id}">${esc(t)}</button>`;
  openSheet(`<div class="sheet-h"><h2>${n}. ${esc(c.title)}</h2><button class="icon-btn" data-act="closeSheet" aria-label="Close">✕</button></div>
    <div class="muted">${esc(c.sub)}</div><div><span class="chip ${s.level[1]}">${s.level[0]}</span></div>
    <div class="field"><label for="ch-notes">Chapter notes</label><textarea id="ch-notes" rows="4" placeholder="What's this chapter about? What's missing?">${esc(f.chapterNotes[n] || "")}</textarea></div>
    <div><div class="eyebrow">Captured shots (${shots.length})</div>${shots.slice(0, 30).map(x => line(`${fmtShort(x.date)} · ${x.title}`, "editFilmShot", x.id)).join("<br>") || `<div class="small muted">None yet.</div>`}</div>
    <div><div class="eyebrow">Interviews (${ivs.length})</div>${ivs.map(x => line(x.name, "editInterview", x.id)).join("<br>") || `<div class="small muted">None yet.</div>`}</div>
    <div><div class="eyebrow">Reflections (${refl.length})</div>${refl.map(x => line(`${fmtShort(x.date)} · ${x.text.slice(0, 60)}`, "editReflection", x.id)).join("<br>") || `<div class="small muted">None yet.</div>`}</div>
    <div><div class="eyebrow">Story moments (${mom.length})</div>${mom.map(x => line(x.title, "editMoment", x.id)).join("<br>") || `<div class="small muted">None yet.</div>`}</div>
    <div class="hint">Assign items to this chapter from their own edit screens.</div>`,
    sheet => { const t = sheet.querySelector("#ch-notes"); t.addEventListener("input", () => { f.chapterNotes[n] = t.value; save(); }); });
}
function seqBuilder(date) {
  const f = F();
  let d = date || filmDate();
  const seqOpts = () => f.sequences.map((q, i) => `<option value="${i}">${esc(q.name)}</option>`).join("");
  const actOpts = dd => `<option value="">No activity</option>` + actsFor(dd).map(a => `<option value="${a.id}">${esc((a.time || a.label || "") + " " + a.title)}</option>`).join("");
  openSheet(`<div class="sheet-h"><h2>Build a sequence</h2><button class="icon-btn" data-act="closeSheet" aria-label="Close">✕</button></div>
    <div class="hint">Plan sequences, not isolated shots: where are we, what's happening, who's involved, what it feels like, what changes, what it means, how we leave.</div>
    <div class="field"><label for="sq-t">Type of experience</label><select id="sq-t">${seqOpts()}</select></div>
    <div class="fields2"><div class="field"><label for="sq-d">Day</label><select id="sq-d">${dateOpts(d)}</select></div>
      <div class="field"><label for="sq-a">Activity</label><select id="sq-a">${actOpts(d)}</select></div></div>
    <div id="sq-steps"></div>
    <div class="btns"><button class="btn" id="sq-add">Add to shot list</button><button class="btn sec" data-act="editSeqs">Edit templates</button></div>`, s => {
    const steps = () => { const q = f.sequences[+s.querySelector("#sq-t").value]; s.querySelector("#sq-steps").innerHTML = q ? `<ol style="margin:0;padding-left:22px;display:flex;flex-direction:column;gap:4px">${q.steps.map(x => `<li>${esc(x)}</li>`).join("")}</ol>` : ""; };
    s.querySelector("#sq-t").addEventListener("change", steps);
    s.querySelector("#sq-d").addEventListener("change", ev => { d = ev.target.value; s.querySelector("#sq-a").innerHTML = actOpts(d); });
    s.querySelector("#sq-add").addEventListener("click", () => {
      const q = f.sequences[+s.querySelector("#sq-t").value]; if (!q) return;
      const actId = s.querySelector("#sq-a").value, ch = storyFor(d).chapter;
      q.steps.forEach((x, i) => { const cat = guessCat(x); f.shots.push({ id: uid(), date: d, title: x, desc: `${q.name} sequence`, loc: "", when: "", cam: cat === "pov" || cat === "transition" ? "x4" : cat === "interview" || cat === "sound" ? "mic" : "iphone",
        cat, purpose: FILM_CATS[cat].purpose, pri: "n", status: "planned", notes: "", actId, chapter: ch, ord: Date.now() + i, tip: "" }); });
      closeSheet(); ui.film = "shots"; ui.filmDate = d; ui.filmAct = actId; save(); render(); toast(`Added ${q.steps.length} shots`);
    });
    steps();
  });
}
function guessCat(t) {
  const x = t.toLowerCase();
  if (/360|immersive|pov|riding shot/.test(x)) return "pov"; if (/establishing/.test(x)) return "establishing"; if (/sound|ambience|room tone|music/.test(x)) return "sound";
  if (/interview|conversation|audio check/.test(x)) return "interview"; if (/reflection|reaction/.test(x)) return "reflection"; if (/close|detail|hands|feet/.test(x)) return "detail";
  if (/arriv|leaving|walking out|finish|closing|transition/.test(x)) return "transition"; if (/guide|person|group|meeting|people/.test(x)) return "people";
  if (/wide/.test(x)) return "wide"; if (/walk|follow|setting off|starting/.test(x)) return "movement"; return "medium";
}
function seqTemplates() {
  const f = F();
  openSheet(`<div class="sheet-h"><h2>Sequence templates</h2><button class="icon-btn" data-act="closeSheet" aria-label="Close">✕</button></div>
    <div class="choice-list">${f.sequences.map(q => `<button class="choice" data-act="editSeq" data-id="${q.id}">${esc(q.name)} <span class="muted small" style="margin-left:auto">${q.steps.length} steps</span></button>`).join("")}</div>
    <button class="btn sec" data-act="editSeq">+ New template</button>`);
}
function seqForm(q) {
  const isNew = !q; q = q || { name: "", steps: [] };
  form({ title: isNew ? "New template" : "Edit template", fields: [{ k: "name", label: "Name", value: q.name, required: true },
    { k: "steps", label: "Steps (one per line)", type: "textarea", value: q.steps.join("\n"), rows: 10, required: true }],
    onSave: v => { const steps = v.steps.split("\n").map(x => x.trim()).filter(Boolean); if (isNew) F().sequences.push({ id: uid(), name: v.name, steps }); else Object.assign(q, { name: v.name, steps }); },
    onDelete: isNew ? null : () => { F().sequences = F().sequences.filter(x => x !== q); } });
}
function soundLib() {
  const f = F(), d = filmDate();
  const html = () => `<div class="sheet-h"><h2>Sound library</h2><button class="icon-btn" data-act="closeSheet" aria-label="Close">✕</button></div>
    <div class="hint">Aim for 30–60 seconds of clean ambience at significant places. Not everywhere permits recording.</div>
    <div>${f.sounds.map(x => `<div class="shot ${x.done ? "done" : ""}"><button class="check ${x.done ? "on" : ""}" data-act="soundTick" data-id="${x.id}" aria-label="Toggle ${esc(x.name)}">${icon("tick")}</button>
      <span class="t">${esc(x.name)}${x.done && x.date ? `<div class="small muted">${fmtShort(x.date)}${x.place && placeById(x.place) ? " · " + esc(placeById(x.place).name) : ""}</div>` : ""}</span><span></span></div>`).join("")}</div>
    <div class="row"><input id="snd-new" placeholder="Add a sound" style="flex:1;min-width:0;background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:12px;font-size:16px"><button class="btn sec" data-act="soundAdd">Add</button></div>
    <details class="fold card" style="box-shadow:none"><summary style="font-size:17px">Interview audio check</summary><ul style="margin:10px 0 0;padding-left:20px">${AUDIO_CHECK.map(a => `<li>${esc(a)}</li>`).join("")}</ul></details>`;
  openSheet(html());
  soundLib.refresh = () => { $("sheet").innerHTML = html(); };
  soundLib.date = d;
}

/* ---------- Exports ---------- */
function filmCsv(kind) {
  const q = v => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const f = F(), pn = id => (placeById(id) || {}).name || "";
  let rows;
  if (kind === "shots") rows = [["Date", "Day", "Location", "Shot", "Description", "Type", "Camera", "Time of day", "Priority", "Status", "Purpose", "Chapter", "Activity", "Notes"],
    ...[...f.shots].sort((a, b) => a.date.localeCompare(b.date) || a.ord - b.ord).map(s => [s.date, dayNum(s.date), s.loc || pn((placeOf(s.date) || {}).id), s.title, s.desc, (FILM_CATS[s.cat] || {}).name, CAMS[s.cam], s.when, SHOT_PRI[s.pri], SHOT_STATUS[s.status], s.purpose, s.chapter, (actById(s.actId) || {}).title || "", s.notes])];
  else if (kind === "footage") rows = [["Date", "Location", "Camera", "Reference", "Description", "Best moments", "Audio notes", "Backup", "Reviewed", "Documentary", "Reels"],
    ...[...f.footage].sort((a, b) => a.date.localeCompare(b.date)).map(e => [e.date, pn(e.place), CAMS[e.cam], e.ref, e.desc, e.best, e.audio, BACKUP[e.backup], e.reviewed ? "Yes" : "No", e.useDoc ? "Yes" : "No", e.useReels ? "Yes" : "No"])];
  else rows = [["Type", "Date", "Location", "Title / question", "Text", "Why it matters", "Theme", "Chapter", "Voiceover", "Footage"],
    ...f.reflections.map(r => ["Reflection", r.date, pn(r.place), r.q, r.text, "", r.theme, r.chapter, r.vo ? "Yes" : "No", ""]),
    ...f.moments.map(m => ["Story moment", m.date, pn(m.place), m.title, m.what, m.why, m.theme, m.chapter, "", m.footage])];
  download(`india-film-${kind}-${realToday()}.csv`, rows.map(r => r.map(q).join(",")).join("\r\n") + "\r\n", "text/csv");
}

/* ---------- Actions ---------- */
Object.assign(actions, {
  filmTab: el => { closeSheet(); ui.film = el.dataset.tab; if (ui.view !== "filming") ui.view = "filming"; render(); window.scrollTo(0, 0); },
  filmStep: el => { const d = addDays(filmDate(), +el.dataset.n); if (inTrip(d)) { ui.filmDate = d; ui.filmAct = ""; render(); } },
  shotCycle: el => { const s = F().shots.find(x => x.id === el.dataset.id); if (s) { s.status = s.status === "captured" ? "planned" : "captured"; save(); render(); } },
  editFilmShot: el => { closeSheet(); filmShotForm(F().shots.find(x => x.id === el.dataset.id)); },
  addFilmShot: el => { closeSheet(); filmShotForm(null, el.dataset.date); },
  addShot: el => { closeSheet(); filmShotForm(null, el.dataset.date); },
  toggleReorder: () => { ui.reorder = !ui.reorder; render(); },
  shotMove: el => {
    const list = filmShotsFor(filmDate()), i = list.findIndex(x => x.id === el.dataset.id), j = i + +el.dataset.n;
    if (i < 0 || j < 0 || j >= list.length) return;
    list.forEach((s, k) => { s.ord = k; }); [list[i].ord, list[j].ord] = [list[j].ord, list[i].ord]; save(); render();
  },
  filmActClear: () => { ui.filmAct = ""; render(); },
  addMoment: el => { closeSheet(); momentForm(null, el.dataset.date); },
  editMoment: el => { closeSheet(); momentForm(F().moments.find(x => x.id === el.dataset.id)); },
  addReflection: el => { closeSheet(); reflectionForm(null, el.dataset.date); },
  editReflection: el => { closeSheet(); reflectionForm(F().reflections.find(x => x.id === el.dataset.id)); },
  saveR60: el => {
    const t = $("r60"); if (!t || !t.value.trim()) { toast("Write something first"); return; }
    const d = el.dataset.date;
    F().reflections.push({ id: uid(), date: d, place: (placeOf(d) || {}).id || "", q: el.dataset.q, text: t.value.trim(), vo: false, theme: "", chapter: storyFor(d).chapter, created: Date.now() });
    save(); render(); toast("Reflection saved");
  },
  r60next: () => { ui.r60i = (ui.r60i || 0) + 1; render(); },
  r60pick: el => { ui.r60i = +el.dataset.i; render(); window.scrollTo(0, 0); },
  voOnly: () => { ui.voOnly = !ui.voOnly; render(); },
  addInterview: el => { closeSheet(); interviewForm(null, el.dataset.date); },
  editInterview: el => { closeSheet(); interviewForm(F().interviews.find(x => x.id === el.dataset.id)); },
  addFootage: el => { closeSheet(); footageForm(null, el.dataset.date); },
  editFootage: el => footageForm(F().footage.find(x => x.id === el.dataset.id)),
  addReel: () => reelForm(),
  editReel: el => reelForm(F().reels.find(x => x.id === el.dataset.id)),
  chapter: el => chapterSheet(+el.dataset.n),
  buildSeq: el => seqBuilder(el.dataset.date),
  editSeqs: () => seqTemplates(),
  editSeq: el => { closeSheet(); seqForm(F().sequences.find(x => x.id === el.dataset.id)); },
  soundLib: () => soundLib(),
  soundTick: el => { const x = F().sounds.find(s => s.id === el.dataset.id); if (x) { x.done = !x.done; x.date = x.done ? (inTrip(todayISO()) ? todayISO() : soundLib.date) : ""; x.place = x.done ? (placeOf(x.date) || {}).id || "" : ""; save(); soundLib.refresh(); } },
  soundAdd: () => { const i = $("snd-new"); if (i && i.value.trim()) { F().sounds.push({ id: uid(), name: i.value.trim(), done: false, date: "", place: "", notes: "" }); save(); soundLib.refresh(); } },
  filmJson: () => download(`india-film-${realToday()}.json`, JSON.stringify(F(), null, 2), "application/json"),
  filmCsv: el => filmCsv(el.dataset.kind),
  filmPlan: el => { closeSheet(); go("filming", { film: "shots", filmDate: el.dataset.date, filmAct: el.dataset.act2 || "" }); },
});
