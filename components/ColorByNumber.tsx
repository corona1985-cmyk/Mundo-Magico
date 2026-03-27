
import React, { useState, useEffect, useRef } from 'react';
import { BASE_ANIMALS, COLORS_BY_NUMBER } from '@/constants';
import { soundService } from '@/src/services/soundService';
import confetti from 'canvas-confetti';

interface ColorByNumberProps {
  animalId: string;
  selectedNumber: number;
  onColored: (dataUrl: string) => void;
}

const ColorByNumber: React.FC<ColorByNumberProps> = ({ animalId, selectedNumber, onColored }) => {
  const animal = BASE_ANIMALS.find(a => a.id === animalId) || BASE_ANIMALS[0];
  const [fills, setFills] = useState<Record<string, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const handleRegionClick = (regionId: string, e: React.MouseEvent) => {
    const colorObj = COLORS_BY_NUMBER.find(c => c.n === selectedNumber);
    if (colorObj) {
      const newFills = { ...fills, [regionId]: colorObj.color };
      setFills(newFills);
      soundService.playColor();

      // Sparkle effect at click position
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      confetti({
        particleCount: 15,
        spread: 40,
        origin: { x, y },
        colors: [colorObj.color],
        gravity: 0.6,
        scalar: 0.6,
        ticks: 40
      });
    }
  };

  useEffect(() => {
    if (containerRef.current) {
      const svg = containerRef.current.querySelector('svg');
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
          canvas.width = 1024;
          canvas.height = 1024;
          if (ctx) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, 1024, 1024);
            ctx.drawImage(img, 0, 0, 1024, 1024);
            onColored(canvas.toDataURL('image/png'));
          }
          URL.revokeObjectURL(url);
        };
        img.src = url;
      }
    }
  }, [fills]);

  return (
    <div ref={containerRef} className="w-full flex justify-center bg-white p-2 md:p-10 rounded-[2rem] md:rounded-[4rem] shadow-2xl border-4 md:border-8 border-indigo-100 relative group overflow-hidden">
      <div className="absolute inset-0 bg-indigo-50/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <svg viewBox="0 0 100 130" className="w-full max-w-[500px] aspect-square select-none touch-none relative z-10">
        <defs>
          <filter id="beautyShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" />
            <feOffset dx="0.5" dy="0.5" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.15" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Zonas de color */}
        {Object.entries(animal.pathData).map(([num, path]) => {
          const pos = animal.numberPositions[num] || { x: 50, y: 50 };
          return (
            <g key={num} onClick={(e) => handleRegionClick(num, e)} className="cursor-pointer">
              <path
                d={path}
                fill={fills[num] || '#ffffff'}
                stroke="#e2e8f0"
                strokeWidth="0.5"
                filter="url(#beautyShadow)"
                className="transition-colors duration-500"
              />
              {!fills[num] && (
                <g className="pointer-events-none">
                  <circle cx={pos.x} cy={pos.y} r="5" fill="white" fillOpacity="0.9" />
                  <text
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    className="text-[8px] font-black fill-indigo-200"
                    style={{ dominantBaseline: 'middle' }}
                  >
                    {num}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Líneas de detalle (Contorno) */}
        <path
          d={animal.detailPath}
          fill="none"
          stroke="#1e293b"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none"
        />
        
        {/* Capa Maestra de Ilustración (El "PNG" profesional) */}
        <path
          d={animal.detailPath}
          fill="none"
          stroke="#0f172a"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none opacity-90"
        />

        {/* Brillos en ojos para dar vida */}
        <g className="pointer-events-none">
           <circle cx="43.5" cy="64" r="0.8" fill="white" />
           <circle cx="53.5" cy="64" r="0.8" fill="white" />
        </g>
      </svg>
    </div>
  );
};

export default ColorByNumber;
