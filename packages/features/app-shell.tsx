// "use client";

// import { useEffect, useState, type ReactNode } from "react";
// import { usePathname, useRouter } from "next/navigation";
// import { RefreshCw } from "lucide-react";
// import Sidebar from "@/features/navigation/sidebar";
// import Topbar from "@/features/navigation/topbar";
// import { SearchDialog } from "@/features/dialogs/search-dialog";
// import { AddSchoolDialog } from "@/features/dialogs/school-dialogs";
// import { EditRecordDialog } from "@/features/dialogs/edit-record-dialog";
// import { LoginPage } from "@/features/auth/login-page";
// import { globalStyles } from "@/features/app-styles";
// import { AcademicYearProvider } from "@/features/academic-years/academic-year-context";
// import { routeForModule } from "@/features/navigation/route-for-module";

// type EditDialogState = {
//   active: string;
//   item: string;
// };

// export function AppShell({ children }: { children: ReactNode }) {
//   const router = useRouter();
//   const pathname = usePathname();
//   const [sessionUser, setSessionUser] = useState<{ email: string } | null>(
//     null,
//   );
//   const [collapsed, setCollapsed] = useState(false);
//   const [mobileNavOpen, setMobileNavOpen] = useState(false);
//   const [dialog, setDialog] = useState<string | null>(null);
//   const [editDialog, setEditDialog] = useState<EditDialogState | null>(null);
//   const [dark, setDark] = useState(false);

//   useEffect(() => {
//     setDark(localStorage.getItem("scsms-theme") === "dark");
//   }, []);

//   useEffect(() => {
//     setMobileNavOpen(false);
//   }, [pathname]);

//   useEffect(() => {
//     const handleKeyboardShortcut = (event: KeyboardEvent) => {
//       if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
//         event.preventDefault();
//         setDialog("search");
//       }

//       if (event.key === "Escape") {
//         setDialog(null);
//       }
//     };

//     window.addEventListener("keydown", handleKeyboardShortcut);
//     return () => window.removeEventListener("keydown", handleKeyboardShortcut);
//   }, []);

//   useEffect(() => {
//     const handleEditRecord = (event: Event) => {
//       const detail = (event as CustomEvent<EditDialogState>).detail;

//       if (!detail?.active || !detail?.item) return;

//       setEditDialog({
//         active: detail.active,
//         item: detail.item,
//       });
//     };

//     window.addEventListener("scsms-edit-record", handleEditRecord);
//     return () =>
//       window.removeEventListener("scsms-edit-record", handleEditRecord);
//   }, []);

//   const toggleTheme = () => {
//     setDark((value) => {
//       const next = !value;
//       localStorage.setItem("scsms-theme", next ? "dark" : "light");
//       return next;
//     });
//   };

//   if (!sessionUser) return <LoginPage onLogin={setSessionUser} />;

//   return (
//     <AcademicYearProvider>
//       <div
//         className={`app ${dark ? "dark-theme" : ""} ${
//           mobileNavOpen ? "mobile-nav-open" : ""
//         }`}
//       >
//         <button
//           className="mobile-nav-backdrop"
//           type="button"
//           onClick={() => setMobileNavOpen(false)}
//           aria-label="Close navigation menu"
//         />
//         <Sidebar
//           collapsed={mobileNavOpen ? false : collapsed}
//           setCollapsed={setCollapsed}
//           onCloseMobile={() => setMobileNavOpen(false)}
//         />
//         <div className="app-main">
//           <Topbar
//             onSearch={() => setDialog("search")}
//             onSync={() => router.push("/synchronization")}
//             dark={dark}
//             onTheme={toggleTheme}
//             user={sessionUser}
//             onMenu={() => setMobileNavOpen(true)}
//             onProfile={() => router.push("/profile")}
//             onLogout={() => setSessionUser(null)}
//           />
//           {children}
//           <footer className="statusbar">
//             <span>
//               <span className="online-dot" />
//               Online
//             </span>
//             <span>Last sync: 18 Sep 2026, 02:00 AM</span>
//             <span>
//               <RefreshCw /> 7 pending changes
//             </span>
//             <span className="statusbar-spacer" />
//             <span>
//               Local database: <b>Healthy</b>
//             </span>
//             <span>SC-SMS v1.0.0</span>
//           </footer>
//         </div>
//         {dialog === "search" && (
//           <SearchDialog
//             onClose={() => setDialog(null)}
//             setActive={(moduleName) => router.push(routeForModule(moduleName))}
//           />
//         )}
//         {dialog === "add" && (
//           <AddSchoolDialog onClose={() => setDialog(null)} />
//         )}
//         {editDialog && (
//           <EditRecordDialog
//             active={editDialog.active}
//             item={editDialog.item}
//             onClose={() => setEditDialog(null)}
//           />
//         )}
//         <style jsx global>
//           {globalStyles}
//         </style>
//       </div>
//     </AcademicYearProvider>
//   );
// }

// export default AppShell;
