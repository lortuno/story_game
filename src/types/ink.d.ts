/** `.ink` files are compiled at build time by tooling/ink/vite-plugin-ink.ts. */
declare module '*.ink' {
  const story: { readonly json: string; readonly hash: string }
  export default story
}
