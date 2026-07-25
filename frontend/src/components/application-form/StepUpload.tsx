import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Upload, FileText, X, Image } from "lucide-react";

interface StepUploadProps {
  control: any;
  errors: any;
  setValue: any;
  resumeFile: File | null;
  setResumeFile: (file: File | null) => void;
  photoFile: File | null;
  setPhotoFile: (file: File | null) => void;
  uploadError: string | null;
  setUploadError: (msg: string | null) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function StepUpload({
  resumeFile,
  setResumeFile,
  photoFile,
  setPhotoFile,
  uploadError,
  setUploadError,
}: StepUploadProps) {
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setUploadError("Resume must be a PDF file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Resume must be less than 5 MB");
      return;
    }

    setUploadError(null);
    setResumeFile(file);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Photo must be an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Photo must be less than 2 MB");
      return;
    }

    setUploadError(null);
    setPhotoFile(file);

    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeResume = () => {
    setResumeFile(null);
    if (resumeInputRef.current) resumeInputRef.current.value = "";
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Upload Documents</h2>
        <p className="text-sm text-muted-foreground">
          Upload your resume and photo
        </p>
      </div>

      {uploadError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {uploadError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label>
            Resume <span className="text-red-500">*</span>
            <span className="ml-1 text-xs text-muted-foreground">
              (PDF, max 5 MB)
            </span>
          </Label>
          <input
            ref={resumeInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleResumeChange}
            className="hidden"
          />

          {resumeFile ? (
            <div className="flex items-center gap-3 rounded-md border border-input p-3">
              <FileText className="h-8 w-8 shrink-0 text-red-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {resumeFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(resumeFile.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={removeResume}
                className="shrink-0 rounded-full p-1 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => resumeInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-md border-2 border-dashed border-input p-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/50"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Click to upload resume
              </span>
            </button>
          )}
        </div>

        <div className="space-y-2">
          <Label>
            Passport Photo
            <span className="ml-1 text-xs text-muted-foreground">
              (Image, max 2 MB)
            </span>
          </Label>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />

          {photoFile && photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Photo preview"
                className="mx-auto h-32 w-32 rounded-md object-cover"
              />
              <p className="mt-2 truncate text-center text-sm font-medium">
                {photoFile.name}
              </p>
              <p className="text-center text-xs text-muted-foreground">
                {formatFileSize(photoFile.size)}
              </p>
              <button
                type="button"
                onClick={removePhoto}
                className="absolute right-0 top-0 rounded-full bg-background p-1 shadow-sm hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-md border-2 border-dashed border-input p-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/50"
            >
              <Image className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Click to upload photo
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
