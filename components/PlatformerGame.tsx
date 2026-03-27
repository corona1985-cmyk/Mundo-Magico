
import React, { useEffect, useRef, useState } from 'react';
import { MagicPet, GameLevel, Platform } from '@/types';
import { GAME_LEVELS } from '@/constants';
import MagicButton from '@/components/MagicButton';

import { soundService } from '@/src/services/soundService';
import confetti from 'canvas-confetti';

interface PlatformerGameProps {
  pet: MagicPet;
  onExit: () => void;
  startLevelIdx?: number;
  onLevelComplete?: (levelIdx: number) => void;
}

const PlatformerGame: React.FC<PlatformerGameProps> = ({ pet, onExit, startLevelIdx = 0, onLevelComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentLevelIdx, setCurrentLevelIdx] = useState(startLevelIdx);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState<'PLAYING' | 'WIN' | 'GAMEOVER' | 'LEVEL_COMPLETE'>('PLAYING');
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [levelTransition, setLevelTransition] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 1000, height: 600 });
  const [isMobile, setIsMobile] = useState(false);
  
  const levelTransitionRef = useRef(false);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchControlsRef = useRef({ left: false, right: false, jump: false });
  
  const playerRef = useRef({
    x: 50,
    y: 400,
    vx: 0,
    vy: 0,
    width: 60,
    height: 60,
    onGround: false,
    facingRight: true,
    walkAnim: 0,
    jumpAnim: 0,
    jumpsLeft: 2,
    jumpCount: 0,
    wingsActive: false,
    wingsTimer: 0,
    checkpointX: 50,
    checkpointY: 400
  });

  const particlesRef = useRef<{x: number, y: number, vx: number, vy: number, life: number, color: string}[]>([]);
  const keysRef = useRef<Record<string, boolean>>({});
  const petImageRef = useRef<HTMLImageElement | null>(null);
  const platformsRef = useRef<Platform[]>([]);
  const hazardsRef = useRef<any[]>([]);
  const cameraXRef = useRef(0);

  useEffect(() => {
    const originalLevel = GAME_LEVELS[currentLevelIdx];
    if (originalLevel) {
      platformsRef.current = JSON.parse(JSON.stringify(originalLevel.platforms));
      hazardsRef.current = originalLevel.hazards || [];
      
      // Reset Player for new level
      const player = playerRef.current;
      player.x = 50;
      player.y = 400;
      player.vx = 0;
      player.vy = 0;
      player.checkpointX = 50;
      player.checkpointY = 400;
      cameraXRef.current = 0;
    }
  }, [currentLevelIdx]);

  useEffect(() => {
    const img = new Image();
    img.src = pet.imageUrl || '';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      petImageRef.current = img;
    };
  }, [pet.imageUrl]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        // Maintain 1000:600 aspect ratio
        const height = (width / 1000) * 600;
        setCanvasSize({ width, height });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysRef.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const level = GAME_LEVELS[currentLevelIdx];
    if (!level) return;
    const coins = [...level.coins];

    const update = () => {
      if (gameState !== 'PLAYING' || levelTransitionRef.current) return;

      const player = playerRef.current;
      const platforms = platformsRef.current;

      // Update Moving Platforms
      platforms.forEach(p => {
        if (p.isMoving) {
          const oldX = p.x;
          const oldY = p.y;
          
          p.progress = (p.progress || 0) + (p.speed || 0.01) * (p.moveDir || 1);
          if (p.progress >= 1) { p.progress = 1; p.moveDir = -1; }
          if (p.progress <= 0) { p.progress = 0; p.moveDir = 1; }
          
          p.x = p.startX! + (p.endX! - p.startX!) * p.progress;
          p.y = p.startY! + (p.endY! - p.startY!) * p.progress;
          
          // If player is on this platform, move them with it
          // We check if player was on top of the platform in the previous frame
          if (player.onGround && Math.abs(player.y + player.height - oldY) < 2 && player.x + player.width > oldX && player.x < oldX + p.w) {
            player.x += (p.x - oldX);
            player.y = p.y - player.height;
          }
        }
      });

      // Input
      const left = keysRef.current['ArrowLeft'] || keysRef.current['KeyA'] || touchControlsRef.current.left;
      const right = keysRef.current['ArrowRight'] || keysRef.current['KeyD'] || touchControlsRef.current.right;
      const jump = keysRef.current['ArrowUp'] || keysRef.current['Space'] || keysRef.current['KeyW'] || touchControlsRef.current.jump;

      if (left) {
        player.vx = -5;
        player.facingRight = false;
      } else if (right) {
        player.vx = 5;
        player.facingRight = true;
      } else {
        player.vx *= 0.8;
      }

      // Handle Jump with Debounce/State
      if (jump && !keysRef.current['jumpPressed']) {
        if (player.onGround || player.jumpsLeft > 0 || player.wingsActive) {
          player.vy = -14;
          player.onGround = false;
          
          if (!player.wingsActive) {
            player.jumpsLeft--;
            player.jumpCount++;
            
            // Every 3 jumps, activate wings
            if (player.jumpCount >= 3) {
              player.wingsActive = true;
              player.wingsTimer = 120; // Approx 2 seconds of flight at 60fps
              player.jumpCount = 0;
            }
          } else {
            // Flight logic: consume wings timer faster when jumping
            player.wingsTimer -= 20;
          }
          
          player.jumpAnim = 1;
          keysRef.current['jumpPressed'] = true;
          soundService.playJump();
        }
      }
      if (!jump) {
        keysRef.current['jumpPressed'] = false;
      }

      // Wings timer decay
      if (player.wingsActive) {
        player.wingsTimer--;
        if (player.wingsTimer <= 0) {
          player.wingsActive = false;
          player.jumpsLeft = 0; // Fall after wings expire
        }
      }

      // Update Animations
      if (player.onGround && Math.abs(player.vx) > 0.1) {
        player.walkAnim += 0.15;
      } else {
        player.walkAnim = 0;
      }
      
      if (player.jumpAnim > 0) {
        player.jumpAnim -= 0.05;
      }

      // Element Particles
      if (Math.random() < 0.3) {
        const colors: Record<string, string> = {
          'Fuego': '#f87171',
          'Agua': '#60a5fa',
          'Tierra': '#a8a29e',
          'Aire': '#f1f5f9',
          'Rayo': '#fbbf24'
        };
        particlesRef.current.push({
          x: player.x + player.width / 2 + (Math.random() - 0.5) * 20,
          y: player.y + player.height / 2 + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 1.0,
          color: colors[pet.element] || '#fff'
        });
      }
      
      particlesRef.current.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        if (p.life <= 0) particlesRef.current.splice(i, 1);
      });

      // Gravity
      player.vy += 0.8;
      player.x += player.vx;
      player.y += player.vy;

      // Collision with platforms
      player.onGround = false;
      platforms.forEach(p => {
        if (
          player.x < p.x + p.w &&
          player.x + player.width > p.x &&
          player.y < p.y + p.h &&
          player.y + player.height > p.y
        ) {
          // Simple collision resolution
          if (player.vy > 0 && player.y + player.height - player.vy <= p.y + 5) {
            player.y = p.y - player.height;
            player.vy = 0;
            player.onGround = true;
            player.jumpsLeft = 2; // Reset jumps
            
            // Update Checkpoint
            player.checkpointX = player.x;
            player.checkpointY = player.y;
          } else if (player.vy < 0 && player.y - player.vy >= p.y + p.h - 5) {
            player.y = p.y + p.h;
            player.vy = 0;
          }
        }
      });

      // Collision with hazards (spikes)
      const hazards = hazardsRef.current;
      hazards.forEach(h => {
        if (
          player.x < h.x + h.w &&
          player.x + player.width > h.x &&
          player.y < h.y + h.h &&
          player.y + player.height > h.y
        ) {
          // Lose a life and respawn at the last checkpoint
          setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              setGameState('GAMEOVER');
              return 0;
            }
            return newLives;
          });
          
          player.x = player.checkpointX;
          player.y = player.checkpointY;
          player.vx = 0;
          player.vy = 0;
          soundService.playJump(); // Use jump sound as a "hit" sound for now
        }
      });

      // Collision with coins
      for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i];
        const dx = (player.x + player.width / 2) - c.x;
        const dy = (player.y + player.height / 2) - c.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 30) {
          coins.splice(i, 1);
          setScore(s => s + 10);
          soundService.playCoin();
        }
      }

      // Check Goal
      const g = level.goal;
      const dx = (player.x + player.width / 2) - g.x;
      const dy = (player.y + player.height / 2) - g.y;
      if (Math.sqrt(dx * dx + dy * dy) < 50 && !levelTransitionRef.current) {
        soundService.playWin();
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FF595E', '#1982C4', '#8AC926', '#FFCA3A', '#6A4C93']
        });
        
        if (onLevelComplete) {
          onLevelComplete(currentLevelIdx);
        }
        
        if (currentLevelIdx < GAME_LEVELS.length - 1) {
          setGameState('LEVEL_COMPLETE');
        } else {
          setGameState('WIN');
        }
      }

      // Fall off
      if (player.y > canvas.height + 100) {
        // Lose a life and respawn at checkpoint
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            setGameState('GAMEOVER');
            return 0;
          }
          return newLives;
        });

        player.x = player.checkpointX;
        player.y = player.checkpointY;
        player.vx = 0;
        player.vy = 0;
        soundService.playJump();
      }

      // Update Camera
      const targetCameraX = Math.max(0, player.x - canvas.width / 2 + player.width / 2);
      // Smooth camera movement
      cameraXRef.current += (targetCameraX - cameraXRef.current) * 0.1;
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const level = GAME_LEVELS[currentLevelIdx];
      if (!level) return;

      // Theme Configuration
      const themes: Record<string, any> = {
        'bg-emerald-50': { bg: '#ecfdf5', platform: '#065f46', top: '#10b981', accent: '#059669', deco: '🌲' },
        'bg-sky-50': { bg: '#f0f9ff', platform: '#075985', top: '#38bdf8', accent: '#0ea5e9', deco: '☁️' },
        'bg-orange-50': { bg: '#fff7ed', platform: '#9a3412', top: '#fb923c', accent: '#f97316', deco: '🌵' },
        'bg-indigo-50': { bg: '#0f172a', platform: '#1e1b4b', top: '#818cf8', accent: '#6366f1', deco: '⭐' },
        'bg-pink-50': { bg: '#fdf2f8', platform: '#831843', top: '#f472b6', accent: '#ec4899', deco: '🍭' }
      };
      const theme = themes[level.background] || themes['bg-sky-50'];

      // Draw Background
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Parallax Background Elements
      ctx.save();
      ctx.translate(-cameraXRef.current * 0.2, 0);
      ctx.font = '40px serif';
      for (let i = 0; i < 15; i++) {
        const x = (i * 500) % (canvas.width * 10);
        const y = 100 + (i * 80) % 300;
        ctx.globalAlpha = 0.3;
        ctx.fillText(theme.deco, x, y);
      }
      ctx.restore();

      // --- START CAMERA ---
      ctx.save();
      ctx.translate(-cameraXRef.current, 0);

      // Draw Platforms
      const platforms = platformsRef.current;
      platforms.forEach(p => {
        // Platform Body
        ctx.fillStyle = theme.platform;
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.w, p.h, 8);
        ctx.fill();
        
        // Platform Top (Grass/Surface)
        ctx.fillStyle = theme.top;
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.w, 12, { tl: 8, tr: 8, bl: 0, br: 0 });
        ctx.fill();

        // Moving platform indicator
        if (p.isMoving) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(p.x - 2, p.y - 2, p.w + 4, p.h + 4);
          ctx.setLineDash([]);
        }
      });

      // Draw Hazards (Spikes)
      const hazards = hazardsRef.current;
      hazards.forEach(h => {
        if (h.type === 'spike') {
          ctx.fillStyle = '#ef4444'; // Red spikes
          ctx.beginPath();
          ctx.moveTo(h.x, h.y + h.h);
          ctx.lineTo(h.x + h.w / 2, h.y);
          ctx.lineTo(h.x + h.w, h.y + h.h);
          ctx.closePath();
          ctx.fill();
          
          // Spike detail
          ctx.strokeStyle = '#b91c1c';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      // Draw Coins (Magical Orbs)
      coins.forEach(c => {
        const pulse = Math.sin(Date.now() / 200) * 3;
        const gradient = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, 12 + pulse);
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(0.5, '#fbbf24');
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 15 + pulse, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Goal (Magic Portal)
      const g = level.goal;
      const portalPulse = Math.sin(Date.now() / 400) * 10;
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(Date.now() / 1000);
      
      const portalGradient = ctx.createRadialGradient(0, 0, 10, 0, 0, 50 + portalPulse);
      portalGradient.addColorStop(0, theme.top);
      portalGradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = portalGradient;
      ctx.beginPath();
      ctx.ellipse(0, 0, 40 + portalPulse, 60 + portalPulse, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      
      ctx.font = '40px serif';
      ctx.textAlign = 'center';
      ctx.fillText('✨', g.x, g.y + 15);

      // Draw Particles
      particlesRef.current.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      // Draw Player
      const player = playerRef.current;
      
      // Shadow
      if (player.onGround) {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(player.x + player.width / 2, player.y + player.height, 20, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      if (petImageRef.current) {
        const bob = Math.sin(player.walkAnim) * 5;
        const stretch = player.jumpAnim * 15;
        
        ctx.save();
        ctx.translate(player.x + player.width / 2, player.y + player.height / 2 + bob);
        
        if (!player.facingRight) {
          ctx.scale(-1, 1);
        }
        
        // Squash and stretch
        const drawW = player.width - stretch;
        const drawH = player.height + stretch;

        // Draw Legs
        const legY = drawH / 2 - 5;
        const legXOffset = 12;
        const legMove = Math.sin(player.walkAnim * 2) * 10;
        
        const legGrad = ctx.createLinearGradient(0, legY, 0, legY + 15);
        legGrad.addColorStop(0, theme.accent);
        legGrad.addColorStop(1, theme.top);
        ctx.fillStyle = legGrad;

        // Back leg
        ctx.save();
        ctx.translate(-legXOffset + legMove, legY);
        ctx.rotate(Math.sin(player.walkAnim * 2) * 0.2);
        ctx.beginPath();
        ctx.roundRect(-5, 0, 10, 15, 5);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.stroke();
        ctx.restore();

        // Front leg
        ctx.save();
        ctx.translate(legXOffset - legMove, legY);
        ctx.rotate(-Math.sin(player.walkAnim * 2) * 0.2);
        ctx.beginPath();
        ctx.roundRect(-5, 0, 10, 15, 5);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.stroke();
        ctx.restore();

        // Draw Arms
        const armY = 0;
        const armXOffset = 25;
        const armMove = Math.cos(player.walkAnim * 2) * 8;
        
        const armGrad = ctx.createLinearGradient(0, armY, 0, armY + 15);
        armGrad.addColorStop(0, theme.accent);
        armGrad.addColorStop(1, theme.top);
        ctx.fillStyle = armGrad;

        // Back arm
        ctx.save();
        ctx.translate(-armXOffset, armY + armMove);
        ctx.rotate(Math.cos(player.walkAnim * 2) * 0.3);
        ctx.beginPath();
        ctx.roundRect(-4, 0, 8, 18, 4);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.stroke();
        ctx.restore();

        // Front arm
        ctx.save();
        ctx.translate(armXOffset, armY - armMove);
        ctx.rotate(-Math.cos(player.walkAnim * 2) * 0.3);
        ctx.beginPath();
        ctx.roundRect(-4, 0, 8, 18, 4);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.stroke();
        ctx.restore();

        // Draw Wings if active
        if (player.wingsActive) {
          const wingFlap = Math.sin(Date.now() / 100) * 20;
          
          // Wing Gradient
          const wingGrad = ctx.createLinearGradient(0, -20, 0, 20);
          wingGrad.addColorStop(0, '#fff');
          wingGrad.addColorStop(1, '#e0f2fe');
          ctx.fillStyle = wingGrad;
          ctx.globalAlpha = 0.9;
          
          // Left Wing
          ctx.save();
          ctx.translate(-25, -10);
          ctx.rotate((-30 + wingFlap) * Math.PI / 180);
          ctx.beginPath();
          ctx.ellipse(0, 0, 35, 18, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#bae6fd';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
          
          // Right Wing
          ctx.save();
          ctx.translate(25, -10);
          ctx.rotate((30 - wingFlap) * Math.PI / 180);
          ctx.beginPath();
          ctx.ellipse(0, 0, 35, 18, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#bae6fd';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
          
          ctx.globalAlpha = 1.0;
        }

        // Player Glow
        const glowGradient = ctx.createRadialGradient(0, 0, 10, 0, 0, 50);
        glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        glowGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(0, 0, 50, 0, Math.PI * 2);
        ctx.fill();

        // Body with 3D Shading
        const bodyGrad = ctx.createRadialGradient(-10, -10, 5, 0, 0, 40);
        bodyGrad.addColorStop(0, '#ffffff');
        bodyGrad.addColorStop(1, '#f3f4f6');
        ctx.fillStyle = bodyGrad;
        
        // Ears
        ctx.fillStyle = '#f3f4f6';
        ctx.beginPath();
        ctx.arc(-15, -drawH/2, 8, 0, Math.PI * 2);
        ctx.arc(15, -drawH/2, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.05)';
        ctx.stroke();

        ctx.beginPath();
        ctx.roundRect(-drawW/2, -drawH/2, drawW, drawH, 25);
        ctx.fill();
        
        // Specular Highlight (Plastic Look)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.ellipse(-15, -15, 8, 4, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Soft Shadow at bottom of body
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        ctx.beginPath();
        ctx.ellipse(0, drawH/2 - 5, drawW/2 - 5, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Face (Eyes and Mouth) - More "3D Toy" style
        // Rosy Cheeks
        ctx.fillStyle = 'rgba(255, 182, 193, 0.4)';
        ctx.beginPath();
        ctx.arc(-18, 0, 6, 0, Math.PI * 2);
        ctx.arc(18, 0, 6, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#1f2937';
        ctx.beginPath();
        ctx.ellipse(-12, -8, 5, 7, 0, 0, Math.PI * 2);
        ctx.ellipse(12, -8, 5, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye Highlights
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-14, -11, 2, 0, Math.PI * 2);
        ctx.arc(10, -11, 2, 0, Math.PI * 2);
        ctx.fill();

        // Nose
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.ellipse(0, -2, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Mouth
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 5, 6, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();

        // Pet Image as "Badge/Heart"
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, -20, 22, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(petImageRef.current, -22, -42, 44, 44);
        ctx.restore();
        
        // Badge Border with Gradient
        const badgeGrad = ctx.createLinearGradient(0, -42, 0, 2);
        badgeGrad.addColorStop(0, theme.top);
        badgeGrad.addColorStop(1, theme.accent);
        ctx.strokeStyle = badgeGrad;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, -20, 22, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
      } else {
        ctx.fillStyle = theme.accent;
        ctx.beginPath();
        ctx.roundRect(player.x, player.y, player.width, player.height, 15);
        ctx.fill();
      }

      ctx.restore();
      // --- END CAMERA ---

      // --- DRAW UI ON CANVAS ---
      // Level Info
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.roundRect(20, 20, 220, 50, 25);
      ctx.fill();
      ctx.fillStyle = '#4338ca';
      ctx.font = 'bold 24px Nunito';
      ctx.textAlign = 'left';
      ctx.fillText(`NIVEL: ${currentLevelIdx + 1}/${GAME_LEVELS.length}`, 40, 53);

      // Coin Counter
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.roundRect(canvas.width - 200, 20, 180, 50, 25);
      ctx.fill();
      ctx.fillStyle = '#db2777';
      ctx.font = 'bold 24px Nunito';
      ctx.textAlign = 'right';
      ctx.fillText(`🪙 ${score}`, canvas.width - 40, 53);

      // Progress Bar
      const progressWidth = 400;
      const progressX = (canvas.width - progressWidth) / 2;
      const progress = Math.min(1, Math.max(0, player.x / level.goal.x));
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.roundRect(progressX, 25, progressWidth, 20, 10);
      ctx.fill();
      
      const barGrad = ctx.createLinearGradient(progressX, 0, progressX + progressWidth, 0);
      barGrad.addColorStop(0, '#818cf8');
      barGrad.addColorStop(1, '#4f46e5');
      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(progressX, 25, progressWidth * progress, 20, 10);
      ctx.fill();
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = 'bold 10px Nunito';
      ctx.textAlign = 'center';
      ctx.fillText('PROGRESO', canvas.width / 2, 39);

      // Draw Hearts (Lives)
      const heartX = 20;
      const heartY = 20;
      for (let i = 0; i < 3; i++) {
        ctx.font = '24px serif';
        ctx.globalAlpha = i < lives ? 1.0 : 0.3;
        ctx.fillText('❤️', heartX + i * 35, heartY + 15);
      }
      ctx.globalAlpha = 1.0;

      // Draw level transition overlay
      if (levelTransition) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#6366f1';
        ctx.font = 'bold 80px Nunito';
        ctx.textAlign = 'center';
        ctx.fillText(`¡NIVEL ${currentLevelIdx + 1} COMPLETADO!`, canvas.width / 2, canvas.height / 2);
      }

      update();
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animationFrameId);
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [currentLevelIdx, gameState, levelTransition]);

  const resetLevel = () => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    levelTransitionRef.current = false;
    setLevelTransition(false);
    cameraXRef.current = 0;
    
    // Reset platforms to initial state
    const originalLevel = GAME_LEVELS[currentLevelIdx];
    if (originalLevel) {
      platformsRef.current = JSON.parse(JSON.stringify(originalLevel.platforms));
      hazardsRef.current = originalLevel.hazards || [];
    }

    playerRef.current = {
      x: 50,
      y: 400,
      vx: 0,
      vy: 0,
      width: 60,
      height: 60,
      onGround: false,
      facingRight: true,
      walkAnim: 0,
      jumpAnim: 0,
      jumpsLeft: 2,
      jumpCount: 0,
      wingsActive: false,
      wingsTimer: 0,
      checkpointX: 50,
      checkpointY: 400
    };
    particlesRef.current = [];
    setLives(3);
    setGameState('PLAYING');
  };

  const watchAdAndContinue = () => {
    setIsWatchingAd(true);
    setTimeout(() => {
      setLives(3);
      setGameState('PLAYING');
      setIsWatchingAd(false);
    }, 2000);
  };

  const restartFromZero = () => {
    setCurrentLevelIdx(0);
    setLives(3);
    setScore(0);
    resetLevel();
  };

  const goToNextLevel = () => {
    setCurrentLevelIdx(prev => prev + 1);
    resetLevel();
  };

  const handleTouchStart = (btn: 'left' | 'right' | 'jump') => {
    touchControlsRef.current[btn] = true;
  };

  const handleTouchEnd = (btn: 'left' | 'right' | 'jump') => {
    touchControlsRef.current[btn] = false;
  };

  return (
    <div className="flex flex-col items-center gap-2 p-2 md:p-4 bg-white/80 backdrop-blur-xl rounded-[2rem] md:rounded-[3rem] shadow-2xl border-4 border-indigo-100 w-full max-h-[85vh] overflow-hidden">
      <div ref={containerRef} className="relative w-full overflow-hidden flex-1">
        <canvas 
          ref={canvasRef} 
          width={1000} 
          height={600} 
          style={{ width: '100%', height: 'auto', maxHeight: '60vh', objectFit: 'contain' }}
          className="bg-sky-50 rounded-[1.5rem] md:rounded-[2rem] shadow-inner border-4 md:border-8 border-white"
        />
        
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md rounded-[1.5rem] md:rounded-[2rem] flex flex-col items-center justify-center text-white p-6 text-center">
            {isWatchingAd ? (
              <div className="flex flex-col items-center gap-6">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-2xl font-black animate-pulse">Viendo anuncio para revivir...</p>
              </div>
            ) : (
              <>
                <h2 className="text-5xl md:text-8xl font-black mb-2 text-red-500">¡SIN VIDAS! 💔</h2>
                <p className="text-xl md:text-2xl mb-8 font-bold text-gray-300">¿Quieres continuar o empezar de nuevo?</p>
                
            <div className="flex flex-col gap-4 w-full max-w-md">
              <MagicButton 
                onClick={watchAdAndContinue} 
                variant="primary"
                className="w-full text-xl md:text-2xl py-4 flex items-center justify-center gap-3"
              >
                <span>📺</span> VER ANUNCIO (+3 ❤️)
              </MagicButton>
              
              <MagicButton 
                onClick={restartFromZero} 
                variant="accent"
                className="w-full text-xl md:text-2xl py-4 flex items-center justify-center gap-3"
              >
                <span>🔄</span> REINICIAR TODO
              </MagicButton>

              <button 
                onClick={onExit} 
                className="text-gray-400 hover:text-white transition-colors font-bold uppercase tracking-widest mt-4"
              >
                Salir al Menú
              </button>
            </div>
              </>
            )}
          </div>
        )}

        {gameState === 'LEVEL_COMPLETE' && (
          <div className="absolute inset-0 bg-indigo-600/90 backdrop-blur-md rounded-[1.5rem] md:rounded-[2rem] flex flex-col items-center justify-center text-white p-4 md:p-10 text-center">
            <h2 className="text-xl sm:text-3xl md:text-6xl font-black mb-2 animate-pulse">¡NIVEL {currentLevelIdx + 1} COMPLETADO! 🌟</h2>
            <p className="text-sm sm:text-lg md:text-2xl mb-4 md:mb-10 font-bold">¡Lo has hecho genial! ¿Quieres seguir?</p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-6 w-full max-w-xs sm:max-w-none px-4 justify-center">
              <MagicButton onClick={onExit} variant="accent" className="px-6 md:px-10 py-2 md:py-4 text-lg md:text-2xl">MENÚ</MagicButton>
              <MagicButton onClick={goToNextLevel} variant="primary" className="px-8 md:px-12 py-3 md:py-6 text-xl md:text-3xl">SIGUIENTE 🚀</MagicButton>
            </div>
          </div>
        )}

        {gameState === 'WIN' && (
          <div className="absolute inset-0 bg-indigo-600/90 backdrop-blur-md rounded-[1.5rem] md:rounded-[2rem] flex flex-col items-center justify-center text-white p-6 text-center">
            <h2 className="text-4xl md:text-7xl font-black mb-4 animate-bounce">¡CAMPEÓN! 🏆</h2>
            <p className="text-xl md:text-3xl mb-8 md:mb-10 font-bold">Has completado todos los niveles mágicos</p>
            <MagicButton onClick={onExit} variant="primary" className="px-10 md:px-16 py-4 md:py-6 text-2xl md:text-3xl">VOLVER AL ÁLBUM</MagicButton>
          </div>
        )}
      </div>

      {isMobile && (
        <div className="flex justify-between w-full px-4 gap-4 mt-4">
          <div className="flex gap-4">
            <button 
              onPointerDown={() => handleTouchStart('left')}
              onPointerUp={() => handleTouchEnd('left')}
              onPointerLeave={() => handleTouchEnd('left')}
              className="w-20 h-20 bg-indigo-500 rounded-2xl flex items-center justify-center text-4xl shadow-lg active:scale-90 transition-all select-none touch-none"
            >
              ⬅️
            </button>
            <button 
              onPointerDown={() => handleTouchStart('right')}
              onPointerUp={() => handleTouchEnd('right')}
              onPointerLeave={() => handleTouchEnd('right')}
              className="w-20 h-20 bg-indigo-500 rounded-2xl flex items-center justify-center text-4xl shadow-lg active:scale-90 transition-all select-none touch-none"
            >
              ➡️
            </button>
          </div>
          <button 
            onPointerDown={() => handleTouchStart('jump')}
            onPointerUp={() => handleTouchEnd('jump')}
            onPointerLeave={() => handleTouchEnd('jump')}
            className="w-24 h-24 bg-pink-500 rounded-full flex items-center justify-center text-5xl shadow-lg active:scale-90 transition-all select-none touch-none"
          >
            ⬆️
          </button>
        </div>
      )}

      {!isMobile && (
        <div className="flex gap-10 text-indigo-300 font-bold text-xl uppercase tracking-widest">
          <span>⬅️ Izquierda</span>
          <span>➡️ Derecha</span>
          <span>⬆️ Saltar</span>
        </div>
      )}
    </div>
  );
};

export default PlatformerGame;
