 "use client";

type Logo = {
  name: string;
  url: string;
};

export default function LogoCarousel() {
  const logos: Logo[] = [
    { name: "Netflix", url: "/netflix.svg" },
    { name: "Target", url: "/target.svg" },
    { name: "Walmart", url: "/walmart.svg" },
    { name: "FedEx", url: "/fedex.svg" },
    { name: "Wayfair", url: "/wayfair.svg" },
    { name: "Toyota", url: "/totoya.svg" },
    { name: "Honda", url: "/honda.svg" },
    { name: "Verizon", url: "/verizon.svg" },
    { name: "Bank of America", url: "/bankofamerica.svg" },
    { name: "Chase", url: "/chasebank.svg" },
    { name: "Nvidia", url: "/nvidia.svg" },
    { name: "Allstate", url: "/allstate.svg" },
    { name: "State Farm", url: "/statefarm.svg" },
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
          <div className="logo-marquee-mask logo-carousel-mask">
            <div className="logo-marquee-row logo-carousel flex items-center gap-[48px]">
              <div className="logo-track logo-carousel-track flex items-center gap-[48px]">
                {logos.map((logo) =>
                  logo.name === "Netflix" ? (
                    <picture key={logo.name}>
                      <source
                        srcSet={logo.url}
                        media="(min-width: 769px)"
                      />
                      <img
                        src="/netflix.png"
                        alt="Netflix logo"
                        className="logo-carousel-img h-10 w-auto flex-shrink-0"
                        loading="lazy"
                      />
                    </picture>
                  ) : (
                    <img
                      key={logo.name}
                      src={logo.url}
                      alt={`${logo.name} logo`}
                      className="logo-carousel-img h-10 w-auto flex-shrink-0"
                      loading="lazy"
                    />
                  )
                )}
              </div>
              <div
                className="logo-track logo-carousel-track logo-carousel-track--dup flex items-center gap-[48px]"
                aria-hidden="true"
              >
                {logos.map((logo) =>
                  logo.name === "Netflix" ? (
                    <picture key={`${logo.name}-duplicate`}>
                      <source
                        srcSet={logo.url}
                        media="(min-width: 769px)"
                      />
                      <img
                        src="/netflix.png"
                        alt=""
                        className="logo-carousel-img h-10 w-auto flex-shrink-0"
                        loading="lazy"
                      />
                    </picture>
                  ) : (
                    <img
                      key={`${logo.name}-duplicate`}
                      src={logo.url}
                      alt=""
                      className="logo-carousel-img h-10 w-auto flex-shrink-0"
                      loading="lazy"
                    />
                  )
                )}
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
          animation: logo-scroll 48s linear infinite;
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

        /* Desktop: fade edges */
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

        /* Mobile: no masks, no animation overrides—just disable masking if any */
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
