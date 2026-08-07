export const OUTCOME = [
  {
    n: "Applied",
    v: 24,
    c: "#6d4aff",
  },
  {
    n: "Interviewing",
    v: 8,
    c: "#f43f5e",
  },
  {
    n: "Assessment",
    v: 5,
    c: "#f59e0b",
  },
  {
    n: "Offered",
    v: 2,
    c: "#22c55e",
  },
  {
    n: "Rejected",
    v: 10,
    c: "#cbd5e1",
  },
];

export const TREND = [
  { d: "May 1", a: 2, i: 1 },
  { d: "May 6", a: 9, i: 2 },
  { d: "May 11", a: 16, i: 4 },
  { d: "May 16", a: 24, i: 6 },
  { d: "May 21", a: 33, i: 9 },
  { d: "May 26", a: 42, i: 11 },
  { d: "May 31", a: 48, i: 12 },
];

export const ANA_STATS = [
  {
    t: "Applications",
    v: "48",
    d: "20% vs last",
    tint: "violet",
  },
  {
    t: "Response Rate",
    v: "27%",
    d: "6% vs last",
    tint: "emerald",
  },
  {
    t: "Interviews",
    v: "12",
    d: "33% vs last",
    tint: "amber",
  },
  {
    t: "Offers",
    v: "3",
    d: "50% vs last",
    tint: "sky",
  },
  {
    t: "Avg. Response",
    v: "6.4d",
    d: "1.2d faster",
    tint: "violet",
  },
];

export const SOURCES = [
  ["AIFAGen Matches", 42],
  ["LinkedIn", 25],
  ["Careers Page", 15],
  ["Referral", 10],
  ["Other", 8],
];

export const CATS = [
  ["Product Design", 5],
  ["UX/UI Design", 4],
  ["Product Management", 2],
  ["User Research", 1],
];

import {
  FileText,
  MessageSquare,
  BadgeCheck,
  TrendingUp,
  Clock,
} from "lucide-react";

export const APP_STATS = [
  {
    t: "Applications",
    v: "39",
    d: "12 this month",
    icon: FileText,
    tint: "violet",
  },
  {
    t: "Interviewing",
    v: "8",
    d: "3 this month",
    icon: MessageSquare,
    tint: "amber",
  },
  {
    t: "Offers",
    v: "2",
    d: "1 this month",
    icon: BadgeCheck,
    tint: "emerald",
  },
  {
    t: "Response Rate",
    v: "26%",
    d: "8% this month",
    icon: TrendingUp,
    tint: "sky",
  },
  {
    t: "Avg. Response",
    v: "6.4d",
    d: "1.2d faster",
    icon: Clock,
    tint: "violet",
  },
];

export const APP_COLS = [
  {
    k: "Applied",
    dot: "bg-brand",
    items: [
      { c: "Stripe", lg: "S", r: "Senior Product Designer", w: "2 days ago", m: 95 },
      { c: "Google", lg: "G", r: "Product Designer", w: "5 days ago", m: 92 },
      { c: "Airbnb", lg: "A", r: "UX Designer", w: "1 week ago", m: 89 },
    ],
  },
  {
    k: "Interviewing",
    dot: "bg-amber-400",
    items: [
      { c: "Microsoft", lg: "M", r: "Product Designer", w: "Round 1", m: 88 },
      { c: "Notion", lg: "N", r: "UX Researcher", w: "Round 2", m: 85 },
      { c: "Canva", lg: "Ca", r: "Product Designer", w: "Take Home", m: 83 },
    ],
  },
  {
    k: "Assessment",
    dot: "bg-sky-400",
    items: [
      { c: "Amazon", lg: "Am", r: "Product Designer", w: "Take Home", m: 80 },
      { c: "Spotify", lg: "Sp", r: "UX Designer", w: "Skills Test", m: 78 },
    ],
  },
  {
    k: "Offer",
    dot: "bg-emerald-500",
    items: [
      { c: "Linear", lg: "I", r: "Senior Product Designer", w: "Offer received", m: 95 },
      { c: "Figma", lg: "U", r: "Product Designer", w: "Offer received", m: 92 },
    ],
  },
  {
    k: "Rejected",
    dot: "bg-rose-400",
    items: [
      { c: "Twitter", lg: "G", r: "UX Designer", w: "Closed", m: 0 },
      { c: "Pinterest", lg: "A", r: "Product Designer", w: "Closed", m: 0 },
    ],
  },
];