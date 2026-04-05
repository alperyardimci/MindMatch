const BOT_NAMES = [
  'Robo', 'Pixel', 'Nova', 'Byte', 'Spark',
  'Echo', 'Flux', 'Blip', 'Zara', 'Neo',
  'Luna', 'Chip', 'Dash', 'Fizz', 'Glow',
];

let nameIndex = 0;

export function getBotName(): string {
  const name = BOT_NAMES[nameIndex % BOT_NAMES.length];
  nameIndex++;
  return name;
}

export function scheduleBotPick(
  emojis: string[],
  callback: (emoji: string) => void,
): NodeJS.Timeout {
  const delay = 1000 + Math.random() * 3000; // 1-4 seconds
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];
  return setTimeout(() => callback(emoji), delay);
}
