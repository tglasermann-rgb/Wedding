import { randomInt } from "node:crypto";

// No look-alike characters (0/O, 1/l/I), so a password read aloud or over WhatsApp survives.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** Readable random password like "k7mq-x4tp-9wzr" (~60 bits). */
export function generatePassword(groups = 3, size = 4): string {
  return Array.from({ length: groups }, () => Array.from({ length: size }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")).join("-");
}

export const MIN_PASSWORD = 8;
