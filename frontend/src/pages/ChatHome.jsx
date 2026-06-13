import React from 'react';
import { Shield, CheckSquare, FileText, ArrowRight, Plus, ChevronDown, Paperclip, Mic, ArrowUp } from 'lucide-react';

export default function ChatHome() {
  const storedUser = JSON.parse(localStorage.getItem('arkive_user') || '{}');
  const displayName = storedUser.display_name || 'there';
  return (
    <div className="h-full flex flex-col items-center justify-center -mt-10">
      
      {/* Top pill */}
      <div className="mb-8 inline-flex items-center gap-3 bg-foreground text-background rounded-full pl-1.5 pr-4 py-1.5">
        <div className="flex -space-x-2">
          <div className="h-6 w-6 rounded-full ring-2 ring-foreground bg-[oklch(0.2_0.05_290)] flex items-center justify-center">
            <Shield size={12} className="text-gold" />
          </div>
          <div className="h-6 w-6 rounded-full ring-2 ring-foreground bg-[oklch(0.2_0.05_290)] flex items-center justify-center z-10">
            <CheckSquare size={12} className="text-gold" />
          </div>
          <div className="h-6 w-6 rounded-full ring-2 ring-foreground bg-[oklch(0.2_0.05_290)] flex items-center justify-center z-20">
            <FileText size={12} className="text-gold" />
          </div>
        </div>
        <span className="text-[13px] font-medium tracking-tight">Built on UNESCO · OECD · EU AI Act</span>
        <ArrowRight size={14} strokeWidth={2} />
      </div>

      {/* Heading */}
      <h1 className="font-serif text-5xl md:text-6xl tracking-tight text-center mb-6">
        Ready to verify, <span className="text-gold italic">{displayName}</span>?
      </h1>

      {/* Subtitle */}
      <p className="text-[15px] text-muted-foreground text-center max-w-lg mb-10 leading-relaxed">
        Query international AI standards or upload your organisation's policy for an instant gap analysis.
      </p>

      {/* Input panel */}
      <div className="w-full max-w-2xl rounded-3xl glass-panel hairline gold-glow px-5 pt-4 pb-3 mb-6 relative z-10">
        <input 
          type="text" 
          placeholder="Ask Arkive about AI compliance, risk tiers, obligations..."
          className="w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/60 mb-4 text-[15px]"
        />
        
        <div className="flex items-center justify-between">
          {/* Left */}
          <div>
            <button className="h-8 w-8 rounded-full bg-[oklch(1_1_1/0.05)] hover:bg-[oklch(1_1_1/0.1)] flex items-center justify-center text-muted-foreground transition-colors">
              <Plus size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[oklch(1_1_1/0.05)] hover:bg-[oklch(1_1_1/0.1)] transition-colors border border-border/40 text-[13px] text-muted-foreground">
              <Shield size={14} className="text-gold" />
              <span>Verify</span>
              <ChevronDown size={14} />
            </button>
            
            <button className="h-8 w-8 rounded-full bg-[oklch(1_1_1/0.05)] hover:bg-[oklch(1_1_1/0.1)] flex items-center justify-center text-muted-foreground transition-colors">
              <Paperclip size={16} strokeWidth={1.7} />
            </button>
            
            <button className="h-8 w-8 rounded-full bg-[oklch(1_1_1/0.05)] hover:bg-[oklch(1_1_1/0.1)] flex items-center justify-center text-muted-foreground transition-colors">
              <Mic size={16} strokeWidth={1.7} />
            </button>

            <button className="h-9 w-9 bg-foreground text-background rounded-full flex items-center justify-center ml-1 gold-glow hover:bg-[oklch(0.9_0.01_300)] transition-colors">
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>



    </div>
  );
}
