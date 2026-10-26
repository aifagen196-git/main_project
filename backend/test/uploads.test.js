import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { docxUnpackOk } from "../src/routes/resumes.routes.js";

test("docx guard: a normal file passes", async () => {
  const z = new JSZip();
  z.file("word/document.xml", "<w:document>Jane Doe, DevOps</w:document>");
  assert.equal(docxUnpackOk(await z.generateAsync({ type: "nodebuffer" })), true);
});

test("docx guard: a zip bomb is refused", async () => {
  const z = new JSZip();
  z.file("word/document.xml", Buffer.alloc(80 * 1024 * 1024, 0x41));
  const buf = await z.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } });
  assert.ok(buf.length < 1024 * 1024);
  assert.equal(docxUnpackOk(buf), false);
});

test("docx guard: too many parts and junk are refused", async () => {
  const z = new JSZip();
  for (let i = 0; i < 2100; i++) z.file(`f${i}.xml`, "x");
  assert.equal(docxUnpackOk(await z.generateAsync({ type: "nodebuffer" })), false);
  assert.equal(docxUnpackOk(Buffer.concat([Buffer.from("PK\x03\x04"), Buffer.alloc(3000, 7)])), false);
});
