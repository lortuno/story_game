/** `.yarnproject` files are compiled at build time by tooling/yarn/vite-plugin-yarn.ts. */
declare module '*.yarnproject' {
  const dialogue: { readonly json: string; readonly hash: string }
  export default dialogue
}
