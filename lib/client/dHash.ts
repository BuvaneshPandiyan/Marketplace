// dHash (difference perceptual hash) for the browser.
// How it works:
//   1. Draw the image onto a tiny 9×8 canvas (the exact size that gives 64 comparison bits)
//   2. Read out the 9×8 = 72 pixel grayscale values
//   3. For each row, compare each pixel to the pixel to its right (8 comparisons × 8 rows = 64)
//   4. Encode the 64 bits as a 16-character hex string
//
// This is browser-only (uses HTMLCanvasElement). Import it only from Client Components or
// files that are never imported on the server.

// Width of the intermediate canvas: one pixel wider than the hash width because we compare
// each pixel to its right neighbor, so 8 comparisons needs 9 source pixels per row
const HASH_WIDTH = 9;
// Height of the intermediate canvas — equals the hash height (8 comparisons per column pair)
const HASH_HEIGHT = 8;

// Compute a dHash for the given image File/Blob. Returns a 16-char hex string, or null if
// the browser's canvas is unavailable or the image can't be decoded.
export async function computeDHash(imageFile: File | Blob): Promise<string | null> {
  try {
    // Create an Object URL so we can load the file into an HTMLImageElement
    const objectUrl = URL.createObjectURL(imageFile);
    try {
      // Load the image into an in-memory HTMLImageElement to get natural width/height
      const img = await loadImage(objectUrl);
      // Create a small off-screen canvas for the resize step
      const canvas = document.createElement("canvas");
      // Set the canvas to the exact size our dHash algorithm needs
      canvas.width = HASH_WIDTH;
      canvas.height = HASH_HEIGHT;
      // Get the 2D rendering context
      const ctx = canvas.getContext("2d");
      // If the browser doesn't support 2D canvas (very rare), bail gracefully
      if (!ctx) return null;
      // Draw the image scaled down to our tiny canvas — the browser's built-in bilinear
      // scaling handles the resize; no image-processing library needed
      ctx.drawImage(img, 0, 0, HASH_WIDTH, HASH_HEIGHT);
      // Extract all pixel RGBA values from the tiny canvas
      const imageData = ctx.getImageData(0, 0, HASH_WIDTH, HASH_HEIGHT);
      // imageData.data is a flat Uint8ClampedArray: [R, G, B, A, R, G, B, A, ...]
      const pixels = imageData.data;

      // Convert each pixel to a grayscale luminance value using the standard Rec.601 weights
      // (these weights account for human perception — green contributes more than blue)
      const gray: number[] = [];
      for (let i = 0; i < pixels.length; i += 4) {
        // 0.299 * R + 0.587 * G + 0.114 * B — the Rec.601 luma formula
        gray.push(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
      }

      // Compute the 64 hash bits: for each row, compare each pixel to the one to its right
      // A bit is 1 if the left pixel is brighter, 0 if the right pixel is brighter or equal
      const bits: number[] = [];
      for (let row = 0; row < HASH_HEIGHT; row++) {
        // Base index for the first pixel in this row
        const rowStart = row * HASH_WIDTH;
        for (let col = 0; col < HASH_WIDTH - 1; col++) {
          // 1 if the current pixel is brighter than its right neighbour, 0 otherwise
          bits.push(gray[rowStart + col] > gray[rowStart + col + 1] ? 1 : 0);
        }
      }

      // Pack the 64 bits into a 16-character hex string (4 bits per hex digit)
      let hex = "";
      for (let i = 0; i < bits.length; i += 4) {
        // Take 4 bits at a time and convert to a single hex character
        const nibble = (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3];
        hex += nibble.toString(16);
      }
      return hex;
    } finally {
      // Always revoke the Object URL to free memory, even if an error occurred
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    // If anything goes wrong (canvas not available, image load failed, etc.), return null
    // so the caller can skip hash storage without crashing
    return null;
  }
}

// Helper: load an image URL into an HTMLImageElement, resolving when the image is decoded
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    // Create a new image element
    const img = new Image();
    // Resolve the promise once the image is fully loaded
    img.onload = () => resolve(img);
    // Reject if the image fails to load (bad URL, CORS error, etc.)
    img.onerror = reject;
    // Set the source — this triggers the load
    img.src = src;
  });
}

// Compute the Hamming distance between two hex hash strings.
// The Hamming distance is the number of bits that differ between the two hashes.
// Two identical images produce distance 0; perceptually similar images typically score < 10.
// Exported so the server-side duplicate check can also explain the similarity score.
export function hammingDistance(hashA: string, hashB: string): number {
  // The hashes must be the same length to compare
  if (hashA.length !== hashB.length) return Infinity;
  // Count differing bits
  let distance = 0;
  for (let i = 0; i < hashA.length; i++) {
    // XOR the two hex digits to find which bits differ
    const xor = parseInt(hashA[i], 16) ^ parseInt(hashB[i], 16);
    // Count the set bits in the XOR result (the standard bit-counting trick)
    let n = xor;
    // Brian Kernighan's bit count: repeatedly clear the lowest set bit
    while (n) {
      n &= n - 1;
      distance++;
    }
  }
  return distance;
}
