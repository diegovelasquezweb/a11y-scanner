"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X, Download } from "lucide-react";

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  detail: string;
  actionLabel: string;
  onAction: () => void;
  preview?: React.ReactNode;
}

export function ExportModal({
  open,
  onOpenChange,
  title,
  description,
  detail,
  actionLabel,
  onAction,
  preview,
}: ExportModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-md bg-white shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 overflow-hidden">
          <div className="flex items-start justify-between p-6 border-b border-slate-100">
            <div>
              <Dialog.Title className="text-lg font-bold text-slate-900">
                {title}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-slate-500 mt-1 leading-relaxed">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors ml-4 shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">{detail}</p>

            {preview && (
              <div className="rounded-md bg-slate-900 border border-slate-700 overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Preview</span>
                </div>
                <div className="p-4 overflow-x-auto max-h-52 overflow-y-auto">
                  {preview}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 px-6 pb-6">
            <Dialog.Close asChild>
              <button
                type="button"
                className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={() => { onAction(); onOpenChange(false); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-sky-600 rounded-md hover:bg-sky-700 transition-colors"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              {actionLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
