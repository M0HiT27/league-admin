"use client";

import { useState } from "react";
import { passPurchasesService } from "@/api/client/services/purchase.service";
import { Button } from "@/ui/components/Button";
import { LoaderOverlay } from "@/ui/components/LoaderOverlay";
import { Download } from "lucide-react";
import type { DownloadPurchaseDataOptions } from "@/api/client/services/purchase.service";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function Dashboard() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleDownload = async (options: DownloadPurchaseDataOptions) => {
    setIsDownloading(true);
    setLoadingMessage("Generating report...");
    setError(null);
    setSuccess(null);

    try {
      const blob =
        await passPurchasesService.downloadPurchaseDataAsExcel(options);
      const filename = `${options.type}-purchases-${new Date().toISOString().slice(0, 10)}.xlsx`;
      saveBlob(blob, filename);
      setSuccess(
        `${options.type === "passwise" ? "Pass-wise" : "Game-wise"} purchase data downloaded successfully!`,
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "An error occurred while downloading data.";
      setError(message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="p-8">
      <LoaderOverlay isVisible={isDownloading} message={loadingMessage} />

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Dashboard Overview
        </h1>
        <p className="text-slate-500 mt-1">
          Welcome back. Export your data reports here.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg border border-green-200">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-start">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">
            Pass-wise Data
          </h2>
          <p className="text-slate-600 text-sm mb-6 flex-1">
            Download a detailed Excel report of all purchases categorized by
            active passes.
          </p>
          <Button
            onClick={() => handleDownload({ type: "passwise" })}
            disabled={isDownloading}
          >
            <Download className="w-4 h-4 mr-2" />
            Download Pass-wise
          </Button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-start">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">
            Game-wise Data
          </h2>
          <p className="text-slate-600 text-sm mb-6 flex-1">
            Download a detailed Excel report of all purchases categorized by
            individual games.
          </p>
          <Button
            onClick={() => handleDownload({ type: "gamewise" })}
            disabled={isDownloading}
          >
            <Download className="w-4 h-4 mr-2" />
            Download Game-wise
          </Button>
        </div>
      </div>
    </div>
  );
}
