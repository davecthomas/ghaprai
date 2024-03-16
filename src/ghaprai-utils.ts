// GHA output strings have problems with newlines and quotes, so we encode them to base64
export function base64Encode(data: string): string {
  return Buffer.from(data).toString("base64")
}
