import type { SchoolContactGroup } from "../../types/fixtures";

export const schoolContactGroups = [
  {
    title: "Head teacher",
    person: {
      name: "John Kamau",
      email: "john.kamau@gmail.com",
      contacts: [
        { label: "Head teacher contact 1", phone: "+254 700 000 014" },
        { label: "Head teacher contact 2", phone: "+254 700 000 015" },
      ],
    },
  },
  {
    title: "Deputy head teacher",
    person: {
      name: "David Mwangi",
      email: "david.mwangi@gmail.com",
      contacts: [
        { label: "Deputy contact 1", phone: "+254 700 000 016" },
        { label: "Deputy contact 2", phone: "+254 700 000 017" },
      ],
    },
  },
  {
    title: "Senior teacher",
    person: {
      name: "Samuel Kiptoo",
      email: "samuel.kiptoo@gmail.com",
      contacts: [
        { label: "Senior teacher contact 1", phone: "+254 700 000 018" },
        { label: "Senior teacher contact 2", phone: "+254 700 000 019" },
      ],
    },
  },
] satisfies SchoolContactGroup[];
