# DOCX Layout Baseline Harness

This fork-local harness captures the current `com.elovirta.ooxml` DOCX layout
behavior before any modernization work.

## Baseline Coordinates

- Fork commit: `cc23fdd8b3f2`
- DITA-OT version: `4.4`
- DITA-OT download URL:
  `https://github.com/dita-ot/dita-ot/releases/download/4.4/dita-ot-4.4.zip`
- Java version capture command: `java -version`

## Commands

Capture committed baseline goldens:

```shell
node test/layout-harness/capture-goldens.mjs
```

Verify generated output against committed goldens:

```shell
node test/layout-harness/run-layout-gate.mjs
```

Use an existing DITA-OT 4.4 checkout for debugging:

```shell
DITA_OT_DIR=/path/to/dita-ot-4.4 node test/layout-harness/run-layout-gate.mjs
```

## Scope

This baseline covers DITA list and indentation behavior only:

1. ordered list restart and nesting
2. bullet list nesting
3. mixed ordered/bullet nesting
4. long wrapped list item content
5. continuation paragraphs inside list items
6. code blocks, notes, and tables inside list items
7. definition lists
8. nine-level nesting

Arbitrary CSS-like indentation is not a P0 supported semantic. Future support
must be defined separately and measured against this baseline.

## Manual Word Review

Manual review status as of 2026-04-21:

1. `test/layout-goldens/layout-baseline.docx` was opened for review.
2. The reviewer reported that the baseline document seems okay.
3. No outstanding layout breakage was observed in the ordered list, bullet list,
   continuation paragraph, nested list, or supported indentation fixtures.
4. Word version, operating system, and explicit repair-prompt status were not
   recorded for this first baseline note.
