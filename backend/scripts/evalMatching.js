// backend/scripts/evalMatching.js
//
// Ranking regression eval: asserts that RELEVANT jobs outrank IRRELEVANT ones
// for a set of candidate fixtures. Run before shipping any scorer change:
//
//   node backend/scripts/evalMatching.js
//
// Exit code 0 = all assertions pass. This encodes the manually-verified cases
// from earlier matching reports (business-analysis / data-analytics / devops /
// network-engineering) so a "recalibration" can never silently wreck ranking
// again — the exact failure mode a previous denominator change caused.

import {
  scoreMatch,
  computeDescSkillScores,
  softCap,
  adaptiveWeights,
} from "../src/services/matching/scoreMatch.js";
import { canonical } from "../src/knowledge/skills.js";

let failures = 0;
function assert(cond, msg) {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    console.error(`  ❌ ${msg}`);
    failures++;
  }
}

const CANDIDATES = {
  dataAnalyst: {
    role_family: "data-analytics",
    seniority: "mid",
    years: 4,
    education_level: "masters",
    skills: ["SQL", "Python", "Tableau", "Power BI", "Excel", "Data Visualization", "ETL"],
    country: "USA",
    open_to_relocate: true,
    target_locations: [],
  },
  devops: {
    role_family: "devops",
    seniority: "senior",
    years: 7,
    education_level: "bachelors",
    skills: ["AWS", "Kubernetes", "Terraform", "Docker", "CI/CD", "Python", "Linux", "Jenkins"],
    country: "USA",
    open_to_relocate: true,
    target_locations: [],
  },
  networkEng: {
    role_family: "network-engineering",
    seniority: "mid",
    years: 5,
    education_level: "bachelors",
    skills: ["BGP", "OSPF", "Cisco", "Routing", "Switching", "Firewall", "VPN", "SD-WAN"],
    country: "USA",
    open_to_relocate: true,
    target_locations: [],
  },
};

function job(overrides) {
  return {
    title: "",
    company: "TestCo",
    location: "Austin, TX",
    country: "USA",
    role_family: "other",
    min_years: 0,
    skills_required: [],
    skills_preferred: [],
    description: "",
    ...overrides,
  };
}

function scorePair(candidate, jobs) {
  computeDescSkillScores(candidate, jobs);
  return jobs.map((j) => scoreMatch(candidate, j));
}

console.log("── Ranking: relevant must outrank irrelevant ──");
{
  const c = CANDIDATES.dataAnalyst;
  const jobs = [
    job({
      title: "Data Analyst",
      role_family: "data-analytics",
      min_years: 3,
      skills_required: ["SQL", "Tableau", "Python", "Excel"],
      description:
        "We are hiring a Data Analyst to build dashboards in Tableau and Power BI, write complex SQL, automate ETL pipelines in Python, and present insights to stakeholders. ".repeat(3),
    }),
    job({
      title: "Sales Operations Manager",
      role_family: "other",
      skills_required: ["Excel", "SQL"],
      description:
        "Sales Operations Manager to run pipeline reviews, quota planning, CRM hygiene in Salesforce, commissions, and territory design. Some Excel and SQL reporting. ".repeat(3),
    }),
  ];
  const [rel, irrel] = scorePair(c, jobs);
  assert(rel.score > irrel.score, `Data Analyst job (${rel.score}) > Sales Ops job (${irrel.score})`);
}

{
  const c = CANDIDATES.devops;
  const jobs = [
    job({
      title: "Senior DevOps Engineer",
      role_family: "devops",
      min_years: 5,
      skills_required: ["AWS", "Kubernetes", "Terraform", "CI/CD"],
      description:
        "Senior DevOps Engineer owning AWS infrastructure, Kubernetes clusters, Terraform modules, and CI/CD pipelines in Jenkins and GitHub Actions. ".repeat(3),
    }),
    job({
      title: "Frontend Developer",
      role_family: "frontend-engineering",
      skills_required: ["React", "TypeScript", "CSS"],
      description:
        "Frontend Developer building React applications with TypeScript, CSS, and modern tooling. Docker familiarity a plus. ".repeat(3),
    }),
  ];
  const [rel, irrel] = scorePair(c, jobs);
  assert(rel.score > irrel.score, `Senior DevOps (${rel.score}) > Frontend Dev (${irrel.score})`);
}

console.log("── Soft caps: mismatches capped, not hidden ──");
{
  const c = CANDIDATES.networkEng; // 5y mid
  const big = job({
    title: "Network Engineer",
    role_family: "network-engineering",
    min_years: 10,
    skills_required: ["BGP", "OSPF", "Cisco"],
    description: "Network Engineer with BGP, OSPF, Cisco. ".repeat(5),
  });
  computeDescSkillScores(c, [big]);
  const m = scoreMatch(c, big);
  assert(!m.gated, "10y-min job is NOT hard-gated for a 5y candidate");
  assert(m.score <= 45 && m.capReason, `Score capped (${m.score}) with reason: "${m.capReason}"`);

  // Seniority cap needs a 3+ step gap: senior (3) vs intern (0).
  const cap = softCap(CANDIDATES.devops, job({ title: "DevOps Intern", min_years: 0 }));
  assert(cap && cap.cap <= 40, `Intern role for senior candidate capped at ${cap?.cap} (seniority)`);
}

console.log("── Adaptive weights: sparse rows lean on domain ──");
{
  const sparse = job({ title: "Data Analyst" }); // no min_years/skills/education
  const rich = job({
    title: "Data Analyst",
    min_years: 3,
    skills_required: ["SQL", "Tableau", "Python"],
    education_min: "bachelors",
  });
  const ws = adaptiveWeights(sparse);
  const wr = adaptiveWeights(rich);
  assert(ws.domain > wr.domain, `Sparse row domain weight ${ws.domain} > rich row ${wr.domain}`);
  assert(wr === undefined || wr.domain === 0.45, "Rich rows keep DEFAULT_WEIGHTS");
}

console.log("── Skill normalization: aliases collapse ──");
{
  const cases = [
    ["ReactJS", "react"],
    ["react.js", "react"],
    ["K8s", "kubernetes"],
    ["Postgres", "postgresql"],
    ["CI CD", "ci/cd"],
    ["continuous integration", "ci/cd"],
    ["Amazon Web Services", "aws"],
    ["scikit learn", "scikit-learn"],
    ["RESTful APIs", "rest api"],
    ["Scrum", "agile"],
  ];
  for (const [input, expected] of cases) {
    assert(canonical(input) === expected, `"${input}" → "${canonical(input)}" (expect "${expected}")`);
  }
}

console.log("── US gate still hard ──");
{
  const c = CANDIDATES.dataAnalyst;
  const nonUS = job({
    title: "Data Analyst",
    location: "Bangalore, India",
    country: null,
    role_family: "data-analytics",
  });
  const m = scoreMatch(c, nonUS);
  assert(m.gated, `Non-US job hard-gated: "${m.gateReason}"`);
}

console.log(failures ? `\n${failures} FAILURE(S)` : "\nAll eval assertions passed.");
process.exit(failures ? 1 : 0);
