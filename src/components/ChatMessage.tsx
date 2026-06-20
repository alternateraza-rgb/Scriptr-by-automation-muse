import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import rehypeHighlight from 'rehype-highlight'
import type { Message } from '../utils/ai'

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
}

export const ChatMessage = ({ message, isStreaming = false }: ChatMessageProps) => (
  <div
    className={`py-3 sm:py-4 streaming-message ${
      message.role === 'assistant'
        ? 'bg-gradient-to-r from-orange-500/[0.035] to-red-600/[0.035]'
        : 'bg-transparent'
    }`}
  >
    <div className="flex items-start w-full max-w-2xl gap-3 px-3 mx-auto sm:px-4">
      {message.role === 'assistant' ? (
        <div className="flex items-center justify-center flex-shrink-0 w-7 h-7 text-[11px] font-semibold text-white rounded-md bg-gradient-to-r from-orange-500 to-red-600 shadow-sm shadow-orange-500/20">
          AI
        </div>
      ) : (
        <div className="flex items-center justify-center flex-shrink-0 w-7 h-7 text-[11px] font-semibold text-white bg-gray-700 rounded-md shadow-sm shadow-black/20">
          Y
        </div>
      )}
      <div className={`flex-1 min-w-0 text-sm leading-6 ${isStreaming ? 'streaming-cursor' : ''}`}>
        <ReactMarkdown
          className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5"
          rehypePlugins={[
            rehypeRaw,
            rehypeSanitize,
            rehypeHighlight,
          ]}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  </div>
); 