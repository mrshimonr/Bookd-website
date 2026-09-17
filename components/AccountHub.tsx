"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ExternalLink,
  LogOut,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase";
type Business = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  published: boolean;
  created_at: string;
  theme: { color?: string };
};
export default function AccountHub() {
  const supabase = getSupabaseBrowser(),
    router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]),
    [email, setEmail] = useState(""),
    [loading, setLoading] = useState(true),
    [deleting, setDeleting] = useState<string | null>(null);
  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    setEmail(user.email || "");
    const { data, error } = await supabase
      .from("businesses")
      .select("id,name,slug,description,category,published,created_at,theme")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    if (!error) setBusinesses((data || []) as Business[]);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);
  async function logout() {
    await supabase.auth.signOut();
    router.replace("/");
  }
  async function remove(b: Business) {
    if (
      !confirm(
        `Delete ${b.name}? This permanently deletes its services, customers, and bookings.`,
      )
    )
      return;
    setDeleting(b.id);
    const { error } = await supabase.from("businesses").delete().eq("id", b.id);
    if (error) alert(error.message);
    else await load();
    setDeleting(null);
  }
  if (loading)
    return (
      <main className="wizard-wrap">
        <div className="wizard-card">
          <div className="loader" />
          <p>Loading your businesses…</p>
        </div>
      </main>
    );
  return (
    <main className="account-page">
      <header className="account-nav">
        <Link href="/account" className="brand">
          <span className="brand-mark">B</span>Bookd
        </Link>
        <div>
          <span>{email}</span>
          <button onClick={logout}>
            <LogOut size={16} /> Log out
          </button>
        </div>
      </header>
      <section className="account-content">
        <div className="account-heading">
          <div>
            <span className="eyebrow">
              <Building2 size={14} /> Your Bookd account
            </span>
            <h1>My businesses</h1>
            <p>Open an existing business or create another booking website.</p>
          </div>
          <Link className="btn btn-primary" href="/onboarding?new=1">
            <Plus size={17} /> Create new business
          </Link>
        </div>
        {businesses.length === 0 ? (
          <div className="account-empty">
            <Building2 size={32} />
            <h2>Create your first business</h2>
            <p>
              Build a custom booking website and start managing real bookings.
            </p>
            <Link className="btn btn-primary" href="/onboarding?new=1">
              Start building
            </Link>
          </div>
        ) : (
          <div className="business-grid">
            {businesses.map((b) => (
              <article className="business-card" key={b.id}>
                <div className="business-card-top">
                  <span style={{ background: b.theme?.color || "#4f46e5" }}>
                    {b.name[0]?.toUpperCase()}
                  </span>
                  <small>{b.published ? "Published" : "Draft"}</small>
                </div>
                <h2>{b.name}</h2>
                <p>{b.description || "No description yet"}</p>
                <div className="site-address">
                  bookd-website-nine.vercel.app/b/{b.slug}
                </div>
                <div className="business-actions">
                  <Link
                    className="btn btn-primary"
                    href={`/dashboard?business=${b.id}`}
                  >
                    <Settings size={15} /> Manage
                  </Link>
                  <Link
                    className="btn btn-secondary"
                    target="_blank"
                    href={`/b/${b.slug}`}
                  >
                    <ExternalLink size={15} /> View site
                  </Link>
                  <button
                    className="delete-btn"
                    disabled={deleting === b.id}
                    onClick={() => remove(b)}
                    title="Delete business"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
