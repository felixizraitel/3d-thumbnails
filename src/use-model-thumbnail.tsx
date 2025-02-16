import { useEffect, useState } from "react";

export interface UseModelThumbnailProps {
  url?: string;
  fileType?: string;
  color?: string;
}

interface LoadingState {
  status: "idle" | "downloading" | "processing" | "complete";
  progress: number;
}

export function useModelThumbnail({
  url,
  fileType,
  color = "#808080",
}: UseModelThumbnailProps) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    status: "idle",
    progress: 0,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    if (fileType !== "obj" && fileType !== "stl") return;

    setLoading({ status: "downloading", progress: 0 });
    setError(null);

    const worker = new Worker(
      new URL("../workers/model-renderer.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (event) => {
      const { type, progress, imageData, error: workerError } = event.data;

      switch (type) {
        case "progress":
          setLoading({ status: "downloading", progress });
          break;
        case "complete":
          setThumbnail(imageData);
          setLoading({ status: "complete", progress: 100 });
          worker.terminate();
          break;
        case "error":
          setError(workerError);
          setLoading({ status: "idle", progress: 0 });
          worker.terminate();
          break;
      }
    };

    worker.postMessage({
      url,
      fileType,
      color,
      width: 400,
      height: 400,
    });

    return () => {
      worker.terminate();
    };
  }, [url, fileType, color]);

  return { thumbnail, loading, error };
}
