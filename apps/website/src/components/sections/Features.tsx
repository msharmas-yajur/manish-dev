'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Brain,
  Shield,
  Zap,
  Users,
  FileText,
  Video,
} from 'lucide-react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Insights',
    description:
      'Leverage multi-provider LLM integration for intelligent clinical decision support, medical coding, and documentation assistance.',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description:
      'HIPAA-compliant infrastructure with role-based access control, encrypted data storage, and comprehensive audit logging.',
  },
  {
    icon: Zap,
    title: 'Streamlined Workflows',
    description:
      'Automate repetitive tasks with intelligent scheduling, patient management, and seamless EHR integration.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description:
      'Enable seamless communication between physicians, nurses, and staff with role-based permissions and shared workspaces.',
  },
  {
    icon: FileText,
    title: 'Smart Documentation',
    description:
      'AI-assisted clinical notes, automatic SNOMED CT coding, and intelligent summarization save hours of documentation time.',
  },
  {
    icon: Video,
    title: 'Telehealth Ready',
    description:
      'Integrated video consultations with LiveKit, enabling secure patient visits from anywhere with full EHR integration.',
  },
];

export function Features() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animate section title
      gsap.fromTo(
        '.features-title',
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.features-title',
            start: 'top 85%',
          },
        }
      );

      // Animate cards with stagger
      cardsRef.current.forEach((card, index) => {
        if (card) {
          gsap.fromTo(
            card,
            { y: 60, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.8,
              ease: 'power2.out',
              delay: index * 0.1,
              scrollTrigger: {
                trigger: card,
                start: 'top 85%',
              },
            }
          );
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="section bg-warm-white">
      <div className="container-wide">
        {/* Section Header */}
        <div className="text-center mb-16 md:mb-24">
          <h2 className="features-title text-display-sm md:text-display-md font-serif text-deep-brown mb-6">
            Everything you need for
            <br />
            <span className="text-gradient">modern healthcare</span>
          </h2>
          <p className="text-lg md:text-xl text-gray-warm max-w-2xl mx-auto">
            A comprehensive platform designed by healthcare professionals,
            for healthcare professionals.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              ref={(el) => { cardsRef.current[index] = el; }}
              className="card-elevated group"
            >
              <div className="w-14 h-14 rounded-2xl bg-terracotta/10 flex items-center justify-center mb-6 group-hover:bg-terracotta/20 transition-colors">
                <feature.icon className="w-7 h-7 text-terracotta" />
              </div>
              <h3 className="text-xl font-serif font-medium text-deep-brown mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-warm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
