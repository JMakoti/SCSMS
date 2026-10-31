export const MAX_FILE_BYTES: number;
export function fileContentType(key: string): string;
export function storageConfig(env?: Record<string, string | undefined>): { url: string; key: string; bucket: string };
export function readFileBytes(stream: AsyncIterable<Uint8Array> | ReadableStream<Uint8Array> | null): Promise<Buffer>;
export function uploadFile(key: string, bytes: Uint8Array, env?: Record<string, string | undefined>): Promise<string>;
export function downloadFile(key: string, env?: Record<string, string | undefined>): Promise<{ bytes: Buffer; contentType: string }>;
