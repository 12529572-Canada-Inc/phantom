type SecureStoreLike = {
  deleteItemAsync(key: string): Promise<void>
  getItemAsync(key: string): Promise<string | null>
  setItemAsync(key: string, value: string): Promise<void>
}

const defaultChunkSize = 1800
const maximumChunkCount = 64

function metadataKey(key: string) {
  return `${key}.meta`
}

function chunkKey(key: string, index: number) {
  return `${key}.${index}`
}

function parseChunkCount(value: string | null) {
  if (value === null) return null

  const count = Number(value)
  if (!Number.isInteger(count) || count < 1 || count > maximumChunkCount) {
    return null
  }

  return count
}

export function createSecureStoreAdapter(
  secureStore: SecureStoreLike,
  chunkSize = defaultChunkSize,
) {
  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new Error('SecureStore chunk size must be a positive integer.')
  }

  return {
    async getItem(key: string) {
      const count = parseChunkCount(await secureStore.getItemAsync(metadataKey(key)))
      if (count === null) return null

      const chunks = await Promise.all(
        Array.from({ length: count }, (_, index) =>
          secureStore.getItemAsync(chunkKey(key, index)),
        ),
      )

      return chunks.some((chunk) => chunk === null) ? null : chunks.join('')
    },

    async removeItem(key: string) {
      const count = parseChunkCount(await secureStore.getItemAsync(metadataKey(key)))
      if (count !== null) {
        await Promise.all(
          Array.from({ length: count }, (_, index) =>
            secureStore.deleteItemAsync(chunkKey(key, index)),
          ),
        )
      }

      await secureStore.deleteItemAsync(metadataKey(key))
    },

    async setItem(key: string, value: string) {
      const previousCount = parseChunkCount(
        await secureStore.getItemAsync(metadataKey(key)),
      )
      const chunks = Array.from(
        { length: Math.max(1, Math.ceil(value.length / chunkSize)) },
        (_, index) => value.slice(index * chunkSize, (index + 1) * chunkSize),
      )

      if (chunks.length > maximumChunkCount) {
        throw new Error('SecureStore value exceeds the supported session size.')
      }

      await Promise.all(
        chunks.map((chunk, index) =>
          secureStore.setItemAsync(chunkKey(key, index), chunk),
        ),
      )
      await secureStore.setItemAsync(metadataKey(key), String(chunks.length))

      if (previousCount !== null && previousCount > chunks.length) {
        await Promise.all(
          Array.from({ length: previousCount - chunks.length }, (_, offset) =>
            secureStore.deleteItemAsync(chunkKey(key, chunks.length + offset)),
          ),
        )
      }
    },
  }
}
