export function buildSharePayload({ name, file }) {
  return {
    title: name,
    text: `Ride ${name} with Road League`,
    files: file ? [file] : []
  };
}
