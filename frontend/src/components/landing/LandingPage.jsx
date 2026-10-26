import { V3 } from "./theme";
import { useScrollProgress } from "./motion";
import LandingNav from "./LandingNav";
import Hero from "./Hero";
import Marquee from "./Marquee";
import Features from "./Features";
import HowItWorks from "./HowItWorks";
import PricingSection from "./PricingSection";
import FAQ from "./FAQ";
import JoinSection from "./JoinSection";
import SiteFooter from "../marketing/SiteFooter";

// The home page: one component per section, top to bottom.
export default function LandingPage({ enter, go }) {
  const scroll = useScrollProgress();

  return (
    <div className="font-body" style={{ background: V3.page, color: V3.ink }}>
      {/* Scroll progress */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          zIndex: 60,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${(scroll * 100).toFixed(2)}%`,
            background: `linear-gradient(90deg,${V3.brand},${V3.ochre})`,
            transition: "width .1s linear",
          }}
        />
      </div>

      <LandingNav enter={enter} />
      <Hero />
      <Marquee />
      <Features />
      <HowItWorks />
      <PricingSection enter={enter} />
      <FAQ />
      <JoinSection enter={enter} />
      <SiteFooter go={go} compact />
    </div>
  );
}
