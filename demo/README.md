# PaperScroll demo

The `PaperScrollDemo` composition is the product cut at 1920×1080, 30fps. It
follows the live site: morning nominations become a deterministic ten-paper board;
the routine opens the abstract on Traces, returns to the decision line and numbered
takeaways, switches from Field to Plain, then reads a Stats paper; the reader
gets caught up; finally an agent on another platform fetches the same board
packets with an Agent routing bearer token. The digest never contains authors’
abstracts.

The current product also includes a `/briefing-studio` prototype for configuring
one cached research endpoint per account. Read the Briefing Studio section in
the root `CLAUDE.md` before incorporating that feature into the video.

```sh
npm ci
```

```sh
npm run dev
```

```sh
npx remotion render PaperScrollDemo out/paperscroll-demo.mp4
```
