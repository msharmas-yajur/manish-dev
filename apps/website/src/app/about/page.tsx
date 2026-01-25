import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about Caladrius Health and our mission to transform healthcare with AI-powered solutions.',
};

const values = [
  {
    title: 'Patient-Centered',
    description:
      'Every feature we build starts with the question: how does this improve patient care?',
  },
  {
    title: 'Clinical Excellence',
    description:
      'Built by healthcare professionals who understand the complexities of modern medicine.',
  },
  {
    title: 'Innovation',
    description:
      'Leveraging cutting-edge AI to solve real problems, not create new ones.',
  },
  {
    title: 'Trust & Security',
    description:
      'HIPAA compliance and data security are non-negotiable foundations of everything we do.',
  },
];

const stats = [
  { value: '10K+', label: 'Healthcare Providers' },
  { value: '5M+', label: 'Patient Records' },
  { value: '99.9%', label: 'Uptime' },
  { value: '50%', label: 'Time Saved' },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="section-lg pt-40">
        <div className="container-narrow text-center">
          <h1 className="text-display-md md:text-display-lg font-serif text-deep-brown mb-8">
            Building the future of
            <br />
            <span className="text-gradient">healthcare technology</span>
          </h1>
          <p className="text-xl text-gray-warm max-w-2xl mx-auto">
            We believe that AI should augment human expertise, not replace it.
            Our platform empowers healthcare professionals to focus on what
            matters most: patient care.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="section bg-warm-white">
        <div className="container-wide">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-display-sm font-serif text-deep-brown mb-6">
                Our Mission
              </h2>
              <p className="text-lg text-gray-warm mb-6">
                Healthcare professionals spend too much time on administrative
                tasks and not enough time with patients. We&apos;re here to change
                that.
              </p>
              <p className="text-lg text-gray-warm mb-6">
                Caladrius Health combines the latest advances in artificial
                intelligence with deep healthcare domain expertise to create
                tools that actually work in clinical settings.
              </p>
              <p className="text-lg text-gray-warm">
                From intelligent medical coding to streamlined documentation,
                every feature is designed to give time back to caregivers.
              </p>
            </div>
            <div className="bg-gradient-to-br from-terracotta/20 to-sage/20 rounded-3xl aspect-square flex items-center justify-center">
              <span className="text-6xl">🏥</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="section bg-deep-brown text-cream">
        <div className="container-wide">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-4xl md:text-5xl font-serif font-medium mb-2">
                  {stat.value}
                </div>
                <div className="text-cream/70">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="section">
        <div className="container-wide">
          <div className="text-center mb-16">
            <h2 className="text-display-sm font-serif text-deep-brown mb-6">
              Our Values
            </h2>
            <p className="text-lg text-gray-warm max-w-2xl mx-auto">
              These principles guide every decision we make, from product
              development to customer support.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {values.map((value) => (
              <div key={value.title} className="card">
                <h3 className="text-xl font-serif font-medium text-deep-brown mb-3">
                  {value.title}
                </h3>
                <p className="text-gray-warm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section bg-warm-white">
        <div className="container-narrow text-center">
          <h2 className="text-display-sm font-serif text-deep-brown mb-6">
            Join us on our mission
          </h2>
          <p className="text-lg text-gray-warm mb-8">
            Whether you&apos;re a healthcare provider looking for better tools,
            or a talented individual wanting to make an impact, we&apos;d love
            to hear from you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/get-started" className="btn-primary">
              Get Started
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link href="/careers" className="btn-secondary">
              View Careers
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
