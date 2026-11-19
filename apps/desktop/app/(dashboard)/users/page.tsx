"use client";

import { invoke, isTauri } from "@tauri-apps/api/core";
import { CheckCircle2, Clock3, RefreshCw, Search, ShieldCheck, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@scsms/features/ui/page-header";
import ModuleRoutePage from "@scsms/features/pages/module-route-page";
import { useDesktopRole } from "@/app/session-context";
import styles from "./review.module.css";

type Account = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  roleId: string;
  subcounty: string | null;
  subcountyId: string | null;
  status: string;
  createdAt: string;
};

type Filter = "inactive" | "all" | "active" | "locked";
type Action = "verify" | "lock" | "unlock" | "role" | "delete";
type AccountOptions = { currentUserId: string; roles: { id: string; name: string }[] };

export default function UsersPage() {
  const role = useDesktopRole();
  if (role?.trim().toLowerCase() !== "administrator") {
    return <ModuleRoutePage active="Users & Roles" />;
  }
  return <AccountManagementPage />;
}

function AccountManagementPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Account | null>(null);
  const [action, setAction] = useState<Action>("verify");
  const [newRole, setNewRole] = useState("");
  const [options, setOptions] = useState<AccountOptions | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!isTauri()) throw new Error("Open the desktop app to review accounts.");
      const [rows, available] = await Promise.all([invoke<Account[]>("review_accounts"), invoke<AccountOptions>("account_review_options")]);
      setAccounts(rows);
      setOptions(available);
      setError("");
    } catch (reason) {
      setAccounts([]);
      setOptions(null);
      setError(typeof reason === "string" ? reason : reason instanceof Error ? reason.message : "Unable to load accounts.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => { void load(); };
    window.addEventListener("scsms:feature-data-refresh", refresh);
    return () => window.removeEventListener("scsms:feature-data-refresh", refresh);
  }, [load]);

  const visible = accounts.filter((account) =>
    (filter === "all" || account.status === filter) &&
    [account.name, account.email, account.phone, account.role, account.subcounty].some((value) => value?.toLowerCase().includes(search.trim().toLowerCase())),
  );
  const pending = accounts.filter((account) => account.status === "inactive").length;
  const active = accounts.filter((account) => account.status === "active").length;

  function openAction(account: Account, next: Action) {
    setNotice(""); setError(""); setSelected(account); setAction(next); setNewRole(account.roleId);
  }

  async function submitAction() {
    if (!selected || saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      if (action === "verify") {
        await invoke("activate_account", { accountId: selected.id, expectedRoleId: selected.roleId, expectedSubcountyId: selected.subcountyId });
      } else {
        await invoke("manage_reviewed_account", { input: { accountId: selected.id, expectedStatus: selected.status, expectedRoleId: selected.roleId, action, newRoleId: action === "role" ? newRole : null } });
      }
      const result = { verify: "verified and activated", lock: "locked", unlock: "unlocked and marked inactive", role: "updated", delete: "deleted" }[action];
      setNotice(`${selected.name}'s account was ${result}.`);
      setSelected(null);
      await load();
    } catch (reason) {
      setError(typeof reason === "string" ? reason : reason instanceof Error ? reason.message : "Unable to update account.");
    } finally { setSaving(false); }
  }

  return <div className="content">
    <PageHeader title="Account management" eyebrow="Administration" description="Review accounts, manage access and verify new users." action={<button type="button" className={styles.refresh} onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Refresh</button>} />
    {error && <div className={styles.error} role="alert">{error}</div>}
    {notice && <div className={styles.notice} role="status">{notice}</div>}
    {!error && <>
      <div className={styles.stats}>
        <div className={styles.stat}><span className={styles.statIcon}><Clock3 size={18} /></span><div><span>Awaiting review</span><strong>{loading ? "—" : pending}</strong><small>Inactive accounts</small></div></div>
        <div className={styles.stat}><span className={styles.statIcon}><CheckCircle2 size={18} /></span><div><span>Active accounts</span><strong>{loading ? "—" : active}</strong><small>Can sign in</small></div></div>
        <div className={styles.stat}><span className={styles.statIcon}><Users size={18} /></span><div><span>Total accounts</span><strong>{loading ? "—" : accounts.length}</strong><small>All statuses</small></div></div>
      </div>
      <section className={styles.panel}>
        <div className={styles.heading}><div><h2>Accounts</h2><p>Review each account and manage its role and access.</p></div><ShieldCheck size={20} aria-hidden="true" /></div>
        <div className={styles.toolbar}>
          <label className={styles.search}><Search size={16} /><span className={styles.srOnly}>Search accounts</span><input type="search" placeholder="Search name, email, role or sub-county" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <label className={styles.filter}>Status <select value={filter} onChange={(event) => setFilter(event.target.value as Filter)}><option value="inactive">Awaiting review</option><option value="all">All accounts</option><option value="active">Active</option><option value="locked">Locked</option></select></label>
        </div>
        <div className="table-scroll"><table><thead><tr><th>Account</th><th>Role</th><th>Sub-county</th><th>Created</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {visible.map((account) => <tr key={account.id}><td><strong>{account.name}</strong><span className={styles.email}>{account.email}</span>{account.phone && <span className={styles.email}>{account.phone}</span>}</td><td>{account.role}</td><td>{account.subcounty || "Not assigned"}</td><td>{account.createdAt.slice(0, 10)}</td><td><span className={`${styles.badge} ${account.status === "inactive" ? styles.pending : account.status === "active" ? styles.active : styles.locked}`}>{account.status}</span></td><td>{account.id === options?.currentUserId ? <span className={styles.muted}>Your account</span> : <div className={styles.rowActions}>
            {account.status === "inactive" && <button type="button" className={styles.review} onClick={() => openAction(account, "verify")}>Verify</button>}
            {(account.status === "inactive" || account.status === "active") && <button type="button" className={styles.rowButton} onClick={() => openAction(account, "lock")}>Lock</button>}
            {account.status === "locked" && <button type="button" className={styles.rowButton} onClick={() => openAction(account, "unlock")}>Unlock</button>}
            <button type="button" className={styles.rowButton} onClick={() => openAction(account, "role")}>Change role</button>
            <button type="button" className={styles.deleteButton} onClick={() => openAction(account, "delete")}>Delete</button>
          </div>}</td></tr>)}
        </tbody></table></div>
        {loading ? <p className={styles.empty} role="status">Loading accounts…</p> : visible.length === 0 && <p className={styles.empty} role="status">{search ? "No accounts match your search." : filter === "inactive" ? "No inactive accounts to review." : "No accounts in this view."}</p>}
        <p className={styles.footnote}>Inactive includes new requests and previously deactivated accounts. Unlocking returns an account to inactive for review.</p>
      </section>
    </>}
    {selected && <div className={styles.overlay} role="presentation"><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="review-title">
      <div className={styles.dialogIcon}><ShieldCheck size={22} /></div>
      <h2 id="review-title">{{ verify: "Verify this account?", lock: "Lock this account?", unlock: "Unlock this account?", role: "Change account role", delete: "Delete this account?" }[action]}</h2>
      <p>{{ verify: "Confirm the person's identity and access before activating their account.", lock: "This account will no longer be able to sign in.", unlock: "The account will become inactive and must be verified before it can sign in.", role: "Choose the role to assign to this account.", delete: "This permanently deletes the account. Related reports will no longer identify it as their creator." }[action]}</p>
      <dl><div><dt>Name</dt><dd>{selected.name}</dd></div><div><dt>Email</dt><dd>{selected.email}</dd></div><div><dt>Phone</dt><dd>{selected.phone || "Not provided"}</dd></div><div><dt>Current role</dt><dd>{selected.role}</dd></div><div><dt>Sub-county</dt><dd>{selected.subcounty || "Not assigned"}</dd></div></dl>
      {action === "role" && <label className={styles.rolePicker}>New role<select value={newRole} onChange={(event) => setNewRole(event.target.value)}>{options?.roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>}
      {((action === "verify" && selected.role.toLowerCase() === "administrator") || (action === "role" && options?.roles.find((role) => role.id === newRole)?.name.toLowerCase() === "administrator")) && <p className={styles.warning}>This grants administrator access. Verify this role carefully.</p>}
      {error && <div className={styles.error} role="alert">{error}</div>}
      <div className={styles.actions}><button type="button" onClick={() => { setSelected(null); setError(""); }} disabled={saving}>Cancel</button><button type="button" className={`${styles.confirm} ${action === "delete" ? styles.danger : ""}`} onClick={() => void submitAction()} disabled={saving || (action === "role" && newRole === selected.roleId)}>{saving ? "Saving…" : { verify: "Verify and activate", lock: "Lock account", unlock: "Unlock account", role: "Update role", delete: "Delete account" }[action]}</button></div>
    </section></div>}
  </div>;
}
