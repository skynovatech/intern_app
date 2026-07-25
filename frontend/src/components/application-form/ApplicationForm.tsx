import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import StepPersonalDetails from "./StepPersonalDetails";
import StepEducation from "./StepEducation";
import StepInternship from "./StepInternship";
import StepSkills from "./StepSkills";
import StepLinks from "./StepLinks";
import StepUpload from "./StepUpload";
import StepDeclaration from "./StepDeclaration";
import StepSubmit from "./StepSubmit";

const STEP_LABELS = [
  "Personal",
  "Education",
  "Internship",
  "Skills",
  "Links",
  "Upload",
  "Declaration",
  "Submit",
] as const;

const applicationSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  mobile: z
    .string()
    .regex(/^\d{10}$/, "Must be a valid 10-digit Indian mobile number"),
  whatsapp: z.string().optional(),
  dob: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Please select a gender"),
  address: z.string().optional(),

  college: z.string().min(1, "College name is required"),
  degree: z.string().min(1, "Please select a degree"),
  department: z.string().min(1, "Department is required"),
  current_year: z.string().min(1, "Please select your current year"),
  cgpa: z.number().min(0, "CGPA must be at least 0").max(10, "CGPA must be at most 10").optional(),

  domain: z.string().min(1, "Please select a domain"),
  duration: z.string().min(1, "Please select a duration"),
  preferred_joining_date: z.string().optional(),

  technical_skills: z
    .array(z.string())
    .min(1, "Add at least one technical skill"),
  soft_skills: z.array(z.string()).optional(),
  projects: z.string().optional(),
  certifications: z.string().optional(),

  github: z.string().optional(),
  linkedin: z.string().optional(),
  portfolio: z.string().optional(),

  declaration: z.boolean().refine((val) => val === true, {
    message: "You must agree to the declaration",
  }),
});

type FormValues = z.infer<typeof applicationSchema>;

const STEP_FIELDS: Record<number, (keyof FormValues)[]> = {
  0: ["full_name", "email", "mobile", "whatsapp", "dob", "gender", "address"],
  1: ["college", "degree", "department", "current_year", "cgpa"],
  2: ["domain", "duration", "preferred_joining_date"],
  3: ["technical_skills", "soft_skills", "projects", "certifications"],
  4: ["github", "linkedin", "portfolio"],
  5: [],
  6: ["declaration"],
  7: [],
};

const DEFAULT_VALUES: FormValues = {
  full_name: "",
  email: "",
  mobile: "",
  whatsapp: "",
  dob: "",
  gender: "",
  address: "",
  college: "",
  degree: "",
  department: "",
  current_year: "",
  cgpa: undefined,
  domain: "",
  duration: "",
  preferred_joining_date: "",
  technical_skills: [],
  soft_skills: [],
  projects: "",
  certifications: "",
  github: "",
  linkedin: "",
  portfolio: "",
  declaration: false,
};

export default function ApplicationForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onTouched",
  });

  const handleNext = async () => {
    setUploadError(null);

    if (currentStep === 5 && !resumeFile) {
      setUploadError("Resume is required");
      return;
    }

    const fields = STEP_FIELDS[currentStep];
    if (fields.length > 0) {
      const isValid = await trigger(fields);
      if (!isValid) return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, STEP_LABELS.length - 1));
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const onSubmit = async (data: FormValues) => {
    setSubmitState("loading");

    try {
      let resumePath: string | null = null;
      let photoPath: string | null = null;

      if (resumeFile) {
        const formData = new FormData();
        formData.append("file", resumeFile);
        const res = await api.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        resumePath = res.data.path;
      }

      if (photoFile) {
        const formData = new FormData();
        formData.append("file", photoFile);
        const res = await api.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        photoPath = res.data.path;
      }

      const applicationData = {
        ...data,
        resume_path: resumePath,
        photo_path: photoPath,
      };

      await api.post("/applications", applicationData);
      setSubmitState("success");
    } catch (err: unknown) {
      const msg =
        err instanceof Object &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response
          ? (err.response as { data: { detail?: string } }).data?.detail ||
            "Something went wrong. Please try again."
          : "Something went wrong. Please try again.";
      setSubmitError(msg);
      setSubmitState("error");
    }
  };

  const handleFinalSubmit = () => {
    handleSubmit(onSubmit)();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepPersonalDetails control={control} errors={errors} />;
      case 1:
        return <StepEducation control={control} errors={errors} />;
      case 2:
        return <StepInternship control={control} errors={errors} />;
      case 3:
        return (
          <StepSkills
            control={control}
            errors={errors}
            watch={watch}
            setValue={setValue}
          />
        );
      case 4:
        return <StepLinks control={control} errors={errors} />;
      case 5:
        return (
          <StepUpload
            control={control}
            errors={errors}
            setValue={setValue}
            resumeFile={resumeFile}
            setResumeFile={setResumeFile}
            photoFile={photoFile}
            setPhotoFile={setPhotoFile}
            uploadError={uploadError}
            setUploadError={setUploadError}
          />
        );
      case 6:
        return (
          <StepDeclaration
            control={control}
            errors={errors}
            watch={watch}
          />
        );
      case 7:
        return (
          <StepSubmit submitState={submitState} submitError={submitError} onRetry={() => { setSubmitState("idle"); setSubmitError(null); }} />
        );
      default:
        return null;
    }
  };

  const isLastStep = currentStep === STEP_LABELS.length - 1;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {STEP_LABELS.map((label, index) => {
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;

              return (
                <li
                  key={label}
                  className={cn(
                    "flex items-center",
                    index < STEP_LABELS.length - 1 && "flex-1"
                  )}
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                        isCompleted &&
                          "bg-primary text-primary-foreground",
                        isCurrent &&
                          "border-2 border-primary bg-background text-primary",
                        !isCompleted &&
                          !isCurrent &&
                          "border-2 border-muted-foreground/30 bg-background text-muted-foreground"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span
                      className={cn(
                        "mt-1.5 text-xs font-medium whitespace-nowrap hidden sm:block",
                        isCurrent && "text-primary",
                        !isCurrent && !isCompleted && "text-muted-foreground",
                        isCompleted && "text-primary"
                      )}
                    >
                      {label}
                    </span>
                  </div>
                  {index < STEP_LABELS.length - 1 && (
                    <div
                      className={cn(
                        "mx-2 h-0.5 flex-1",
                        isCompleted ? "bg-primary" : "bg-muted"
                      )}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm sm:p-6">
        {renderStep()}
      </div>

      {submitState === "idle" && (
        <div className="mt-6 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>

          {isLastStep ? (
            <Button type="button" onClick={handleFinalSubmit}>
              Submit Application
            </Button>
          ) : (
            <Button type="button" onClick={handleNext}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
