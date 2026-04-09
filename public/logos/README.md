# MyStackd — Logo Assets

Drop your logo files into this folder. The app loads them automatically.

## Files in this folder

| File | Used in | Description |
|------|---------|-------------|
| `favicon.png` | Sidebar icon slot (32×32px) + browser tab + iOS home screen | Square icon-only mark |
| `logo-wordmark.png` | Sidebar text slot (20px tall) | "MyStackd" text-only logo |
| `logo-full.png` | Landing page, emails, og:image | Full horizontal logo (mark + text combined) |

## Brand colors (for reference)

```
Deep Navy:   #1F2A44  — primary background
Stack Green: #22C55E  — primary accent (CTAs, earnings)
Stack Blue:  #3B82F6  — charts, selected states
Soft Teal:   #14B8A6  — secondary accent
```

## How the sidebar logo works

The sidebar tries to load `logo-mark.svg` first (the icon).
If that fails (file not found), it shows a green "M" badge as fallback.

It also tries `logo-wordmark.svg` for the text portion.
If that fails, it shows "MyStackd" in white Inter Semibold as fallback.

So the app works before you drop files in, and automatically upgrades
to your real logos once they're here — no code changes needed.

## Format tips

- Use SVG for all logos (scales to any size, no blur)
- Keep `logo-mark.svg` square or near-square
- Set `viewBox` correctly — don't hardcode width/height in the SVG root
- Test both on `#1F2A44` (navy bg) and `#17203A` (sidebar bg)
