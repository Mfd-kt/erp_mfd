import path from "node:path";
import { fileURLToPath } from "node:url";

/** Même racine que next.config (évite « Can't resolve tailwindcss in ~/ » si cwd ≠ dossier du projet). */
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

const config = {
  plugins: {
    "@tailwindcss/postcss": {
      base: projectRoot,
    },
  },
};

export default config;
