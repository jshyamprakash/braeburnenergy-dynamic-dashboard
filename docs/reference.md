Reference DOCX (styles for ARCHITECTURE_PRINT.md conversion)

Purpose
- This file documents the `reference.docx` styles to use when converting `docs/ARCHITECTURE_PRINT.md` to DOCX/PDF with Pandoc.
- You can either (A) create `reference.docx` in Microsoft Word/LibreOffice using these steps, or (B) let me generate it if you allow running `pandoc` here.

Recommended Table Style: `ArchitectureTable`
- Header row: Bold, white text, background #333333, font-size 11pt.
- Body rows: Regular, font-size 10.5pt, left-aligned, single-spaced.
- Cell wrapping: Enabled (word-wrap), autofit disabled (allow manual column widths), enable 'Allow row to break across pages'.
- Cell padding: Top/Bottom 6pt, Left/Right 6pt.
- Borders: Thin (0.5pt) gray (#CCCCCC).

Recommended Paragraph/Heading Styles
- Normal: Calibri or Inter (11pt), single spacing.
- Heading 1: 18pt bold (for top-level sections).
- Heading 2: 14pt bold.
- Code: Use `Courier New` or `Consolas` 10pt, apply a light gray background shading and 6pt padding (use a paragraph style named `CodeBlock`).
- Mermaid images: center-aligned with small caption (italic 9pt).

How to create `reference.docx` manually (quick)
1. Open Word and create a new blank document.
2. Insert a sample table (2x2).
3. Format the table to match the "ArchitectureTable" spec above (header, padding, wrapping, borders).
4. Adjust Normal/Heading styles as recommended.
5. Save the document as `reference.docx` and place it at the repo root or pass its path to Pandoc.

Pandoc conversion commands (uses `reference.docx`):
```bash
pandoc docs/ARCHITECTURE_PRINT.md -f markdown+pipe_tables+raw_html -o ARCHITECTURE.docx --reference-doc=reference.docx
pandoc docs/ARCHITECTURE_PRINT.md -f markdown+pipe_tables+raw_html -o ARCHITECTURE.pdf --reference-doc=reference.docx --pdf-engine=xelatex
```

Optional: I can generate `reference.docx` automatically if you allow me to run `pandoc` here. If you want that, reply "Generate reference.docx" and I will create it and then convert `ARCHITECTURE_PRINT.md` to DOCX/PDF.
