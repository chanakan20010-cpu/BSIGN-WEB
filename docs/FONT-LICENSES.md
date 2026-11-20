# Font licenses

The 20 requested Thai font families and the existing Noto Sans and Inter families are self-hosted from installed `@fontsource` packages. Vite copies their local font assets into the production build. Runtime font rendering uses this site's assets and does not require a Google Fonts request. The two device font choices, `sans-serif` and `serif`, use the visitor's installed fonts.

Each bundled family is distributed under the SIL Open Font License 1.1. The linked files preserve the exact copyright notices, reserved font names where present, and complete license text shipped by its installed package. The [machine-readable inventory](../public/font-licenses/index.json) records package and font versions, attribution, upstream source, Fontsource distribution, supported weights, styles, subsets, and a SHA-256 digest of each license. These notices are also served at `/font-licenses/`.

| Family | Package version | License and notices | Distribution source |
| --- | --- | --- | --- |
| IBM Plex Sans Thai | 5.3.0 | [OFL-1.1](../public/font-licenses/ibm-plex-sans-thai/LICENSE.txt) | [Fontsource](https://fontsource.org/fonts/ibm-plex-sans-thai) |
| Noto Sans Thai | 5.3.0 | [OFL-1.1](../public/font-licenses/noto-sans-thai/LICENSE.txt) | [Fontsource](https://fontsource.org/fonts/noto-sans-thai) |
| Sarabun | 5.3.0 | [OFL-1.1](../public/font-licenses/sarabun/LICENSE.txt) | [Fontsource](https://fontsource.org/fonts/sarabun) |
| Anuphan | 5.3.0 | [OFL-1.1](../public/font-licenses/anuphan/LICENSE.txt) | [Fontsource](https://fontsource.org/fonts/anuphan) |
| Prompt | 5.3.0 | [OFL-1.1](../public/font-licenses/prompt/LICENSE.txt) | [Fontsource](https://fontsource.org/fonts/prompt) |
| Kanit | 5.3.0 | [OFL-1.1](../public/font-licenses/kanit/LICENSE.txt) | [Fontsource](https://fontsource.org/fonts/kanit) |
| Bai Jamjuree | 5.3.0 | [OFL-1.1](../public/font-licenses/bai-jamjuree/LICENSE.txt) | [Fontsource](https://fontsource.org/fonts/bai-jamjuree) |
| Chakra Petch | 5.3.0 | [OFL-1.1](../public/font-licenses/chakra-petch/LICENSE.txt) | [Fontsource](https://fontsource.org/fonts/chakra-petch) |
| Krub | 5.3.0 | [OFL-1.1](../public/font-licenses/krub/LICENSE.txt) | [Fontsource](https://fontsource.org/fonts/krub) |
| K2D | 5.3.0 | [OFL-1.1](../public/font-licenses/k2d/LICENSE.txt) | [Fontsource](https://fontsource.org/fonts/k2d) |
| Athiti | 5.3.0 | [OFL-1.1](../public/font-licenses/athiti/LICENSE.txt) | [Fontsource](https://fontsource.org/fonts/athiti) |
| Mitr | 5.3.0 | [OFL-1.1](../public/font-licenses/mitr/LICENSE.txt) | [Fontsource](https://fontsource.org/fonts/mitr) |
| Noto Serif Thai | 5.3.0 | [OFL-1.1](../public/font-licenses/noto-serif-thai/LICENSE.txt) | [Fontsource](https://fontsource.org/fonts/noto-serif-thai) |
| Pridi | 5.3.0 | [OFL-1.1](../public/font-licenses/pridi/LICENSE.txt) | [Fontsource](https://fontsource.org/fonts/pridi) |
| Maitree | 5.3.0 | [OFL-1.1](../public/font-licenses/maitree/LICENSE.txt) | [Fontsource](https://fontsource.org/fonts/maitree) |
| Taviraj | 5.3.0 | [OFL-1.1](../public/font-licenses/taviraj/LICENSE.txt) | [Fontsource](https://fontsource.org/fonts/taviraj) |
| Trirong | 5.3.0 | [OFL-1.1](../public/font-licenses/trirong/LICENSE.txt) | [Fontsource](https://fontsource.org/fonts/trirong) |
| Chonburi | 5.3.0 | [OFL-1.1](../public/font-licenses/chonburi/LICENSE.txt) | [Fontsource](https://fontsource.org/fonts/chonburi) |
| Mali | 5.3.0 | [OFL-1.1](../public/font-licenses/mali/LICENSE.txt) | [Fontsource](https://fontsource.org/fonts/mali) |
| Itim | 5.3.0 | [OFL-1.1](../public/font-licenses/itim/LICENSE.txt) | [Fontsource](https://fontsource.org/fonts/itim) |
| Noto Sans | 5.3.0 | [OFL-1.1](../public/font-licenses/noto-sans/LICENSE.txt) | [Fontsource](https://fontsource.org/fonts/noto-sans) |
| Inter | 5.3.0 | [OFL-1.1](../public/font-licenses/inter/LICENSE.txt) | [Fontsource](https://fontsource.org/fonts/inter) |

## Regenerate notices

Run `node scripts/font-licenses.js` after installing or changing font dependencies, then include the updated `public/font-licenses/` and this document in the release. The script reads only installed packages and makes no network requests. It stops if an installed family's license is no longer OFL-1.1 so that the change can be reviewed.

## Uploaded fonts

Administrators may upload their own WOFF2, WOFF, TTF, or OTF font files. The uploader must hold permission to use and redistribute the font as a web font. Record its source URL and license in the font library; uploading a font does not grant rights or change its original license. Uploaded files are stored separately in the site's data directory and are not covered by the bundled OFL notices. Retain any additional notices and license documents required by the uploaded font's owner.
