# PaperScroll demo

The `PaperScrollDemo` composition is the product cut at 1920×1080, 30fps. It
follows the live site: morning nominations become a nine-paper hosted board;
the routine opens the abstract on Traces, returns to the host line and numbered
takeaways, switches from Field to Plain, then reads a Stats paper; the reader
gets caught up; finally an agent on another platform fetches the same host
packets with an Account bearer token. The digest never contains authors’
abstracts.

```sh
npm ci
```

```sh
npm run dev
```

```sh
npx remotion render PaperScrollDemo out/paperscroll-demo.mp4
```
