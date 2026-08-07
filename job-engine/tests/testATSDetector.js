import detectATS from "../processors/detectATS.js";

const urls = [
  "https://boards.greenhouse.io/openai/jobs/12345",

  "https://jobs.lever.co/notion/abc",

  "https://jobs.ashbyhq.com/openai/xyz",

  "https://apply.workable.com/company/job",

  "https://careers.smartrecruiters.com/company/job",

  "https://jobs.gusto.com/postings/company/job",

  "https://company.wd1.myworkdayjobs.com/en-US/Careers/job",

  "https://careers.company.com/jobs/software-engineer",

  "https://www.oraclecloud.com/careers/job123",

  "https://company.icims.com/jobs/123",

  "https://company.taleo.net/careersection/jobdetail.ftl",

  "https://jobs.successfactors.com/job/123",
];

for (const url of urls) {
  const ats = detectATS(url);

  console.log(
    ats.platform.padEnd(20),
    "|",
    ats.supported ? "SUPPORTED" : "GENERIC ",
    "|",
    ats.host,
  );
}
