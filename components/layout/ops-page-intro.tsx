import Link from "next/link";
import { ArrowRight, LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type FlowLink = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type OpsPageIntroProps = {
  eyebrow?: string;
  title: string;
  description: string;
  links?: FlowLink[];
};

export function OpsPageIntro({ eyebrow = "Operations", title, description, links = [] }: OpsPageIntroProps) {
  return (
    <section className="overflow-hidden rounded-none border border-slate-300/70 bg-[linear-gradient(120deg,#ffffff_0%,#eef7ff_52%,#f3fbf2_100%)] p-4 shadow-sm md:p-5">
      <div className="space-y-2">
        <Badge variant="secondary" className="rounded-none border border-slate-300 bg-white/90 text-slate-700">
          {eyebrow}
        </Badge>
        <h2 className="text-2xl font-bold tracking-[-0.03em] text-slate-900 md:text-3xl">{title}</h2>
        <p className="max-w-4xl text-sm text-slate-600 md:text-base">{description}</p>
      </div>
      {links.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {links.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={`${item.href}-${item.label}-${idx}`} className="flex items-center gap-2">
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1.5 rounded-none border border-slate-300/80 bg-white/85 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Icon className="h-3.5 w-3.5 text-sky-700" />
                  {item.label}
                </Link>
                {idx < links.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-slate-400" />}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
