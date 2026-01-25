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
    <section className="bg-transparent">
      <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:py-10">
        <div className="text-center">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl md:text-3xl">
            Used by professionals from leading companies
          </h2>
          <p className="mt-1.5 text-sm text-slate-500/90 md:text-base">
            Designed to make everyday work simpler and efficient.
          </p>
        </div>

        <div className="mt-6">
          <div className="logo-marquee">
            <div className="logo-marquee-track">
              {[...logos, ...logos].map((logo, index) => (
                <img
                  key={`${logo.name}-${index}`}
                  src={logo.url}
                  alt={`${logo.name} logo`}
                  className="h-9 w-auto opacity-70 grayscale md:h-10"
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
