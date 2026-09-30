import { eq } from "drizzle-orm";
import { subcounty } from "../schema/subcounty_ward";
import { db } from "../sqlite";

const subCounties = [
    {
        county: "Kilifi",
        countyCode: "003",
        subCounty: "Rabai",
        subCountyCode: "00301",
        constituency: "Rabai",
        constituencyCode: "00301",
        notes: "Rabai Sub-County",
    },
];

export async function seedSubCounties() {
    console.log("Seeding sub-county...");

    for (const item of subCounties) {
        const existing = await db
            .select({ id: subcounty.id })
            .from(subcounty)
            .where(eq(subcounty.subCountyCode, item.subCountyCode))
            .limit(1);

        if (existing.length > 0) {
            console.log(
                `✓ ${item.subCounty} already exists — skipping`,
            );
            continue;
        }

        await db.insert(subcounty).values(item);

        console.log(`✓ Created ${item.subCounty}`);
    }

    console.log("Sub-county seeding complete.");
}