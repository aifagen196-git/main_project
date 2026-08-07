import * as cheerio from "cheerio";

/**
 * Cleans HTML job descriptions into readable plain text.
 */
export default function cleanDescription(html = "") {
  if (!html || typeof html !== "string") {
    return "";
  }

  const $ = cheerio.load(html);

  $("script").remove();
  $("style").remove();
  $("noscript").remove();

  $("br").replaceWith("\n");
  $("li").prepend("• ");

  const text = $.root().text();

  return text
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .trim();
}
