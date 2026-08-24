import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Ticket, QrCode, Clock, MapPin, Calendar, Users, LogOut, Check, X,
  Film, Music, Search, Plus, TrendingUp, ChevronRight, AlertCircle,
  UserCircle, ShieldCheck, Armchair, Timer, ArrowLeft, Mail
} from "lucide-react";

/* ============================================================
   THEME
   Box-office ticket stub: cream ticket stock, marquee brick-red,
   foil gold, ink navy-black. Perforation motif used as the
   recurring structural device (nav divider + ticket stub tear).
   ============================================================ */
const Theme = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Work+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

    .tb-root {
      --paper: #F3EEE1;
      --paper-raised: #FBF8F0;
      --ink: #241F26;
      --ink-soft: #5B5560;
      --marquee: #A9382C;
      --marquee-dark: #8A2C22;
      --gold: #BE8A3D;
      --gold-soft: #E4CFA0;
      --line: #D8CFB6;
      --seat-open: #3E7A5B;
      --seat-open-bg: #E4EEE6;
      --seat-held: #BE8A3D;
      --seat-held-bg: #F3E8D2;
      --seat-mine: #2C5C82;
      --seat-mine-bg: #DCE7EE;
      --seat-taken: #8C4A47;
      --seat-taken-bg: #EBDEDA;
      font-family: 'Work Sans', sans-serif;
      background: var(--paper);
      color: var(--ink);
      min-height: 100vh;
    }
    .tb-display { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.03em; }
    .tb-mono { font-family: 'IBM Plex Mono', monospace; }
    .tb-perforate {
      background-image: radial-gradient(circle, var(--paper) 2.5px, transparent 2.6px);
      background-size: 16px 16px;
      background-position: 0 -2px;
      height: 8px;
    }
    .tb-card {
      background: var(--paper-raised);
      border: 1px solid var(--line);
      border-radius: 10px;
    }
    .tb-btn-primary {
      background: var(--marquee);
      color: #FBF8F0;
      border-radius: 999px;
      font-weight: 600;
      transition: background 0.15s ease;
    }
    .tb-btn-primary:hover { background: var(--marquee-dark); }
    .tb-btn-primary:disabled { background: #C9BFA8; color: #8A8272; cursor: not-allowed; }
    .tb-btn-ghost {
      background: transparent;
      border: 1.5px solid var(--ink);
      border-radius: 999px;
      font-weight: 600;
      color: var(--ink);
    }
    .tb-btn-ghost:hover { background: var(--ink); color: var(--paper-raised); }
    .tb-badge {
      border-radius: 999px;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11px;
      letter-spacing: 0.04em;
      padding: 2px 9px;
    }
    .tb-seat {
      width: 26px; height: 26px; border-radius: 6px 6px 8px 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; font-family: 'IBM Plex Mono', monospace;
      cursor: pointer; transition: transform 0.1s ease; border: 1.5px solid transparent;
    }
    .tb-seat:hover:not(.tb-seat-taken):not(.tb-seat-held) { transform: translateY(-2px); }
    .tb-tab {
      font-weight: 600; font-size: 14px; padding: 8px 4px; border-bottom: 2.5px solid transparent;
      color: var(--ink-soft); cursor: pointer;
    }
    .tb-tab-active { color: var(--ink); border-bottom-color: var(--marquee); }
    input.tb-input, select.tb-input {
      background: var(--paper-raised); border: 1.5px solid var(--line); border-radius: 8px;
      padding: 8px 12px; font-family: 'Work Sans', sans-serif; color: var(--ink); outline: none;
    }
    input.tb-input:focus, select.tb-input:focus { border-color: var(--gold); }
  `}</style>
);

/* ============================================================
   MOCK DATA
   ============================================================ */
const ROWS = ["A", "B", "C", "D", "E", "F"];
const COLS = 10;
const HOLD_TTL = 90; // seconds — demo TTL, configurable in production
const OFFER_TTL = 45; // seconds — waitlist offer window

function buildSeatMap(seed) {
  const map = {};
  ROWS.forEach((row, ri) => {
    for (let c = 1; c <= COLS; c++) {
      const id = `${row}${c}`;
      const category = ri < 2 ? "Premium" : "Standard";
      // deterministic pseudo-random pre-booked seats for realism
      const hash = (seed + row.charCodeAt(0) * 31 + c * 7) % 11;
      const status = hash === 0 ? "booked" : "available";
      map[id] = { id, row, col: c, category, status };
    }
  });
  return map;
}

const INITIAL_EVENTS = [
  {
    id: "ev1", type: "movie", title: "Nightfall Junction", venue: "Regal Downtown 4",
    date: "2026-08-29", time: "7:30 PM", icon: "film",
    prices: { Premium: 450, Standard: 250 },
    seatMap: buildSeatMap(3),
  },
  {
    id: "ev2", type: "concert", title: "The Amber Hour — Live", venue: "Riverside Amphitheatre",
    date: "2026-09-05", time: "8:00 PM", icon: "music",
    prices: { Premium: 1800, Standard: 900 },
    seatMap: buildSeatMap(9),
  },
  {
    id: "ev3", type: "movie", title: "Paper Kites", venue: "Regal Downtown 4",
    date: "2026-08-30", time: "4:00 PM", icon: "film",
    prices: { Premium: 400, Standard: 220 },
    seatMap: buildSeatMap(5),
  },
];

// force ev2 Premium to be nearly sold out for waitlist demo
INITIAL_EVENTS[1].seatMap = (() => {
  const m = buildSeatMap(9);
  ROWS.slice(0, 2).forEach((row) => {
    for (let c = 1; c <= COLS; c++) m[`${row}${c}`].status = "booked";
  });
  return m;
})();

function countAvailable(seatMap, category) {
  return Object.values(seatMap).filter((s) => s.category === category && s.status === "available").length;
}

function bookingRef() {
  return "TB-" + Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + Math.floor(1000 + Math.random() * 9000);
}

function fmtClock(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/* deterministic pseudo-QR visual from a string (placeholder — real
   QR encoding happens server-side with a proper library) */
function PseudoQR({ value, size = 108 }) {
  const grid = 14;
  const cells = useMemo(() => {
    let h = 0;
    for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
    const arr = [];
    for (let i = 0; i < grid * grid; i++) {
      h = (h * 1103515245 + 12345) >>> 0;
      arr.push((h >> 16) % 3 === 0);
    }
    return arr;
  }, [value]);
  const cell = size / grid;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ background: "#fff", borderRadius: 6 }}>
      {cells.map((on, i) => {
        if (!on) return null;
        const x = (i % grid) * cell;
        const y = Math.floor(i / grid) * cell;
        return <rect key={i} x={x} y={y} width={cell} height={cell} fill="#241F26" />;
      })}
      {[[0, 0], [1, 0], [0, 1]].map(([gx, gy], i) => (
        <rect key={"pos" + i} x={gx * (size - cell * 4)} y={gy * (size - cell * 4)} width={cell * 4} height={cell * 4} fill="none" stroke="#241F26" strokeWidth={cell * 0.9} />
      ))}
    </svg>
  );
}

/* ============================================================
   APP
   ============================================================ */
export default function TicketBookingApp() {
  const [role, setRole] = useState("customer");
  const [view, setView] = useState("browse");
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [activeEventId, setActiveEventId] = useState(null);
  const [myHolds, setMyHolds] = useState([]); // {eventId, seatId, expiresAt}
  const [bookings, setBookings] = useState([]); // {ref, eventId, seats, total, at}
  const [waitlists, setWaitlists] = useState({}); // key `${eventId}::${category}` -> [{name, isMe}]
  const [offers, setOffers] = useState({}); // key -> {name, isMe, expiresAt, seatCategory}
  const [toast, setToast] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // auto-release expired holds
  useEffect(() => {
    const expired = myHolds.filter((h) => h.expiresAt <= now);
    if (expired.length === 0) return;
    setMyHolds((prev) => prev.filter((h) => h.expiresAt > now));
    setEvents((prev) =>
      prev.map((ev) => {
        const mine = expired.filter((h) => h.eventId === ev.id);
        if (mine.length === 0) return ev;
        const sm = { ...ev.seatMap };
        mine.forEach((h) => { sm[h.seatId] = { ...sm[h.seatId], status: "available" }; });
        return { ...ev, seatMap: sm };
      })
    );
    setToast(`Hold expired on ${expired.length} seat(s) — released back to the map.`);
  }, [now, myHolds]);

  // auto-expire offers -> move to next in waitlist
  useEffect(() => {
    Object.entries(offers).forEach(([key, offer]) => {
      if (offer.expiresAt <= now) advanceWaitlist(key, true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const activeEvent = events.find((e) => e.id === activeEventId);

  function openEvent(id) {
    setActiveEventId(id);
    setView("event");
  }

  function holdSeat(eventId, seatId) {
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== eventId) return ev;
        const sm = { ...ev.seatMap };
        if (sm[seatId].status !== "available") return ev;
        sm[seatId] = { ...sm[seatId], status: "held-mine" };
        return { ...ev, seatMap: sm };
      })
    );
    setMyHolds((prev) => [...prev, { eventId, seatId, expiresAt: Date.now() + HOLD_TTL * 1000 }]);
  }

  function releaseSeat(eventId, seatId) {
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== eventId) return ev;
        const sm = { ...ev.seatMap };
        sm[seatId] = { ...sm[seatId], status: "available" };
        return { ...ev, seatMap: sm };
      })
    );
    setMyHolds((prev) => prev.filter((h) => !(h.eventId === eventId && h.seatId === seatId)));
  }

  function confirmBooking(eventId, seatIds) {
    const ev = events.find((e) => e.id === eventId);
    const total = seatIds.reduce((sum, id) => sum + ev.prices[ev.seatMap[id].category], 0);
    const ref = bookingRef();
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== eventId) return e;
        const sm = { ...e.seatMap };
        seatIds.forEach((id) => { sm[id] = { ...sm[id], status: "booked" }; });
        return { ...e, seatMap: sm };
      })
    );
    setMyHolds((prev) => prev.filter((h) => !(h.eventId === eventId && seatIds.includes(h.seatId))));
    const record = { ref, eventId, seats: seatIds, total, at: new Date().toISOString() };
    setBookings((prev) => [record, ...prev]);
    setToast(`Booked! Confirmation emailed with QR ticket ${ref}.`);
    return record;
  }

  function joinWaitlist(eventId, category) {
    const key = `${eventId}::${category}`;
    setWaitlists((prev) => {
      const list = prev[key] || [];
      if (list.some((p) => p.isMe)) return prev;
      return { ...prev, [key]: [...list, { name: "You", isMe: true, joinedAt: Date.now() }] };
    });
    setToast("Added to waitlist — you'll get an email if a seat opens up.");
  }

  function advanceWaitlist(key, wasExpired) {
    setOffers((prevOffers) => {
      const next = { ...prevOffers };
      delete next[key];
      return next;
    });
    setWaitlists((prev) => {
      const list = prev[key] || [];
      if (list.length === 0) return prev;
      const [head, ...rest] = list;
      setOffers((o) => ({
        ...o,
        [key]: { name: head.name, isMe: head.isMe, expiresAt: Date.now() + OFFER_TTL * 1000, seatCategory: key.split("::")[1], eventId: key.split("::")[0] },
      }));
      setToast(wasExpired ? `Offer expired — passed to next in line: ${head.name}.` : `Seat offered to ${head.name}.`);
      return { ...prev, [key]: rest };
    });
  }

  function simulateCancellation(eventId, category) {
    const ev = events.find((e) => e.id === eventId);
    const bookedSeats = Object.values(ev.seatMap).filter((s) => s.category === category && s.status === "booked");
    if (bookedSeats.length === 0) return;
    const seatId = bookedSeats[0].id;
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== eventId) return e;
        const sm = { ...e.seatMap };
        sm[seatId] = { ...sm[seatId], status: "available" };
        return { ...e, seatMap: sm };
      })
    );
    const key = `${eventId}::${category}`;
    const list = waitlists[key] || [];
    if (list.length > 0) advanceWaitlist(key, false);
    else setToast("Seat cancelled and released — no one on the waitlist.");
  }

  function acceptOffer(key) {
    const offer = offers[key];
    if (!offer) return;
    const ev = events.find((e) => e.id === offer.eventId);
    const category = offer.seatCategory;
    const seat = Object.values(ev.seatMap).find((s) => s.category === category && s.status === "available");
    if (seat) {
      setEvents((prev) =>
        prev.map((e) => {
          if (e.id !== offer.eventId) return e;
          const sm = { ...e.seatMap };
          sm[seat.id] = { ...sm[seat.id], status: "booked" };
          return { ...e, seatMap: sm };
        })
      );
      const record = { ref: bookingRef(), eventId: offer.eventId, seats: [seat.id], total: ev.prices[category], at: new Date().toISOString() };
      setBookings((prev) => [record, ...prev]);
      setToast(`Waitlist seat confirmed — ${record.ref}`);
    }
    setOffers((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }

  function cancelBooking(ref) {
    const b = bookings.find((x) => x.ref === ref);
    if (!b) return;
    setBookings((prev) => prev.filter((x) => x.ref !== ref));
    const ev = events.find((e) => e.id === b.eventId);
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== b.eventId) return e;
        const sm = { ...e.seatMap };
        b.seats.forEach((id) => { sm[id] = { ...sm[id], status: "available" }; });
        return { ...e, seatMap: sm };
      })
    );
    const cats = [...new Set(b.seats.map((id) => ev.seatMap[id].category))];
    cats.forEach((cat) => {
      const key = `${b.eventId}::${cat}`;
      const list = waitlists[key] || [];
      // re-book the seat as taken to reflect that it's earmarked for offer, then advance
      if (list.length > 0) {
        setEvents((prev) =>
          prev.map((e) => {
            if (e.id !== b.eventId) return e;
            const sm = { ...e.seatMap };
            const seatId = b.seats.find((id) => e.seatMap[id].category === cat);
            if (seatId) sm[seatId] = { ...sm[seatId], status: "booked" };
            return { ...e, seatMap: sm };
          })
        );
        advanceWaitlist(key, false);
      }
    });
    setToast("Booking cancelled.");
  }

  const userOffer = Object.entries(offers).find(([, o]) => o.isMe);

  return (
    <div className="tb-root">
      <Theme />
      <Header role={role} setRole={setRole} view={view} setView={setView} bookingCount={bookings.length} />
      <div className="tb-perforate" />

      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 50 }} className="tb-card px-4 py-3 shadow-lg flex items-center gap-2 max-w-xs">
          <AlertCircle size={16} color="var(--marquee)" />
          <span className="text-sm">{toast}</span>
        </div>
      )}

      {userOffer && (
        <div className="max-w-5xl mx-auto px-6 mt-4">
          <div className="tb-card px-5 py-3 flex items-center justify-between" style={{ borderColor: "var(--gold)", background: "var(--seat-held-bg)" }}>
            <div className="flex items-center gap-2">
              <Timer size={18} color="var(--gold)" />
              <span className="text-sm">
                A seat opened up for your waitlist entry — expires in <b className="tb-mono">{fmtClock(Math.max(0, Math.floor((userOffer[1].expiresAt - now) / 1000)))}</b>
              </span>
            </div>
            <button className="tb-btn-primary text-xs px-4 py-1.5" onClick={() => acceptOffer(userOffer[0])}>Claim seat</button>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-6 py-8">
        {view === "browse" && <BrowseView events={events} onOpen={openEvent} />}
        {view === "event" && activeEvent && (
          <EventView
            event={activeEvent}
            myHolds={myHolds.filter((h) => h.eventId === activeEvent.id)}
            now={now}
            onHold={(seatId) => holdSeat(activeEvent.id, seatId)}
            onRelease={(seatId) => releaseSeat(activeEvent.id, seatId)}
            onBack={() => setView("browse")}
            onConfirm={(seatIds) => { confirmBooking(activeEvent.id, seatIds); setView("history"); }}
            onJoinWaitlist={(category) => joinWaitlist(activeEvent.id, category)}
            waitlistCount={(category) => (waitlists[`${activeEvent.id}::${category}`] || []).length}
            onSeeded={(category) => (waitlists[`${activeEvent.id}::${category}`] || []).some((p) => p.isMe)}
          />
        )}
        {view === "history" && <HistoryView bookings={bookings} events={events} onCancel={cancelBooking} />}
        {view === "organiser" && (
          <OrganiserView
            events={events}
            bookings={bookings}
            onAddEvent={(ev) => setEvents((prev) => [...prev, ev])}
            onSimulateCancellation={simulateCancellation}
          />
        )}
        {view === "admin" && <AdminView events={events} />}
      </main>
    </div>
  );
}

/* ============================================================
   HEADER
   ============================================================ */
function Header({ role, setRole, view, setView, bookingCount }) {
  const tabsByRole = {
    customer: [["browse", "Browse"], ["history", `My Tickets${bookingCount ? ` (${bookingCount})` : ""}`]],
    organiser: [["organiser", "Dashboard"]],
    admin: [["admin", "Venues"]],
  };
  return (
    <header className="max-w-5xl mx-auto px-6 pt-6 pb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Ticket size={26} color="var(--marquee)" style={{ transform: "rotate(-8deg)" }} />
        <span className="tb-display text-2xl" style={{ letterSpacing: "0.06em" }}>ADMIT ONE</span>
      </div>
      <nav className="flex items-center gap-6">
        {tabsByRole[role].map(([key, label]) => (
          <div key={key} className={`tb-tab ${view === key ? "tb-tab-active" : ""}`} onClick={() => setView(key)}>
            {label}
          </div>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <select className="tb-input text-sm" value={role} onChange={(e) => { setRole(e.target.value); setView(e.target.value === "customer" ? "browse" : e.target.value); }}>
          <option value="customer">Customer view</option>
          <option value="organiser">Organiser view</option>
          <option value="admin">Admin view</option>
        </select>
      </div>
    </header>
  );
}

/* ============================================================
   BROWSE
   ============================================================ */
function BrowseView({ events, onOpen }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const filtered = events.filter(
    (e) => (filter === "all" || e.type === filter) && e.title.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="tb-badge inline-block mb-2" style={{ background: "var(--gold-soft)", color: "var(--ink)" }}>NOW SHOWING &amp; ON SALE</div>
          <h1 className="tb-display text-5xl leading-none">Tonight's Line-up</h1>
        </div>
        <div className="flex gap-2">
          <div className="tb-input flex items-center gap-2 px-3">
            <Search size={15} color="var(--ink-soft)" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events" style={{ border: "none", outline: "none", background: "transparent" }} />
          </div>
          <select className="tb-input" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="movie">Movies</option>
            <option value="concert">Concerts</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {filtered.map((ev) => {
          const premAvail = countAvailable(ev.seatMap, "Premium");
          const stdAvail = countAvailable(ev.seatMap, "Standard");
          const soldOut = premAvail === 0 && stdAvail === 0;
          return (
            <div key={ev.id} className="tb-card overflow-hidden cursor-pointer" onClick={() => onOpen(ev.id)}>
              <div className="px-5 pt-5 pb-4" style={{ background: "var(--seat-mine-bg)" }}>
                {ev.type === "movie" ? <Film size={22} color="var(--marquee)" /> : <Music size={22} color="var(--marquee)" />}
                <div className="tb-display text-3xl mt-2 leading-none">{ev.title}</div>
              </div>
              <div className="tb-perforate" />
              <div className="p-5 space-y-2">
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--ink-soft)" }}>
                  <MapPin size={14} /> {ev.venue}
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--ink-soft)" }}>
                  <Calendar size={14} /> {ev.date} · {ev.time}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="tb-mono text-xs">from ₹{Math.min(ev.prices.Premium, ev.prices.Standard)}</span>
                  {soldOut ? (
                    <span className="tb-badge" style={{ background: "var(--seat-taken-bg)", color: "var(--seat-taken)" }}>SOLD OUT</span>
                  ) : (
                    <span className="tb-badge" style={{ background: "var(--seat-open-bg)", color: "var(--seat-open)" }}>{premAvail + stdAvail} seats left</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   EVENT DETAIL + SEAT MAP
   ============================================================ */
function EventView({ event, myHolds, now, onHold, onRelease, onBack, onConfirm, onJoinWaitlist, waitlistCount, onSeeded }) {
  const seatIds = Object.keys(event.seatMap);
  const myHeldSeatIds = myHolds.map((h) => h.seatId);
  const total = myHeldSeatIds.reduce((sum, id) => sum + event.prices[event.seatMap[id].category], 0);
  const earliestExpiry = myHolds.length ? Math.min(...myHolds.map((h) => h.expiresAt)) : null;
  const secsLeft = earliestExpiry ? Math.max(0, Math.floor((earliestExpiry - now) / 1000)) : null;

  const categories = ["Premium", "Standard"];

  function seatClass(status) {
    if (status === "booked") return "tb-seat tb-seat-taken";
    if (status === "held-mine") return "tb-seat";
    return "tb-seat";
  }
  function seatStyle(status) {
    if (status === "booked") return { background: "var(--seat-taken-bg)", color: "var(--seat-taken)", cursor: "not-allowed" };
    if (status === "held-mine") return { background: "var(--seat-mine-bg)", color: "var(--seat-mine)", borderColor: "var(--seat-mine)" };
    return { background: "var(--seat-open-bg)", color: "var(--seat-open)" };
  }

  return (
    <div>
      <button className="flex items-center gap-1 text-sm mb-4" style={{ color: "var(--ink-soft)" }} onClick={onBack}>
        <ArrowLeft size={15} /> Back to line-up
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="tb-display text-4xl">{event.title}</h1>
          <div className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>{event.venue} · {event.date} · {event.time}</div>
        </div>
        {secsLeft !== null && (
          <div className="tb-card px-4 py-2 flex items-center gap-2" style={{ borderColor: "var(--gold)" }}>
            <Clock size={16} color="var(--gold)" />
            <span className="text-sm">Hold expires in <b className="tb-mono">{fmtClock(secsLeft)}</b></span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        <div>
          <div className="tb-card p-6 mb-4">
            <div className="text-center mb-6">
              <div className="mx-auto mb-1 h-2 rounded-full" style={{ width: "70%", background: "var(--line)" }} />
              <span className="text-xs tb-mono" style={{ color: "var(--ink-soft)" }}>SCREEN / STAGE THIS WAY</span>
            </div>
            <div className="space-y-2">
              {ROWS.map((row) => (
                <div key={row} className="flex items-center gap-3">
                  <span className="tb-mono text-xs w-4" style={{ color: "var(--ink-soft)" }}>{row}</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {Array.from({ length: COLS }, (_, i) => i + 1).map((c) => {
                      const id = `${row}${c}`;
                      const seat = event.seatMap[id];
                      const clickable = seat.status === "available" || seat.status === "held-mine";
                      return (
                        <div
                          key={id}
                          className={seatClass(seat.status)}
                          style={seatStyle(seat.status)}
                          title={`${id} · ${seat.category}`}
                          onClick={() => {
                            if (!clickable) return;
                            if (seat.status === "held-mine") onRelease(id);
                            else onHold(id);
                          }}
                        >
                          {c}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-5 justify-center mt-6 text-xs flex-wrap">
              <Legend color="var(--seat-open)" bg="var(--seat-open-bg)" label="Available" />
              <Legend color="var(--seat-mine)" bg="var(--seat-mine-bg)" label="Your hold" />
              <Legend color="var(--seat-taken)" bg="var(--seat-taken-bg)" label="Booked" />
            </div>
          </div>

          {categories.map((cat) => {
            const avail = countAvailable(event.seatMap, cat);
            if (avail > 0) return null;
            const seeded = onSeeded(cat);
            return (
              <div key={cat} className="tb-card p-4 flex items-center justify-between mb-3" style={{ background: "var(--seat-taken-bg)" }}>
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle size={16} color="var(--seat-taken)" />
                  <span>{cat} is sold out · {waitlistCount(cat)} on waitlist</span>
                </div>
                <button className="tb-btn-ghost text-xs px-4 py-1.5" disabled={seeded} onClick={() => onJoinWaitlist(cat)}>
                  {seeded ? "On waitlist" : "Join waitlist"}
                </button>
              </div>
            );
          })}
        </div>

        <div>
          <div className="tb-card p-5 sticky top-6">
            <div className="tb-display text-xl mb-3">Your selection</div>
            {myHeldSeatIds.length === 0 && <div className="text-sm" style={{ color: "var(--ink-soft)" }}>Tap seats on the map to place a hold.</div>}
            <div className="space-y-1.5 mb-3">
              {myHeldSeatIds.map((id) => (
                <div key={id} className="flex justify-between text-sm">
                  <span className="tb-mono">{id} <span style={{ color: "var(--ink-soft)" }}>· {event.seatMap[id].category}</span></span>
                  <span>₹{event.prices[event.seatMap[id].category]}</span>
                </div>
              ))}
            </div>
            {myHeldSeatIds.length > 0 && (
              <>
                <div className="tb-perforate" style={{ margin: "12px -20px" }} />
                <div className="flex justify-between font-semibold mb-4">
                  <span>Total</span><span>₹{total}</span>
                </div>
                <button className="tb-btn-primary w-full py-2.5" onClick={() => onConfirm(myHeldSeatIds)}>
                  Confirm booking
                </button>
              </>
            )}
            <div className="text-xs mt-3 flex items-start gap-1.5" style={{ color: "var(--ink-soft)" }}>
              <Timer size={13} style={{ marginTop: 1 }} />
              Held seats auto-release after {HOLD_TTL}s of inactivity.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, bg, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="tb-seat" style={{ background: bg, color, width: 16, height: 16 }} />
      <span style={{ color: "var(--ink-soft)" }}>{label}</span>
    </div>
  );
}

/* ============================================================
   BOOKING HISTORY / TICKET
   ============================================================ */
function HistoryView({ bookings, events, onCancel }) {
  if (bookings.length === 0) {
    return (
      <div className="tb-card p-12 text-center">
        <Ticket size={32} color="var(--ink-soft)" className="mx-auto mb-3" />
        <div className="tb-display text-2xl mb-1">No tickets yet</div>
        <div className="text-sm" style={{ color: "var(--ink-soft)" }}>Booked seats will show up here as ticket stubs with a QR code.</div>
      </div>
    );
  }
  return (
    <div>
      <h1 className="tb-display text-4xl mb-6">My Tickets</h1>
      <div className="space-y-5">
        {bookings.map((b) => {
          const ev = events.find((e) => e.id === b.eventId);
          return (
            <div key={b.ref} className="tb-card grid grid-cols-1 sm:grid-cols-[1fr_auto] overflow-hidden">
              <div className="p-5">
                <div className="tb-display text-2xl">{ev.title}</div>
                <div className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>{ev.venue} · {ev.date} · {ev.time}</div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {b.seats.map((id) => (
                    <span key={id} className="tb-badge tb-mono" style={{ background: "var(--seat-mine-bg)", color: "var(--seat-mine)" }}>{id}</span>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: "var(--ink-soft)" }}>
                  <span className="tb-mono">{b.ref}</span>
                  <span className="flex items-center gap-1"><Mail size={12} /> QR ticket emailed</span>
                </div>
                <button className="text-xs mt-4" style={{ color: "var(--marquee)" }} onClick={() => onCancel(b.ref)}>Cancel booking</button>
              </div>
              <div className="flex sm:flex-col items-center justify-center p-5 gap-2" style={{ borderLeft: "1px dashed var(--line)", background: "var(--paper)" }}>
                <PseudoQR value={b.ref} size={92} />
                <span className="tb-mono text-[10px]" style={{ color: "var(--ink-soft)" }}>₹{b.total}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   ORGANISER DASHBOARD
   ============================================================ */
function OrganiserView({ events, bookings, onAddEvent, onSimulateCancellation }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", venue: "", date: "", time: "", type: "movie", premPrice: 500, stdPrice: 250 });

  function submit(e) {
    e.preventDefault();
    const id = "ev" + (events.length + 1) + "-" + Date.now().toString(36).slice(-4);
    onAddEvent({
      id, type: form.type, title: form.title || "Untitled Event", venue: form.venue || "TBD Venue",
      date: form.date || "2026-09-01", time: form.time || "7:00 PM", icon: form.type,
      prices: { Premium: Number(form.premPrice), Standard: Number(form.stdPrice) },
      seatMap: buildSeatMap(events.length + 4),
    });
    setShowForm(false);
    setForm({ title: "", venue: "", date: "", time: "", type: "movie", premPrice: 500, stdPrice: 250 });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="tb-display text-4xl">Organiser Dashboard</h1>
        <button className="tb-btn-primary px-5 py-2 text-sm flex items-center gap-1.5" onClick={() => setShowForm((s) => !s)}>
          <Plus size={15} /> New listing
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="tb-card p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className="tb-input" placeholder="Event title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className="tb-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="movie">Movie</option>
            <option value="concert">Concert</option>
          </select>
          <input className="tb-input" placeholder="Venue" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
          <input className="tb-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <input className="tb-input" placeholder="Time e.g. 7:30 PM" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          <div className="flex gap-2">
            <input className="tb-input w-1/2" type="number" placeholder="Premium ₹" value={form.premPrice} onChange={(e) => setForm({ ...form, premPrice: e.target.value })} />
            <input className="tb-input w-1/2" type="number" placeholder="Standard ₹" value={form.stdPrice} onChange={(e) => setForm({ ...form, stdPrice: e.target.value })} />
          </div>
          <button className="tb-btn-primary py-2 sm:col-span-2" type="submit">Publish listing</button>
        </form>
      )}

      <div className="space-y-4">
        {events.map((ev) => {
          const evBookings = bookings.filter((b) => b.eventId === ev.id);
          const revenue = evBookings.reduce((s, b) => s + b.total, 0);
          const seatsSold = evBookings.reduce((s, b) => s + b.seats.length, 0);
          return (
            <div key={ev.id} className="tb-card p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="tb-display text-2xl">{ev.title}</div>
                  <div className="text-xs" style={{ color: "var(--ink-soft)" }}>{ev.venue} · {ev.date}</div>
                </div>
                <div className="flex items-center gap-5 text-sm">
                  <Stat icon={<Users size={14} />} label="Sold" value={seatsSold} />
                  <Stat icon={<TrendingUp size={14} />} label="Revenue" value={`₹${revenue}`} />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {["Premium", "Standard"].map((cat) => (
                  <button key={cat} className="tb-btn-ghost text-xs px-3 py-1.5" onClick={() => onSimulateCancellation(ev.id, cat)}>
                    Simulate {cat} cancellation
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="flex items-center gap-1.5" style={{ color: "var(--ink-soft)" }}>
      {icon}<span>{label}</span><b style={{ color: "var(--ink)" }}>{value}</b>
    </div>
  );
}

/* ============================================================
   ADMIN — VENUES
   ============================================================ */
function AdminView({ events }) {
  const venues = [...new Set(events.map((e) => e.venue))];
  return (
    <div>
      <h1 className="tb-display text-4xl mb-2">Venues &amp; Seat Layouts</h1>
      <p className="text-sm mb-6" style={{ color: "var(--ink-soft)" }}>Admin manages the physical layout and category bands; organisers price shows against it.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {venues.map((v) => (
          <div key={v} className="tb-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={16} color="var(--marquee)" />
              <span className="tb-display text-xl">{v}</span>
            </div>
            <div className="flex gap-4 text-xs mb-3" style={{ color: "var(--ink-soft)" }}>
              <span>{ROWS.length} rows</span><span>{COLS} seats/row</span><span>{ROWS.length * COLS} total</span>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1"><Armchair size={12} color="var(--seat-mine)" /> Rows A–B: Premium</span>
              <span className="flex items-center gap-1"><Armchair size={12} color="var(--ink-soft)" /> Rows C–F: Standard</span>
            </div>
          </div>
        ))}
        <div className="tb-card p-5 flex items-center justify-center border-dashed cursor-pointer" style={{ borderStyle: "dashed" }}>
          <span className="text-sm flex items-center gap-1.5" style={{ color: "var(--ink-soft)" }}><Plus size={15} /> Add venue</span>
        </div>
      </div>
    </div>
  );
}
