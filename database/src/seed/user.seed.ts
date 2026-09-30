import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { roles, users } from "../schema/user";
import { subcounty } from "../schema/subcounty_ward";
import { db } from "../sqlite";

const ADMIN_EMAIL = "admin@scsms.go.ke";

export async function seedAdministrator() {
    console.log("Seeding administrator...");

    // --------------------------------------------------
    // 1. Get or create administrator role
    // --------------------------------------------------

    let administratorRole = await db
        .select()
        .from(roles)
        .where(eq(roles.name, "administrator"))
        .limit(1);

    let role = administratorRole[0];

    if (!role) {
        const inserted = await db
            .insert(roles)
            .values({
                name: "administrator",
                description: "System administrator with full access to SCSMS.",
                permissionsJson: JSON.stringify(["*"]),
                isSystem: true,
            })
            .returning();

        role = inserted[0];

        console.log("✓ Administrator role created");
    } else {
        console.log("✓ Administrator role already exists");
    }

    // --------------------------------------------------
    // 2. Find the active sub-county
    // --------------------------------------------------

    const activeSubCounty = await db
        .select()
        .from(subcounty)
        .where(eq(subcounty.isActive, true))
        .limit(1);

    if (!activeSubCounty[0]) {
        throw new Error(
            "No active sub-county found. Seed the sub-county before creating the administrator.",
        );
    }

    // --------------------------------------------------
    // 3. Check whether admin already exists
    // --------------------------------------------------

    const existingAdmin = await db
        .select()
        .from(users)
        .where(eq(users.email, ADMIN_EMAIL))
        .limit(1);

    if (existingAdmin[0]) {
        console.log(`✓ ${ADMIN_EMAIL} already exists — skipping`);

        return;
    }

    // --------------------------------------------------
    // 4. Get password from environment
    // --------------------------------------------------

    const password = process.env.SCSMS_ADMIN_PASSWORD;

    if (!password) {
        throw new Error(
            "SCSMS_ADMIN_PASSWORD environment variable is required.",
        );
    }

    if (password.length < 6) {
        throw new Error(
            "SCSMS_ADMIN_PASSWORD must contain at least 12 characters.",
        );
    }

    // --------------------------------------------------
    // 5. Hash password
    // --------------------------------------------------

    const passwordHash = await bcrypt.hash(password, 6);

    // --------------------------------------------------
    // 6. Create administrator
    // --------------------------------------------------

    await db.insert(users).values({
        roleId: role.id,
        subcountyId: activeSubCounty[0].id,
        name: "System Administrator",
        email: ADMIN_EMAIL,
        passwordHash,
        status: "active",
    });

    console.log(`✓ Administrator created: ${ADMIN_EMAIL}`);
}