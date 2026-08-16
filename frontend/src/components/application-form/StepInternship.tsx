import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDomains, useDurations } from "@/stores/lookupsStore";

interface StepInternshipProps {
  control: any;
  errors: any;
}

export default function StepInternship({
  control,
  errors,
}: StepInternshipProps) {
  const domains = useDomains();
  const durations = useDurations();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Internship Preferences</h2>
        <p className="text-sm text-muted-foreground">
          Choose your preferred internship details
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>
            Domain <span className="text-red-500">*</span>
          </Label>
          <Controller
            name="domain"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select domain" />
                </SelectTrigger>
                <SelectContent>
                  {domains.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors?.domain && (
            <p className="text-sm text-red-500">
              {errors.domain.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>
            Duration <span className="text-red-500">*</span>
          </Label>
          <Controller
            name="duration"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {durations.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors?.duration && (
            <p className="text-sm text-red-500">
              {errors.duration.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="preferred_joining_date">
            Preferred Joining Date
          </Label>
          <Controller
            name="preferred_joining_date"
            control={control}
            render={({ field }) => (
              <Input
                id="preferred_joining_date"
                type="date"
                {...field}
              />
            )}
          />
          {errors?.preferred_joining_date && (
            <p className="text-sm text-red-500">
              {errors.preferred_joining_date.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
