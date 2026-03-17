import { callAiFunction } from './aiProviderService'

export type ImportedYouTubeChannel = {
  channelId: string
  channelUrl: string
  channelName: string
  description: string
  profilePhotoUrl: string
  subscriberCount: number
  subscriberCountLabel: string
}

export type ImportedYouTubeChannelStats = {
  channelId: string
  totalSubscribers: number
  totalChannelViews: number
  totalVideos: number
  uploadsPerMonth: number
  averageVideoLengthSeconds: number
  averageVideoLengthLabel: string
}

export async function importYouTubeChannel(channelUrl: string): Promise<ImportedYouTubeChannel> {
  const data = await callAiFunction<{ channel?: ImportedYouTubeChannel }>('fetchYouTubeChannelProfile', { channelUrl })
  if (!data.channel) {
    throw new Error('Unable to import this YouTube channel.')
  }
  return data.channel
}

export async function fetchYouTubeChannelStats(channelId: string): Promise<ImportedYouTubeChannelStats> {
  const data = await callAiFunction<{ stats?: ImportedYouTubeChannelStats }>('fetchYouTubeChannelStats', { channelId })
  if (!data.stats) {
    throw new Error('Unable to load channel stats.')
  }
  return data.stats
}
