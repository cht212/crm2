const fs = require("fs");

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  console.error("Uso: node tools/markdown_to_pdf.js input.md output.pdf");
  process.exit(1);
}

const mm = 72 / 25.4;
const pageWidth = 210 * mm;
const pageHeight = 297 * mm;
const margin = 18 * mm;
const bottom = 16 * mm;
const contentWidth = pageWidth - margin * 2;

const sanitize = value => String(value)
  .replace(/\*\*/g, "")
  .replace(/`/g, "")
  .replace(/[“”]/g, '"')
  .replace(/[‘’]/g, "'")
  .replace(/[–—]/g, "-")
  .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "");

const escapePdf = value => sanitize(value)
  .replace(/\\/g, "\\\\")
  .replace(/\(/g, "\\(")
  .replace(/\)/g, "\\)");

const textWidth = (text, size) => {
  let total = 0;
  for (const char of text) {
    if (char === " ") total += 0.28;
    else if ("ilI.,'|".includes(char)) total += 0.24;
    else if ("MW@#%&".includes(char)) total += 0.82;
    else total += 0.52;
  }
  return total * size;
};

const wrap = (text, size, indent = 0) => {
  const words = sanitize(text).split(/\s+/).filter(Boolean);
  const maxWidth = contentWidth - indent;
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (textWidth(next, size) <= maxWidth) {
      current = next;
      continue;
    }

    if (current) lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
};

const rawLines = fs.readFileSync(inputPath, "utf8").replace(/\r\n/g, "\n").split("\n");
const pages = [];
let currentPage = [];
let y = pageHeight - margin;
let inCode = false;

const newPage = () => {
  if (currentPage.length) pages.push(currentPage);
  currentPage = [];
  y = pageHeight - margin;
};

const addLine = (text, size = 10.5, font = "F1", indent = 0, after = 4) => {
  const leading = size + 3;
  if (y - leading < bottom) newPage();
  currentPage.push({ text, size, font, x: margin + indent, y });
  y -= leading + after;
};

const addWrapped = (text, size = 10.5, font = "F1", indent = 0, after = 4) => {
  const lines = wrap(text, size, indent);
  lines.forEach((line, index) => addLine(line, size, font, indent, index === lines.length - 1 ? after : 0));
};

for (const rawLine of rawLines) {
  const line = rawLine.trimEnd();

  if (line.startsWith("```")) {
    inCode = !inCode;
    y -= inCode ? 4 : 2;
    continue;
  }

  if (inCode) {
    addWrapped(line, 8.5, "F3", 10, 1);
    continue;
  }

  if (!line.trim()) {
    y -= 5;
    if (y < bottom) newPage();
    continue;
  }

  const heading = /^(#{1,6})\s+(.+)$/.exec(line);
  if (heading) {
    const level = heading[1].length;
    const text = heading[2];
    y -= level === 1 ? 6 : 4;
    if (level === 1) addWrapped(text, 20, "F2", 0, 10);
    else if (level === 2) addWrapped(text, 14, "F2", 0, 7);
    else addWrapped(text, 11.5, "F2", 0, 5);
    continue;
  }

  const bullet = /^-\s+(.+)$/.exec(line);
  if (bullet) {
    addWrapped(`- ${bullet[1]}`, 10.5, "F1", 10, 2);
    continue;
  }

  addWrapped(line, 10.5, "F1", 0, 4);
}

if (currentPage.length) pages.push(currentPage);

const objects = [];
const addObj = body => {
  objects.push(body);
  return objects.length;
};

const catalogId = addObj("<< /Type /Catalog /Pages 2 0 R >>");
const pagesId = addObj("");
const fontRegularId = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
const fontBoldId = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
const fontMonoId = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>");

const pageIds = [];

for (const page of pages) {
  const content = page.map(line =>
    `BT /${line.font} ${line.size.toFixed(2)} Tf 1 0 0 1 ${line.x.toFixed(2)} ${line.y.toFixed(2)} Tm (${escapePdf(line.text)}) Tj ET`
  ).join("\n");

  const contentBuffer = Buffer.from(content, "latin1");
  const contentId = addObj(`<< /Length ${contentBuffer.length} >>\nstream\n${content}\nendstream`);
  const pageId = addObj(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R /F3 ${fontMonoId} 0 R >> >> /Contents ${contentId} 0 R >>`);
  pageIds.push(pageId);
}

objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
const offsets = [0];
for (let index = 0; index < objects.length; index++) {
  offsets.push(Buffer.byteLength(pdf, "latin1"));
  pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
}

const xrefOffset = Buffer.byteLength(pdf, "latin1");
pdf += `xref\n0 ${objects.length + 1}\n`;
pdf += "0000000000 65535 f \n";
for (let index = 1; index < offsets.length; index++) {
  pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

fs.writeFileSync(outputPath, Buffer.from(pdf, "latin1"));
