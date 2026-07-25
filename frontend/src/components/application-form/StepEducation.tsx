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
import {
  DEGREE_OPTIONS as degrees,
  YEAR_OPTIONS as years,
} from "@/types";

interface StepEducationProps {
  control: any;
  errors: any;
}

export default function StepEducation({
  control,
  errors,
}: StepEducationProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Education</h2>
        <p className="text-sm text-muted-foreground">
          Your academic background
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="college">
            College / University <span className="text-red-500">*</span>
          </Label>
          <Controller
            name="college"
            control={control}
            render={({ field }) => (
              <Input
                id="college"
                placeholder="Enter your college name"
                {...field}
              />
            )}
          />
          {errors?.college && (
            <p className="text-sm text-red-500">
              {errors.college.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>
            Degree <span className="text-red-500">*</span>
          </Label>
          <Controller
            name="degree"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select degree" />
                </SelectTrigger>
                <SelectContent>
                  {degrees.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors?.degree && (
            <p className="text-sm text-red-500">
              {errors.degree.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">
            Department / Branch <span className="text-red-500">*</span>
          </Label>
          <Controller
            name="department"
            control={control}
            render={({ field }) => (
              <Input
                id="department"
                placeholder="e.g. Computer Science"
                {...field}
              />
            )}
          />
          {errors?.department && (
            <p className="text-sm text-red-500">
              {errors.department.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>
            Current Year <span className="text-red-500">*</span>
          </Label>
          <Controller
            name="current_year"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors?.current_year && (
            <p className="text-sm text-red-500">
              {errors.current_year.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cgpa">CGPA (out of 10)</Label>
          <Controller
            name="cgpa"
            control={control}
            render={({ field: { onChange, value, ...rest } }) => (
              <Input
                id="cgpa"
                type="number"
                min={0}
                max={10}
                step={0.01}
                placeholder="e.g. 8.5"
                value={value ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange(val === "" ? undefined : parseFloat(val));
                }}
                {...rest}
              />
            )}
          />
          {errors?.cgpa && (
            <p className="text-sm text-red-500">{errors.cgpa.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
