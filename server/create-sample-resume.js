/**
 * Generates a minimal but valid sample resume PDF for testing.
 * Run once with: node create-sample-resume.js
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'uploads', 'resumes');
fs.mkdirSync(dir, { recursive: true });

const outPath = path.join(dir, 'sample-resume.pdf');

// A minimal valid PDF with real visible content
const content = [
  '%PDF-1.4',
  '1 0 obj<</Type /Catalog /Pages 2 0 R>>endobj',
  '2 0 obj<</Type /Pages /Kids [3 0 R] /Count 1>>endobj',
  '3 0 obj<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]',
  '/Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> ',
  '                         /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>',
  '/Contents 4 0 R>>endobj',
].join('\n');

const streamContent = [
  'BT',
  '/F1 22 Tf',
  '72 740 Td',
  '(Rahul Kumar) Tj',
  '/F2 11 Tf',
  '0 -20 Td',
  '(2021CS101  |  Computer Science  |  IIT Placement Portal) Tj',
  '0 -14 Td',
  '(student@placeiit.in  |  +91 98765 43210) Tj',
  '',
  '/F1 14 Tf',
  '0 -35 Td',
  '(Education) Tj',
  '/F2 11 Tf',
  '0 -18 Td',
  '(B.Tech + M.Tech  |  Computer Science  |  IIT  |  2021-2026) Tj',
  '0 -14 Td',
  '(CGPA: 8.7 / 10) Tj',
  '',
  '/F1 14 Tf',
  '0 -35 Td',
  '(Technical Skills) Tj',
  '/F2 11 Tf',
  '0 -18 Td',
  '(Languages: C++, Python, JavaScript, TypeScript) Tj',
  '0 -14 Td',
  '(Frameworks: React, Node.js, Express, FastAPI) Tj',
  '0 -14 Td',
  '(Databases: MongoDB, PostgreSQL, Redis) Tj',
  '',
  '/F1 14 Tf',
  '0 -35 Td',
  '(Projects) Tj',
  '/F2 11 Tf',
  '0 -18 Td',
  '(PlaceIIT - Real-time campus placement coordination platform) Tj',
  '0 -14 Td',
  '(Memory-Efficient Versioned File Indexer) Tj',
  'ET',
].join('\n');

const streamLen = Buffer.byteLength(streamContent, 'utf8');

const pdfParts = [
  content,
  `4 0 obj<</Length ${streamLen}>>`,
  'stream',
  streamContent,
  'endstream',
  'endobj',
  'xref',
  '0 5',
  '0000000000 65535 f ',
  '0000000009 00000 n ',
  '0000000058 00000 n ',
  '0000000115 00000 n ',
  '0000000450 00000 n ',
  'trailer<</Root 1 0 R /Size 5>>',
  'startxref',
  '600',
  '%%EOF',
].join('\n');

fs.writeFileSync(outPath, pdfParts, 'utf8');
console.log('✅ Sample resume created at:', outPath);
