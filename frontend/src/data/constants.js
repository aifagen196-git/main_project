import {
  LayoutDashboard,
  Briefcase,
  FileText,
  MessageSquare,
  BarChart3,
  Bookmark,
  Settings,
  Send,
  BadgeCheck,
  Calendar,
  Mail,
  Target,
} from "lucide-react";


export const STAT_TINT = {
  violet: {
    bg: "bg-brand-50",
    fg: "brand",
  },

  emerald: {
    bg: "bg-emerald-50",
    fg: "text-emerald-600",
  },

  rose: {
    bg: "bg-rose-50",
    fg: "text-rose-600",
  },

  sky: {
    bg: "bg-sky-50",
    fg: "text-sky-600",
  },

  amber: {
    bg: "bg-amber-50",
    fg: "text-amber-600",
  },
};

export const DASH_STATS = [
  {
    t: "Job Matches",
    v: "128",
    d: "24 new matches",
    icon: Briefcase,
    tint: "violet",
  },
  {
    t: "Applications",
    v: "34",
    d: "8 this week",
    icon: Send,
    tint: "emerald",
  },
  {
    t: "Interviews",
    v: "5",
    d: "2 this week",
    icon: MessageSquare,
    tint: "rose",
  },
  {
    t: "Offers",
    v: "2",
    d: "Keep it up!",
    icon: BadgeCheck,
    tint: "sky",
  },
];

export const TASKS = [
  {
    t: "Prepare for Google interview",
    s: "Product Designer · In 2 days",
    icon: Calendar,
  },
  {
    t: "Optimize resume for UX roles",
    s: "High impact",
    icon: FileText,
  },
  {
    t: "Follow up with Airbnb",
    s: "Applied 5 days ago",
    icon: Mail,
  },
  {
    t: "Complete skills assessment",
    s: "Due in 3 days",
    icon: Target,
  },
];

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
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
  },
];