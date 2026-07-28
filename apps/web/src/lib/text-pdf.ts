/**
 * Minimal multi-page text PDF (no native deps). Good enough for cover letters
 * and optimized resume text exports.
 */
function escapePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapLine(line: string, maxChars: number): string[] {
  const trimmed = line.replace(/\t/g, '    ');
  if (trimmed.length <= maxChars) return [trimmed || ' '];
  const words = trimmed.split(/\s+/);
  const rows: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) rows.push(current);
    if (word.length <= maxChars) {
      current = word;
    } else {
      for (let i = 0; i < word.length; i += maxChars) {
        rows.push(word.slice(i, i + maxChars));
      }
      current = '';
    }
  }
  if (current) rows.push(current);
  return rows.length ? rows : [' '];
}

function paginate(lines: string[], linesPerPage: number): string[][] {
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }
  return pages.length ? pages : [[' ']];
}

export function buildTextPdf(input: {
  title: string;
  body: string;
  subtitle?: string;
}): Uint8Array {
  const maxChars = 92;
  const linesPerPage = 48;
  const header: string[] = [];
  if (input.title.trim()) header.push(...wrapLine(input.title.trim(), maxChars), ' ');
  if (input.subtitle?.trim()) header.push(...wrapLine(input.subtitle.trim(), maxChars), ' ');

  const bodyLines = input.body
    .replace(/\r\n/g, '\n')
    .split('\n')
    .flatMap((line) => wrapLine(line, maxChars));

  const pages = paginate([...header, ...bodyLines], linesPerPage);
  const objectBodies: string[] = [];

  const addObject = (body: string) => {
    objectBodies.push(body);
    return objectBodies.length;
  };

  addObject('<< /Type /Catalog /Pages 2 0 R >>');
  const pagesObjectIndex = addObject('<< /Type /Pages /Kids [] /Count 0 >>') - 1;
  addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  const pageObjectNumbers: number[] = [];

  for (const pageLines of pages) {
    const contentLines = pageLines
      .map((line, index) => {
        const y = 770 - index * 14;
        const escaped = escapePdfText(line);
        if (index === 0) {
          return `BT /F1 11 Tf 48 ${y} Td (${escaped}) Tj`;
        }
        return `0 -14 Td (${escaped}) Tj`;
      })
      .join('\n');
    const stream = `${contentLines}\nET`;
    const contentObjNum = addObject(
      `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`,
    );
    const pageObjNum = addObject(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`,
    );
    pageObjectNumbers.push(pageObjNum);
  }

  const kids = pageObjectNumbers.map((n) => `${n} 0 R`).join(' ');
  objectBodies[pagesObjectIndex] =
    `<< /Type /Pages /Kids [${kids}] /Count ${pageObjectNumbers.length} >>`;

  const headerPdf = '%PDF-1.4\n';
  const chunks: string[] = [headerPdf];
  const offsets: number[] = [0];
  let cursor = headerPdf.length;

  for (let i = 0; i < objectBodies.length; i += 1) {
    offsets.push(cursor);
    const serialized = `${i + 1} 0 obj\n${objectBodies[i]}\nendobj\n`;
    chunks.push(serialized);
    cursor += serialized.length;
  }

  const xrefStart = cursor;
  let xref = `xref\n0 ${offsets.length}\n`;
  xref += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  chunks.push(xref, trailer);
  return new TextEncoder().encode(chunks.join(''));
}

export function pdfResponse(bytes: Uint8Array, filename: string) {
  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
