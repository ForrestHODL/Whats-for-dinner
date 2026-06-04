import { useRef, useState } from "react";
import {
  compressRecipeImage,
  dataUrlByteSize,
  formatImageSize,
  isRecipeDataImage,
} from "../lib/compressRecipeImage";

interface RecipeImageFieldProps {
  value: string;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
  /** When false, skips the inline preview (e.g. page already shows a hero image). */
  showPreview?: boolean;
}

export default function RecipeImageField({
  value,
  onChange,
  disabled = false,
  showPreview = true,
}: RecipeImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUploaded = isRecipeDataImage(value);
  const urlValue = isUploaded ? "" : value;

  const handleFile = async (file: File | undefined) => {
    if (!file || disabled) return;
    setUploading(true);
    setError(null);
    try {
      const compressed = await compressRecipeImage(file);
      onChange(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="recipe-image-field">
      <span className="recipe-image-label">Photo</span>

      {showPreview && value ? (
        <div className="recipe-image-preview-wrap">
          <img src={value} alt="" className="recipe-image-preview" />
          {isUploaded && (
            <p className="recipe-image-meta">
              Uploaded · {formatImageSize(dataUrlByteSize(value))} compressed
            </p>
          )}
        </div>
      ) : null}

      <div className="recipe-image-actions">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="recipe-image-file-input"
          disabled={disabled || uploading}
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          className="btn-secondary recipe-image-upload-btn"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Compressing…" : value ? "Replace photo" : "Upload photo"}
        </button>
        {value && (
          <button
            type="button"
            className="btn-ghost recipe-image-remove-btn"
            disabled={disabled || uploading}
            onClick={() => onChange(undefined)}
          >
            Remove
          </button>
        )}
      </div>

      <label className="recipe-image-url-field">
        <span className="recipe-image-url-label">
          {isUploaded ? "Or replace with image URL" : "Or paste image URL"}
        </span>
        <input
          type="text"
          inputMode="url"
          value={urlValue}
          onChange={(e) => onChange(e.target.value.trim() || undefined)}
          placeholder="https://…"
          disabled={disabled || uploading}
        />
      </label>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
