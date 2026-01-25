'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight } from 'lucide-react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export function CTA() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.cta-content',
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.cta-content',
            start: 'top 85%',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="section-lg bg-deep-brown text-cream relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-terracotta/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-sage/10 rounded-full blur-3xl" />
      </div>

      <div className="container-narrow relative">
        <div className="cta-content text-center">
          <h2 className="text-display-sm md:text-display-md font-serif mb-6">
            Ready to transform your
            <br />
            clinical workflows?
          </h2>
          <p className="text-xl text-cream/70 max-w-xl mx-auto mb-10">
            Join thousands of healthcare professionals using Caladrius
            to deliver better patient care with AI-powered tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/get-started"
              className="inline-flex items-center justify-center px-8 py-4
                       bg-cream text-deep-brown rounded-full font-medium text-lg
                       transition-all duration-300 hover:bg-warm-white hover:scale-105"
            >
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-4
                       bg-transparent text-cream border-2 border-cream/30 rounded-full
                       font-medium text-lg transition-all duration-300
                       hover:border-cream hover:bg-cream/10"
            >
              Talk to Sales
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
