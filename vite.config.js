import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

function collectFiles(directory, prefix = "") {
  return readdirSync(directory).flatMap((name) => {
    const source = resolve(directory, name);
    const outputName = prefix ? `${prefix}/${name}` : name;

    return statSync(source).isDirectory()
      ? collectFiles(source, outputName)
      : [{ source, outputName }];
  });
}

export default defineConfig({
  base: "/ReadJourney/",
  publicDir: false,
  build: {
    emptyOutDir: true,
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      input: {
        main: resolve("index.html"),
        notFound: resolve("404.html"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          const name = chunkInfo.name;
          if (name === "firebase-vendor") return "assets/firebase-vendor.js";
          if (name === "router") return "assets/router.js";
          if (name === "react-vendor") return "assets/react-vendor.js";
          return "assets/main.js";
        },
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
        manualChunks(id) {
          if (
            id.includes("/node_modules/@firebase/") ||
            id.includes("/node_modules/firebase/")
          )
            return "firebase-vendor";
          if (id.includes("/node_modules/react-router/")) return "router";
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/")
          )
            return "react-vendor";
        },
      },
    },
  },
  plugins: [
    {
      name: "copy-existing-static-assets",
      generateBundle() {
        const files = [
          ...collectFiles(resolve("assets"), "assets").filter(
            ({ outputName }) => outputName.endsWith("/book-C2aK6_m4.jpg"),
          ),
          { source: resolve("Logo-1.svg"), outputName: "Logo-1.svg" },
        ];

        for (const { source, outputName } of files) {
          this.emitFile({
            type: "asset",
            fileName: outputName,
            source: readFileSync(source),
          });
        }
      },
    },
  ],
});
