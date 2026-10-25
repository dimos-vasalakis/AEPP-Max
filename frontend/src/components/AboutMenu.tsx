import Image from "next/image";
import Link from "next/link";
import { NavPopover } from "@/components/NavPopover";

/** The logo button: opens the copyright notice. */
export function AboutMenu() {
  return (
    <NavPopover
      label="Πνευματικά δικαιώματα"
      icon={<Image src="/logo-cloud.png" alt="" width={26} height={26} priority />}
    >
      <div className="mb-3 flex items-center gap-2">
        <Image src="/logo-cloud.png" alt="" width={32} height={32} />
        <h2 className="font-semibold">AEPP Max</h2>
      </div>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
        Πνευματικά δικαιώματα
      </h3>
      <p>© 2026 Dimos Vasalakis. Με άδεια MIT.</p>
      <p className="mt-2 text-xs text-muted">
        Εμπνευσμένο από τον Διερμηνευτή της ΓΛΩΣΣΑΣ του Άλκη Γεωργόπουλου. Η ΓΛΩΣΣΑ είναι η
        γλώσσα του σχολικού βιβλίου «Ανάπτυξη Εφαρμογών σε Προγραμματιστικό Περιβάλλον».
      </p>
      <Link href="/" className="mt-3 inline-block text-xs text-accent hover:underline">
        Αρχική σελίδα
      </Link>
    </NavPopover>
  );
}
