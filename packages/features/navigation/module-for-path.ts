import { moduleRoutes } from "../navigation/module-routes";

export function moduleForPath(pathname: string) {
  const match = Object.entries(moduleRoutes)
    .filter(
      ([, route]) =>
        route === pathname || (route !== "/" && pathname.startsWith(route)),
    )
    .sort((a, b) => b[1].length - a[1].length)[0];

  return match?.[0] ?? "Dashboard";
}
