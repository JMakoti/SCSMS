// Seed Runner
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
    path: path.resolve(__dirname, "../../../.env"),
});

import { seedSubCounties } from "./subcounty.seed";
import { seedAdministrator } from "./user.seed";

async function main() {
    await seedSubCounties();
    await seedAdministrator();
}

main()
    .then(() => {
        console.log("Database seeding completed.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Database seeding failed:", error);
        process.exit(1);
    });