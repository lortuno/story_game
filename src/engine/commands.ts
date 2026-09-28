/**
 * Splits a delivered Yarn command (`image tablet "Tablet bloqueada"`) into a name and
 * arguments. Double quotes group words; `\"` inside quotes is a literal quote.
 */
export interface ParsedCommand {
  readonly name: string
  readonly args: readonly string[]
}

export function parseCommand(command: string): ParsedCommand {
  const tokens: string[] = []
  let current = ''
  let inQuotes = false
  let hasToken = false

  for (let index = 0; index < command.length; index++) {
    const char = command[index]
    if (inQuotes && char === '\\' && command[index + 1] === '"') {
      current += '"'
      index++
    } else if (char === '"') {
      inQuotes = !inQuotes
      hasToken = true
    } else if (!inQuotes && /\s/.test(char)) {
      if (hasToken) tokens.push(current)
      current = ''
      hasToken = false
    } else {
      current += char
      hasToken = true
    }
  }
  if (hasToken) tokens.push(current)

  const [name = '', ...args] = tokens
  return { name: name.toLowerCase(), args }
}
