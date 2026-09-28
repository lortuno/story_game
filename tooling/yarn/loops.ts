/**
 * Static check for jump cycles that never produce content.
 *
 * The Yarn runtime executes jumps inside one synchronous loop and only yields at a line,
 * command, option set or <<stop>>. A cycle of <<jump>>/<<detour>> with none of those in
 * between (e.g. node A: `<<jump A>>`) therefore freezes the browser tab for good; no
 * runtime guard can interrupt it, so it has to be caught at build time.
 */

/** Structural subset of the compiled Yarn program we analyse. */
export interface ProgramLike {
  readonly nodes: Readonly<Record<string, { readonly instructions: readonly InstructionLike[] }>>
}

interface InstructionLike {
  readonly op: string
  readonly index?: number
  readonly node?: string
}

export interface LoopReport {
  /** Cycles reachable without passing any condition: they always hang. */
  readonly unconditional: readonly (readonly string[])[]
  /** Cycles that pass through an <<if>>: they hang only for some variable values. */
  readonly conditional: readonly (readonly string[])[]
}

interface Edge {
  readonly to: string
  readonly conditional: boolean
}

/** Ops where the runtime returns control to the host (so a cycle through them is not a hang). */
const YIELDING_OPS: ReadonlySet<string> = new Set(['runLine', 'runCommand', 'showOptions', 'stop'])
/** Ops that end the current path (leave the node) without a static jump target. */
const TERMINAL_OPS: ReadonlySet<string> = new Set(['return', 'popJump', 'selectSaliencyCandidate'])

export function findContentFreeLoops(program: ProgramLike): LoopReport {
  const edges = new Map<string, readonly Edge[]>()
  for (const [name, node] of Object.entries(program.nodes)) edges.set(name, contentFreeJumps(node.instructions))

  const unconditional = findCycles(edges, (edge) => !edge.conditional)
  const known = new Set(unconditional.map(cycleKey))
  const conditional = findCycles(edges, () => true).filter((cycle) => !known.has(cycleKey(cycle)))
  return { unconditional, conditional }
}

/** Jumps reachable from the node's entry without passing a yielding instruction. */
function contentFreeJumps(instructions: readonly InstructionLike[]): Edge[] {
  const edges: Edge[] = []
  const visited = new Map<number, boolean>() // ip → reached only conditionally?
  const stack: { ip: number; conditional: boolean }[] = [{ ip: 0, conditional: false }]

  while (stack.length > 0) {
    const { ip, conditional } = stack.pop()!
    const seen = visited.get(ip)
    // Revisit only if we now reach this ip unconditionally (a stronger finding).
    if (ip < 0 || ip >= instructions.length || (seen !== undefined && (seen === false || conditional))) continue
    visited.set(ip, conditional)

    const instruction = instructions[ip]
    const { op } = instruction
    if (YIELDING_OPS.has(op) || TERMINAL_OPS.has(op)) continue
    if (op === 'jumpTo') stack.push({ ip: instruction.index ?? -1, conditional })
    else if (op === 'jumpIfFalse' || op === 'jumpIfTrue') {
      stack.push({ ip: instruction.index ?? -1, conditional: true }, { ip: ip + 1, conditional: true })
    } else if (op === 'runNode' && instruction.node) {
      edges.push({ to: instruction.node, conditional })
    } else if (op === 'detour' && instruction.node) {
      edges.push({ to: instruction.node, conditional })
      stack.push({ ip: ip + 1, conditional }) // execution resumes here after the detour returns
    } else {
      stack.push({ ip: ip + 1, conditional })
    }
  }
  return edges
}

/** Elementary cycles found by DFS (one per back edge), over the edges `include` accepts. */
function findCycles(edges: ReadonlyMap<string, readonly Edge[]>, include: (edge: Edge) => boolean): string[][] {
  const cycles: string[][] = []
  const state = new Map<string, 'active' | 'done'>()
  const path: string[] = []

  const visit = (node: string) => {
    state.set(node, 'active')
    path.push(node)
    for (const edge of edges.get(node) ?? []) {
      if (!include(edge)) continue
      const next = state.get(edge.to)
      if (next === 'active') cycles.push([...path.slice(path.indexOf(edge.to)), edge.to])
      else if (next === undefined && edges.has(edge.to)) visit(edge.to)
    }
    path.pop()
    state.set(node, 'done')
  }

  for (const node of edges.keys()) if (!state.has(node)) visit(node)
  return cycles
}

function cycleKey(cycle: readonly string[]): string {
  return [...new Set(cycle)].sort().join('|')
}
