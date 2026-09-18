"use client";
import { FormEvent, useEffect, useState } from "react";
import { Edit3, Plus, Search, Trash2, X } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase";
type Kind = "customer" | "service";
type RecordItem = {
  id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  name?: string;
  description?: string;
  duration_minutes?: number;
  price_cents?: number;
  deposit_cents?: number;
  active?: boolean;
};
export default function RecordManagerCRM({
  businessId,
  kind,
}: {
  businessId: string;
  kind: Kind;
}) {
  const supabase = getSupabaseBrowser(),
    table = kind === "customer" ? "customers" : "services";
  const [items, setItems] = useState<RecordItem[]>([]),
    [editing, setEditing] = useState<RecordItem | null | "new">(null),
    [search, setSearch] = useState(""),
    [notice, setNotice] = useState("");
  async function load() {
    const { data } = await supabase
      .from(table)
      .select("*")
      .eq("business_id", businessId)
      .order(kind === "customer" ? "full_name" : "name");
    setItems(data || []);
  }
  useEffect(() => {
    load();
  }, [businessId, kind]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget),
      payload =
        kind === "customer"
          ? {
              full_name: d.get("name"),
              email: d.get("email"),
              phone: d.get("phone"),
              notes: d.get("notes"),
            }
          : {
              name: d.get("name"),
              description: d.get("description"),
              duration_minutes: Number(d.get("duration")),
              price_cents: Math.round(Number(d.get("price")) * 100),
              deposit_cents: Math.round(Number(d.get("deposit")) * 100),
              active: d.get("active") === "on",
            };
    const result =
      editing === "new"
        ? await supabase
            .from(table)
            .insert({ business_id: businessId, ...payload })
        : await supabase.from(table).update(payload).eq("id", editing!.id);
    if (result.error) return setNotice(result.error.message);
    setEditing(null);
    setNotice(`${kind === "customer" ? "Customer" : "Service"} saved`);
    load();
  }
  async function remove(item: RecordItem) {
    if (!confirm(`Delete this ${kind}?`)) return;
    const { error } = await supabase.from(table).delete().eq("id", item.id);
    if (error) setNotice(error.message);
    else {
      setNotice(`${kind === "customer" ? "Customer" : "Service"} deleted`);
      load();
    }
  }
  const filtered = items.filter((x) =>
    (kind === "customer"
      ? `${x.full_name} ${x.email} ${x.phone}`
      : `${x.name} ${x.description}`
    )
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <section className="manager">
      <header className="manager-tools">
        <div className="search-box">
          <Search size={16} />
          <input
            placeholder={`Search ${kind}s`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => setEditing("new")}>
          <Plus size={16} /> Add {kind}
        </button>
      </header>
      {notice && <div className="notice">{notice}</div>}
      <div className="record-grid">
        {filtered.map((item) => (
          <article className="feature record-card" key={item.id}>
            <div>
              <h3>{kind === "customer" ? item.full_name : item.name}</h3>
              <p>
                {kind === "customer"
                  ? item.email || "No email"
                  : item.description || "No description"}
              </p>
              <span>
                {kind === "customer"
                  ? item.phone || "No phone"
                  : `${item.duration_minutes} min · $${((item.price_cents || 0) / 100).toFixed(2)}`}
              </span>
            </div>
            <div className="row-actions">
              <button onClick={() => setEditing(item)}>
                <Edit3 size={15} />
              </button>
              <button onClick={() => remove(item)}>
                <Trash2 size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {editing && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={save}>
            <button
              type="button"
              className="modal-x"
              onClick={() => setEditing(null)}
            >
              <X />
            </button>
            <h2>
              {editing === "new" ? "Add" : "Edit"} {kind}
            </h2>
            <label className="field">
              {kind === "customer" ? "Full name" : "Service name"}
              <input
                name="name"
                defaultValue={
                  editing === "new"
                    ? ""
                    : kind === "customer"
                      ? editing.full_name
                      : editing.name
                }
                required
              />
            </label>
            {kind === "customer" ? (
              <>
                <label className="field">
                  Email
                  <input
                    name="email"
                    type="email"
                    defaultValue={editing === "new" ? "" : editing.email}
                  />
                </label>
                <label className="field">
                  Phone
                  <input
                    name="phone"
                    defaultValue={editing === "new" ? "" : editing.phone}
                  />
                </label>
                <label className="field">
                  Notes
                  <textarea
                    name="notes"
                    defaultValue={editing === "new" ? "" : editing.notes}
                  />
                </label>
              </>
            ) : (
              <>
                <label className="field">
                  Description
                  <textarea
                    name="description"
                    defaultValue={editing === "new" ? "" : editing.description}
                  />
                </label>
                <div className="field-row">
                  <label className="field">
                    Duration (minutes)
                    <input
                      name="duration"
                      type="number"
                      min="1"
                      defaultValue={
                        editing === "new" ? 60 : editing.duration_minutes
                      }
                    />
                  </label>
                  <label className="field">
                    Price ($)
                    <input
                      name="price"
                      type="number"
                      step=".01"
                      min="0"
                      defaultValue={
                        editing === "new"
                          ? ""
                          : (editing.price_cents || 0) / 100
                      }
                    />
                  </label>
                </div>
                <label className="field">
                  Default deposit ($)
                  <input
                    name="deposit"
                    type="number"
                    step=".01"
                    min="0"
                    defaultValue={
                      editing === "new" ? 0 : (editing.deposit_cents || 0) / 100
                    }
                  />
                </label>
                <label className="toggle">
                  <input
                    name="active"
                    type="checkbox"
                    defaultChecked={editing === "new" ? true : editing.active}
                  />{" "}
                  Active service
                </label>
              </>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button className="btn btn-primary">Save</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
