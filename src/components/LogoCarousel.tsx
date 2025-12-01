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
      <div className="mx-auto w-full max-w-7xl px-6 py-10 lg:py-12">
        <div className="text-center">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl md:text-3xl">
            Trusted by the world&apos;s top companies
          </h2>
          <p className="mt-2 text-sm text-slate-500 md:text-base">
            Designed to make everyday work simpler and efficient.
          </p>
        </div>

        <div className="mt-8">
          {/* Static responsive logo grid:
              - Mobile: 3 columns × 4 rows
              - Desktop / horizontal: 6 columns × 2 rows */}
          <div className="grid grid-cols-3 justify-items-center gap-x-10 gap-y-6 md:grid-cols-6 md:gap-x-12 md:gap-y-8">
            {logos.map((logo) => (
              <img
                key={logo.name}
                src={logo.url}
                alt={`${logo.name} logo`}
                className="h-7 w-auto md:h-9"
                loading="lazy"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
