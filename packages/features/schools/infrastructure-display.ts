export function formatInfrastructureFacilityStatus(status: string) {
  switch (status.toLowerCase().replaceAll("_", " ")) {
    case "pending":
      return "Pending";
    case "active":
      return "Active";
    case "completed":
      return "Completed";
    case "needs repair":
      return "Needs repair";
    case "unavailable":
      return "Unavailable";
    default:
      return status;
  }
}

export function formatInfrastructureProjectStatus(status: string) {
  switch (status.toLowerCase().replaceAll("_", " ")) {
    case "planned":
      return "Active";
    case "in progress":
      return "Ongoing";
    case "completed":
      return "Completed";
    case "deferred":
      return "Delayed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}
