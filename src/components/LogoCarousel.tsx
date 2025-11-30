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
          <div className="logo-marquee-mask">
            <div className="logo-marquee-row flex items-center gap-[48px]">
              {[...logos, ...logos].map((logo, index) => (
                <img
                  key={`${logo.name}-${index}`}
                  src={logo.url}
                  alt={index < logos.length ? `${logo.name} logo` : ""}
                  className="h-10 w-auto flex-shrink-0"
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
          width: max-content;
          animation: logo-scroll 40s linear infinite;
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
