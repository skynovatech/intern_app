import { PublicLayout } from "@/components/layout/PublicLayout";
import ApplicationForm from "@/components/application-form/ApplicationForm";

export function ApplyPage() {
  return (
    <PublicLayout>
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">
            Apply for Internship
          </h1>
          <p className="mt-2 text-muted-foreground">
            Fill out the form below to submit your application
          </p>
        </div>
        <ApplicationForm />
      </div>
    </PublicLayout>
  );
}
