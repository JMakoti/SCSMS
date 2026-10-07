import type {
  EnrollmentFilterType,
  EnrollmentGradeBand,
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
      label: "Grade 10-12",
      grades: "Senior secondary",
      count: "3 grades",
      tone: "sky",
    },
  ],
} satisfies Record<EnrollmentFilterType, EnrollmentGradeBand[]>;
