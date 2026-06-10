import { access, mkdtemp, unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { AgentBridgeClient } from '../agent-bridge/client'
import { getAgentBridgeManager } from '../agent-bridge/manager'
import type { SttTranscribeInput, SttTranscribeResult } from './types'

const TMP_PREFIX = 'hermes-stt-'

export async function transcribeLocal(input: SttTranscribeInput): Promise<SttTranscribeResult> {
  const startedAt = Date.now()

  if (!Buffer.isBuffer(input.audio) || input.audio.length === 0) {
    throw new Error('Local STT audio is empty')
  }

  const manager = getAgentBridgeManager()
  await manager.ensureReady({ timeoutMs: 30000 })
  const bridgeClient = new AgentBridgeClient()

  const tmpDir = await mkdtemp(join(tmpdir(), TMP_PREFIX))
  const ext = extFromMime(input.mimeType) || '.ogg'
  const audioPath = join(tmpDir, `audio${ext}`)

  try {
    await writeFile(audioPath, input.audio)

    const result = await bridgeClient.transcribe(audioPath)

    if (!result.ok) {
      throw new Error(String(result.error || 'Local STT transcription failed'))
    }

    return {
      text: String(result.transcript || ''),
      provider: input.provider,
      model: 'faster-whisper',
      language: typeof result.language === 'string' ? result.language : undefined,
      durationMs: Date.now() - startedAt,
    }
  } finally {
    await unlink(audioPath).catch(() => {})
    await access(tmpDir).then(() => unlink(tmpDir).catch(() => {})).catch(() => {})
  }
}

function extFromMime(mimeType: string | undefined | null): string | null {
  if (!mimeType) return null
  const map: Record<string, string> = {
    'audio/webm': '.webm',
    'audio/ogg': '.ogg',
    'audio/wav': '.wav',
    'audio/mp3': '.mp3',
    'audio/mpeg': '.mp3',
    'audio/mp4': '.mp4',
    'audio/x-m4a': '.m4a',
    'audio/flac': '.flac',
  }
  return map[mimeType as string] || null
}
