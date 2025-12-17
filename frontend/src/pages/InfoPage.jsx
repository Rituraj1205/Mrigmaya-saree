import { Link, useParams } from "react-router-dom";

const pages = {
  about: {
    title: "About us",
    sections: [
      "We curate sarees, blouses, and jewellery with a studio-grade finish, handcrafted by trusted artisan partners.",
      "Every piece is inspected, finished in-house, and dispatched with styling notes so you can wear it right out of the box.",
      "We’re based in Surat and ship pan-India with ready-to-ship inventory and responsive customer care."
    ]
  },
  contact: {
    title: "Contact us",
    sections: [
      "Need help styling or tracking an order? We’re here to help.",
      "Working hours: 10:00 AM – 6:30 PM (Mon – Sat)",
      "WhatsApp: +91 99998 38768",
      "Call us: +91 99998 38768",
      "Email: care@sudathi.com"
    ]
  },
  "return-policy": {
    title: "Return policy",
    sections: [
      "Returns are accepted for unused items with tags intact within 7 days of delivery.",
      "To initiate a return, WhatsApp us with your order ID and unboxing photos.",
      "Refunds are processed to the original payment method after quality check. Shipping fees are non-refundable."
    ]
  },
  "shipping-policy": {
    title: "Shipping policy",
    sections: [
      "We ship pan-India via trusted courier partners. Ready-to-ship items typically dispatch within 24-48 hours.",
      "You’ll receive tracking details by SMS/WhatsApp/email once your parcel is booked.",
      "Prepaid and COD (where available) are supported. Delivery timelines vary by pincode."
    ]
  },
  "privacy-policy": {
    title: "Privacy policy",
    sections: [
      "What we collect: name, email, and profile image when you sign in with Google; contact and shipping details you provide at checkout; and order history. We do not collect or store your card details—payments are handled by our PCI-compliant gateway.",
      "How we use it: to create and secure your account, show your profile, process and deliver orders, provide support, and send essential service updates. We do not sell your data.",
      "Storage and security: data is stored in our database with access limited to authorized staff. All traffic is served over HTTPS.",
      "Sharing: only with service providers needed to run the app (for example, payments, hosting, analytics, delivery partners). We do not share data with advertisers.",
      "Your controls: you can request correction or deletion, or ask us to disconnect your Google account by emailing care@sudathi.com. You can also revoke Google access from your Google Account settings.",
      "Data retention: we retain account and order data for as long as your account is active or as required for legal, tax, and fraud-prevention purposes, then delete or anonymize it.",
      "Contact: care@sudathi.com for any questions about data use or this policy."
    ]
  },
  "terms-of-service": {
    title: "Terms of service",
    sections: [
      "Placing an order constitutes acceptance of our return, shipping, and privacy policies.",
      "Product images aim to represent actual colors; minor variations may occur due to lighting and screens.",
      "Misuse of promotional offers or fraudulent activity may result in order cancellation."
    ]
  }
};

export default function InfoPage() {
  const { slug } = useParams();
  const page = pages[slug];

  if (!page) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900">Page not found</h1>
        <Link to="/" className="text-pink-600 font-semibold">
          Go back home
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#fefbfe] min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <h1 className="text-3xl font-semibold text-gray-900">{page.title}</h1>
        <div className="space-y-3 text-gray-700 leading-relaxed">
          {page.sections.map((para, idx) => (
            <p key={idx}>{para}</p>
          ))}
        </div>
        <Link to="/" className="inline-flex text-sm text-pink-600 font-semibold">
          Back to home
        </Link>
      </div>
    </div>
  );
}
