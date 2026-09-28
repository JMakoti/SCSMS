import type { StaffRecord } from "../../packages/features/types/seeders";

export const staffRecords = [
  {
    name: "John Kamau",
    role: "Head Teacher",
    type: "Teaching",
    phone: "+254 700 000 014",
    status: "Active",
  },
  {
    name: "Grace Akinyi",
    role: "Deputy Head Teacher",
    type: "Teaching",
    phone: "+254 700 000 017",
    status: "Active",
  },
  {
    name: "Peter Otieno",
    role: "Accounts Clerk",
    type: "Non-teaching",
    phone: "+254 700 000 021",
    status: "Active",
  },
  {
    name: "Mary Wanjiku",
    role: "Support Staff",
    type: "Non-teaching",
    phone: "+254 700 000 024",
    status: "On leave",
  },
] satisfies StaffRecord[];
