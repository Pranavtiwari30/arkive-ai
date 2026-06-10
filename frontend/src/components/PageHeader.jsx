import React from 'react';

export default function PageHeader({ eyebrow, title, accentWord, description }) {
  return (
    <div className="mb-10">
      <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">{eyebrow}</h4>
      <h1 className="font-serif text-4xl tracking-tight mb-3">
        {title} {accentWord && <span className="text-gold italic">{accentWord}</span>}
      </h1>
      <p className="text-muted-foreground text-sm max-w-2xl">{description}</p>
    </div>
  );
}
