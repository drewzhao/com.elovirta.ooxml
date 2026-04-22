# com.elovirta.ooxml

A DITA-OT plug-in that generates Microsoft Word DOCX output from DITA source
using Office Open XML (OOXML).

This fork is maintained for the multibrand documentation DOCX pipeline. The
current fork baseline targets DITA-OT 4.4 and keeps the plug-in usable as a
standalone `docx` transtype while adding the pipeline controls needed for
modern DOCX export.

## Current Status

- Primary transtype: `docx`
- Tested toolkit baseline: DITA-OT 4.4
- Primary reader target: Microsoft Word desktop
- Compatibility readers under review: WPS Office and LibreOffice
- Default SVG behavior: legacy-compatible relationship mapping, with Inkscape
  conversion disabled by default
- Production-safe authored SVG behavior is handled by the calling pipeline,
  which normally converts authored SVGs to PNG before invoking this plug-in
- Experimental opt-in: native Office SVG with PNG fallback

## What This Fork Adds

This fork keeps the original DITA-to-DOCX plug-in structure and adds:

- a fork-local DITA-OT 4.4 baseline harness
- committed layout fixture goldens for list and indentation behavior
- internal cross-reference hyperlinks for DOCX navigation
- authored image policy controls: keep, strip, and rescue-tagged images
- Mermaid image awareness, so generated diagram images can be kept separately
  from authored screenshots
- media pruning, so the final DOCX contains only relationship-referenced media
- default disabling of the legacy Inkscape SVG-to-EMF conversion path
- experimental native Office SVG output with PNG fallbacks

## Requirements

For normal DITA-OT use:

- Java supported by the selected DITA-OT version
- DITA-OT 4.4 for the current tested baseline

For the fork-local harness:

- Java
- `curl`
- `unzip`
- `zip`

The harness downloads and caches DITA-OT 4.4 under `.tools-cache/` on demand.

## Installation

Install the checked-out plug-in into a DITA-OT 4.4 toolkit:

```shell
dita install /path/to/com.elovirta.ooxml --force
```

Or install a packaged zip of this repository:

```shell
dita install /path/to/com.elovirta.ooxml.zip --force
```

The plug-in id is `com.elovirta.ooxml`.

## Building DOCX

Use the `docx` transtype:

```shell
dita -i guide.ditamap -f docx -o out
```

With common fork parameters:

```shell
dita -i guide.ditamap -f docx -o out \
  --args.image.output=yes \
  --args.docx.mermaid.output=yes \
  --docx.inkscape.skip=true
```

## Parameters

| Parameter | Values | Default | Purpose |
| --- | --- | --- | --- |
| `dotx.file` | file path | built-in template | DOCX template file. |
| `document.flat.xsl` | file path | built-in stylesheet | Preprocess clean-up stylesheet override. |
| `core.xsl` | file path | built-in stylesheet | Core metadata stylesheet override. |
| `custom.xsl` | file path | built-in stylesheet | Custom metadata stylesheet override. |
| `document.xsl` | file path | built-in stylesheet | Main document stylesheet override. |
| `comments.xsl` | file path | built-in stylesheet | Comments stylesheet override. |
| `numbering.xsl` | file path | built-in stylesheet | List and title numbering stylesheet override. |
| `footnotes.xsl` | file path | built-in stylesheet | Footnote stylesheet override. |
| `document.xml.xsl` | file path | built-in stylesheet | Document relationship stylesheet override. |
| `args.image.output` | `yes`, `no`, `rescue` | `yes` | Controls authored image output. |
| `args.image.role.group` | string | `image_role` | Grouped `@props` name used by rescue mode. |
| `args.docx.mermaid.output` | `yes`, `no` | `yes` | Controls generated Mermaid diagram images. |
| `docx.svg.policy` | `legacy-emf`, `native` | `legacy-emf` | Controls SVG relationship and package handling. |
| `docx.inkscape.skip` | `true`, `false` | `true` | Prevents accidental legacy Inkscape SVG-to-EMF conversion. |
| `inkscape.exec` | file path | auto-detected when allowed | Optional legacy Inkscape executable. |

## Image Policy

Authored images and generated Mermaid images are intentionally separate.

| Input | `args.image.output=yes` | `args.image.output=no` | `args.image.output=rescue` |
| --- | --- | --- | --- |
| Authored image | emitted | suppressed | emitted only when `@props` contains the configured role group |
| Mermaid image under `_docx-mermaid/*.png` | emitted when `args.docx.mermaid.output=yes` | emitted when `args.docx.mermaid.output=yes` | emitted when `args.docx.mermaid.output=yes` |

Use `--args.docx.mermaid.output=no` to suppress Mermaid diagram images.

Rescue mode matches grouped DITA props. With the default group, images tagged
with values such as `props="image_role(shared)"` are retained.

Only emitted images receive image relationships and media package parts. After
relationships are generated, unreferenced files under `word/media` are pruned
before the DOCX is zipped.

## SVG Handling

The safest production path is to convert authored SVGs before DITA-OT invokes
this plug-in. In the multibrand docs pipeline, authored SVGs are prepared as
PNG assets by default.

This plug-in supports two SVG policies:

### `docx.svg.policy=legacy-emf`

This is the default for backward compatibility. Legacy behavior maps SVG image
references to EMF relationship targets. The actual SVG-to-EMF conversion path
uses Inkscape, but this fork sets `docx.inkscape.skip=true` by default so a
local Inkscape installation is not used accidentally.

Use this mode only when a caller intentionally owns the legacy EMF workflow.

### `docx.svg.policy=native`

Native mode is experimental. It packages each prepared SVG together with a PNG
fallback and emits Office SVG markup:

- the normal `a:blip` relationship points to the PNG fallback
- the `asvg:svgBlip` extension relationship points to the SVG
- `[Content_Types].xml` declares `image/svg+xml`
- both the `.svg` and paired `.png` are copied into `word/media`

Modern Microsoft Word can use the SVG. Readers that do not understand the
Office SVG extension can fall back to the PNG. Native mode assumes the caller
has already prepared a self-contained SVG and a same-stem PNG fallback under
`_docx-svg/`.

## Mermaid Diagrams

This plug-in does not render Mermaid syntax. It recognizes Mermaid images that
have already been rendered into `_docx-mermaid/*.png` by the caller.

That lets a DOCX pipeline strip authored screenshots while still keeping
generated Mermaid diagrams:

```shell
dita -i guide.ditamap -f docx -o out \
  --args.image.output=no \
  --args.docx.mermaid.output=yes
```

## Layout Baseline Harness

The fork includes a self-contained harness under `test/layout-harness/`. It
bootstraps DITA-OT 4.4, installs the current plug-in into a fresh toolkit, and
builds focused fixtures.

Run the fast structural self-test:

```shell
node test/layout-harness/self-test.mjs
```

Run the image policy gate:

```shell
node test/layout-harness/image-policy-test.mjs
```

Run the native SVG gate:

```shell
node test/layout-harness/native-svg-test.mjs
```

Run the layout baseline gate against committed goldens:

```shell
node test/layout-harness/run-layout-gate.mjs
```

Capture new layout goldens only when intentionally updating the baseline:

```shell
node test/layout-harness/capture-goldens.mjs
```

For debugging, an existing DITA-OT 4.4 checkout can be used instead of the
fork-local bootstrap:

```shell
DITA_OT_DIR=/path/to/dita-ot-4.4 node test/layout-harness/run-layout-gate.mjs
```

See `BASELINE.md` for the baseline coordinates and manual review notes.

## Compatibility Notes

The layout baseline currently covers:

- ordered list restart and nesting
- bullet list nesting
- mixed ordered and bullet list nesting
- long wrapped list item content
- continuation paragraphs inside list items
- code blocks, notes, and tables inside list items
- definition lists
- nine-level nesting

Arbitrary CSS-like indentation is not part of the current P0 support contract.
It should be defined and tested separately before being treated as guaranteed
DOCX behavior.

Native SVG mode should stay opt-in until representative output has been checked
in Microsoft Word, WPS Office, and LibreOffice. The PNG SVG mode in the calling
pipeline remains the safer default.

## Repository Notes

The GitLab repository is the canonical internal fork remote. The GitHub remote
is kept for continuity and source attribution.

The tracked `lib/ant-contrib-0.6.jar` is used by the Ant build template for
legacy Ant tasks such as conditional execution and file iteration. It remains
part of the plug-in package unless the build template is refactored away from
Ant-Contrib.

Generated harness artifacts are ignored:

- `.tools-cache/`
- `build/`
- local DOCX render output

Committed goldens under `test/layout-goldens/` are intentional test fixtures.

## Acknowledgement

This repository originates as a fork of Jarno Elovirta's
[`jelovirt/com.elovirta.ooxml`](https://github.com/jelovirt/com.elovirta.ooxml)
DITA to Word plug-in. We gratefully acknowledge the original project, Jarno
Elovirta, and its contributors. This fork builds on that work for our DOCX
pipeline requirements.

## License

The DITA to Word plug-in is released under the
[Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).
See `LICENSE` for the full license text.
