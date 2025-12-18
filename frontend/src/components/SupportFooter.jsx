import { Link } from "react-router-dom";

export default function SupportFooter() {
  return (
    <section className="support-footer relative overflow-hidden mt-12">
      <div className="support-footer__glow support-footer__glow--one" aria-hidden="true" />
      <div className="support-footer__glow support-footer__glow--two" aria-hidden="true" />
      <div className="relative max-w-6xl mx-auto px-4 py-16">
        <div className="grid gap-10 md:grid-cols-2 bg-[rgba(16,12,14,0.9)] border border-white/10 rounded-[28px] p-8 md:p-10 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-md support-footer__card text-[var(--surface)]">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--accent)] opacity-90">Customer care</p>
            <h3 className="text-2xl font-semibold mt-2 text-white">We are here for you</h3>
            <ul className="mt-6 space-y-3 text-sm text-white/80">
              <li>
                <Link to="/info/about" className="hover:underline decoration-[var(--accent)] decoration-2 underline-offset-4">
                  About us
                </Link>
              </li>
              <li>
                <Link to="/info/contact" className="hover:underline decoration-[var(--accent)] decoration-2 underline-offset-4">
                  Contact us
                </Link>
              </li>
              <li>
                <Link to="/info/return-policy" className="hover:underline decoration-[var(--accent)] decoration-2 underline-offset-4">
                  Return policy
                </Link>
              </li>
              <li>
                <Link to="/info/shipping-policy" className="hover:underline decoration-[var(--accent)] decoration-2 underline-offset-4">
                  Shipping policy
                </Link>
              </li>
              <li>
                <Link to="/info/privacy-policy" className="hover:underline decoration-[var(--accent)] decoration-2 underline-offset-4">
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link to="/info/terms-of-service" className="hover:underline decoration-[var(--accent)] decoration-2 underline-offset-4">
                  Terms of service
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--accent)] opacity-90">Get in touch</p>
            <h3 className="text-2xl font-semibold mt-2 text-white">Styling concierge</h3>
            <p className="mt-4 text-sm text-white/80">Working hours: 10:00 AM - 6:30 PM (Mon - Sat)</p>
            <div className="mt-4 space-y-2 text-sm text-white/90">
              <p>
                WhatsApp:{" "}
                <a
                  className="font-semibold underline decoration-[var(--accent)] decoration-2 underline-offset-4"
                  href="https://wa.me/919754658009"
                  target="_blank"
                  rel="noreferrer"
                >
                  +91 97546 58009
                </a>
              </p>
              <p>
                Call us:{" "}
                <a className="font-semibold underline decoration-[var(--accent)] decoration-2 underline-offset-4" href="tel:+919754658009">
                  +91 97546 58009
                </a>
              </p>
              <p>
                Email:{" "}
                <a
                  className="font-semibold underline decoration-[var(--accent)] decoration-2 underline-offset-4"
                  href="mailto:mrigmaya101@gmail.com"
                >
                  mrigmaya101@gmail.com
                </a>
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <a
                className="support-footer__pill support-footer__pill--instagram"
                href="https://www.instagram.com/yourhandle"
                target="_blank"
                rel="noreferrer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
                </svg>
                Instagram
              </a>
              <a
                className="support-footer__pill support-footer__pill--facebook"
                href="https://www.facebook.com/yourpage"
                target="_blank"
                rel="noreferrer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M14 8h2V5h-2c-1.7 0-3 1.3-3 3v2H9v3h2v6h3v-6h2.1l.4-3H14V8.5c0-.3.2-.5.5-.5Z"
                    fill="currentColor"
                  />
                </svg>
                Facebook
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
