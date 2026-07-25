import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StepSubmitProps {
  submitState: "idle" | "loading" | "success" | "error";
  submitError?: string | null;
  onRetry: () => void;
}

export default function StepSubmit({ submitState, submitError, onRetry }: StepSubmitProps) {
  if (submitState === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
        <h2 className="text-lg font-semibold">Submitting Your Application</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Please wait while we process your submission...
        </p>
      </div>
    );
  }

  if (submitState === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-lg font-semibold">
          Application Submitted Successfully!
        </h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Thank you for applying. We will review your application and get back
          to you soon.
        </p>
      </div>
    );
  }

  if (submitState === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-lg font-semibold">Submission Failed</h2>
        {submitError && (
          <div className="mt-3 max-w-md rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {submitError}
          </div>
        )}
        <p className="mt-3 max-w-sm text-sm text-muted-foreground">
          Something went wrong while submitting your application. Please try
          again.
        </p>
        <Button onClick={onRetry} className="mt-6" variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h2 className="text-lg font-semibold">Ready to Submit</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Review your declaration and click &quot;Submit Application&quot; to
        complete the process.
      </p>
    </div>
  );
}
