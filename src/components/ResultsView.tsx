import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";

interface ResultsViewProps {
  status: string;
  onDownload?: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({
  status = "PENDING",
  onDownload = () => console.log("Download clicked"),
}) => {
  const isComplete = status === "COMPLETE";

  return (
    <Card className="w-full bg-white">
      <CardHeader>
        <CardTitle>Results</CardTitle>
      </CardHeader>
      <CardContent>
        {isComplete ? (
          <div className="flex justify-center">
            <Button onClick={onDownload} className="flex items-center gap-2">
              <Download size={16} />
              Download Results
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            Results will be available here once the job is complete.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ResultsView;
