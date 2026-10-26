import { LayoutDashboard, Briefcase, Building2, FileText, Bookmark } from "lucide-react";

// Sidebar entries of the signed-in app (Sidebar.jsx, AppShell.jsx).
export const NAV = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "matches",
    label: "Job Matches",
    icon: Briefcase,
  },
  {
    id: "internal-jobs",
    label: "Internal Jobs",
    icon: Building2,
  },
  {
    id: "applications",
    label: "Applications",
    icon: FileText,
  },
  {
    id: "resume",
    label: "Resume",
    icon: FileText,
  },
  // HIDDEN — Analytics is built and working (pages/Analytics.jsx against
  // GET /api/analytics), but every figure derives from self-reported status
  // updates: nothing detects an employer reply, so the numbers are only as
  // current as the user's own tracker edits. Re-enable this entry, and the
  // /analytics route in AppShell, once application status can be captured
  // reliably (an explicit "responded on" field, or mailbox integration).
  // {
  //   id: "analytics",
  //   label: "Analytics",
  //   icon: BarChart3,
  // },
  {
    id: "saved",
    label: "Saved Jobs",
    icon: Bookmark,
  },
  // Settings is not a NAV entry — it's reached via the account button at the
  // bottom of the sidebar (Sidebar.jsx), which links straight to /settings.
];