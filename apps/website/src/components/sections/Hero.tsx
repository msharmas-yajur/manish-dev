'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ArrowRight } from 'lucide-react';

export function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(
        titleRef.current,
        { y: 80, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2 }
      )
        .fromTo(
          subtitleRef.current,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 1 },
          '-=0.6'
        )
        .fromTo(
          ctaRef.current,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8 },
          '-=0.5'
        );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-warm-white via-cream to-cream" />

      {/* Decorative shapes */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-terracotta/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-sage/10 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative container-wide text-center pt-32 pb-20">
        <h1
          ref={titleRef}
          className="text-display-lg md:text-display-xl font-serif text-deep-brown mb-8 text-balance"
        >
          Healthcare, powered by
          <br />
          <span className="text-gradient">intelligent AI</span>
        </h1>

        <p
          ref={subtitleRef}
          className="text-xl md:text-2xl text-gray-warm max-w-2xl mx-auto mb-12 text-balance"
        >
          Transform clinical workflows with AI-powered patient management,
          medical coding, and decision support designed for modern healthcare.
        </p>

        <div ref={ctaRef} className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/get-started" className="btn-primary text-lg px-8 py-4">
            Get Started
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
          <Link href="/demo" className="btn-secondary text-lg px-8 py-4">
            Watch Demo
          </Link>
        </div>

        {/* Trust badges */}
        <div className="mt-20 flex flex-wrap items-center justify-center gap-8 text-gray-warm">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-sage" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium">HIPAA Compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-sage" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium">SOC 2 Certified</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-sage" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium">99.9% Uptime</span>
          </div>
        </div>
      </div>
    </section>
  );
}
