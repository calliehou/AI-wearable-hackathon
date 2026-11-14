# Peri — Design reference

The source of truth is the HTML design files in `design/screens/` (exported from our design canvas). Each file is one 390×844 phone screen written as plain HTML with inline styles. Copy values from them directly.

## Tokens
| Token | Value | Use |
|---|---|---|
| ink | `#111111` | text, primary buttons, nav pill, badges |
| muted | `#6B6B76` | secondary text |
| surface | `#F3F3F5` | list rows, chips, inputs |
| line | `#EFEFF2` | borders |
| satellite | `#F26A3D` | due-today ring, logo satellite, live states |
| family | `#CDEBD6` (dot `#7CC99A`) | circle color |
| friends | `#FFE3B8` (dot `#F5A54A`) | circle color |
| work | `#CDEBFB` (dot `#6AB6E8`) | circle color |
| school | `#E3D9FF` (dot `#A993F0`) | circle color |
| money | `#FFD9C9` | promise kind tile, `$` |
| gift | `#F9C9C4` | promise kind tile |
| task | `#CDEBFB` | promise kind tile (paper-plane icon) |
| plan | `#FFF0B8` | promise kind tile (calendar or phone icon) |

- **Font:** Plus Jakarta Sans 500 / 600 / 700 / 800. Page titles 36px/800, letter-spacing -1.2px.
- **Radii:** rows 20–22px, cards 26–28px, pills 999px, avatars fully round.
- **Shadow:** `0 4px 16px rgba(17,17,17,.06)` on cards; the nav uses `0 10px 28px rgba(17,17,17,.3)`.
- **Badge:** black circle, min-width 20, 2px white border, sits top-right of the avatar (−5px, −7px).

## Logo
A solid dot (you), a tilted ellipse orbit (rx 38, ry 16, rotated −28° in a 100×100 viewBox), and an orange satellite at (70.9, 27.3). The app icon is white on `#111111`. The wordmark is lowercase **peri**, 800 weight. The SVG is in `design/screens/Logo.dc.html`.

## Motion
- Orbit rings rotate slowly at 70s, 110s and 160s per turn; the middle ring turns the opposite way. Avatars counter-rotate so they stay upright.
- Due-today postcards use horizontal scroll-snap.
- The mic button turns orange with a pulsing ring while held.
- All motion stops under `prefers-reduced-motion`.

## Screen files
`Launch` (welcome) · `Main` (My orbit) · `People` (Contacts) · `Person` · `Rhythm` (Ask Peri) · `Circles` · `Places` · `Lock` · `Detected` (Promise heard) · `Transfer` · `Sent` (Promise kept) · `Gift` · `Band` · `Mic`
