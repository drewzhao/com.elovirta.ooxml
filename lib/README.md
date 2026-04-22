# Bundled Ant-Contrib Jar

This directory contains the Ant-Contrib jar that is bundled with the
`com.elovirta.ooxml` DITA-OT plug-in package.

Current status, reviewed 2026-04-22: keep `ant-contrib-0.6.jar` for now. Do
not upgrade to `1.0b3` until we intentionally schedule and verify that change.

## Current File

- File: `ant-contrib-0.6.jar`
- Size in this repository: about 120 KB
- Manifest details:
  - `Ant-Version: Apache Ant 1.5.3`
  - `Created-By: 1.4.1_01-b01 (Sun Microsystems Inc.)`
- Imported by `plugin.xml`:

```xml
<feature extension="dita.conductor.lib.import" file="lib/ant-contrib-0.6.jar"/>
```

DITA-OT copies this jar into the installed plug-in so the Ant build template can
load Ant-Contrib tasks with:

```xml
<taskdef resource="net/sf/antcontrib/antlib.xml"/>
```

## What Uses It

The plug-in uses only a very small part of Ant-Contrib.

### Legacy SVG-to-EMF Loop

`build_template.xml` uses Ant-Contrib `<for>` in the `docx.svg2emf` target to
iterate over authored SVG files and invoke Inkscape:

```xml
<for param="svg.file">
  ...
</for>
```

This path is legacy. In this fork, it is disabled by default through:

```xml
<property name="docx.inkscape.skip" value="true"/>
```

The current production DOCX pipeline does not rely on this path. Authored SVGs
are prepared by the calling pipeline instead. The preferred production behavior
is SVG-to-PNG before DITA-OT, with native SVG kept as an experimental opt-in
mode.

### Native SVG Packaging Conditions

`build_template.xml` also uses Ant-Contrib `<if>` in `docx.package.media`:

1. When `docx.svg.policy=native`, copy paired fallback PNG files from
   `_docx-svg/*.png` into `word/media`.
2. When native SVG mode is not active, delete copied `.svg` media files so
   legacy/default output does not accidentally package SVG media.

These conditionals are active and are covered by the fork-local native SVG
harness.

## Why We Are Keeping 0.6 For Now

`ant-contrib-1.0b3` is available publicly and is newer than the bundled `0.6`
jar, but it is still an old beta-era artifact. Updating to it would improve
dependency hygiene and provenance, but it does not add a required DOCX feature.

Reasons to keep the current jar for now:

1. Current DITA-OT 4.4 harness gates pass with `ant-contrib-0.6.jar`.
2. The plug-in uses only stable Ant-Contrib tasks: `<if>` and `<for>`.
3. The risk surface is narrow: this is a build-time Ant helper bundled with the
   plug-in, not a DOCX runtime dependency.
4. The most security- and maintenance-friendly long-term answer is probably to
   remove the Ant-Contrib dependency, not merely replace one old jar with a
   slightly newer old jar.
5. Updating the jar would still leave a binary jar in source control, so it does
   not address repository binary-artifact policy by itself.

## If We Upgrade Later

Treat an upgrade to `1.0b3` as a small dependency-change milestone, not a drive-
by edit.

Suggested procedure:

1. Download `ant-contrib-1.0b3.jar` from Maven Central or the official
   SourceForge release.
2. Verify the checksum from the same source used for download.
3. Replace `lib/ant-contrib-0.6.jar` with `lib/ant-contrib-1.0b3.jar`.
4. Update `plugin.xml` to import the new jar path.
5. Update this README and the repository README.
6. Run the fork-local harness gates:

```shell
node test/layout-harness/self-test.mjs
node test/layout-harness/image-policy-test.mjs
node test/layout-harness/native-svg-test.mjs
node test/layout-harness/run-layout-gate.mjs
```

7. Build at least one representative DOCX through the main documentation
   pipeline before promoting the change.

Relevant public references:

- Maven Central: `ant-contrib:ant-contrib:1.0b3`
  <https://central.sonatype.com/artifact/ant-contrib/ant-contrib/1.0b3>
- Maven repository artifact index:
  <https://repo1.maven.org/maven2/ant-contrib/ant-contrib/1.0b3/>
- SourceForge release directory:
  <https://sourceforge.net/projects/ant-contrib/files/ant-contrib/1.0b3/>
- Ant-Contrib manual:
  <https://ant-contrib.sourceforge.net/ant-contrib/manual/>
- Ant-Contrib `<for>` task documentation:
  <https://ant-contrib.sourceforge.net/tasks/tasks/for.html>

## Better Future Cleanup

The cleaner future state is to remove Ant-Contrib from the plug-in entirely.

Possible cleanup direction:

1. Replace the two package-time `<if>` blocks with plain Ant target conditions
   or split targets.
2. Remove or isolate the legacy SVG-to-EMF `<for>` path, since the maintained
   pipeline no longer depends on automatic Inkscape conversion.
3. Delete the bundled jar.
4. Remove the `dita.conductor.lib.import` entry from `plugin.xml`.
5. Rerun the same harness gates listed above.

That cleanup would reduce binary provenance questions more effectively than a
`0.6` to `1.0b3` jar replacement.
