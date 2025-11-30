 "use client";

import { useEffect, useRef } from "react";

type Logo = {
  name: string;
  url: string;
};

export default function LogoCarousel() {
  const carouselRef = useRef<HTMLDivElement | null>(null);

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

  // Mobile: scroll-based marquee using scrollLeft to avoid transform glitches
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth > 768) return;

    const container = carouselRef.current;
    if (!container) return;

    let frameId: number;
    const step = 0.4; // pixels per frame for smooth, slow scroll

    const tick = () => {
      const maxScroll = container.scrollWidth / 2;
      container.scrollLeft += step;
      if (container.scrollLeft >= maxScroll) {
        container.scrollLeft -= maxScroll;
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-0 lg:py-12">
        <div className="text-center">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Trusted by the world&apos;s top companies
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            These teams rely on MergifyPDF to work faster and smarter
          </p>
        </div>

        <div className="mt-8">
          {/* Desktop: marquee carousel */}
          <div className="hidden md:block">
          <div ref={carouselRef} className="logo-marquee-mask logo-carousel-mask">
              <div className="logo-marquee-row logo-carousel flex items-center gap-[48px]">
                <div className="logo-track logo-carousel-track flex items-center gap-[48px]">
                  {logos.map((logo) => (
                    <img
                      key={logo.name}
                      src={logo.url}
                      alt={`${logo.name} logo`}
                      className="logo-carousel-img h-10 w-auto flex-shrink-0"
                      loading="lazy"
                    />
                  ))}
                </div>
                <div
                  className="logo-track logo-carousel-track logo-carousel-track--dup flex items-center gap-[48px]"
                  aria-hidden="true"
                >
                  {logos.map((logo) => (
                    <img
                      key={`${logo.name}-duplicate`}
                      src={logo.url}
                      alt=""
                      className="logo-carousel-img h-10 w-auto flex-shrink-0"
                      loading="lazy"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile: static 3x4 logo grid */}
          <div className="block md:hidden">
            <div className="grid grid-cols-3 gap-x-10 gap-y-6 justify-items-center">
              {logos.map((logo) => (
                <img
                  key={`mobile-${logo.name}`}
                  src={logo.url}
                  alt={`${logo.name} logo`}
                  className="h-7 w-auto"
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .logo-marquee-mask,
        .logo-carousel-mask {
          overflow: hidden;
          position: relative;
        }

        .logo-marquee-row,
        .logo-carousel {
          width: max-content;
          animation: logo-scroll 60s linear infinite;
          will-change: transform;
        }

        .logo-track,
        .logo-carousel-track {
          flex-shrink: 0;
        }

        @keyframes logo-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        /* Desktop: fade edges + CSS marquee */
        @media (min-width: 769px) {
          .logo-marquee-mask::before {
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
            background: linear-gradient(
              to right,
              rgba(255, 255, 255, 1) 0%,
              rgba(255, 255, 255, 0) 15%,
              rgba(255, 255, 255, 0) 85%,
              rgba(255, 255, 255, 1) 100%
            );
          }
        }

        /* Mobile: JS scroll marquee – disable CSS transforms on row only */
        @media (max-width: 768px) {
          .logo-carousel-mask,
          .logo-carousel {
            mask-image: none !important;
            -webkit-mask-image: none !important;
            clip-path: none !important;
            filter: none !important;
          }

          .logo-marquee-row.logo-carousel {
            animation: none !important;
            transform: none !important;
            will-change: auto !important;
          }

          .logo-carousel-img {
            height: 28px;
            transform: none !important;
            image-rendering: auto;
          }
        }
      `}</style>
    </section>
  );
}
