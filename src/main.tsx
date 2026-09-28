import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { createServices } from './app/services'
import { resolveStoryId } from './stories/registry'
import './styles/global.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

createRoot(root).render(
  <StrictMode>
    <App storyId={resolveStoryId(window.location.search)} services={createServices()} />
  </StrictMode>,
)
