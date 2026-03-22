
/**
 * A collection of utility functions for file handling.
 */

/**
 * Extracts a filename from a given URL or data URI.
 * @param url The URL or data URI string.
 * @param defaultName A default name to use if a name cannot be extracted.
 * @returns The extracted or default filename.
 */
export const getFileNameFromUrl = (url: string, defaultName: string): string => {
  // Handle data URIs, potentially with a 'name' parameter
  if (url.startsWith('data:')) {
    const nameMatch = url.match(/name=([^;]+)/);
    if (nameMatch && nameMatch[1]) {
      try {
        return decodeURIComponent(nameMatch[1]);
      } catch (e) {
        // Fallback if decoding fails
      }
    }
    // Fallback for data URIs without a name parameter
    const mimeType = url.substring(url.indexOf(':') + 1, url.indexOf(';'));
    const extension = mimeType.split('/')[1] || 'file';
    return `${defaultName.replace(/\s+/g, '_').toLowerCase()}.${extension}`;
  }
  
  // Handle regular URLs
  try {
    const urlWithoutParams = url.split('?')[0];
    const path = new URL(urlWithoutParams).pathname;
    const filename = path.substring(path.lastIndexOf('/') + 1);
    // Decode URI component to handle encoded characters and return if valid
    if (filename) {
      return decodeURIComponent(filename);
    }
  } catch (e) {
    // Malformed URL, fallback to default name
    console.error("Could not parse URL to extract filename:", e);
  }
  
  return defaultName;
};

/**
 * Converts a data URI string into a File object.
 * @param dataURI The data URI to convert.
 * @param filename The desired filename for the output File object.
 * @returns A promise that resolves with the created File object, or null if conversion fails.
 */
export async function dataURItoFile(dataURI: string, filename: string): Promise<File | null> {
  if (!dataURI.startsWith('data:')) return null;
  
  try {
    const res = await fetch(dataURI);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
  } catch (error) {
    console.error("Error converting data URI to File:", error);
    return null;
  }
}
