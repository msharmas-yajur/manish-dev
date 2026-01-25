/**
 * GSAP Animation Utilities
 * Reusable animation configurations for Apple/Anthropic style animations
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins (client-side only)
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// Animation presets
export const animations = {
  // Fade in from bottom (Apple-style hero text)
  fadeUp: {
    from: { y: 60, opacity: 0 },
    to: { y: 0, opacity: 1, duration: 1, ease: 'power3.out' },
  },

  // Fade in from left
  fadeLeft: {
    from: { x: -60, opacity: 0 },
    to: { x: 0, opacity: 1, duration: 0.8, ease: 'power2.out' },
  },

  // Fade in from right
  fadeRight: {
    from: { x: 60, opacity: 0 },
    to: { x: 0, opacity: 1, duration: 0.8, ease: 'power2.out' },
  },

  // Scale in (for cards, images)
  scaleIn: {
    from: { scale: 0.9, opacity: 0 },
    to: { scale: 1, opacity: 1, duration: 0.6, ease: 'power2.out' },
  },

  // Stagger children (for lists, grids)
  stagger: {
    each: 0.1,
    from: 'start',
    ease: 'power2.out',
  },

  // Text reveal line by line
  textReveal: {
    from: { y: '100%', opacity: 0 },
    to: { y: '0%', opacity: 1, duration: 0.8, ease: 'power3.out' },
  },
};

// ScrollTrigger defaults
export const scrollTriggerDefaults = {
  start: 'top 85%',
  end: 'bottom 15%',
  toggleActions: 'play none none reverse',
};

// Create scroll-triggered animation
export function createScrollAnimation(
  element: string | Element,
  animation: keyof typeof animations,
  options: {
    trigger?: string | Element;
    start?: string;
    stagger?: number;
    delay?: number;
    markers?: boolean;
  } = {}
) {
  const preset = animations[animation];
  const trigger = options.trigger || element;

  return gsap.fromTo(element, preset.from, {
    ...preset.to,
    delay: options.delay || 0,
    stagger: options.stagger ? { each: options.stagger, ...animations.stagger } : undefined,
    scrollTrigger: {
      trigger,
      start: options.start || scrollTriggerDefaults.start,
      toggleActions: scrollTriggerDefaults.toggleActions,
      markers: options.markers || false,
    },
  });
}

// Parallax effect
export function createParallax(
  element: string | Element,
  options: {
    speed?: number;
    trigger?: string | Element;
  } = {}
) {
  const speed = options.speed || 0.5;

  return gsap.to(element, {
    yPercent: -50 * speed,
    ease: 'none',
    scrollTrigger: {
      trigger: options.trigger || element,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
    },
  });
}

// Smooth scroll to element
export function scrollToElement(selector: string, offset = 0) {
  const element = document.querySelector(selector);
  if (element) {
    const y = element.getBoundingClientRect().top + window.scrollY + offset;
    gsap.to(window, {
      duration: 1,
      scrollTo: { y, autoKill: false },
      ease: 'power3.inOut',
    });
  }
}

// Split text for character/word animation
export function splitText(element: Element): {
  chars: HTMLSpanElement[];
  words: HTMLSpanElement[];
} {
  const text = element.textContent || '';
  const words = text.split(' ');

  element.innerHTML = '';
  const wordSpans: HTMLSpanElement[] = [];
  const charSpans: HTMLSpanElement[] = [];

  words.forEach((word, wordIndex) => {
    const wordSpan = document.createElement('span');
    wordSpan.className = 'inline-block';

    word.split('').forEach((char) => {
      const charSpan = document.createElement('span');
      charSpan.className = 'inline-block';
      charSpan.textContent = char;
      wordSpan.appendChild(charSpan);
      charSpans.push(charSpan);
    });

    element.appendChild(wordSpan);
    wordSpans.push(wordSpan);

    // Add space between words (except last)
    if (wordIndex < words.length - 1) {
      element.appendChild(document.createTextNode(' '));
    }
  });

  return { chars: charSpans, words: wordSpans };
}

// Cleanup function for ScrollTrigger
export function killScrollTriggers() {
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
}

// Refresh ScrollTrigger (after content changes)
export function refreshScrollTrigger() {
  ScrollTrigger.refresh();
}
