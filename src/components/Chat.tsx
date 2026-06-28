import { useEffect, useRef, type ReactNode } from 'react'

interface ChatProps {
  messages: ReadonlyArray<unknown>
  isLoading?: boolean
  className?: string
  children: ReactNode
}

export function Chat({ messages, isLoading = false, className, children }: ChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div className={className}>
      {children}
      <div ref={messagesEndRef} aria-hidden="true" />
    </div>
  )
}
