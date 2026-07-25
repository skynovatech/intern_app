import { Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface StepDeclarationProps {
  control: any;
  errors: any;
  watch: any;
}

function SummaryRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}:</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function SummarySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      {children}
    </div>
  );
}

export default function StepDeclaration({
  control,
  errors,
  watch,
}: StepDeclarationProps) {
  const values = watch();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Declaration & Review</h2>
        <p className="text-sm text-muted-foreground">
          Please review your information before submitting
        </p>
      </div>

      <div className="max-h-[360px] space-y-4 overflow-y-auto rounded-md border p-4">
        <SummarySection title="Personal Details">
          <SummaryRow label="Name" value={values.full_name} />
          <SummaryRow label="Email" value={values.email} />
          <SummaryRow label="Mobile" value={values.mobile} />
          {values.whatsapp && (
            <SummaryRow label="WhatsApp" value={values.whatsapp} />
          )}
          <SummaryRow label="DOB" value={values.dob} />
          <SummaryRow label="Gender" value={values.gender} />
          {values.address && (
            <SummaryRow label="Address" value={values.address} />
          )}
        </SummarySection>

        <Separator />

        <SummarySection title="Education">
          <SummaryRow label="College" value={values.college} />
          <SummaryRow label="Degree" value={values.degree} />
          <SummaryRow label="Department" value={values.department} />
          <SummaryRow label="Year" value={values.current_year} />
          {values.cgpa != null && (
            <SummaryRow label="CGPA" value={String(values.cgpa)} />
          )}
        </SummarySection>

        <Separator />

        <SummarySection title="Internship">
          <SummaryRow label="Domain" value={values.domain} />
          <SummaryRow label="Duration" value={values.duration} />
          {values.preferred_joining_date && (
            <SummaryRow
              label="Joining Date"
              value={values.preferred_joining_date}
            />
          )}
        </SummarySection>

        <Separator />

        <SummarySection title="Skills">
          {values.technical_skills?.length > 0 && (
            <SummaryRow
              label="Technical"
              value={values.technical_skills.join(", ")}
            />
          )}
          {values.soft_skills?.length > 0 && (
            <SummaryRow
              label="Soft Skills"
              value={values.soft_skills.join(", ")}
            />
          )}
          {values.projects && (
            <SummaryRow label="Projects" value={values.projects} />
          )}
          {values.certifications && (
            <SummaryRow
              label="Certifications"
              value={values.certifications}
            />
          )}
        </SummarySection>

        <Separator />

        <SummarySection title="Links">
          {values.github && (
            <SummaryRow label="GitHub" value={values.github} />
          )}
          {values.linkedin && (
            <SummaryRow label="LinkedIn" value={values.linkedin} />
          )}
          {values.portfolio && (
            <SummaryRow label="Portfolio" value={values.portfolio} />
          )}
        </SummarySection>
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <Controller
            name="declaration"
            control={control}
            render={({ field }) => (
              <input
                id="declaration"
                type="checkbox"
                checked={field.value || false}
                onChange={field.onChange}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-primary accent-primary"
              />
            )}
          />
          <Label htmlFor="declaration" className="leading-snug">
            I hereby declare that all the information provided above is true
            and correct to the best of my knowledge.{" "}
            <span className="text-red-500">*</span>
          </Label>
        </div>
        {errors?.declaration && (
          <p className="text-sm text-red-500">
            {errors.declaration.message}
          </p>
        )}
      </div>
    </div>
  );
}
