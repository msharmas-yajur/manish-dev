import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Brain,
  Shield,
  Zap,
  Users,
  FileText,
  Video,
  Stethoscope,
  Calendar,
  BarChart,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Features',
  description:
    'Explore the powerful features of Caladrius Health - AI-powered healthcare platform for modern clinical workflows.',
};

const features = [
  {
    icon: Brain,
    title: 'AI Clinical Decision Support',
    description:
      'Get intelligent suggestions for diagnoses, treatments, and care plans powered by state-of-the-art language models.',
    benefits: [
      'Multi-provider LLM support (OpenAI, Anthropic, Ollama)',
      'Evidence-based recommendations',
      'Configurable confidence thresholds',
    ],
  },
  {
    icon: FileText,
    title: 'Smart Documentation',
    description:
      'Reduce documentation time by 50% with AI-assisted clinical notes, automatic summarization, and intelligent coding.',
    benefits: [
      'Automatic SNOMED CT coding',
      'Clinical note generation',
      'Voice-to-text transcription',
    ],
  },
  {
    icon: Stethoscope,
    title: 'Patient Management',
    description:
      'Comprehensive patient records with demographics, medical history, allergies, and care plans in one place.',
    benefits: [
      'Complete medical history',
      'Allergy and medication tracking',
      'Care plan management',
    ],
  },
  {
    icon: Calendar,
    title: 'Intelligent Scheduling',
    description:
      'Smart appointment scheduling that optimizes provider time and reduces patient wait times.',
    benefits: [
      'Automated reminders',
      'Conflict detection',
      'Resource optimization',
    ],
  },
  {
    icon: Video,
    title: 'Telehealth',
    description:
      'Secure video consultations integrated directly into your workflow with full EHR access during calls.',
    benefits: [
      'HIPAA-compliant video',
      'Screen sharing',
      'In-call documentation',
    ],
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description:
      'Bank-level security with role-based access control, encryption, and comprehensive audit logging.',
    benefits: [
      'HIPAA compliance',
      'SOC 2 Type II certified',
      'End-to-end encryption',
    ],
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description:
      'Seamless communication between physicians, nurses, and staff with role-based permissions.',
    benefits: [
      '8 predefined healthcare roles',
      '39 granular permissions',
      'Audit trail for all actions',
    ],
  },
  {
    icon: BarChart,
    title: 'Analytics & Reporting',
    description:
      'Gain insights into your practice with real-time dashboards and customizable reports.',
    benefits: [
      'Patient outcomes tracking',
      'Provider productivity metrics',
      'Financial reporting',
    ],
  },
  {
    icon: Zap,
    title: 'Workflow Automation',
    description:
      'Automate repetitive tasks with intelligent triggers, notifications, and background processing.',
    benefits: [
      'Celery task queue',
      'Batch processing',
      'Scheduled jobs',
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="section-lg pt-40 bg-warm-white">
        <div className="container-narrow text-center">
          <h1 className="text-display-md font-serif text-deep-brown mb-6">
            Powerful features for
            <br />
            <span className="text-gradient">modern healthcare</span>
          </h1>
          <p className="text-xl text-gray-warm max-w-2xl mx-auto">
            Everything you need to streamline clinical workflows, improve patient
            outcomes, and grow your practice.
          </p>
        </div>
      </section>

      {/* Features List */}
      <section className="section">
        <div className="container-wide">
          <div className="space-y-24">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`grid lg:grid-cols-2 gap-12 items-center ${
                  index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                  <div className="w-16 h-16 rounded-2xl bg-terracotta/10 flex items-center justify-center mb-6">
                    <feature.icon className="w-8 h-8 text-terracotta" />
                  </div>
                  <h2 className="text-display-sm font-serif text-deep-brown mb-4">
                    {feature.title}
                  </h2>
                  <p className="text-lg text-gray-warm mb-6">
                    {feature.description}
                  </p>
                  <ul className="space-y-3">
                    {feature.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-center gap-3">
                        <svg
                          className="w-5 h-5 text-sage flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-gray-warm">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div
                  className={`aspect-square rounded-3xl bg-gradient-to-br from-terracotta/10 to-sage/10 flex items-center justify-center ${
                    index % 2 === 1 ? 'lg:order-1' : ''
                  }`}
                >
                  <feature.icon className="w-32 h-32 text-terracotta/30" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-lg bg-deep-brown text-cream">
        <div className="container-narrow text-center">
          <h2 className="text-display-sm font-serif mb-6">
            Ready to see it in action?
          </h2>
          <p className="text-xl text-cream/70 max-w-xl mx-auto mb-10">
            Schedule a personalized demo and see how Caladrius Health can
            transform your practice.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center px-8 py-4
                       bg-cream text-deep-brown rounded-full font-medium text-lg
                       transition-all duration-300 hover:bg-warm-white hover:scale-105"
            >
              Schedule Demo
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-4
                       bg-transparent text-cream border-2 border-cream/30 rounded-full
                       font-medium text-lg transition-all duration-300
                       hover:border-cream hover:bg-cream/10"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
