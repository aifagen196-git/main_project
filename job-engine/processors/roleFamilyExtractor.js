/**
 * Classify a job into a role family.
 */

const ROLE_FAMILIES = {
  frontend: [
    "frontend",
    "front end",
    "react",
    "next.js",
    "nextjs",
    "vue",
    "angular",
    "ui engineer",
    "ui developer",
    "javascript developer",
    "typescript developer",
  ],

  backend: [
    "backend",
    "back end",
    "node",
    "node.js",
    "express",
    "nestjs",
    "java",
    "spring",
    "spring boot",
    "python developer",
    "django",
    "flask",
    "fastapi",
    "golang",
    "go developer",
    ".net",
    "c#",
    "php",
    "laravel",
  ],

  fullstack: ["full stack", "fullstack", "mern", "mean"],

  ai_ml: [
    "ai engineer",
    "machine learning",
    "ml engineer",
    "llm",
    "nlp",
    "computer vision",
    "generative ai",
    "deep learning",
    "data science",
  ],

  data: [
    "data analyst",
    "data engineer",
    "data scientist",
    "analytics engineer",
    "business intelligence",
    "bi developer",
    "etl",
    "sql developer",
  ],

  cloud: ["cloud engineer", "aws", "azure", "gcp", "cloud architect"],

  devops: [
    "devops",
    "site reliability",
    "sre",
    "platform engineer",
    "infrastructure engineer",
    "kubernetes",
    "docker",
    "terraform",
  ],

  security: [
    "cyber security",
    "cybersecurity",
    "security engineer",
    "security analyst",
    "soc analyst",
    "application security",
    "penetration tester",
  ],

  mobile: ["android", "ios", "flutter", "react native", "swift", "kotlin"],

  qa: [
    "qa",
    "quality assurance",
    "test engineer",
    "automation engineer",
    "sdet",
    "testing",
  ],

  product: ["product manager", "technical product manager", "program manager"],

  design: ["ui designer", "ux designer", "product designer", "visual designer"],
};

export default function extractRoleFamily(text = "") {
  const content = String(text).toLowerCase();

  for (const [family, keywords] of Object.entries(ROLE_FAMILIES)) {
    if (keywords.some((keyword) => content.includes(keyword))) {
      return family;
    }
  }

  return "other";
}
