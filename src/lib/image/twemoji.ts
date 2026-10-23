export function twemojiUrl(emoji: string): string {
  const sequence = emoji.includes('\u200d') ? emoji : emoji.replace(/\ufe0f/g, '')
  const codepoints = Array.from(sequence, character => character.codePointAt(0)!.toString(16)).join('-')
  return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${codepoints}.svg`
}
export function loadTwemoji(emoji: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Unable to load emoji image'))
    image.src = twemojiUrl(emoji)
  })
}
