import { supabase } from "./supabase";

/**
 * Uploads a file to a specific Supabase storage bucket and returns the public URL.
 * @param file The file object to upload.
 * @param bucket The storage bucket name (default: 'doctor-documents').
 * @param path The relative path/filename within the bucket.
 * @returns The public URL of the uploaded file.
 */
export async function uploadDocument(
    file: File,
    path: string,
    bucket: string = "doctor-documents"
): Promise<string> {
    // 1. Upload the file
    const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
            upsert: true,
        });

    if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // 2. Get the public URL
    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

    return publicUrl;
}

/**
 * List files in a specific folder within a bucket.
 */
export async function listDocuments(path: string, bucket: string = "doctor-documents") {
    const { data, error } = await supabase.storage
        .from(bucket)
        .list(path);

    if (error) throw error;
    return data;
}

/**
 * Remove a file from a bucket.
 */
export async function deleteDocument(path: string, bucket: string = "doctor-documents") {
    const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

    if (error) throw error;
}
