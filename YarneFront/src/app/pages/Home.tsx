import React, { useEffect, useState } from "react";
import {
  getInitialHomePageMediaSelection,
  loadHomePageMediaSelection,
} from "../utils/homePageMediaSelection";
import { HomeScrollExperience } from "../components/home/HomeScrollExperience";
import { resolveMediaUrl } from "../utils/storefrontMedia";

export function Home() {
  const [homePageMedia, setHomePageMedia] = useState(getInitialHomePageMediaSelection);

  useEffect(() => {
    let cancelled = false;
    void loadHomePageMediaSelection().then((media) => {
      if (!cancelled) setHomePageMedia(media);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const heroImageSrc = homePageMedia.heroImageUrl.trim();

  useEffect(() => {
    const resolvedHero = resolveMediaUrl(heroImageSrc);
    if (!resolvedHero) return;
    const img = new Image();
    img.decoding = "async";
    img.fetchPriority = "high";
    img.src = resolvedHero;
  }, [heroImageSrc]);

  return (
    <main className="relative bg-[#F5F2ED]">
      <HomeScrollExperience heroImageUrl={heroImageSrc} />
    </main>
  );
}
