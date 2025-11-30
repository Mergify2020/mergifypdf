 "use client";

type Logo = {
  name: string;
  url: string;
};

export default function LogoCarousel() {
  const logos: Logo[] = [
    { name: "Wayfair", url: "https://cdn.simpleicons.org/wayfair" },
    { name: "Facebook", url: "https://cdn.simpleicons.org/facebook" },
    { name: "UPS", url: "https://cdn.simpleicons.org/ups" },
    { name: "FedEx", url: "https://cdn.simpleicons.org/fedex" },
    { name: "Netflix", url: "https://cdn.simpleicons.org/netflix" },
    { name: "PepsiCo", url: "https://cdn.simpleicons.org/pepsico" },
    { name: "Kellogg's", url: "https://cdn.simpleicons.org/kelloggs" },
    { name: "Kohl's", url: "https://cdn.simpleicons.org/kohls" },
    { name: "Allstate", url: "https://cdn.simpleicons.org/allstate" },
  ];

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-0 lg:py-12">
        <div className="text-center">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Join the world&apos;s largest companies
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Employees at these companies use our products
          </p>
        </div>

        <div className="mt-8">
          <div className="logo-marquee-mask">
            <div className="logo-marquee-row flex items-center gap-16">
              {[...logos, ...logos].map((logo, index) => (
                <img
                  key={`${logo.name}-${index}`}
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
        .logo-marquee-mask {
          overflow: hidden;
          mask-image: linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%);
          -webkit-mask-image: linear-gradient(
            to right,
            transparent 0%,
            black 15%,
            black 85%,
            transparent 100%
          );
        }

        .logo-marquee-row {
          animation: logo-scroll 34s linear infinite;
        }

        @keyframes logo-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </section>
  );
}
