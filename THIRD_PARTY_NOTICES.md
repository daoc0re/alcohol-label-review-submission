# Third-party notices

This prototype uses third-party software and pretrained OCR data. Upstream packages retain their copyrights and license terms; this document does not replace them. The lockfile records exact transitive resolutions.

- React/React DOM, Vite, TypeScript, Radix UI/shadcn primitives, Tailwind, Lucide and other UI dependencies: see the generated `public/THIRD_PARTY_LICENSES.txt` inventory and the respective installed package LICENSE files. The inherited starter UI catalog is retained and only referenced components are bundled.
- Tesseract.js 6.0.1 and Tesseract.js-core: Apache-2.0 upstream distributions. The `@tesseract.js-data/eng` package declares MIT; the pinned English-data package contains no separate license text at its root, which the inventory discloses. The asset-copy step bundles their available license/notice files next to the OCR assets, and records SHA-256 checksums of model/worker/WASM binaries.
- axe-core: Mozilla Public License 2.0; development/test use only, not part of the production application bundle.
- Pillow and DejaVu Sans: used to generate raster test artwork. Fonts and Pillow are not required at runtime. Consult Pillow/DejaVu licensing if redistributing their software/font files; only rendered synthetic test images are included here.
- Starter support code and vendored CSS retain their existing included licenses.

Synthetic brand names, addresses, artwork and test cases were created for this assessment. They are not representations of actual approved products. No trademark claim or affiliation with Treasury/TTB is intended. No new blanket license is applied to third-party materials. Choose the applicant's desired license for original project code before broader reuse; public source visibility alone does not waive third-party obligations.
