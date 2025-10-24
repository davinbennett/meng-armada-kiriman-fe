
// Uses Web Crypto API available in Deno / Supabase Edge
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const ALGO = 'AES-GCM';
const IV_LEN = 12; // for AES-GCM

export async function importKey(base64Key: string) {
    const raw = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
    return await crypto.subtle.importKey(
        'raw',
        raw,
        { name: ALGO },
        false,
        ['encrypt', 'decrypt']
    );
}

export function genIv() {
    return crypto.getRandomValues(new Uint8Array(IV_LEN));
}

export function b64encode(bytes: Uint8Array) {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export function b64decode(b64: string) {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
}

export async function encryptText(plain: string, base64Key: string) {
    const key = await importKey(base64Key);
    const iv = genIv();
    const data = encoder.encode(plain);
    const cipher = await crypto.subtle.encrypt(
        { name: ALGO, iv },
        key,
        data
    );
    const cipherBytes = new Uint8Array(cipher);
    // store iv + ciphertext as base64.iv|base64.ct
    return `${b64encode(iv)}.${b64encode(cipherBytes)}`;
}

export async function decryptText(payload: string, base64Key: string) {
    const [ivB64, ctB64] = payload.split('.');
    if (!ivB64 || !ctB64) throw new Error('invalid payload');
    const key = await importKey(base64Key);
    const iv = b64decode(ivB64);
    const ct = b64decode(ctB64);
    const plainBuf = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ct);
    return decoder.decode(new Uint8Array(plainBuf));
}
