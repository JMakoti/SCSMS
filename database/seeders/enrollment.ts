import type {
  EnrollmentFilterType,
  EnrollmentGradeBand,
  EnrollmentGradeRow,
  EnrollmentRow,
  GradeEnrollmentSchoolRow,
} from "../../packages/features/types/seeders";

export const enrollmentGradeBands = {
  Primary: [
    {
      label: "PP1-PP3",
      grades: "Early years",
      count: "3 grades",
      tone: "blue",
    },
    {
      label: "Grade 1-6",
      grades: "Primary cycle",
      count: "6 grades",
      tone: "indigo",
    },
  ],
  Junior: [
    {
      label: "Grade 7-9",
      grades: "Junior secondary",
      count: "3 grades",
      tone: "violet",
    },
  ],
  "Senior / Secondary": [
    {
      label: "Grade 10-13",
      grades: "Senior secondary",
      count: "4 grades",
      tone: "sky",
    },
  ],
  "All schools": [
    {
      label: "PP1-PP3",
      grades: "Early years",
      count: "3 grades",
      tone: "blue",
    },
    {
      label: "Grade 1-6",
      grades: "Primary cycle",
      count: "6 grades",
      tone: "indigo",
    },
    {
      label: "Grade 7-9",
      grades: "Junior secondary",
      count: "3 grades",
      tone: "violet",
    },
    {
      label: "Grade 10-13",
      grades: "Senior secondary",
      count: "4 grades",
      tone: "sky",
    },
  ],
} satisfies Record<EnrollmentFilterType, EnrollmentGradeBand[]>;

export const enrollmentRows = [
  {
    school: "Mwangaza Primary School",
    type: "Primary",
    total: 642,
    updated: "Today",
  },
  {
    school: "Bahari Primary School",
    type: "Primary",
    total: 518,
    updated: "Today",
  },
  {
    school: "Kijani Junior School",
    type: "Junior",
    total: 836,
    updated: "Yesterday",
  },
  {
    school: "Tumaini Senior Secondary School",
    type: "Senior / Secondary",
    total: 412,
    updated: "2 days ago",
  },
] satisfies EnrollmentRow[];

export const gradeEnrollmentSchools: Record<
  string,
  GradeEnrollmentSchoolRow[]
> = {
  "PP1-PP3": [
    ["Mwangaza Primary School", 326, 316],
    ["Bahari Primary School", 264, 254],
  ],
  "Grade 1-6": [
    ["Mwangaza Primary School", 326, 316],
    ["Bahari Primary School", 264, 254],
  ],
  "Grade 7-9": [["Kijani Junior School", 421, 415]],
  "Grade 10-13": [["Tumaini Senior Secondary School", 205, 207]],
};

export const enrollmentGradeRows = [
  ["PP1", 18, 16, 34],
  ["PP2", 17, 19, 36],
  ["PP3", 20, 15, 35],
  ["Grade 1", 24, 22, 46],
  ["Grade 2", 21, 25, 46],
  ["Grade 3", 26, 23, 49],
  ["Grade 4", 32, 29, 61],
  ["Grade 5", 28, 31, 59],
  ["Grade 6", 30, 27, 57],
  ["Grade 7", 34, 30, 64],
  ["Grade 8", 31, 35, 66],
  ["Grade 9", 29, 33, 62],
  ["Grade 10", 27, 31, 58],
  ["Grade 11", 25, 28, 53],
  ["Grade 12", 23, 26, 49],
  ["Grade 13", 21, 24, 45],
] satisfies EnrollmentGradeRow[];
