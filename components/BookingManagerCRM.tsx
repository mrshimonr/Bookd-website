"use client";
import { FormEvent, useEffect, useState } from "react";
import { Edit3, Plus, Search, Trash2, X } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase";
import CustomFieldInputs,{CustomField,customData} from "@/components/CustomFieldInputs";
type Customer = { id: string; full_name: string };
type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
};
type Booking = {
  id: string;
  customer_id: string;
  service_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  payment_status: string;
  total_cents: number;
  deposit_cents: number;
  notes: string;
  custom_data: Record<string,unknown>;
  customers: { full_name: string } | null;
  services: { name: string } | null;
};
const bookingStatuses = [
    "pending",
    "confirmed",
    "in_progress",
    "completed",
    "cancelled",
    "no_show",
  ],
  paymentStatuses = [
    "unpaid",
    "deposit_due",
    "deposit_paid",
    "paid",
    "partially_refunded",
    "refunded",
  ];
export default function BookingManagerCRM({
  businessId,
}: {
  businessId: string;
}) {
  const supabase = getSupabaseBrowser();
  const [bookings, setBookings] = useState<Booking[]>([]),
    [customers, setCustomers] = useState<Customer[]>([]),
    [services, setServices] = useState<Service[]>([]),
    [customFields,setCustomFields]=useState<CustomField[]>([]),
    [editing, setEditing] = useState<Booking | null | "new">(null),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [notice, setNotice] = useState("");
  async function load() {
    const [{ data: b }, { data: c }, { data: s },{data:f}] = await Promise.all([
      supabase
        .from("bookings")
        .select(
          "id,customer_id,service_id,starts_at,ends_at,status,payment_status,total_cents,deposit_cents,notes,custom_data,customers(full_name),services(name)",
        )
        .eq("business_id", businessId)
        .order("starts_at", { ascending: false }),
      supabase
        .from("customers")
        .select("id,full_name")
        .eq("business_id", businessId)
        .order("full_name"),
      supabase
        .from("services")
        .select("id,name,duration_minutes,price_cents")
        .eq("business_id", businessId)
        .eq("active", true)
        .order("name"),
      supabase.from("custom_fields").select("id,label,field_key,field_type,required,visible,options").eq("business_id",businessId).eq("entity_type","booking").order("display_order"),
    ]);
    setBookings((b || []) as unknown as Booking[]);
    setCustomers(c || []);
    setServices(s || []);
    setCustomFields((f||[]) as CustomField[]);
  }
  useEffect(() => {
    load();
  }, [businessId]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget),
      service = services.find((s) => s.id === d.get("service_id"));
    if (!service) return;
    const start = new Date(String(d.get("starts_at"))),
      end = new Date(start.getTime() + service.duration_minutes * 60000),
      payload = {
        customer_id: d.get("customer_id"),
        service_id: service.id,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        status: d.get("status"),
        payment_status: d.get("payment_status"),
        total_cents: Math.round(Number(d.get("total")) * 100),
        deposit_cents: Math.round(Number(d.get("deposit")) * 100),
        notes: d.get("notes"),
        custom_data:customData(d,customFields),
      };
    const result =
      editing === "new"
        ? await supabase
            .from("bookings")
            .insert({ business_id: businessId, ...payload })
        : await supabase.from("bookings").update(payload).eq("id", editing!.id);
    if (result.error) return setNotice(result.error.message);
    setEditing(null);
    setNotice(editing === "new" ? "Booking created" : "Booking updated");
    load();
  }
  async function remove(b: Booking) {
    if (!confirm("Delete this booking permanently?")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", b.id);
    if (error) setNotice(error.message);
    else {
      setNotice("Booking deleted");
      load();
    }
  }
  const filtered = bookings.filter(
    (b) =>
      (status === "all" || b.status === status) &&
      `${b.customers?.full_name} ${b.services?.name}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <section className="manager">
      <header className="manager-tools">
        <div className="search-box">
          <Search size={16} />
          <input
            placeholder="Search bookings"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {bookingStatuses.map((x) => (
            <option value={x} key={x}>
              {label(x)}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={() => setEditing("new")}>
          <Plus size={16} /> New booking
        </button>
      </header>
      {notice && <div className="notice">{notice}</div>}
      <div className="data-table">
        <div className="table-head">
          <span>Date</span>
          <span>Customer</span>
          <span>Service</span>
          <span>Booking</span>
          <span>Payment</span>
          <span>Total</span>
          <span />
        </div>
        {filtered.length === 0 ? (
          <div className="empty-small">No matching bookings.</div>
        ) : (
          filtered.map((b) => (
            <div className="table-row" key={b.id}>
              <span>{new Date(b.starts_at).toLocaleString()}</span>
              <b>{b.customers?.full_name}</b>
              <span>{b.services?.name}</span>
              <span className={`status ${b.status}`}>{label(b.status)}</span>
              <span>{label(b.payment_status)}</span>
              <span>${(b.total_cents / 100).toFixed(2)}</span>
              <span className="row-actions">
                <button onClick={() => setEditing(b)}>
                  <Edit3 size={15} />
                </button>
                <button onClick={() => remove(b)}>
                  <Trash2 size={15} />
                </button>
              </span>
            </div>
          ))
        )}
      </div>
      {editing && (
        <div className="modal-backdrop">
          <form className="modal wide" onSubmit={save}>
            <button
              type="button"
              className="modal-x"
              onClick={() => setEditing(null)}
            >
              <X />
            </button>
            <h2>{editing === "new" ? "Create booking" : "Edit booking"}</h2>
            <div className="field-row">
              <label className="field">
                Customer
                <select
                  name="customer_id"
                  defaultValue={editing === "new" ? "" : editing.customer_id}
                  required
                >
                  <option value="" disabled>
                    Select customer
                  </option>
                  {customers.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.full_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Service
                <select
                  name="service_id"
                  defaultValue={editing === "new" ? "" : editing.service_id}
                  required
                >
                  <option value="" disabled>
                    Select service
                  </option>
                  {services.map((s) => (
                    <option value={s.id} key={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field">
              Date and time
              <input
                name="starts_at"
                type="datetime-local"
                defaultValue={
                  editing === "new" ? "" : localInput(editing.starts_at)
                }
                required
              />
            </label>
            <div className="field-row">
              <label className="field">
                Booking status
                <select
                  name="status"
                  defaultValue={editing === "new" ? "pending" : editing.status}
                >
                  {bookingStatuses.map((x) => (
                    <option value={x} key={x}>
                      {label(x)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Payment status
                <select
                  name="payment_status"
                  defaultValue={
                    editing === "new" ? "unpaid" : editing.payment_status
                  }
                >
                  {paymentStatuses.map((x) => (
                    <option value={x} key={x}>
                      {label(x)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                Total price ($)
                <input
                  name="total"
                  type="number"
                  step=".01"
                  min="0"
                  defaultValue={
                    editing === "new" ? "" : editing.total_cents / 100
                  }
                  required
                />
              </label>
              <label className="field">
                Deposit ($)
                <input
                  name="deposit"
                  type="number"
                  step=".01"
                  min="0"
                  defaultValue={
                    editing === "new" ? 0 : editing.deposit_cents / 100
                  }
                />
              </label>
            </div>
            <label className="field">
              Internal notes
              <textarea
                name="notes"
                defaultValue={editing === "new" ? "" : editing.notes}
              />
            </label>
            <CustomFieldInputs fields={customFields} values={editing==="new"?{}:editing.custom_data||{}}/>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button className="btn btn-primary">Save booking</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
function label(x: string) {
  return x.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function localInput(iso: string) {
  const d = new Date(iso),
    off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}
