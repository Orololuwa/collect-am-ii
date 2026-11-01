import { CTA } from "./cta";
import { DealRoomSection } from "./deal-room-section";
import { FAQ } from "./faq";
import { Features } from "./features";
import { Footer } from "./footer";
import { Header } from "./header";
import { Hero } from "./hero";
import { HowItWorks } from "./how-it-works";
import { Trades } from "./trades";

export default function LandingPage() {
  return (
    <div className="overflow-hidden">
      <Header />

      <main>
        <Hero />
        <Trades />
        <HowItWorks />
        <DealRoomSection />
        <Features />
        <FAQ />
        <CTA />
      </main>

      <Footer />
    </div>
  );
}
