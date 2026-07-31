import { describe, expect, test } from "bun:test";
import { extractSeChapter } from "../../scripts/ingest-book";

// Regression guard for the Standard Ebooks parser: blockquote prose (letters,
// signs, telegrams) was once silently dropped because only direct-child <p>
// was captured — After Twenty Years lost its entire twist note. The fixture
// mirrors the SE structures that bit us: a blockquote letter with a
// salutation paragraph and a footer signature, a <br/>-separated sign, and an
// endnote reference that must NOT leak into prose.
const FIXTURE = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<body epub:type="bodymatter z3998:fiction">
<article id="the-test-story" epub:type="se:short-story">
<h2 epub:type="title">The Test Story</h2>
<p>Rudolf opened the note.<a href="endnotes.xhtml#note-1" id="noteref-1" epub:type="noteref">1</a></p>
<blockquote epub:type="z3998:letter">
<p epub:type="z3998:salutation">Dear Old Pal:</p>
<p>Meet me at Sullivan&#8217;s place next Wednesday night.</p>
<footer role="presentation">
<p epub:type="z3998:signature">Jimmy.</p>
</footer>
</blockquote>
<blockquote>
<p>Trespassers<br/>
Will Be<br/>
Prosecuted</p>
</blockquote>
<table>
<tbody>
<tr><td>Rise from bed</td><td>6:00</td><td>a.m.</td></tr>
<tr><td>Study electricity</td><td>7:15</td><td>a.m.</td></tr>
</tbody>
</table>
<p>He was a very selfish giant.</p>
</article>
</body>
</html>`;

describe("extractSeChapter", () => {
  const { title, paragraphs } = extractSeChapter(FIXTURE);

  test("captures the heading title", () => {
    expect(title).toBe("The Test Story");
  });

  test("captures blockquote letters including salutation and signature", () => {
    expect(paragraphs).toContain("Dear Old Pal:");
    expect(paragraphs).toContain("Meet me at Sullivan’s place next Wednesday night.");
    expect(paragraphs).toContain("Jimmy.");
  });

  test("collapses <br/>-separated sign lines into one paragraph", () => {
    expect(paragraphs).toContain("Trespassers Will Be Prosecuted");
  });

  test("captures table rows as paragraphs with space-joined cells", () => {
    expect(paragraphs).toContain("Rise from bed 6:00 a.m.");
    expect(paragraphs).toContain("Study electricity 7:15 a.m.");
  });

  test("keeps document order across plain and blockquote paragraphs", () => {
    expect(paragraphs[0]).toBe("Rudolf opened the note.");
    expect(paragraphs[paragraphs.length - 1]).toBe("He was a very selfish giant.");
  });

  test("suppresses endnote reference markers", () => {
    expect(paragraphs[0]).not.toContain("1");
  });
});
