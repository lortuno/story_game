import { useEffect, useRef, useState } from 'react'
import { useStoryContext } from '../app/story-context'
import type { ImageRef } from '../engine/types'
import type { StoryImage } from '../stories/types'
import styles from './StoryFigure.module.css'

interface StoryFigureProps {
  readonly images: readonly ImageRef[]
}

/** One image, or a gallery for consecutive <<image>> commands. */
export function StoryFigure({ images }: StoryFigureProps) {
  const { story } = useStoryContext()
  const available = images.filter((image) => story.images[image.key])
  if (available.length === 0) return null

  return (
    <div className={available.length > 1 ? styles.gallery : styles.single}>
      {available.map((image) => (
        <ZoomableImage key={image.key} image={story.images[image.key]} caption={image.caption} />
      ))}
    </div>
  )
}

interface ZoomableImageProps {
  readonly image: StoryImage
  readonly caption: string | null
}

function ZoomableImage({ image, caption }: ZoomableImageProps) {
  const { strings } = useStoryContext()
  const [zoomed, setZoomed] = useState(false)
  const label = caption ?? ''

  return (
    <figure className={styles.figure}>
      <button type="button" className={styles.zoom} onClick={() => setZoomed(true)} aria-label={strings.enlargeImage(label)}>
        <img src={image.src} width={image.width} height={image.height} alt={label} loading="lazy" decoding="async" />
      </button>
      {caption && <figcaption>{caption}</figcaption>}
      {zoomed && <Lightbox image={image} caption={label} onClose={() => setZoomed(false)} />}
    </figure>
  )
}

interface LightboxProps {
  readonly image: StoryImage
  readonly caption: string
  readonly onClose: () => void
}

/** Native modal <dialog>: focus trap, Esc to close and inert background for free. */
function Lightbox({ image, caption, onClose }: LightboxProps) {
  const { strings } = useStoryContext()
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className={styles.lightbox}
      aria-label={caption}
      onClose={() => {
        // StrictMode's simulated unmount calls close() and re-opens the dialog; its queued
        // close event arrives while the dialog is open again and must be ignored.
        if (!dialogRef.current?.open) onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose() // backdrop click
      }}
    >
      <img src={image.src} width={image.width} height={image.height} alt={caption} />
      <div className={styles.lightboxBar}>
        {caption && <span>{caption}</span>}
        <a href={image.src} target="_blank" rel="noopener noreferrer">
          {strings.openOriginal}
        </a>
        <button type="button" className="button" onClick={onClose} autoFocus>
          {strings.close}
        </button>
      </div>
    </dialog>
  )
}
