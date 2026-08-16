import { useState } from "react";
import { Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";

interface StepSkillsProps {
  control: any;
  errors: any;
  watch: any;
  setValue: any;
}

function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (val: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");

  const addCurrent = () => {
    const tag = input.trim();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCurrent();
    }
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  return (
    <div>
      <div className="flex min-h-[36px] flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm focus-within:ring-1 focus-within:ring-ring">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-0.5 rounded-full hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground min-w-[120px]"
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{value.length} added</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addCurrent}
          disabled={!input.trim()}
          className="h-8 gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </div>
  );
}

export default function StepSkills({
  control,
  errors,
  watch,
  setValue,
}: StepSkillsProps) {
  const technicalSkills = watch("technical_skills") || [];
  const softSkills = watch("soft_skills") || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Skills & Projects</h2>
        <p className="text-sm text-muted-foreground">
          Showcase your abilities
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>
            Technical Skills <span className="text-red-500">*</span>
          </Label>
          <Controller
            name="technical_skills"
            control={control}
            render={() => (
              <TagInput
                value={technicalSkills}
                onChange={(val) => setValue("technical_skills", val)}
                placeholder="Type a skill, then tap Add"
              />
            )}
          />
          {errors?.technical_skills && (
            <p className="text-sm text-red-500">
              {errors.technical_skills.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Soft Skills</Label>
          <Controller
            name="soft_skills"
            control={control}
            render={() => (
              <TagInput
                value={softSkills}
                onChange={(val) => setValue("soft_skills", val)}
                placeholder="Type a skill, then tap Add"
              />
            )}
          />
          {errors?.soft_skills && (
            <p className="text-sm text-red-500">
              {errors.soft_skills.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="projects">Projects</Label>
          <Controller
            name="projects"
            control={control}
            render={({ field }) => (
              <Textarea
                id="projects"
                placeholder="Describe your notable projects (optional)"
                rows={4}
                {...field}
              />
            )}
          />
          {errors?.projects && (
            <p className="text-sm text-red-500">
              {errors.projects.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="certifications">Certifications</Label>
          <Controller
            name="certifications"
            control={control}
            render={({ field }) => (
              <Textarea
                id="certifications"
                placeholder="List your certifications (optional)"
                rows={3}
                {...field}
              />
            )}
          />
          {errors?.certifications && (
            <p className="text-sm text-red-500">
              {errors.certifications.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
