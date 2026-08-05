export function canShareFiles(navigatorObject) {
  return Boolean(navigatorObject?.share && navigatorObject?.canShare);
}
