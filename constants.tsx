
import { BaseAnimal, MagicElement, GameLevel, Platform, Hazard } from './types';

export const GAME_LEVELS: GameLevel[] = Array.from({ length: 30 }, (_, i) => {
  const levelId = i + 1;
  const platforms: Platform[] = [
    { x: 0, y: 500, w: 200, h: 100 }, // Inicio
  ];
  const hazards: Hazard[] = [];

  // Parámetros de dificultad que escalan con el nivel
  const numPlatforms = 12 + Math.floor(levelId * 1.5); // Niveles más largos
  const minWidth = Math.max(80, 200 - (levelId * 4));
  const maxWidth = Math.max(120, 280 - (levelId * 5));
  const horizontalGapBase = 80 + (levelId * 5); // Gap entre el FINAL de una y el INICIO de otra
  const verticalVariation = 40 + (levelId * 5);

  for (let j = 0; j < numPlatforms; j++) {
    const lastP = platforms[platforms.length - 1];
    
    const w = minWidth + Math.random() * (maxWidth - minWidth);
    // Calculamos X basándonos en el final de la plataforma anterior para evitar colisiones
    const x = lastP.x + lastP.w + horizontalGapBase + Math.random() * 40;
    
    // Altura oscilante para asegurar que sea alcanzable pero variado
    const targetY = 450 - (Math.sin(j * 0.8) * verticalVariation);
    const y = Math.max(150, Math.min(500, targetY));

    // Probabilidad de plataforma móvil aumenta con el nivel
    const isMoving = levelId > 2 && Math.random() < (0.2 + (levelId * 0.03));
    
    if (isMoving) {
      const moveType = Math.random() > 0.5 ? 'H' : 'V'; // Horizontal o Vertical
      const range = 100 + (levelId * 5);
      
      platforms.push({
        x, y, w, h: 40,
        isMoving: true,
        startX: x,
        startY: y,
        endX: moveType === 'H' ? x + range : x,
        endY: moveType === 'V' ? y - range : y,
        speed: 0.005 + (levelId * 0.0005),
        progress: Math.random(),
        moveDir: 1
      });
    } else {
      platforms.push({ x, y, w, h: 40 });
      
      // Agregar espinas en algunas plataformas estáticas a partir del nivel 3
      if (levelId >= 3 && Math.random() < 0.3) {
        const spikeW = 30;
        const spikeH = 20;
        // Poner la espina en el medio de la plataforma
        hazards.push({
          x: x + (w / 2) - (spikeW / 2),
          y: y - spikeH,
          w: spikeW,
          h: spikeH,
          type: 'spike'
        });
      }
    }
  }

  const lastP = platforms[platforms.length - 1];
  const goalPlatformX = lastP.x + horizontalGapBase + 100;
  platforms.push({ x: goalPlatformX, y: 300, w: 300, h: 400 }); // Meta

  // Temas visuales por grupos de niveles
  const themes = [
    'bg-emerald-50', // Bosque (1-6)
    'bg-sky-50',     // Cielo (7-12)
    'bg-orange-50',  // Desierto (13-18)
    'bg-indigo-50',  // Espacio (19-24)
    'bg-pink-50'     // Dulce (25-30)
  ];
  const background = themes[Math.floor((levelId - 1) / 6)];

  return {
    id: levelId,
    platforms,
    hazards,
    coins: platforms.slice(1, -1).map(p => ({ 
      x: p.x + p.w / 2, 
      y: (p.startY || p.y) - 40 
    })),
    goal: { x: goalPlatformX + 150, y: 250 },
    background,
  };
});

export const BASE_ANIMALS: BaseAnimal[] = [
  { 
    id: 'lion', 
    name: 'León', 
    icon: '🦁', 
    color: 'bg-orange-300',
    pathData: {
      "1": "M50,35 C70,35 85,50 85,70 C85,90 70,105 50,105 C30,105 15,90 15,70 C15,50 30,35 50,35", // Cara
      "2": "M50,5 C10,5 -5,45 -5,85 C-5,120 20,145 50,145 C80,145 105,120 105,85 C105,45 90,5 50,5 Z", // Melena Exterior
      "3": "M50,15 C25,15 5,45 5,85 C5,115 25,135 50,135 C75,135 95,115 95,85 C95,45 75,15 50,15", // Melena Interior
      "4": "M40,105 L30,135 L70,135 L60,105 Z", // Cuerpo
      "5": "M10,105 Q-20,130 20,140 L30,130 Z" // Cola
    },
    detailPath: "M50,5 C10,5 -5,45 -5,85 C-5,120 20,145 50,145 C80,145 105,120 105,85 C105,45 90,5 50,5 M50,15 C25,15 5,45 5,85 C5,115 25,135 50,135 C75,135 95,115 95,85 C95,45 75,15 50,15 M50,35 C70,35 85,50 85,70 C85,90 70,105 50,105 C30,105 15,90 15,70 C15,50 30,35 50,35 M40,65 A5,5 0 1,0 48,65 M52,65 A5,5 0 1,0 60,65 M45,85 Q50,95 55,85 M50,95 L50,105 M20,85 Q30,90 20,95 M80,85 Q70,90 80,95 M35,10 L30,0 M65,10 L70,0",
    numberPositions: {
      "1": { x: 50, y: 70 },
      "2": { x: 25, y: 30 },
      "3": { x: 75, y: 50 },
      "4": { x: 50, y: 120 },
      "5": { x: 5, y: 125 }
    }
  },
  { 
    id: 'cat', 
    name: 'Gatito', 
    icon: '🐱', 
    color: 'bg-orange-200',
    pathData: {
      "1": "M50,30 C75,30 90,45 90,70 C90,95 75,110 50,110 C25,110 10,95 10,70 C10,45 25,30 50,30", // Cabeza
      "2": "M25,35 L5,5 L45,30 Z M75,35 L95,5 L55,30 Z", // Orejas
      "3": "M35,110 Q25,140 50,140 Q75,140 65,110", // Cuerpo
      "4": "M90,85 Q115,85 110,55 Q105,40 85,75", // Cola
      "5": "M45,80 L55,80 L50,90 Z" // Nariz
    },
    detailPath: "M10,70 C10,45 25,30 50,30 C75,30 90,45 90,70 C90,95 75,110 50,110 C25,110 10,95 10,70 M5,5 L25,35 M75,35 L95,5 M35,65 A4,4 0 1,0 43,65 M57,65 A4,4 0 1,0 65,65 M42,90 Q50,100 58,90 M10,80 L0,75 M10,85 L0,90 M90,80 L100,75 M90,85 L100,90",
    numberPositions: {
      "1": { x: 50, y: 65 },
      "2": { x: 15, y: 20 },
      "3": { x: 50, y: 125 },
      "4": { x: 105, y: 70 },
      "5": { x: 50, y: 85 }
    }
  },
  { 
    id: 'rhino', 
    name: 'Rinoceronte', 
    icon: '🦏', 
    color: 'bg-gray-400',
    pathData: {
      "1": "M50,30 C80,30 95,45 95,75 C95,105 80,120 50,120 C20,120 5,105 5,75 C5,45 20,30 50,30", // Cabeza
      "2": "M50,35 L50,10 L65,30 Z", // Cuerno grande
      "3": "M60,45 L60,35 L70,45 Z", // Cuerno pequeño
      "4": "M20,120 Q10,150 50,150 Q90,150 80,120", // Cuerpo
      "5": "M25,35 L15,15 L35,30 Z M75,35 L85,15 L65,30 Z" // Orejas
    },
    detailPath: "M5,75 C5,45 20,30 50,30 C80,30 95,45 95,75 C95,105 80,120 50,120 C20,120 5,105 5,75 M50,35 L50,10 L65,30 Z M60,45 L60,35 L70,45 Z M35,70 A5,5 0 1,0 43,70 M57,70 A5,5 0 1,0 65,70 M45,95 Q50,105 55,95 M15,15 L25,35 M75,35 L85,15",
    numberPositions: {
      "1": { x: 50, y: 75 },
      "2": { x: 50, y: 20 },
      "3": { x: 65, y: 40 },
      "4": { x: 50, y: 135 },
      "5": { x: 20, y: 25 }
    }
  },
  { 
    id: 'panda', 
    name: 'Panda', 
    icon: '🐼', 
    color: 'bg-gray-100',
    pathData: {
      "1": "M50,25 C75,25 90,40 90,65 C90,90 75,105 50,105 C25,105 10,90 10,65 C10,40 25,25 50,25", // Cabeza
      "2": "M15,35 A18,18 0 1,0 35,15 M85,35 A18,18 0 1,1 65,15", // Orejas
      "3": "M25,65 A15,18 0 1,0 45,65 M75,65 A15,18 0 1,1 55,65", // Ojos (manchas)
      "4": "M30,105 Q20,140 50,140 Q80,140 70,105", // Cuerpo
      "5": "M45,90 L55,90 L50,98 Z" // Nariz
    },
    detailPath: "M10,65 C10,40 25,25 50,25 C75,25 90,40 90,65 C90,90 75,105 50,105 C25,105 10,90 10,65 M15,35 A18,18 0 1,0 35,15 M85,35 A18,18 0 1,1 65,15 M25,65 A15,18 0 1,0 45,65 M75,65 A15,18 0 1,1 55,65 M33,65 A5,5 0 1,0 41,65 M59,65 A5,5 0 1,0 67,65 M46,92 Q50,100 54,92",
    numberPositions: {
      "1": { x: 50, y: 45 },
      "2": { x: 20, y: 20 },
      "3": { x: 35, y: 65 },
      "4": { x: 50, y: 125 },
      "5": { x: 50, y: 92 }
    }
  },
  {
    id: 'rabbit',
    name: 'Conejo',
    icon: '🐰',
    color: 'bg-pink-100',
    pathData: {
      "1": "M50,40 C75,40 90,55 90,80 C90,105 75,120 50,120 C25,120 10,105 10,80 C10,55 25,40 50,40", // Cabeza
      "2": "M35,45 L20,0 L50,40 Z M65,45 L80,0 L50,40 Z", // Orejas
      "3": "M35,120 Q20,150 50,150 Q80,150 65,120", // Cuerpo
      "4": "M45,95 L55,95 L50,105 Z", // Nariz
      "5": "M15,100 Q-5,100 5,85" // Cola
    },
    detailPath: "M10,80 C10,55 25,40 50,40 C75,40 90,55 90,80 C90,105 75,120 50,120 C25,120 10,105 10,80 M20,0 L35,45 M65,45 L80,0 M38,75 A4,4 0 1,0 46,75 M54,75 A4,4 0 1,0 62,75 M45,100 Q50,108 55,100",
    numberPositions: {
      "1": { x: 50, y: 80 },
      "2": { x: 20, y: 15 },
      "3": { x: 50, y: 135 },
      "4": { x: 50, y: 100 },
      "5": { x: 5, y: 95 }
    }
  },
  {
    id: 'dragon',
    name: 'Dragón',
    icon: '🐲',
    color: 'bg-emerald-200',
    pathData: {
      "1": "M50,30 C85,30 100,50 100,80 L100,110 L0,110 L0,80 C0,50 15,30 50,30", // Cabeza
      "2": "M35,30 L20,0 L50,25 Z M65,30 L80,0 L50,25 Z", // Cuernos
      "3": "M10,110 Q50,150 90,110 L80,130 Q50,150 20,130 Z", // Cuerpo
      "4": "M25,60 L0,40 L25,30 Z M75,60 L100,40 L75,30 Z", // Alas
      "5": "M40,90 L45,95 L40,100 Z M60,90 L55,95 L60,100 Z" // Nariz
    },
    detailPath: "M0,80 C0,50 15,30 50,30 C85,30 100,50 100,80 L100,110 L0,110 Z M20,0 L35,30 M65,30 L80,0 M35,65 A5,5 0 1,0 45,65 M55,65 A5,5 0 1,0 65,65 M40,95 L60,95 M30,110 L20,125 M70,110 L80,125",
    numberPositions: {
      "1": { x: 50, y: 60 },
      "2": { x: 20, y: 10 },
      "3": { x: 50, y: 130 },
      "4": { x: 10, y: 40 },
      "5": { x: 50, y: 95 }
    }
  },
  {
    id: 'fox',
    name: 'Zorro',
    icon: '🦊',
    color: 'bg-orange-400',
    pathData: {
      "1": "M50,35 L95,85 L50,125 L5,85 Z", // Cabeza
      "2": "M30,45 L5,5 L45,40 Z M70,45 L95,5 L55,40 Z", // Orejas
      "3": "M35,125 Q50,155 65,125 L55,145 Q50,155 45,145 Z", // Cuerpo
      "4": "M10,85 Q-10,120 25,125", // Cola izq
      "5": "M90,85 Q110,120 75,125" // Cola der
    },
    detailPath: "M50,35 L95,85 L50,125 L5,85 Z M5,5 L30,45 M70,45 L95,5 M38,85 A4,4 0 1,0 46,85 M54,85 A4,4 0 1,0 62,85 M45,110 Q50,120 55,110",
    numberPositions: {
      "1": { x: 50, y: 80 },
      "2": { x: 15, y: 20 },
      "3": { x: 50, y: 140 },
      "4": { x: 5, y: 110 },
      "5": { x: 95, y: 110 }
    }
  }
];

export const COLORS_BY_NUMBER = [
  { n: 1, color: '#FF595E', name: 'Rojo' },
  { n: 2, color: '#1982C4', name: 'Azul' },
  { n: 3, color: '#8AC926', name: 'Verde' },
  { n: 4, color: '#FFCA3A', name: 'Amarillo' },
  { n: 5, color: '#6A4C93', name: 'Morado' },
  { n: 6, color: '#FF924C', name: 'Naranja' },
];

export const ELEMENTS: MagicElement[] = [
  { id: 'fire', name: 'Fuego', icon: '🔥', color: 'bg-red-400' },
  { id: 'ice', name: 'Hielo', icon: '❄️', color: 'bg-blue-300' },
  { id: 'nature', name: 'Naturaleza', icon: '🌿', color: 'bg-emerald-400' },
  { id: 'star', name: 'Estrellas', icon: '✨', color: 'bg-indigo-400' },
  { id: 'candy', name: 'Caramelos', icon: '🍭', color: 'bg-pink-400' },
];

export const LOADING_MESSAGES = [
  "Preparando los pinceles mágicos...",
  "Llamando a las hadas del color...",
  "Dando vida a tu dibujo...",
  "Buscando un lugar en el álbum...",
];
