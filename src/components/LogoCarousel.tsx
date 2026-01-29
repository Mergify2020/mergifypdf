"use client";

import { useEffect, useState } from "react";
type Logo = {
  name: string;
  url: string;
};

export default function LogoCarousel() {
  const [ready, setReady] = useState(false);

  const logos: Logo[] = [
    { name: "Netflix", url: "/netflix.png" },
    { name: "Target", url: "/target.png" },
    { name: "Walmart", url: "/walmart.png" },
    { name: "FedEx", url: "/fedex.png" },
    { name: "Wayfair", url: "/wayfair.png" },
    { name: "Toyota", url: "/toyota.png" },
    { name: "Honda", url: "/honda.png" },
    { name: "Verizon", url: "/verizon.png" },
    { name: "Bank of America", url: "/bankofamerica.png" },
    { name: "Chase", url: "/chasebank.png" },
    { name: "Nvidia", url: "/nvidia.png" },
    { name: "State Farm", url: "/statefarm.png" },
  ];

  useEffect(() => {
    let cancelled = false;
    const unique = Array.from(new Set(logos.map((logo) => logo.url)));
    let loaded = 0;

    function markLoaded() {
      loaded += 1;
      if (!cancelled && loaded >= unique.length) {
        setReady(true);
      }
    }

    unique.forEach((url) => {
      const img = new Image();
      img.onload = markLoaded;
      img.onerror = markLoaded;
      img.src = url;
    });

    const fallback = window.setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 1500);

    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <section className="bg-transparent">
      <div className="mx-auto w-full max-w-[1400px] px-4 pt-4 pb-6 sm:px-6 lg:px-8 lg:pt-6 lg:pb-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl md:text-3xl">
            Trusted by professionals worldwide
          </h2>
        </div>

        <div className="mt-5">
          <div className="logo-marquee">
            <div className={`logo-marquee-track ${ready ? "logo-marquee-track--ready" : "logo-marquee-track--idle"}`}>
              {[...logos, ...logos].map((logo, index) => (
                <img
                  key={`${logo.name}-${index}`}
                  src={logo.url}
                  alt={`${logo.name} logo`}
                  className="h-9 w-28 flex-shrink-0 object-contain opacity-70 grayscale md:h-10 md:w-32 lg:h-11 lg:w-36"
                  loading="eager"
                  decoding="async"
                />
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
