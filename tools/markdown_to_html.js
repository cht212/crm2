const fs = require("fs");
const path = require("path");

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  console.error("Uso: node tools/markdown_to_html.js input.md output.html");
  process.exit(1);
}

const escapeHtml = value => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

const inline = value => escapeHtml(value)
  .replace(/`([^`]+)`/g, "<code>$1</code>")
  .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

const lines = fs.readFileSync(inputPath, "utf8").replace(/\r\n/g, "\n").split("\n");
const body = [];
let inList = false;
let inCode = false;
let codeLines = [];

const closeList = () => {
  if (!inList) return;
  body.push("</ul>");
  inList = false;
};

for (const rawLine of lines) {
  const line = rawLine.trimEnd();

  if (line.startsWith("```")) {
    if (inCode) {
      body.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      codeLines = [];
      inCode = false;
    } else {
      closeList();
      inCode = true;
    }
    continue;
  }

  if (inCode) {
    codeLines.push(rawLine);
    continue;
  }

  if (!line.trim()) {
    closeList();
    continue;
  }

  const heading = /^(#{1,6})\s+(.+)$/.exec(line);
  if (heading) {
    closeList();
    const level = heading[1].length;
    body.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    continue;
  }

  const bullet = /^-\s+(.+)$/.exec(line);
  if (bullet) {
    if (!inList) {
      body.push("<ul>");
      inList = true;
    }
    body.push(`<li>${inline(bullet[1])}</li>`);
    continue;
  }

  closeList();
  body.push(`<p>${inline(line)}</p>`);
}

closeList();
if (inCode) {
  body.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
}

const title = path.basename(inputPath, path.extname(inputPath)).replace(/_/g, " ");
const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4; margin: 18mm 16mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #142531;
      font-family: "Segoe UI", Arial, sans-serif;
      font-size: 11.5pt;
      line-height: 1.52;
    }
    h1 {
      margin: 0 0 18px;
      padding-bottom: 10px;
      border-bottom: 3px solid #0ea5c6;
      color: #0b465b;
      font-size: 24pt;
      line-height: 1.15;
    }
    h2 {
      margin: 24px 0 8px;
      color: #0b465b;
      font-size: 16pt;
      break-after: avoid;
    }
    h3 {
      margin: 18px 0 6px;
      color: #14394a;
      font-size: 13pt;
      break-after: avoid;
    }
    p { margin: 0 0 8px; }
    ul { margin: 4px 0 10px 20px; padding: 0; }
    li { margin: 3px 0; }
    code {
      padding: 1px 4px;
      border-radius: 4px;
      background: #eef6f9;
      color: #0b465b;
      font-family: Consolas, "Courier New", monospace;
      font-size: 10pt;
    }
    pre {
      margin: 10px 0 12px;
      padding: 10px 12px;
      border: 1px solid #d9e7ee;
      border-radius: 8px;
      background: #f7fbfd;
      white-space: pre-wrap;
      break-inside: avoid;
    }
    pre code {
      padding: 0;
      background: transparent;
    }
  </style>
</head>
<body>
${body.join("\n")}
</body>
</html>`;

fs.writeFileSync(outputPath, html, "utf8");
