import React from "react";
import { Badge } from "@/components/ui/badge";

interface StatusDisplayProps {
  status: string;
  errorMessage?: string;
}

const StatusDisplay: React.FC<StatusDisplayProps> = ({
  status = "PENDING",
  errorMessage,
}) => {
  // Map status to variant for visual distinction
  const getVariant = () => {
    switch (status) {
      case "COMPLETE":
        return "secondary";
      case "FAILED_SCRAPING":
        return "destructive";
      case "SCRAPING":
        return "default";
      case "PENDING":
      default:
        return "outline";
    }
  };

  return (
    <div className="flex flex-col gap-2 bg-white p-4 rounded-md">
      <Badge variant={getVariant()}>{status}</Badge>
      {errorMessage && (
        <p className="text-sm text-destructive mt-1">{errorMessage}</p>
      )}
    </div>
  );
};

export default StatusDisplay;
