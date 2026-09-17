"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarPlus,
  Trash2,
  X,
} from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase";
type Booking = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  payment_status: string;
  total_cents: number;
  notes: string;
  customers: { full_name: string } | null;
  services: { name: string } | null;
};
export default function CalendarCRM({
  businessId,
  onNewBooking,
}: {
  businessId: string;
  onNewBooking: () => void;
}) {
  const supabase = getSupabaseBrowser();
  const [today] = useState(new Date()),
    [cursor, setCursor] = useState(new Date()),
    [mode, setMode] = useState<"month" | "year">("month"),
    [bookings, setBookings] = useState<Booking[]>([]),
    [selected, setSelected] = useState<Date | null>(null),
    [editing, setEditing] = useState<Booking | null>(null);
  async function load() {
    const { data } = await supabase
      .from("bookings")
      .select(
        "id,starts_at,ends_at,status,payment_status,total_cents,notes,customers(full_name),services(name)",
      )
      .eq("business_id", businessId)
      .order("starts_at");
    setBookings((data || []) as unknown as Booking[]);
  }
  useEffect(() => {
    load();
  }, [businessId]);
  const byDay = useMemo(() => {
    const m = new Map<string, Booking[]>();
    bookings.forEach((b) => {
      const k = new Date(b.starts_at).toDateString();
      m.set(k, [...(m.get(k) || []), b]);
    });
    return m;
  }, [bookings]);
  function move(n: number) {
    const d = new Date(cursor);
    mode === "month"
      ? d.setMonth(d.getMonth() + n)
      : d.setFullYear(d.getFullYear() + n);
    setCursor(d);
  }
  async function remove(id: string) {
    if (!confirm("Delete this booking?")) return;
    await supabase.from("bookings").delete().eq("id", id);
    setEditing(null);
    load();
  }
  async function save() {
    if (!editing) return;
    await supabase
      .from("bookings")
      .update({
        status: editing.status,
        payment_status: editing.payment_status,
        notes: editing.notes,
      })
      .eq("id", editing.id);
    setEditing(null);
    load();
  }
  const days = mode === "month" ? monthCells(cursor) : yearMonths(cursor);
  return (
    <section className="crm-calendar">
      <header className="calendar-toolbar">
        <div>
          <button onClick={() => move(-1)}>
            <ChevronLeft />
          </button>
          <button onClick={() => setCursor(new Date())}>Today</button>
          <button onClick={() => move(1)}>
            <ChevronRight />
          </button>
          <h2>
            {mode === "month"
              ? cursor.toLocaleString("en", { month: "long", year: "numeric" })
              : cursor.getFullYear()}
          </h2>
        </div>
        <div>
          <button
            className={mode === "month" ? "active" : ""}
            onClick={() => setMode("month")}
          >
            Month
          </button>
          <button
            className={mode === "year" ? "active" : ""}
            onClick={() => setMode("year")}
          >
            Year
          </button>
          <button className="btn btn-primary" onClick={onNewBooking}>
            <CalendarPlus size={16} /> New booking
          </button>
        </div>
      </header>
      {mode === "month" ? (
        <>
          <div className="weekdays">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((x) => (
              <b key={x}>{x}</b>
            ))}
          </div>
          <div className="month-grid">
            {days.map((d, i) => {
              const list = d ? byDay.get(d.toDateString()) || [] : [];
              const isToday = d?.toDateString() === today.toDateString();
              return (
                <button
                  className={`day-cell ${isToday ? "today" : ""}`}
                  disabled={!d}
                  key={i}
                  onClick={() => d && setSelected(d)}
                >
                  {d && (
                    <>
                      <span>{d.getDate()}</span>
                      {list.length > 0 && (
                        <div className="booking-dots">
                          <i />
                          {list.length} booking{list.length > 1 ? "s" : ""}
                        </div>
                      )}
                      {list.slice(0, 2).map((b) => (
                        <small key={b.id}>
                          {new Date(b.starts_at).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}{" "}
                          {b.customers?.full_name}
                        </small>
                      ))}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="year-grid">
          {days.map((d, i) => (
            <button
              key={i}
              onClick={() => {
                if (d) setCursor(d);
                setMode("month");
              }}
            >
              <b>{d!.toLocaleString("en", { month: "long" })}</b>
              <span>
                {
                  bookings.filter((b) => {
                    const x = new Date(b.starts_at);
                    return (
                      x.getMonth() === d!.getMonth() &&
                      x.getFullYear() === d!.getFullYear()
                    );
                  }).length
                }{" "}
                bookings
              </span>
            </button>
          ))}
        </div>
      )}
      {selected && (
        <div className="calendar-drawer">
          <header>
            <div>
              <small>
                {selected.toLocaleString("en", { weekday: "long" })}
              </small>
              <h3>{selected.toLocaleDateString()}</h3>
            </div>
            <button onClick={() => setSelected(null)}>
              <X />
            </button>
          </header>
          {(byDay.get(selected.toDateString()) || []).length === 0 ? (
            <p>No bookings for this date.</p>
          ) : (
            (byDay.get(selected.toDateString()) || []).map((b) => (
              <button
                className="calendar-booking"
                key={b.id}
                onClick={() => setEditing(b)}
              >
                <b>
                  {new Date(b.starts_at).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </b>
                <span>{b.customers?.full_name}</span>
                <small>
                  {b.services?.name} · {b.status}
                </small>
              </button>
            ))
          )}
        </div>
      )}
      {editing && (
        <div className="modal-backdrop">
          <div className="modal">
            <button className="modal-x" onClick={() => setEditing(null)}>
              <X />
            </button>
            <h2>Booking details</h2>
            <p>
              <b>{editing.customers?.full_name}</b>
              <br />
              {editing.services?.name}
              <br />
              {new Date(editing.starts_at).toLocaleString()}
            </p>
            <label className="field">
              Booking status
              <select
                value={editing.status}
                onChange={(e) =>
                  setEditing({ ...editing, status: e.target.value })
                }
              >
                {[
                  "pending",
                  "confirmed",
                  "in_progress",
                  "completed",
                  "cancelled",
                  "no_show",
                ].map((x) => (
                  <option key={x} value={x}>
                    {label(x)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Payment status
              <select
                value={editing.payment_status}
                onChange={(e) =>
                  setEditing({ ...editing, payment_status: e.target.value })
                }
              >
                {[
                  "unpaid",
                  "deposit_due",
                  "deposit_paid",
                  "paid",
                  "refunded",
                ].map((x) => (
                  <option key={x} value={x}>
                    {label(x)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Notes
              <textarea
                value={editing.notes || ""}
                onChange={(e) =>
                  setEditing({ ...editing, notes: e.target.value })
                }
              />
            </label>
            <div className="modal-actions">
              <button
                className="delete-action"
                onClick={() => remove(editing.id)}
              >
                <Trash2 size={16} /> Delete
              </button>
              <button className="btn btn-primary" onClick={save}>
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
function monthCells(d: Date) {
  const y = d.getFullYear(),
    m = d.getMonth(),
    first = new Date(y, m, 1).getDay(),
    count = new Date(y, m + 1, 0).getDate();
  return [
    ...Array(first).fill(null),
    ...Array.from({ length: count }, (_, i) => new Date(y, m, i + 1)),
  ] as (Date | null)[];
}
function yearMonths(d: Date) {
  return Array.from({ length: 12 }, (_, i) => new Date(d.getFullYear(), i, 1));
}
function label(x: string) {
  return x.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
