import React, { useState, useRef } from 'react';
import { X, Copy, Check, Download, MessageCircle, ExternalLink, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Campaign, EvaluatedSubject } from '../types';

interface ShareQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign;
  subject?: EvaluatedSubject | null;
  onOpenEvaluationDirectly?: (subjectId?: string) => void;
}

export const ShareQrModal: React.FC<ShareQrModalProps> = ({
  isOpen,
  onClose,
  campaign,
  subject,
  onOpenEvaluationDirectly,
}) => {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Compute evaluation link URL
  const origin = window.location.origin;
  const basePath = window.location.pathname.replace(/\/$/, '');
  const params = new URLSearchParams();
  if (subject) {
    params.set('evaluar', subject.id);
    params.set('id', subject.id);
    params.set('campana', campaign.clientCode);
    params.set('empresa', campaign.clientCode);
    params.set('code', campaign.clientCode);
  } else {
    params.set('campana', campaign.clientCode);
    params.set('empresa', campaign.clientCode);
    params.set('code', campaign.clientCode);
  }
  const fullShareUrl = `${origin}${basePath}?${params.toString()}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullShareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQr = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 600;
    canvas.height = 600;

    img.onload = () => {
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 600, 600);
      ctx.drawImage(img, 50, 50, 500, 500);

      const a = document.createElement('a');
      const filename = subject
        ? `QR_Evaluacion_${subject.name.replace(/\s+/g, '_')}_${campaign.clientCode}.png`
        : `QR_Evaluacion_${campaign.companyName.replace(/\s+/g, '_')}_${campaign.clientCode}.png`;
      a.download = filename;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const shareText = subject
    ? `Hola! Te invitamos a participar en la Evaluación 360° de ${subject.name} (${subject.role}) para ${campaign.companyName}. Tu feedback sincero y constructivo es vital para su desarrollo. Ingresa aquí: ${fullShareUrl}`
    : `Hola! Te invitamos a participar en el proceso de Evaluación 360° de ${campaign.companyName}. Ingresa con el código de empresa: ${campaign.clientCode} en el siguiente enlace: ${fullShareUrl}`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <img src="/comgico.png" alt="Comunicación Global" className="h-6 w-6 object-contain rounded-full shadow-xs" />
            <h3 className="font-extrabold text-base text-white">
              {subject ? 'QR de Evaluación Personalizada' : 'Código QR de Campaña'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-center">
          <div>
            <span className="inline-block px-3 py-1 bg-lime-50 text-slate-900 font-mono font-bold text-xs rounded-full border border-lime-300 mb-1">
              {campaign.clientCode}
            </span>
            <h4 className="text-lg font-bold text-slate-900">
              {subject ? subject.name : campaign.companyName}
            </h4>
            <p className="text-xs text-slate-500">
              {subject ? `${subject.role} • ${subject.department}` : 'Enlace general para todos los evaluadores'}
            </p>
          </div>

          {/* QR Code Container */}
          <div className="flex justify-center">
            <div
              ref={qrRef}
              className="p-4 bg-white rounded-2xl border-2 border-lime-400 shadow-md inline-flex flex-col items-center ring-4 ring-lime-400/10"
            >
              <QRCodeSVG
                value={fullShareUrl}
                size={210}
                level="H"
                includeMargin={true}
                bgColor="#ffffff"
                fgColor="#0f172a"
              />
              <span className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">
                Escanea con la cámara de tu smartphone
              </span>
            </div>
          </div>

          {/* Direct Link Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block text-left uppercase tracking-wider">
              Enlace directo de acceso:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={fullShareUrl}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-700 truncate select-all focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition shrink-0 ${
                  copied
                    ? 'bg-slate-900 text-lime-400'
                    : 'bg-lime-500 text-slate-900 hover:bg-lime-400 border border-lime-400'
                }`}
                title="Copiar enlace"
              >
                {copied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={handleDownloadQr}
              className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition border border-slate-200"
            >
              <Download className="w-4 h-4 text-slate-600" />
              Descargar PNG
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              Enviar WhatsApp
            </a>
          </div>

          {onOpenEvaluationDirectly && (
            <button
              onClick={() => {
                onClose();
                onOpenEvaluationDirectly(subject?.id);
              }}
              className="w-full py-2.5 text-xs font-bold text-slate-900 hover:text-lime-800 hover:bg-lime-50 rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-200"
            >
              <ExternalLink className="w-3.5 h-3.5 text-lime-700" />
              Probar o responder encuesta ahora como evaluador
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
