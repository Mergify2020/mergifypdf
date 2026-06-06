'use client';

import { useEffect } from 'react';

const DARK_COLOR_SCHEME = 'dark light';
const DARK_SCROLLBAR_TRACK = '#18181b';
const DARK_SCROLLBAR_THUMB = '#3f3f46';
const DARK_SCROLLBAR_THUMB_HOVER = '#52525b';

export default function LandingScrollbarTone() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const previous = {
      htmlColorScheme: html.style.colorScheme,
      bodyColorScheme: body.style.colorScheme,
      htmlTrack: html.style.getPropertyValue('--scrollbar-track'),
      htmlThumb: html.style.getPropertyValue('--scrollbar-thumb'),
      htmlThumbHover: html.style.getPropertyValue('--scrollbar-thumb-hover'),
      bodyTrack: body.style.getPropertyValue('--scrollbar-track'),
      bodyThumb: body.style.getPropertyValue('--scrollbar-thumb'),
      bodyThumbHover: body.style.getPropertyValue('--scrollbar-thumb-hover'),
    };

    html.style.colorScheme = DARK_COLOR_SCHEME;
    body.style.colorScheme = DARK_COLOR_SCHEME;
    html.style.setProperty('--scrollbar-track', DARK_SCROLLBAR_TRACK);
    html.style.setProperty('--scrollbar-thumb', DARK_SCROLLBAR_THUMB);
    html.style.setProperty('--scrollbar-thumb-hover', DARK_SCROLLBAR_THUMB_HOVER);
    body.style.setProperty('--scrollbar-track', DARK_SCROLLBAR_TRACK);
    body.style.setProperty('--scrollbar-thumb', DARK_SCROLLBAR_THUMB);
    body.style.setProperty('--scrollbar-thumb-hover', DARK_SCROLLBAR_THUMB_HOVER);

    return () => {
      html.style.colorScheme = previous.htmlColorScheme;
      body.style.colorScheme = previous.bodyColorScheme;

      if (previous.htmlTrack) html.style.setProperty('--scrollbar-track', previous.htmlTrack);
      else html.style.removeProperty('--scrollbar-track');
      if (previous.htmlThumb) html.style.setProperty('--scrollbar-thumb', previous.htmlThumb);
      else html.style.removeProperty('--scrollbar-thumb');
      if (previous.htmlThumbHover) html.style.setProperty('--scrollbar-thumb-hover', previous.htmlThumbHover);
      else html.style.removeProperty('--scrollbar-thumb-hover');

      if (previous.bodyTrack) body.style.setProperty('--scrollbar-track', previous.bodyTrack);
      else body.style.removeProperty('--scrollbar-track');
      if (previous.bodyThumb) body.style.setProperty('--scrollbar-thumb', previous.bodyThumb);
      else body.style.removeProperty('--scrollbar-thumb');
      if (previous.bodyThumbHover) body.style.setProperty('--scrollbar-thumb-hover', previous.bodyThumbHover);
      else body.style.removeProperty('--scrollbar-thumb-hover');
    };
  }, []);

  return null;
}
