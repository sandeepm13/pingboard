// Used by worker/Dockerfile. The bundle keeps npm packages external, and the
// repo has one package.json shared with the web app (Next.js, React…). This
// writes a package.json with only the packages the worker bundle imports, at
// the versions pinned in the real one, so the worker image installs just those.
//
//   node worker/runtime-deps.mjs <bundle.mjs> <out/package.json>

import { readFileSync, writeFileSync } from "node:fs"
import { builtinModules } from "node:module"

const [bundlePath, outPath] = process.argv.slice(2)
if (!bundlePath || !outPath) {
  console.error("usage: node worker/runtime-deps.mjs <bundle.mjs> <out.json>")
  process.exit(1)
}

const bundle = readFileSync(bundlePath, "utf8")
const root = JSON.parse(readFileSync("package.json", "utf8"))

// esbuild output: `import x from "pkg"`, `import "pkg"`, `import("pkg")`.
const specifiers = [
  ...bundle.matchAll(/\b(?:from|import)\s*\(?\s*"([^".][^"]*)"/g),
].map((match) => match[1])

const builtins = new Set(builtinModules)
const packages = new Set()
for (const specifier of specifiers) {
  if (specifier.startsWith("node:") || builtins.has(specifier)) continue
  const parts = specifier.split("/")
  packages.add(
    specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]
  )
}

const dependencies = {}
for (const name of [...packages].sort()) {
  const version = root.dependencies?.[name]
  if (!version) {
    console.error(
      `worker imports "${name}", which isn't in package.json "dependencies"`
    )
    process.exit(1)
  }
  dependencies[name] = version
}

const reduced = {
  name: `${root.name}-worker`,
  version: root.version,
  private: true,
  dependencies,
  // Overrides only apply to packages that are still listed.
  overrides: Object.fromEntries(
    Object.entries(root.overrides ?? {}).filter(
      ([name]) => name in dependencies
    )
  ),
}
writeFileSync(outPath, `${JSON.stringify(reduced, null, 2)}\n`)
console.log(`worker runtime packages: ${Object.keys(dependencies).join(", ")}`)
