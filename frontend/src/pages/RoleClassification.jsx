import React from 'react';
import PageHeader from '../components/PageHeader';
import { Shield } from 'lucide-react';

export default function RoleClassification() {
  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader 
        eyebrow="Workspace · Roles"
        title="Role"
        accentWord="Classification"
        description="Identify your organization's legal role under the EU AI Act."
      />

      <div className="max-w-3xl rounded-3xl glass-panel hairline p-7 md:p-8 soft-shadow mt-8">
        <div className="mb-8">
          <h2 className="font-serif text-2xl tracking-tight">Organization Details</h2>
          <p className="text-[13px] text-muted-foreground mt-2">
            Describe your relationship with the AI system to determine your compliance obligations.
          </p>
        </div>

        <form className="flex flex-col gap-6">
          {/* Field 1 — Organization Name */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-foreground">Organization Name</label>
            <input 
              type="text" 
              placeholder="e.g., Acme Corp"
              className="rounded-xl bg-[oklch(0.18_0.03_285/0.6)] hairline px-3.5 py-2.5 text-[13px] outline-none focus:ring-1 focus:ring-[oklch(0.7_0.22_305/0.5)] transition-all placeholder:text-muted-foreground"
            />
          </div>

          {/* Field 2 — Involvement with the AI System */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-foreground">Involvement with the AI System</label>
            <textarea 
              rows={3}
              placeholder="e.g., We use the system internally to filter resumes, but we didn't build it."
              className="rounded-xl bg-[oklch(0.18_0.03_285/0.6)] hairline px-3.5 py-2.5 text-[13px] outline-none focus:ring-1 focus:ring-[oklch(0.7_0.22_305/0.5)] transition-all placeholder:text-muted-foreground resize-none"
            />
          </div>

          {/* Field 3 — System Origin / Development */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-foreground">System Origin / Development</label>
            <textarea 
              rows={3}
              placeholder="e.g., Purchased from a vendor based in the US."
              className="rounded-xl bg-[oklch(0.18_0.03_285/0.6)] hairline px-3.5 py-2.5 text-[13px] outline-none focus:ring-1 focus:ring-[oklch(0.7_0.22_305/0.5)] transition-all placeholder:text-muted-foreground resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 mt-2">
            <button 
              type="button" 
              className="px-5 py-2.5 rounded-xl text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
            <button 
              type="button" 
              className="bg-foreground text-background rounded-xl px-5 py-2.5 flex items-center gap-2 text-[13px] font-medium hover:bg-[oklch(0.9_0.01_300)] transition-colors gold-glow"
            >
              <Shield size={16} strokeWidth={2} />
              <span>Classify Role</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
