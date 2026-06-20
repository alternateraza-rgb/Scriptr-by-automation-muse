import { Send } from 'lucide-react';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
}

export const ChatInput = ({ 
  input, 
  setInput, 
  handleSubmit, 
  isLoading 
}: ChatInputProps) => (
  <div className="absolute bottom-0 right-0 border-t left-64 bg-gray-900/85 backdrop-blur-md border-orange-500/10">
    <div className="w-full max-w-2xl px-3 py-2.5 mx-auto sm:px-4">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            placeholder="Type something clever (or don't, we won't judge)..."
            className="w-full py-2.5 pl-3.5 pr-11 overflow-hidden text-sm leading-5 text-white placeholder-gray-400 border rounded-xl shadow-lg resize-none border-orange-500/15 bg-gray-800/60 focus:outline-none focus:ring-2 focus:ring-orange-500/35 focus:border-orange-500/30"
            rows={1}
            style={{ minHeight: '40px', maxHeight: '160px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height =
                Math.min(target.scrollHeight, 160) + 'px'
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute p-1.5 text-orange-500 transition-colors -translate-y-1/2 rounded-md right-2 top-1/2 hover:text-orange-400 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  </div>
); 