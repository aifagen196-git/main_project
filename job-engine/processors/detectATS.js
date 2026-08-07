/**
 * Detect the ATS/provider from a job URL.
 */

const ATS_RULES = [
  { platform: "greenhouse", domains: ["boards.greenhouse.io"] },
  { platform: "lever", domains: ["jobs.lever.co"] },
  { platform: "ashby", domains: ["jobs.ashbyhq.com"] },
  { platform: "workable", domains: ["apply.workable.com"] },
  { platform: "smartrecruiters", domains: ["careers.smartrecruiters.com"] },

  { platform: "workday", domains: ["myworkdayjobs.com"] },

  { platform: "gusto", domains: ["jobs.gusto.com"] },

  { platform: "oracle", domains: ["oraclecloud.com"] },

  { platform: "icims", domains: ["icims.com"] },

  { platform: "taleo", domains: ["taleo.net"] },

  { platform: "successfactors", domains: ["successfactors.com"] },

  { platform: "bamboohr", domains: ["bamboohr.com"] },

  { platform: "recruitee", domains: ["recruitee.com"] },

  { platform: "teamtailor", domains: ["teamtailor.com"] },
];

export default function detectATS(url = "") {
  let hostname = "";

  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return {
      platform: "unknown",
      host: "",
      supported: false,
    };
  }

  for (const ats of ATS_RULES) {
    if (
      ats.domains.some(
        (domain) => hostname === domain || hostname.endsWith("." + domain),
      )
    ) {
      return {
        platform: ats.platform,
        host: hostname,
        supported: true,
      };
    }
  }

  return {
    platform: "generic",
    host: hostname,
    supported: false,
  };
}
