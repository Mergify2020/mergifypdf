 "use client";

export default function LogoCarousel() {
  const logos = ["Netflix", "PepsiCo", "Kellogg's", "Kohl's", "Allstate", "Wayfair", "Facebook", "UPS", "FedEx"];

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

        <div className="mt-8 overflow-hidden">
          <div className="logo-marquee flex items-center gap-12 whitespace-nowrap text-slate-400">
            {[...logos, ...logos].map((name) => (
              <span key={name} className="text-lg font-semibold tracking-wide sm:text-xl">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .logo-marquee {
          animation: logo-scroll 32s linear infinite;
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
