let previewDigestModule;

async function loadPreviewDigest() {
  if (!previewDigestModule) {
    previewDigestModule = import("vite")
      .then(({ runnerImport }) =>
        runnerImport(new URL("../src/agentDigest.ts", import.meta.url).pathname),
      )
      .then((result) => result.module);
  }
  return previewDigestModule;
}

async function mount(vite) {
  const { handleApi } = await import("./app.mjs");
  vite.middlewares.use(async (req, res, next) => {
    try {
      const digest =
        typeof vite.ssrLoadModule === "function"
          ? async (query) => {
            const mod = await vite.ssrLoadModule("/src/agentDigest.ts");
            return mod.buildDigest(query);
            }
          : async (query) => {
              const mod = await loadPreviewDigest();
              return mod.buildDigest(query);
            };
      const handled = await handleApi(req, res, { digest });
      if (!handled) next();
    } catch (err) {
      next(err);
    }
  });
}

export function paperscrollApi() {
  return {
    name: "paperscroll-api",
    configureServer: mount,
    configurePreviewServer: mount,
  };
}
