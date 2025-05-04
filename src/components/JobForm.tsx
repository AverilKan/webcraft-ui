import React from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";

interface JobFormProps {
  onSubmit?: (formData: {
    targetUrl: string;
    fields: string;
    outputFormat: "json" | "csv";
  }) => void;
}

export default function JobForm({ onSubmit }: JobFormProps = {}) {
  const [targetUrl, setTargetUrl] = React.useState("");
  const [fields, setFields] = React.useState("");
  const [outputFormat, setOutputFormat] = React.useState<"json" | "csv">(
    "json",
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({
        targetUrl,
        fields,
        outputFormat,
      });
    }
  };

  return (
    <Card className="w-full max-w-md bg-white">
      <CardHeader>
        <CardTitle>Create Scraping Job</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="targetUrl">Target URL</Label>
            <Input
              id="targetUrl"
              placeholder="https://example.com"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fields">Fields (comma-separated)</Label>
            <Textarea
              id="fields"
              placeholder="title, price, description"
              value={fields}
              onChange={(e) => setFields(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Output Format</Label>
            <RadioGroup
              value={outputFormat}
              onValueChange={(value) =>
                setOutputFormat(value as "json" | "csv")
              }
              className="flex flex-row gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json">JSON</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv">CSV</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full">
            Submit Job
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
