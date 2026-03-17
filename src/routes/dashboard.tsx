import { createFileRoute } from '@tanstack/react-router'
import { Home } from './index'

export const Route = createFileRoute('/dashboard')({
  component: Home,
})
