import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGenders } from "@/stores/lookupsStore";

interface StepPersonalDetailsProps {
  control: any;
  errors: any;
}

export default function StepPersonalDetails({
  control,
  errors,
}: StepPersonalDetailsProps) {
  const genders = useGenders();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Personal Details</h2>
        <p className="text-sm text-muted-foreground">
          Tell us about yourself
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="full_name">
            Full Name <span className="text-red-500">*</span>
          </Label>
          <Controller
            name="full_name"
            control={control}
            render={({ field }) => (
              <Input
                id="full_name"
                placeholder="Enter your full name"
                {...field}
              />
            )}
          />
          {errors?.full_name && (
            <p className="text-sm text-red-500">
              {errors.full_name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">
            Email <span className="text-red-500">*</span>
          </Label>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...field}
              />
            )}
          />
          {errors?.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="mobile">
            Mobile <span className="text-red-500">*</span>
          </Label>
          <Controller
            name="mobile"
            control={control}
            render={({ field }) => (
              <Input
                id="mobile"
                type="tel"
                placeholder="10-digit mobile number"
                maxLength={10}
                {...field}
              />
            )}
          />
          {errors?.mobile && (
            <p className="text-sm text-red-500">{errors.mobile.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Controller
            name="whatsapp"
            control={control}
            render={({ field }) => (
              <Input
                id="whatsapp"
                type="tel"
                placeholder="WhatsApp number (optional)"
                maxLength={10}
                {...field}
              />
            )}
          />
          {errors?.whatsapp && (
            <p className="text-sm text-red-500">
              {errors.whatsapp.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dob">
            Date of Birth <span className="text-red-500">*</span>
          </Label>
          <Controller
            name="dob"
            control={control}
            render={({ field }) => (
              <Input id="dob" type="date" {...field} />
            )}
          />
          {errors?.dob && (
            <p className="text-sm text-red-500">{errors.dob.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>
            Gender <span className="text-red-500">*</span>
          </Label>
          <Controller
            name="gender"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {genders.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors?.gender && (
            <p className="text-sm text-red-500">{errors.gender.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Controller
          name="address"
          control={control}
          render={({ field }) => (
            <Textarea
              id="address"
              placeholder="Enter your address (optional)"
              rows={3}
              {...field}
            />
          )}
        />
        {errors?.address && (
          <p className="text-sm text-red-500">{errors.address.message}</p>
        )}
      </div>
    </div>
  );
}
