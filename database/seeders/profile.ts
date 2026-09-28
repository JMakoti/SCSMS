import type {
  ProfileDefaults,
  ProfileDetail,
  SchoolGenderDistribution,
  SchoolHistoryActivity,
} from "../../packages/features/types/seeders";

export const profileDetails = [
  ["Email address", "email"],
  ["Phone number", "phone"],
  ["Department", "department"],
  ["Location", "location"],
] satisfies ProfileDetail[];

export const profileDefaults = {
  email: "admin@scsms.go.ke",
  phone: "+254 700 000 001",
  department: "Sub-County Education Office",
  location: "Mombasa County, Kenya",
} satisfies ProfileDefaults;

export const schoolGenderDistribution = [
  {
    label: "Male",
    value: 326,
    tone: "male",
  },
  {
    label: "Female",
    value: 316,
    tone: "female",
  },
] satisfies SchoolGenderDistribution[];

export const schoolHistoryActivities = [
  {
    title: "School profile updated",
    detail: "Contact and registration information updated",
    time: "Today, 10:42 AM",
    icon: "Pencil",
  },
  {
    title: "Infrastructure record updated",
    detail: "Water points condition changed to Needs attention",
    time: "Yesterday, 3:18 PM",
    icon: "Building2",
  },
  {
    title: "Staff record added",
    detail: "Peter Otieno added as Accounts Clerk",
    time: "12 Sep 2026, 9:06 AM",
    icon: "UserCog",
  },
  {
    title: "Enrollment submitted",
    detail: "Term 1 enrollment submitted for PP1-Grade 6",
    time: "08 Sep 2026, 2:24 PM",
    icon: "Users",
  },
] satisfies SchoolHistoryActivity[];
