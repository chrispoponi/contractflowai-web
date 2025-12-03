import { supabase } from "./supabaseClient";

const CONTRACTS_BUCKET =
  import.meta.env.VITE_SUPABASE_STORAGE_CONTRACTS_BUCKET || "contracts";

function buildObjectKey(userId, fileName) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const extension = fileName.split(".").pop();
  return `${userId}/${timestamp}-${randomSuffix}.${extension || "pdf"}`;
}

export async function uploadContractFile({
  file,
  userId,
  bucket = CONTRACTS_BUCKET,
}) {
  if (!file) {
    throw new Error("File is required for upload.");
  }
  if (!userId) {
    throw new Error("User ID is required to upload files.");
  }

  const objectKey = buildObjectKey(userId, file.name || "contract.pdf");

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(objectKey, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(objectKey, 60 * 60);

  if (signedError) {
    throw signedError;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(objectKey);

  return {
    bucket,
    path: objectKey,
    signedUrl: signed.signedUrl,
    publicUrl,
  };
}
