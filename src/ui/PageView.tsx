import type { Block, GroupStyle, StyledText } from '../engine/types'
import styles from './PageView.module.css'
import { RichText } from './RichText'
import { StoryFigure } from './StoryFigure'

interface PageViewProps {
  readonly blocks: readonly Block[]
}

const GROUP_CLASS: Record<GroupStyle, string> = {
  postit: styles.postit,
  list: styles.list,
  olist: styles.list,
  note: styles.note,
  clue: styles.clue,
}

export function PageView({ blocks }: PageViewProps) {
  // Blocks are immutable per page and the page is keyed by id, so index keys are stable.
  return blocks.map((block, index) => <BlockView key={index} block={block} />)
}

function BlockView({ block }: { readonly block: Block }) {
  switch (block.kind) {
    case 'paragraph':
      return (
        <p className={styles.paragraph}>
          {block.speaker && <strong className={styles.speaker}>{block.speaker}: </strong>}
          <RichText text={block.text} />
        </p>
      )
    case 'heading': {
      const Heading = block.level === 2 ? 'h2' : 'h3'
      return (
        <Heading className={styles.heading}>
          <RichText text={block.text} />
        </Heading>
      )
    }
    case 'figure':
      return <StoryFigure images={block.images} />
    case 'group':
      return <GroupView style={block.style} items={block.items} />
  }
}

function GroupView({ style, items }: { readonly style: GroupStyle; readonly items: readonly StyledText[] }) {
  const lines = items.map((item, index) => <RichText key={index} text={item} />)

  if (style === 'list' || style === 'olist') {
    const List = style === 'olist' ? 'ol' : 'ul'
    return (
      <List className={GROUP_CLASS[style]}>
        {lines.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </List>
    )
  }
  return (
    <div className={GROUP_CLASS[style]}>
      {lines.map((line, index) => (
        <p key={index}>{line}</p>
      ))}
    </div>
  )
}
