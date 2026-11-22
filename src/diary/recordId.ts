const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";

export function createDiaryRecordId() {
  // This identifies a save retry. PocketBase checks ownership separately.
  let id = "";
  for (let index = 0; index < 15; index++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
}
