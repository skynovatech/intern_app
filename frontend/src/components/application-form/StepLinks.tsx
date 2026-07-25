import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StepLinksProps {
  control: any;
  errors: any;
}

export default function StepLinks({ control, errors }: StepLinksProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Online Profiles</h2>
        <p className="text-sm text-muted-foreground">
          Share your online presence (all optional)
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="github">GitHub URL</Label>
          <Controller
            name="github"
            control={control}
            render={({ field }) => (
              <Input
                id="github"
                type="url"
                placeholder="https://github.com/username"
                {...field}
              />
            )}
          />
          {errors?.github && (
            <p className="text-sm text-red-500">
              {errors.github.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="linkedin">LinkedIn URL</Label>
          <Controller
            name="linkedin"
            control={control}
            render={({ field }) => (
              <Input
                id="linkedin"
                type="url"
                placeholder="https://linkedin.com/in/username"
                {...field}
              />
            )}
          />
          {errors?.linkedin && (
            <p className="text-sm text-red-500">
              {errors.linkedin.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="portfolio">Portfolio URL</Label>
          <Controller
            name="portfolio"
            control={control}
            render={({ field }) => (
              <Input
                id="portfolio"
                type="url"
                placeholder="https://yourportfolio.com"
                {...field}
              />
            )}
          />
          {errors?.portfolio && (
            <p className="text-sm text-red-500">
              {errors.portfolio.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
