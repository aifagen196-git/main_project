const collectors = [
  ["greenhouse", "../collectors/greenhouse.js"],
  ["ashby", "../collectors/ashby.js"],
  ["lever", "../collectors/lever.js"],
  ["workable", "../collectors/workable.js"],
  ["smartrecruiters", "../collectors/smartrecruiters.js"],
  ["linkedin", "../collectors/linkedin.js"],
  ["indeed", "../collectors/indeed.js"],
];

for (const [name, modulePath] of collectors) {
  const mod = await import(modulePath);
  if (typeof mod.default !== "function") {
    throw new Error(`${name} collector does not export a default function`);
  }
  console.log(`${name}: import OK`);
}
