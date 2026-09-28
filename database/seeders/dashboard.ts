import type {
  DashboardGenderDistribution,
  DashboardRecentActivity,
  DashboardWardBar,
} from "../../packages/features/types/seeders";

export const dashboardWardBars = [
  { label: "Ward A", value: 82 },
  { label: "Ward B", value: 64 },
  { label: "Ward C", value: 94 },
  { label: "Ward D", value: 53 },
  { label: "Ward E", value: 71 },
] satisfies DashboardWardBar[];

export const dashboardGenderDistribution = [
  {
    label: "Male",
    value: 24786,
    tone: "male",
  },
  {
    label: "Female",
    value: 23839,
    tone: "female",
  },
] satisfies DashboardGenderDistribution[];

export const dashboardRecentActivities = [
  {
    icon: "Pencil",
    title: "School updated",
    entity: "Mwangaza Primary School",
    time: "10 minutes ago",
    tone: "blue",
  },
  {
    icon: "Plus",
    title: "New school added",
    entity: "Kijani Secondary School",
    time: "35 minutes ago",
    tone: "green",
  },
  {
    icon: "Users",
    title: "Enrollment updated",
    entity: "Bahari Primary School",
    time: "1 hour ago",
    tone: "purple",
  },
  {
    icon: "UserCog",
    title: "Staff record modified",
    entity: "Mombasa Secondary School",
    time: "2 hours ago",
    tone: "amber",
  },
] satisfies DashboardRecentActivity[];
