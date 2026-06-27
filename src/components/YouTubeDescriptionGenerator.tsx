import { useMemo, useState } from 'react'
import { Copy, Loader2 } from 'lucide-react'
import { generateYouTubeDescription } from '../services/youtubeDescriptionService'

const MAX_WORDS = 5000

const countWords = (text: string) => {
  const trimmed = text.trim()
  if (!trimmed) {
    return 0
  }
  return trimmed.split(/\s+/).filter(Boolean).length
}

type YouTubeDescriptionGeneratorProps = {
  onToast: (message: string) => void
}

export function YouTubeDescriptionGenerator({ onToast }: YouTubeDescriptionGeneratorProps) {
  const [script, setScript] = useState('')
  const [generatedDescription, setGeneratedDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState('')

  const wordCount = useMemo(() => countWords(script), [script])
  const isOverWordLimit = wordCount > MAX_WORDS
  const canSubmit = script.trim().length > 0 && !isOverWordLimit && !isGenerating

  const handleGenerate = async () => {
    if (!canSubmit) {
      return
    }

    setIsGenerating(true)
    setGenerationError('')
    setGeneratedDescription('')

    try {
      const result = await generateYouTubeDescription(script)
      setGeneratedDescription(result.description)
      onToast('YouTube description generated.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to generate description.'
      setGenerationError(message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!generatedDescription) {
      return
    }

    try {
      await navigator.clipboard.writeText(generatedDescription)
      onToast('Description copied to clipboard.')
    } catch {
      onToast('Unable to copy description.')
    }
  }

  return (
    <div className="content-stack">
      <section className="panel glass-panel">
        <div>
          <p className="eyebrow">Input</p>
          <h3>Video script</h3>
          <p>Paste your full video script below. We will turn it into an SEO-ready YouTube description.</p>
        </div>

        <div className="form-grid">
          <label>
            Script
            <textarea
              value={script}
              onChange={(event) => setScript(event.target.value)}
              placeholder="Paste your video script here..."
              rows={14}
              aria-invalid={isOverWordLimit}
              aria-describedby="script-word-count"
            />
          </label>
        </div>

        <p
          id="script-word-count"
          className={`word-count ${isOverWordLimit ? 'word-count-over' : ''}`}
          aria-live="polite"
        >
          Word count: {wordCount.toLocaleString()} / {MAX_WORDS.toLocaleString()}
        </p>

        {isOverWordLimit ? (
          <p className="error-message" role="alert">
            Script exceeds the {MAX_WORDS.toLocaleString()}-word limit. Please shorten your script before generating.
          </p>
        ) : null}

        <div className="action-row">
          <button className="btn primary" type="button" onClick={() => void handleGenerate()} disabled={!canSubmit}>
            {isGenerating ? (
              <>
                <Loader2 className="icon-inline spin" aria-hidden="true" />
                Generating...
              </>
            ) : (
              'Generate Description'
            )}
          </button>
        </div>

        {generationError ? <p className="error-message">{generationError}</p> : null}
      </section>

      <section className="panel glass-panel">
        <div className="split-header">
          <div>
            <p className="eyebrow">Output</p>
            <h3>Generated description</h3>
            <p>Review the SEO-optimized description below, then copy it into YouTube Studio.</p>
          </div>
          {generatedDescription ? (
            <button className="btn secondary" type="button" onClick={() => void handleCopy()}>
              <Copy className="icon-inline" aria-hidden="true" />
              Copy to Clipboard
            </button>
          ) : null}
        </div>

        {generatedDescription ? (
          <article className="result-card description-output">
            <p style={{ whiteSpace: 'pre-wrap' }}>{generatedDescription}</p>
          </article>
        ) : (
          <p className="muted-note">
            {isGenerating
              ? 'Generating your YouTube description...'
              : 'Your generated description will appear here after you submit your script.'}
          </p>
        )}
      </section>
    </div>
  )
}
