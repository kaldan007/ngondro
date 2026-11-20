# Ngöndro practice

A small static site for reading the ngöndro recitation with the refuge tree thangka.
It opens on a prompt to begin; during practice the text can sit over the image,
beside it, below it, or alone, and you step through it one passage at a time.

Arrow keys move between passages. Layout, text size and image dimming are remembered in the browser.

## Changing the text

Edit the `.md` file (`<sub>` marks small-print instructions), then run:

```bash
node tools/build-text.mjs
```

This rewrites the passages in `index.html` and fails if they stop matching the `.md` exactly.
Where each section breaks into passages is set by the `splits` lists in that script.

## Publishing

Push to a GitHub repository, then under Settings, Pages, choose "Deploy from a branch", `main`, `/ (root)`.
