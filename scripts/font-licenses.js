import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { builtInFonts } from "../src/font-catalog.js";

const projectDirectory = fileURLToPath(new URL("../", import.meta.url));

// Ship the copyright notices and complete license from the installed package,
// rather than a generic OFL template that would lose each family's attribution.
export function generateFontLicenses(directory = projectDirectory) {
  const outputDirectory = path.join(directory, "public", "font-licenses");
  mkdirSync(outputDirectory, { recursive: true });
  const entries = builtInFonts.filter((font) => font.package).map((font) => {
    const packageDirectory = path.join(directory, "node_modules", font.package);
    const packageJson = JSON.parse(readFileSync(path.join(packageDirectory, "package.json"), "utf8"));
    const metadata = JSON.parse(readFileSync(path.join(packageDirectory, "metadata.json"), "utf8"));
    const license = readFileSync(path.join(packageDirectory, "LICENSE"));
    if (packageJson.license !== "OFL-1.1" || metadata.license?.type !== "OFL-1.1" ||
        !license.toString("utf8").includes("SIL OPEN FONT LICENSE Version 1.1")) {
      throw new Error(`Review the font license before shipping ${font.package}`);
    }
    const destination = path.join(outputDirectory, font.slug);
    mkdirSync(destination, { recursive: true });
    writeFileSync(path.join(destination, "LICENSE.txt"), license);
    const entry = {
      family: font.family,
      package: font.package,
      packageVersion: packageJson.version,
      license: metadata.license.type,
      licenseUrl: `/font-licenses/${font.slug}/LICENSE.txt`,
      licenseInformation: metadata.license.url,
      attribution: metadata.license.attribution,
      source: metadata.source,
      distribution: font.source,
      repository: packageJson.repository,
      weights: metadata.weights,
      styles: metadata.styles,
      subsets: metadata.subsets,
      fontVersion: metadata.version,
      licenseSha256: createHash("sha256").update(license).digest("hex"),
    };
    writeFileSync(path.join(destination, "metadata.json"), JSON.stringify(entry, null, 2) + "\n");
    return entry;
  });
  writeFileSync(path.join(outputDirectory, "index.json"), JSON.stringify(entries, null, 2) + "\n");

  const rows = entries.map((entry) =>
    `| ${entry.family} | ${entry.packageVersion} | [OFL-1.1](../public${entry.licenseUrl}) | [Fontsource](${entry.distribution}) |`);
  const document = `# Font licenses\n\n` +
    `The 20 requested Thai font families and the existing Noto Sans and Inter families are self-hosted from installed \`@fontsource\` packages. Vite copies their local font assets into the production build. Runtime font rendering uses this site's assets and does not require a Google Fonts request. The two device font choices, \`sans-serif\` and \`serif\`, use the visitor's installed fonts.\n\n` +
    `Each bundled family is distributed under the SIL Open Font License 1.1. The linked files preserve the exact copyright notices, reserved font names where present, and complete license text shipped by its installed package. The [machine-readable inventory](../public/font-licenses/index.json) records package and font versions, attribution, upstream source, Fontsource distribution, supported weights, styles, subsets, and a SHA-256 digest of each license. These notices are also served at \`/font-licenses/\`.\n\n` +
    `| Family | Package version | License and notices | Distribution source |\n` +
    `| --- | --- | --- | --- |\n${rows.join("\n")}\n\n` +
    `## Regenerate notices\n\n` +
    `Run \`node scripts/font-licenses.js\` after installing or changing font dependencies, then include the updated \`public/font-licenses/\` and this document in the release. The script reads only installed packages and makes no network requests. It stops if an installed family's license is no longer OFL-1.1 so that the change can be reviewed.\n\n` +
    `## Uploaded fonts\n\n` +
    `Administrators may upload their own WOFF2, WOFF, TTF, or OTF font files. The uploader must hold permission to use and redistribute the font as a web font. Record its source URL and license in the font library; uploading a font does not grant rights or change its original license. Uploaded files are stored separately in the site's data directory and are not covered by the bundled OFL notices. Retain any additional notices and license documents required by the uploaded font's owner.\n`;
  mkdirSync(path.join(directory, "docs"), { recursive: true });
  writeFileSync(path.join(directory, "docs", "FONT-LICENSES.md"), document);
  return entries;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const entries = generateFontLicenses();
  process.stdout.write(`Generated license notices for ${entries.length} font families.\n`);
}
