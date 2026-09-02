// collectors/config/teamtailorCompanies.js
//
// Teamtailor career-site slugs the collector scrapes.
//
// A slug is the subdomain a company uses at https://{slug}.teamtailor.com
// The public, unauthenticated feed lives at https://{slug}.teamtailor.com/jobs.json
// (a JSON Feed per jsonfeed.org, with a schema.org JobPosting embedded in
// each item under `_jobposting`). This is separate from Teamtailor's
// authenticated Partner API (api.teamtailor.com), which needs a per-company
// token and is NOT what this collector uses.
//
// Companies below were confirmed live on 2026-07-31 by hitting the endpoint
// directly. Run `npm run verify:teamtailor` before a real scrape — boards
// close down over time.

const companies = [
  "career", // Teamtailor's own careers board — 17 live jobs confirmed
  "recruitgo", // RecruitGo (EOR/global hiring platform) — 42 live jobs confirmed
  "oneflow", // Oneflow (SE, e-signature/contract SaaS) — 6 live jobs confirmed
  "tenzo", // Tenzo (UK, hospitality analytics) — 4 live jobs confirmed
  "fredperry", // Fred Perry (UK, fashion retail) — 12 live jobs confirmed

  // Sourced from Prospeo's Teamtailor-customer list, slugs verified live via
  // jobs.json on 2026-07-31 (job counts as of that check). Teamtailor 404s
  // for a subdomain with no board, so every slug here is a real company.
  "theworks", // The Works Stores (UK, retail) — 88 live jobs
  "jobmatchingpartner", // JobMatchingPartner (SE, recruitment agency) — 87 live jobs
  "stellenmanufaktur", // Stellenmanufaktur (DE, recruitment agency) — 56 live jobs
  "danda", // Danda (SE, staffing/gig platform) — 49 live jobs
  "aramisauto", // Aramisauto (FR, used-car marketplace) — 25 live jobs
  "novumglobal", // Novum Global (restructuring/insolvency advisory) — 20 live jobs
  "groundcontrol", // Ground Control (UK, events/production) — 16 live jobs
  "talentxd", // TalentXD (recruitment agency) — 13 live jobs
  "tjintokk", // Tjintokk (SE, staffing agency) — 12 live jobs
  "talentogrupointernacional", // Talento Grupo Internacional (staffing agency) — 12 live jobs
  "theformula", // The Formula Consulting (DE, consulting) — 9 live jobs
  "thepanda", // The Panda (NO, staffing agency) — 8 live jobs
  "txservices", // TX Services (RS, business services) — 8 live jobs
  "qarat", // Qarat (SE, recruitment agency) — 7 live jobs
  "macavoy", // Macavoy (SE, recruitment agency) — 6 live jobs
  "equality", // EQuality Rekrytering & Interim (SE, recruitment agency) — 5 live jobs
  "flit", // Flit (SE, recruitment agency) — 5 live jobs
  "unisale", // Unisale (SE, sales recruitment) — 4 live jobs
  "tombola", // tombola (UK, online bingo/gaming) — 4 live jobs
  "talentconnection", // Talent Connection NZ (recruitment agency) — 4 live jobs
  "academix", // Academix (SE, education recruitment) — 4 live jobs
  "followu", // FollowU (SE, recruitment agency) — 4 live jobs
  "factor7", // Factor 7 (DK, consulting) — 4 live jobs
  "mercadonatech", // Mercadona Tech (ES, retail tech) — 3 live jobs
  "balancedevelopment", // Balance Development (SE, recruitment agency) — 3 live jobs
  "jobbarenan", // JobbArenan (SE, recruitment agency) — 3 live jobs
  "hronline", // HR-Online (SE, recruitment agency) — 2 live jobs
  "icw", // ICW (SE, recruitment agency) — 1 live job

  // Additional well-known Nordic/EU brands, individually probed against
  // jobs.json on 2026-08-03 (job counts as of that check).
  "polestar", // Polestar (SE, EV automotive) — 29 live jobs
  "storytel", // Storytel (SE, audiobook/streaming) — 7 live jobs
  "lunar", // Lunar (DK, neobank) — 5 live jobs
  "hemnet", // Hemnet (SE, real-estate marketplace) — 4 live jobs
  "detectify", // Detectify (SE, security/attack-surface monitoring) — 4 live jobs
  "vivino", // Vivino (DK, wine marketplace) — 3 live jobs
  "qasa", // Qasa (SE, rental housing marketplace) — 2 live jobs
  "flowscape", // Flowscape (SE, workplace/desk-booking SaaS) — 2 live jobs
  "doconomy", // Doconomy (SE, climate fintech) — 1 live job
  "mathem", // MatHem (SE, online grocery) — 1 live job

  // Batch-probed against jobs.json on 2026-08-04 from a candidate list of
  // ~290 Nordic/EU/UK brand-name guesses (job counts as of that check).
  "hemfrid", // Hemfrid (SE, home cleaning services) — 100 live jobs
  "made", // Made.com (UK, furniture/home goods) — 44 live jobs
  "schibsted", // Schibsted (NO, media/marketplaces group) — 27 live jobs
  "oatly", // Oatly (SE, oat-milk food company) — 15 live jobs
  "cazoo", // Cazoo (UK, online used-car retailer) — 11 live jobs
  "maersk", // Maersk (DK, shipping/logistics) — 10 live jobs
  "remarkable", // reMarkable (NO, e-paper tablets) — 10 live jobs
  "qliro", // Qliro (SE, fintech/checkout) — 9 live jobs
  "signicat", // Signicat (NO, digital identity) — 7 live jobs
  "vipps", // Vipps (NO, mobile payments) — 7 live jobs
  "brite", // Brite Payments (SE, open banking payments) — 6 live jobs
  "bookbeat", // BookBeat (SE, audiobook/e-book streaming) — 4 live jobs
  "trifork", // Trifork (DK, software consultancy) — 1 live job
  "matas", // Matas (DK, health/beauty retail) — 1 live job
  "templafy", // Templafy (DK, document generation SaaS) — 1 live job

  // Cross-portal sweep of company wishlist, verified live via jobs.json on 2026-08-14
  "payfit", // PayFit (FR, payroll SaaS) — 13 live jobs
  "spacelift", // Spacelift (IaC platform) — 12 live jobs
  "akeneo", // Akeneo (PIM software) — 13 live jobs
  "gitguardian", // GitGuardian (secrets detection/security) — 38 live jobs
  "hivebrite", // Hivebrite (community platform) — 3 live jobs
  "launchmetrics", // Launchmetrics (fashion/beauty SaaS) — 9 live jobs
  "techsee", // TechSee (visual/AR support) — 3 live jobs
  "teamviewer", // TeamViewer — 100 live jobs
  "unleash", // Unleash (feature flags) — 4 live jobs
  "hedvig", // Hedvig (SE, insurtech) — 8 live jobs
  "keepit", // Keepit (SaaS backup) — 37 live jobs
  "powerfleet", // PowerFleet (IoT fleet management) — 38 live jobs
  "exotrail", // Exotrail (space propulsion) — 40 live jobs
  "ml6", // ML6 (AI consultancy) — 12 live jobs
];

export default companies;
