 "use client";

type Logo = {
  name: string;
  url: string;
};

export default function LogoCarousel() {
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
            <div className="logo-marquee-mask logo-carousel-mask">
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

          {/* Mobile: marquee carousel as well */}
          <div className="block md:hidden">
            <div className="logo-marquee-mask logo-carousel-mask">
              <div className="logo-marquee-row logo-carousel flex items-center gap-[32px]">
                <div className="logo-track logo-carousel-track flex items-center gap-[32px]">
                  {logos.map((logo) => (
                    <img
                      key={`mobile-${logo.name}`}
                      src={logo.url}
                      alt={`${logo.name} logo`}
                      className="logo-carousel-img h-7 w-auto flex-shrink-0"
                      loading="lazy"
                    />
                  ))}
                </div>
                <div
                  className="logo-track logo-carousel-track logo-carousel-track--dup flex items-center gap-[32px]"
                  aria-hidden="true"
                >
                  {logos.map((logo) => (
                    <img
                      key={`mobile-${logo.name}-duplicate`}
                      src={logo.url}
                      alt=""
                      className="logo-carousel-img h-7 w-auto flex-shrink-0"
                      loading="lazy"
                    />
                  ))}
                </div>
              </div>
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

        /* Desktop & landscape: fade edges + CSS marquee */
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

        /* Mobile: keep marquee, no masks/filters, slightly smaller logos */
        @media (max-width: 768px) {
          .logo-carousel-mask,
          .logo-carousel {
            mask-image: none !important;
            -webkit-mask-image: none !important;
            clip-path: none !important;
            filter: none !important;
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
