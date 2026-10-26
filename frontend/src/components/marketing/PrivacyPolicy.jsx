import { useEffect } from "react";
import {
  Mail,
  Phone,
} from "lucide-react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import { CONTACT_EMAIL, PHONE, PHONE_HREF } from "../../data/site";

export default function PrivacyPolicy({ home, enter, go }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const H = ({ children }) => (
    <h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 mt-12">
      {children}
    </h2>
  );
  const P = ({ children }) => (
    <p className="text-slate-600 leading-relaxed mt-4">{children}</p>
  );
  const List = ({ items }) => (
    <ul className="mt-4 space-y-2 list-disc pl-6 text-slate-600">
      {items.map((it) => (
        <li key={it}>{it}</li>
      ))}
    </ul>
  );

  return (
    <div className="font-body text-slate-800 bg-white">
      <SiteHeader home={home} go={go} onCta={enter} active="privacy" />

      {/* CONTENT */}
      <section className="max-w-3xl mx-auto px-5 py-16 md:py-20">
        <h1 className="font-display text-4xl md:text-5xl font-extrabold text-slate-900">
          AIFAGen Labs Privacy Policy
        </h1>

        <H>1. Introduction</H>
        <P>
          AIFAGen Labs ("Company," "we," "our," or "us") is committed to
          protecting your privacy. This Privacy Policy explains how we collect,
          use, and safeguard your information when you use our website and
          services, including SMS communications.
        </P>

        <H>2. Information We Collect</H>
        <P>We may collect the following information:</P>
        <List
          items={[
            "Full Name",
            "Email Address",
            "Phone Number",
            "Resume / Employment Information",
            "Visa Status (if applicable)",
            "LinkedIn Profile",
            "Technical Skills & Work Experience",
            "Any information voluntarily submitted via forms",
          ]}
        />

        <H>3. How We Use Your Information</H>
        <P>We use collected information to:</P>
        <List
          items={[
            "Provide IT staffing and job marketing services",
            "Contact you regarding job opportunities",
            "Send service-related SMS and email updates",
            "Schedule interviews and screening calls",
            "Improve our services",
            "Maintain compliance with legal requirements",
          ]}
        />

        <H>4. SMS Communication &amp; Consent</H>
        <P>
          By submitting your phone number through our website forms, you consent
          to receive SMS messages from AIFAGen Labs related to:
        </P>
        <List
          items={[
            "Job opportunities",
            "Application updates",
            "Interview scheduling",
            "Service notifications",
          ]}
        />
        <P>Message frequency may vary.</P>
        <P>Message and data rates may apply.</P>
        <P>
          You can opt out at any time by replying{" "}
          <span className="font-bold text-slate-900">STOP</span>.
        </P>
        <P>
          For assistance, reply{" "}
          <span className="font-bold text-slate-900">HELP</span> or contact us
          at:
        </P>
        <div className="mt-4 space-y-2 text-slate-600">
          <div className="flex items-center gap-3">
            <Mail size={16} className="text-slate-400" />
            Email:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="brand hover:underline">
              {CONTACT_EMAIL}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Phone size={16} className="text-slate-400" />
            Phone:{" "}
            <a href={PHONE_HREF} className="brand hover:underline">
              {PHONE}
            </a>
          </div>
        </div>

        <H>5. Data Sharing</H>
        <P>
          We do <span className="font-bold text-slate-900">NOT</span> sell, rent,
          or trade your personal information.
        </P>
        <P>We may share your information only:</P>
        <List
          items={[
            "With verified client companies for job placement",
            "With payroll partners (if placed)",
            "When required by law",
          ]}
        />

        <H>6. Data Security</H>
        <P>
          We implement industry-standard security measures to protect your
          information from unauthorized access, misuse, or disclosure.
        </P>

        <H>7. Your Rights</H>
        <P>You may:</P>
        <List
          items={[
            "Request access to your data",
            "Request correction or deletion",
            "Withdraw SMS consent anytime",
          ]}
        />
        <P>
          To exercise your rights, contact us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="brand hover:underline">
            {CONTACT_EMAIL}
          </a>
        </P>

        <H>8. Updates to This Policy</H>
        <P>
          We may update this Privacy Policy periodically. Updates will be posted
          on this page with a revised effective date.
        </P>
      </section>

      <SiteFooter go={go} />
    </div>
  );
}
