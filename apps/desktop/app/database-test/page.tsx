"use client";

import { useEffect, useState } from "react";

import {
    getActiveSubCounty,
    getCurrentUser,
    testDatabase,
} from "@/lib/test";

type CurrentUser = {
    id: string;
    name: string;
    email: string;
    status: "active" | "inactive" | "locked";
    roleId: string;
    subcountyId: string | null;
};

type ActiveSubCounty = {
    id: string;
    county: string | null;
    countyCode: string | null;
    subCounty: string | null;
    subCountyCode: string | null;
    constituency: string | null;
    constituencyCode: string | null;
    notes: string | null;
    isActive: boolean;
};

export default function DatabaseTestPage() {
    const [databaseStatus, setDatabaseStatus] =
        useState("Testing SQLite...");

    const [user, setUser] =
        useState<CurrentUser | null>(null);

    const [activeSubCounty, setActiveSubCounty] =
        useState<ActiveSubCounty | null>(null);

    const [loading, setLoading] = useState(true);

    const [error, setError] =
        useState<string | null>(null);

    useEffect(() => {
        async function loadDatabaseData() {
            try {
                setLoading(true);
                setError(null);

                // Test SQLite connection
                const databaseResult = await testDatabase();

                setDatabaseStatus(
                    `SQLite working: ${JSON.stringify(databaseResult)}`
                );

                // Get current user
                const currentUser = await getCurrentUser();

                setUser(currentUser);

                // Get active sub-county
                const subCounty = await getActiveSubCounty();

                setActiveSubCounty(subCounty);
            } catch (error) {
                console.error(
                    "Database test failed:",
                    error
                );

                setError(String(error));

                setDatabaseStatus(
                    "SQLite database connection failed."
                );
            } finally {
                setLoading(false);
            }
        }

        loadDatabaseData();
    }, []);

    return (
        <main className="min-h-screen bg-background p-8">
            <div className="mx-auto max-w-5xl space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">
                        Database Test
                    </h1>

                    <p className="mt-2 text-muted-foreground">
                        Test the Tauri SQLite connection and
                        retrieve the current user and active
                        sub-county.
                    </p>
                </div>

                {/* Database Status */}
                <section className="rounded-xl border bg-card p-6">
                    <h2 className="text-lg font-semibold">
                        Database Connection
                    </h2>

                    <div className="mt-4 rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">
                            Status
                        </p>

                        <p className="mt-1 font-medium">
                            {databaseStatus}
                        </p>
                    </div>
                </section>

                {/* Loading */}
                {loading && (
                    <section className="rounded-xl border bg-card p-6">
                        <p className="text-sm text-muted-foreground">
                            Loading database information...
                        </p>
                    </section>
                )}

                {/* Error */}
                {error && (
                    <section className="rounded-xl border border-destructive/50 bg-destructive/5 p-6">
                        <h2 className="font-semibold text-destructive">
                            Database Error
                        </h2>

                        <pre className="mt-3 overflow-auto whitespace-pre-wrap text-sm text-destructive">
                            {error}
                        </pre>
                    </section>
                )}

                {/* Current User */}
                {!loading && (
                    <section className="rounded-xl border bg-card p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Current User
                                </h2>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    Administrator account stored
                                    in SQLite.
                                </p>
                            </div>

                            <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${
                                    user?.status === "active"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-muted text-muted-foreground"
                                }`}
                            >
                                {user?.status ?? "Not found"}
                            </span>
                        </div>

                        {user ? (
                            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                <InfoItem
                                    label="ID"
                                    value={user.id}
                                />

                                <InfoItem
                                    label="Name"
                                    value={user.name}
                                />

                                <InfoItem
                                    label="Email"
                                    value={user.email}
                                />

                                <InfoItem
                                    label="Role ID"
                                    value={user.roleId}
                                />

                                <InfoItem
                                    label="Sub-County ID"
                                    value={
                                        user.subcountyId ??
                                        "Not assigned"
                                    }
                                />

                                <InfoItem
                                    label="Status"
                                    value={user.status}
                                />
                            </div>
                        ) : (
                            <div className="mt-6 rounded-lg border border-dashed p-6 text-center">
                                <p className="font-medium">
                                    No current user found.
                                </p>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    Make sure the administrator
                                    seed has been executed.
                                </p>
                            </div>
                        )}
                    </section>
                )}

                {/* Active Sub-County */}
                {!loading && (
                    <section className="rounded-xl border bg-card p-6">
                        <div>
                            <h2 className="text-lg font-semibold">
                                Active Sub-County
                            </h2>

                            <p className="mt-1 text-sm text-muted-foreground">
                                The active SCSMS administrative
                                area.
                            </p>
                        </div>

                        {activeSubCounty ? (
                            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                <InfoItem
                                    label="ID"
                                    value={activeSubCounty.id}
                                />

                                <InfoItem
                                    label="County"
                                    value={
                                        activeSubCounty.county ??
                                        "—"
                                    }
                                />

                                <InfoItem
                                    label="County Code"
                                    value={
                                        activeSubCounty.countyCode ??
                                        "—"
                                    }
                                />

                                <InfoItem
                                    label="Sub-County"
                                    value={
                                        activeSubCounty.subCounty ??
                                        "—"
                                    }
                                />

                                <InfoItem
                                    label="Sub-County Code"
                                    value={
                                        activeSubCounty.subCountyCode ??
                                        "—"
                                    }
                                />

                                <InfoItem
                                    label="Constituency"
                                    value={
                                        activeSubCounty.constituency ??
                                        "—"
                                    }
                                />

                                <InfoItem
                                    label="Constituency Code"
                                    value={
                                        activeSubCounty.constituencyCode ??
                                        "—"
                                    }
                                />

                                <InfoItem
                                    label="Active"
                                    value={
                                        activeSubCounty.isActive
                                            ? "Yes"
                                            : "No"
                                    }
                                />

                                <div className="sm:col-span-2">
                                    <InfoItem
                                        label="Notes"
                                        value={
                                            activeSubCounty.notes ??
                                            "—"
                                        }
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="mt-6 rounded-lg border border-dashed p-6 text-center">
                                <p className="font-medium">
                                    No active sub-county found.
                                </p>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    Make sure the sub-county seed
                                    has been executed.
                                </p>
                            </div>
                        )}
                    </section>
                )}
            </div>
        </main>
    );
}

function InfoItem({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-lg border p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
            </p>

            <p className="mt-1 break-all text-sm font-medium">
                {value}
            </p>
        </div>
    );
}
