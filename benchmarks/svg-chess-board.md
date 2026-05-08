---
title: SVG Chess Board
type: svg
description: Render a chess position from PGN as SVG
expected: |
  Valid SVG showing the chess board after move 7.h4.
  The last move (h4) should be highlighted.
reference: /benchmarks/svg-chess-board/original.webp
system_hint: Output only valid SVG code wrapped in ```xml and ``` code fences.
---

Given this PGN string of a chess game:

1. b3 e5 2. Nf3 h5 3. d4 exd4 4. Nxd4 Nf6 5. f4 Ke7 6. Qd3 d5 7. h4 *

Figure out the current state of the chessboard, create an image in SVG code, also highlight the last move.
