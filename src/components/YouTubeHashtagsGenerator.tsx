import { useMemo, useState } from 'react'
import { Copy, Loader2 } from 'lucide-react'
import { generateYouTubeHashtags } from '../services/youtubeHashtagsService'

const MAX_WORDS = 5000

const countWords = (text: string) => {
  const trimmed = text.trim()
  if (!trimmed) {
    return 0
  }
  return trimmed.split(/\s+/).filter(Boolean).length
}

type YouTubeHashtagsGeneratorProps = {
  onToast: (message: string) => void
}

export function YouTubeHashtagsGenerator({ onToast }: YouTubeHashtagsGeneratorProps) {
  const [content, setContent] = useState('')
  const [generatedHashtags, setGeneratedHashtags] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState('')

  const wordCount = useMemo(() => countWords(content), [content])
  const isOverWordLimit = wordCount > MAX_WORDS
  const canSubmit = content.trim().length > 0 && !isOverWordLimit && !isGenerating

  const handleGenerate = async () => {
    if (!canSubmit) {
      return
    }

    setIsGenerating(true)
    setGenerationError('')
    setGeneratedHashtags('')

    try {
      const result = await generateYouTubeHashtags(content)
      setGeneratedHashtags(result.hashtags)
      onToast('YouTube hashtags generated.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to generate hashtags.'
      setGenerationError(message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!generatedHashtags) {
      return
    }

    try {
      await navigator.clipboard.writeText(generatedHashtags)
      onToast('Hashtags copied to clipboard.')
    } catch {
      onToast('Unable to copy hashtags.')
    }
  }

  return (
    <div className="content-stack">
      <section className="panel glass-panel">
        <div>
          <p className="eyebrow">Input</p>
          <h3>Video script, topic, or description</h3>
          <p>Paste your content below and we will generate a mix of broad and niche YouTube hashtags.</p>
        </div>

        <div className="form-grid">
          <label>
            Content
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Paste your video script, topic, or description here..."
              rows={14}
              aria-invalid={isOverWordLimit}
              aria-describedby="hashtags-word-count"
            />
          </label>
        </div>

        <p
          id="hashtags-word-count"
          className={`word-count ${isOverWordLimit ? 'word-count-over' : ''}`}
          aria-live="polite"
        >
          Word count: {wordCount.toLocaleString()} / {MAX_WORDS.toLocaleString()}
        </p>

        {isOverWordLimit ? (
          <p className="error-message" role="alert">
            Input exceeds the {MAX_WORDS.toLocaleString()}-word limit. Please shorten your text before generating.
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
              'Generate Hashtags'
            )}
          </button>
        </div>

        {generationError ? <p className="error-message">{generationError}</p> : null}
      </section>

      <section className="panel glass-panel">
        <div className="split-header">
          <div>
            <p className="eyebrow">Output</p>
            <h3>Generated hashtags</h3>
            <p>Copy the optimized hashtag list directly into YouTube Studio.</p>
          </div>
          {generatedHashtags ? (
            <button className="btn secondary" type="button" onClick={() => void handleCopy()}>
              <Copy className="icon-inline" aria-hidden="true" />
              Copy to Clipboard
            </button>
          ) : null}
        </div>

        {generatedHashtags ? (
          <article className="result-card description-output">
            <p style={{ whiteSpace: 'pre-wrap' }}>{generatedHashtags}</p>
          </article>
        ) : (
          <p className="muted-note">
            {isGenerating
              ? 'Generating your YouTube hashtags...'
              : 'Your generated hashtags will appear here after you submit your content.'}
          </p>
        )}
      </section>
    </div>
  )
}
