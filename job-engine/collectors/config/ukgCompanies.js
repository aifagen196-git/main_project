// collectors/config/ukgCompanies.js
//
// UKG Pro Recruiting (formerly UltiPro) career sites the collector scrapes
// via the public LoadSearchResults / OpportunityDetail endpoints at
// recruiting.ultipro.com/{companyCode}/JobBoard/{boardGuid}.
//
// Both companyCode (an internal UKG account code, e.g. "BUI1004BMDI") and
// boardGuid are opaque and not derivable from the company's actual name —
// there is no discovery API, same situation as Workday/Oracle. Verify
// additions with `npm run verify:ukg <companyCode>/<boardGuid>` first.
//
// Verified live 2026-08-05.

const companies = [
  {
    company: "bridgetown-windows-and-doors",
    companyCode: "BUI1004BMDI",
    boardGuid: "6b442184-52a5-4635-8db5-5aa4bed2a563",
  },
  {
    company: "ukg-tenant-hol1002hphm",
    companyCode: "HOL1002HPHM",
    boardGuid: "be27b89b-3cb9-491f-a1b0-42f8b077a9dd",
  },
  {
    company: "ukg-tenant-kwp1000kwp",
    companyCode: "KWP1000KWP",
    boardGuid: "71ac9ad7-0b69-4732-b40e-01f3dce289e2",
  },
  {
    company: "fraser",
    companyCode: "fra1008",
    boardGuid: "a2c01f70-5455-0bf5-510b-7d25ebd4336c",
  },
];

export default companies;
