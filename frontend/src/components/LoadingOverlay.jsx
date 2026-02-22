import React from "react";

export default function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mb-4"></div>
      <p className="text-gray-500 font-medium">Verifying Session...</p>
    </div>
  );
}
