import { extractSkills } from "../collectors/processors/extractSkills.js";

const description = `
We are looking for a Software Engineer with:

React
TypeScript
Node.js
AWS
Docker

Experience building scalable systems.
`;

const skills = extractSkills(description);

console.log(skills);
