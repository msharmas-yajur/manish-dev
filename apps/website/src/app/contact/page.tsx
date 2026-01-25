import type { Metadata } from 'next';
import { Mail, MapPin, Phone } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with the Caladrius Health team. We\'re here to help with questions about our healthcare platform.',
};

const contactInfo = [
  {
    icon: Mail,
    title: 'Email',
    value: 'hello@caladrius.com',
    href: 'mailto:hello@caladrius.com',
  },
  {
    icon: Phone,
    title: 'Phone',
    value: '+1 (555) 123-4567',
    href: 'tel:+15551234567',
  },
  {
    icon: MapPin,
    title: 'Office',
    value: 'San Francisco, CA',
    href: null,
  },
];

export default function ContactPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="section-lg pt-40 bg-warm-white">
        <div className="container-narrow text-center">
          <h1 className="text-display-md font-serif text-deep-brown mb-6">
            Get in touch
          </h1>
          <p className="text-xl text-gray-warm max-w-xl mx-auto">
            Have questions about Caladrius Health? We&apos;d love to hear from you.
            Our team is here to help.
          </p>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="section">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-serif text-deep-brown mb-8">
                Send us a message
              </h2>
              <form className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="firstName"
                      className="block text-sm font-medium text-deep-brown mb-2"
                    >
                      First name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      className="w-full px-4 py-3 rounded-xl border border-gray-light
                               bg-warm-white focus:outline-none focus:ring-2
                               focus:ring-terracotta focus:border-transparent
                               transition-all"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-deep-brown mb-2"
                    >
                      Last name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      className="w-full px-4 py-3 rounded-xl border border-gray-light
                               bg-warm-white focus:outline-none focus:ring-2
                               focus:ring-terracotta focus:border-transparent
                               transition-all"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-deep-brown mb-2"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="w-full px-4 py-3 rounded-xl border border-gray-light
                             bg-warm-white focus:outline-none focus:ring-2
                             focus:ring-terracotta focus:border-transparent
                             transition-all"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="organization"
                    className="block text-sm font-medium text-deep-brown mb-2"
                  >
                    Organization
                  </label>
                  <input
                    type="text"
                    id="organization"
                    name="organization"
                    className="w-full px-4 py-3 rounded-xl border border-gray-light
                             bg-warm-white focus:outline-none focus:ring-2
                             focus:ring-terracotta focus:border-transparent
                             transition-all"
                    placeholder="Acme Hospital"
                  />
                </div>

                <div>
                  <label
                    htmlFor="subject"
                    className="block text-sm font-medium text-deep-brown mb-2"
                  >
                    Subject
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    className="w-full px-4 py-3 rounded-xl border border-gray-light
                             bg-warm-white focus:outline-none focus:ring-2
                             focus:ring-terracotta focus:border-transparent
                             transition-all"
                  >
                    <option value="">Select a topic</option>
                    <option value="demo">Request a Demo</option>
                    <option value="pricing">Pricing Inquiry</option>
                    <option value="support">Technical Support</option>
                    <option value="partnership">Partnership</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-deep-brown mb-2"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl border border-gray-light
                             bg-warm-white focus:outline-none focus:ring-2
                             focus:ring-terracotta focus:border-transparent
                             transition-all resize-none"
                    placeholder="Tell us how we can help..."
                  />
                </div>

                <button type="submit" className="btn-primary w-full sm:w-auto">
                  Send Message
                </button>
              </form>
            </div>

            {/* Contact Info */}
            <div>
              <h2 className="text-2xl font-serif text-deep-brown mb-8">
                Contact information
              </h2>

              <div className="space-y-6 mb-12">
                {contactInfo.map((item) => (
                  <div key={item.title} className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-terracotta/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-terracotta" />
                    </div>
                    <div>
                      <h3 className="font-medium text-deep-brown">
                        {item.title}
                      </h3>
                      {item.href ? (
                        <a
                          href={item.href}
                          className="text-gray-warm hover:text-terracotta transition-colors"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p className="text-gray-warm">{item.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* FAQ Card */}
              <div className="card bg-warm-white">
                <h3 className="text-xl font-serif text-deep-brown mb-4">
                  Frequently Asked Questions
                </h3>
                <p className="text-gray-warm mb-4">
                  Find quick answers to common questions about our platform,
                  pricing, and implementation.
                </p>
                <a
                  href="/faq"
                  className="text-terracotta font-medium hover:underline"
                >
                  View FAQ →
                </a>
              </div>

              {/* Office Hours */}
              <div className="mt-8 p-6 rounded-2xl border border-gray-light">
                <h3 className="font-medium text-deep-brown mb-3">
                  Office Hours
                </h3>
                <div className="space-y-2 text-gray-warm">
                  <p>Monday - Friday: 9:00 AM - 6:00 PM PST</p>
                  <p>Saturday - Sunday: Closed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
