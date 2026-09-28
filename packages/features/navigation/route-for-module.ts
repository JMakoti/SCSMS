import { moduleRoutes } from "../navigation/module-routes";

export function routeForModule(moduleName: string) {
  return moduleRoutes[moduleName] ?? "/";
}
