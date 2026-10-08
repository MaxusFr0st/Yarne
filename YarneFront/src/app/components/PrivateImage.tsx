import { useEffect, useState } from "react";

/**
 * A photo that is not at a public address: fetched with the session and shown through an object URL (released on unmount).
 * Clicking opens the full picture in a new tab.
 */
export function PrivateImage({ load, alt, className }: { load: () => Promise<Blob>; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;
    load()
      .then((blob) => {
        if (revoked) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!revoked) setFailed(true);
      });
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!url) return <div className={className} style={{ backgroundColor: "rgba(45,36,30,0.06)" }} aria-hidden={!failed} />;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
      <img src={url} alt={alt} className={className} />
    </a>
  );
}
