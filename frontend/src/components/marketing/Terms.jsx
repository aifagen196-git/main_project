import { useEffect } from "react";
import {
  Mail,
  Globe,
  Phone,
} from "lucide-react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import { CONTACT_EMAIL, PHONE, PHONE_HREF } from "../../data/site";

export default function Terms({ home, enter, go }) {
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
      <SiteHeader home={home} go={go} onCta={enter} active="terms" />

      {/* CONTENT */}
      <section className="max-w-3xl mx-auto px-5 py-16 md:py-20">
        <h1 className="font-display text-4xl md:text-5xl font-extrabold text-slate-900">
          AIFAGen Labs Terms &amp; Conditions
        </h1>

        <H>1. Overview</H>
        <P>
          AIFAGen Labs provides IT staffing, job marketing, resume engineering,
          and interview support services for job seekers.
        </P>
        <P>By using our services, you agree to these Terms and Conditions.</P>

        <H>2. Services</H>
        <P>Our services may include:</P>
        <List
          items={[
            "Resume engineering",
            "Job application marketing",
            "Interview preparation",
            "Client payroll placement support",
            "Technical screening",
          ]}
        />
        <P>
          We do not guarantee job placement but commit to strategic job marketing
          efforts.
        </P>

        <H>3. SMS Terms of Service</H>
        <P>
          By opting into SMS communication via web forms or other methods, you
          agree to receive text messages from AIFAGen Labs regarding:
        </P>
        <List
          items={[
            "Job updates",
            "Application status",
            "Interview scheduling",
            "Service notifications",
          ]}
        />
        <P>Message frequency varies.</P>
        <P>Message and data rates may apply.</P>
        <P>
          To opt out, reply <span className="font-bold text-slate-900">STOP</span>{" "}
          at any time.
        </P>
        <P>
          For assistance, reply{" "}
          <span className="font-bold text-slate-900">HELP</span> or contact:
        </P>
        <div className="mt-4 space-y-2 text-slate-600">
          <div className="flex items-center gap-3">
            <Mail size={16} className="text-slate-400" />
            <a href={`mailto:${CONTACT_EMAIL}`} className="brand hover:underline">
              {CONTACT_EMAIL}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Phone size={16} className="text-slate-400" />
            <a href={PHONE_HREF} className="brand hover:underline">
              {PHONE}
            </a>
          </div>
        </div>

        <H>4. User Responsibilities</H>
        <P>You agree that:</P>
        <List
          items={[
            "Information provided is accurate and truthful",
            "You are legally authorized to work in your stated visa category",
            "You will not misuse our services",
          ]}
        />

        <H>5. Payments &amp; Plan Periods</H>
        <P>If enrolled in a paid plan:</P>
        <List
          items={[
            "Fees must be paid in advance and are processed by Razorpay",
            "Monthly plans cover one month; one-time payment plans are charged once at checkout",
            "Plan time starts on the date of payment, or, if you still have time left (a free trial or a current plan), when that time ends, so paying early never shortens your access",
            "Plans do not renew automatically — no further charges are made unless you choose and pay for a new plan",
          ]}
        />

        <H>6. Limitation of Liability</H>
        <P>AIFAGen Labs is not liable for:</P>
        <List
          items={[
            "Hiring decisions made by client companies",
            "Delays in job offers",
            "Market-related employment conditions",
          ]}
        />

        <H>7. Intellectual Property</H>
        <P>
          All website content, branding, and service materials belong to AIFAGen
          Labs and may not be copied without permission.
        </P>

        <H>8. Modifications</H>
        <P>
          We reserve the right to modify these terms at any time. Continued use of
          services indicates acceptance of updated terms.
        </P>

        <H>9. Contact Information</H>
        <P>AIFAGen Labs</P>
        <div className="mt-4 space-y-2 text-slate-600">
          <div className="flex items-center gap-3">
            <Mail size={16} className="text-slate-400" />
            <a href={`mailto:${CONTACT_EMAIL}`} className="brand hover:underline">
              {CONTACT_EMAIL}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Phone size={16} className="text-slate-400" />
            <a href={PHONE_HREF} className="brand hover:underline">
              {PHONE}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Globe size={16} className="text-slate-400" />
            <a
              href="https://www.aifagenlabs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="brand hover:underline"
            >
              https://www.aifagenlabs.com
            </a>
          </div>
        </div>
      </section>

      <SiteFooter go={go} />
    </div>
  );
}
