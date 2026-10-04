import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "../postgres";
import { subcounty } from "../postgress-schemas/subcounty_ward";
import { roles, users } from "../postgress-schemas/user";

const ADMIN_EMAIL = "admin@scsms.go.ke";

export async function seedAdministrator() {
  console.log("Seeding administrator...");

  const administratorRole = await db
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

    console.log("Administrator role created");
  } else {
    console.log("Administrator role already exists");
  }

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

  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .limit(1);

  if (existingAdmin[0]) {
    console.log(`${ADMIN_EMAIL} already exists - skipping`);
    return;
  }

  const password = process.env.SCSMS_ADMIN_PASSWORD;

  if (!password) {
    throw new Error("SCSMS_ADMIN_PASSWORD environment variable is required.");
  }

  if (password.length < 8) {
    throw new Error("SCSMS_ADMIN_PASSWORD must contain at least 8 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 6);

  await db.insert(users).values({
    roleId: role.id,
    subcountyId: activeSubCounty[0].id,
    name: "System Administrator",
    email: ADMIN_EMAIL,
    passwordHash,
    status: "active",
  });

  console.log(`Administrator created: ${ADMIN_EMAIL}`);
}
