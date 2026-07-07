// Static, SFW one-liners. Kept tame and workplace-appropriate.
// TODO: later, load jokes from a database instead of this static array.
const jokes = [
  "Why don't scientists trust atoms? Because they make up everything.",
  "I told my computer I needed a break, and now it won't stop sending me KitKat ads.",
  "Why did the developer go broke? Because he used up all his cache.",
  "I would tell you a UDP joke, but you might not get it.",
  "Why do programmers prefer dark mode? Because light attracts bugs.",
  "I'm reading a book about anti-gravity. It's impossible to put down.",
  "Why did the scarecrow win an award? He was outstanding in his field.",
  "There are 10 kinds of people in the world: those who understand binary and those who don't.",
  "Why did the coffee file a police report? It got mugged.",
  "I used to play piano by ear, but now I use my hands.",
];

export function getRandomJoke() {
  return jokes[Math.floor(Math.random() * jokes.length)];
}
