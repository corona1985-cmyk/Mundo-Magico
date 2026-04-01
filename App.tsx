
import React, { useState, useEffect } from 'react';
import { AppState, MagicPet } from '@/types';
import { BASE_ANIMALS, ELEMENTS, LOADING_MESSAGES, COLORS_BY_NUMBER, GAME_LEVELS } from '@/constants';
import MagicButton from '@/components/MagicButton';
import ColorByNumber from '@/components/ColorByNumber';
import PlatformerGame from '@/components/PlatformerGame';
import { soundService } from '@/src/services/soundService';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, BookOpen } from 'lucide-react';

const SparkleTrail: React.FC = () => {
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const newSparkle = { id: Date.now(), x: e.clientX, y: e.clientY };
      setSparkles(prev => [...prev.slice(-15), newSparkle]);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      <AnimatePresence>
        {sparkles.map(s => (
          <motion.div
            key={s.id}
            initial={{ scale: 0, opacity: 1, rotate: 0 }}
            animate={{ scale: [1, 0.5, 0], opacity: 0, rotate: 180 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute text-2xl"
            style={{ left: s.x - 10, top: s.y - 10 }}
          >
            ✨
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const buildLocalStory = (pet: MagicPet): string => {
  const adventures = [
    `descubrio un bosque encantado donde todo brillaba con energia de ${pet.element.toLowerCase()}`,
    `ayudo a sus amigos con un hechizo secreto de ${pet.element.toLowerCase()}`,
    `encontro una puerta magica que solo se abre con valentia y alegria`,
  ];
  const randomAdventure = adventures[Math.floor(Math.random() * adventures.length)];
  return `Habia una vez ${pet.name}, un ${pet.baseAnimal} con poderes de ${pet.element}. Un dia ${randomAdventure}. Desde entonces, ${pet.name} cuida Mundo M. Crea tu mascota con una gran sonrisa.`;
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>('HOME');
  const [pet, setPet] = useState<MagicPet>({
    name: '',
    baseAnimal: '',
    element: '',
    personality: 'Feliz'
  });
  const [drawing, setDrawing] = useState<string>('');
  const [selectedNumber, setSelectedNumber] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [gallery, setGallery] = useState<MagicPet[]>(() => {
    const saved = localStorage.getItem('magic_gallery');
    return saved ? JSON.parse(saved) : [];
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interactionEmoji, setInteractionEmoji] = useState<string | null>(null);
  const [unlockedLevels, setUnlockedLevels] = useState<number[]>(() => {
    const saved = localStorage.getItem('unlocked_levels');
    return saved ? JSON.parse(saved) : [0]; // Level 1 (idx 0) is unlocked by default
  });
  const [selectedLevelIdx, setSelectedLevelIdx] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const toggleMute = () => {
    const muted = soundService.toggleMute();
    setIsMuted(muted);
  };

  const startMusic = () => {
    soundService.playMusic();
  };

  useEffect(() => {
    localStorage.setItem('magic_gallery', JSON.stringify(gallery));
  }, [gallery]);

  useEffect(() => {
    localStorage.setItem('unlocked_levels', JSON.stringify(unlockedLevels));
  }, [unlockedLevels]);

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingMsg(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [loading]);

  const handleCreatePet = async () => {
    if (!pet.name || !pet.baseAnimal || !pet.element || !drawing) {
      alert("¡Recuerda pintar todas las zonas y darle un nombre!");
      return;
    }

    setLoading(true);
    setLoadingMsg("¡Tu dibujo está cobrando vida!");
    
    // Use the colored drawing as the initial image so the game uses it
    const currentPet = { ...pet, imageUrl: drawing };
    setPet(currentPet);

    // Simulate a short magical transition without external services.
    await new Promise(resolve => setTimeout(resolve, 900));
    const finalPet = { ...currentPet, story: buildLocalStory(currentPet) };
    setPet(finalPet);
    setGallery(prev => [finalPet, ...prev]);
    setState('RESULT');
    setLoading(false);
  };

  const handleDownload = () => {
    if (!pet.imageUrl) return;
    const link = document.createElement('a');
    link.href = pet.imageUrl;
    link.download = `${pet.name}-magico.png`;
    link.click();
  };

  const handleSpeak = async () => {
    if (!pet.story || isSpeaking) return;
    if (!('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(pet.story);
    utterance.lang = 'es-ES';
    utterance.rate = 0.95;
    utterance.pitch = 1.1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const renderHome = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <div className="relative mb-4 md:mb-8 max-w-[min(100%,420px)] md:max-w-xl mx-auto float-animation">
        <img
          src="/logo-mundo-magico.png"
          alt="Mundo Mágico"
          className="w-full h-auto drop-shadow-2xl select-none"
          width={512}
          height={512}
          draggable={false}
        />
      </div>
      <p className="text-lg sm:text-2xl text-indigo-500 mb-8 md:mb-12 max-w-xl font-bold leading-tight">
        ¡Pinta tu dibujo real y observa cómo cobra vida en 3D!
      </p>
      <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
        <MagicButton onClick={() => setState('SELECT_TEMPLATE')} variant="primary" className="text-xl md:text-3xl px-8 md:px-16 py-4 md:py-8">
          ¡A CREAR! 🚀
        </MagicButton>
        {gallery.length > 0 && (
          <MagicButton onClick={() => setState('GALLERY')} variant="secondary" className="text-lg md:text-xl px-6 md:px-12">
            Mi Álbum 📸
          </MagicButton>
        )}
      </div>
    </div>
  );

  const renderSelectTemplate = () => (
    <div className="max-w-5xl mx-auto p-2 md:p-4 text-center animate-fade-in h-full flex flex-col justify-center">
      <h2 className="text-2xl sm:text-4xl font-black text-indigo-700 mb-4 md:mb-8 drop-shadow-sm uppercase">Escoge a tu nuevo amigo</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 overflow-y-auto pr-2 scrollbar-hide flex-1">
        {BASE_ANIMALS.map((animal) => (
          <button
            key={animal.id}
            onClick={() => {
              setPet({...pet, baseAnimal: animal.name});
              setState('CREATOR');
            }}
            className="group relative bg-white p-3 md:p-6 rounded-[1.5rem] md:rounded-[3rem] shadow-xl hover:scale-105 transition-all duration-300 border-b-[6px] md:border-b-[10px] border-indigo-100 flex flex-col items-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-5xl md:text-8xl block mb-2 md:mb-4 relative z-10 group-hover:rotate-12 transition-transform">{animal.icon}</span>
            <span className="text-lg md:text-2xl font-black text-indigo-600 uppercase relative z-10 tracking-widest">{animal.name}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderCreator = () => {
    const selectedAnimal = BASE_ANIMALS.find(a => a.name === pet.baseAnimal);
    
    return (
      <div className="max-w-5xl mx-auto p-3 md:p-6 bg-white/95 rounded-[2rem] md:rounded-[3rem] shadow-2xl border-4 border-indigo-100 max-h-full flex flex-col overflow-y-auto scrollbar-hide">
        <div className="flex flex-col gap-3 md:gap-6 min-h-full">
          <div className="flex justify-center shrink-0">
             <input 
                type="text"
                value={pet.name}
                onChange={(e) => setPet({...pet, name: e.target.value})}
                placeholder="Nombre..."
                className="text-lg md:text-3xl font-black text-center w-full max-w-md p-2 md:p-4 rounded-full border-4 border-indigo-50 focus:border-indigo-400 bg-indigo-50/30 outline-none transition-all placeholder:text-indigo-200"
             />
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-3 md:gap-8 flex-1">
            <div className="flex-1 w-full flex items-center justify-center min-h-0">
               <ColorByNumber 
                 animalId={selectedAnimal?.id || 'cat'} 
                 selectedNumber={selectedNumber}
                 onColored={setDrawing}
               />
            </div>

            <div className="w-full lg:w-48 flex flex-row lg:flex-col gap-2 md:gap-4 shrink-0 items-stretch">
               <div className="flex-1 bg-white p-2 md:p-4 rounded-[1.5rem] md:rounded-[2rem] shadow-xl border-2 border-indigo-50">
                  <p className="text-center font-black text-indigo-300 mb-1 md:mb-3 uppercase text-[10px] md:text-xs tracking-widest">Colores</p>
                  <div className="grid grid-cols-4 lg:grid-cols-2 gap-1 md:gap-2">
                    {COLORS_BY_NUMBER.map(c => (
                      <button
                        key={c.n}
                        onClick={() => setSelectedNumber(c.n)}
                        className={`
                          h-7 w-7 md:h-12 md:w-12 rounded-lg md:rounded-xl flex items-center justify-center text-xs md:text-xl font-black text-white shadow-lg transition-all
                          ${selectedNumber === c.n ? 'ring-2 md:ring-4 ring-indigo-200 scale-110 rotate-6' : 'opacity-80 hover:opacity-100 hover:scale-105'}
                        `}
                        style={{ backgroundColor: c.color }}
                      >
                        {c.n}
                      </button>
                    ))}
                  </div>
               </div>

               <div className="flex-1 bg-white p-2 md:p-4 rounded-[1.5rem] md:rounded-[2rem] shadow-xl border-2 border-pink-50 flex flex-col items-center">
                  <p className="text-center font-black text-pink-300 mb-1 md:mb-3 uppercase text-[10px] md:text-xs tracking-widest">Poder</p>
                  <div className="grid grid-cols-4 lg:grid-cols-2 gap-1 md:gap-2">
                    {ELEMENTS.map(el => (
                      <button
                        key={el.id}
                        onClick={() => setPet({...pet, element: el.name})}
                        className={`w-7 h-7 md:w-12 md:h-12 flex items-center justify-center rounded-full text-base md:text-2xl transition-all shadow-md ${pet.element === el.name ? 'bg-pink-400 text-white scale-110 -rotate-6 shadow-pink-200 ring-2 ring-pink-100' : 'bg-gray-50 grayscale hover:grayscale-0 hover:bg-pink-50'}`}
                      >
                        {el.icon}
                      </button>
                    ))}
                  </div>
               </div>
            </div>
          </div>

          <div className="flex flex-row justify-between items-center gap-4 pt-2 md:pt-4 border-t-4 border-indigo-50 shrink-0 mt-auto">
            <button onClick={() => setState('SELECT_TEMPLATE')} className="text-base md:text-2xl font-black text-indigo-300 hover:text-indigo-600 transition-colors uppercase tracking-widest">Atrás</button>
            <MagicButton onClick={handleCreatePet} variant="accent" className="text-lg md:text-3xl px-6 md:px-12 py-2 md:py-4 rounded-full">
              ¡MAGIA! ✨
            </MagicButton>
          </div>
        </div>
      </div>
    );
  };

  const renderResult = () => (
    <div className="max-w-2xl mx-auto p-4 md:p-8 bg-white rounded-[2rem] md:rounded-[4rem] shadow-2xl border-[6px] md:border-[10px] border-yellow-200 relative animate-fade-in h-full flex flex-col overflow-hidden">
      {interactionEmoji && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <span className="text-[6rem] md:text-[10rem] animate-ping opacity-60 drop-shadow-2xl">{interactionEmoji}</span>
        </div>
      )}
      
      <div className="relative mb-4 md:mb-8 shrink-0">
        <div className="absolute -top-4 -left-4 md:-top-8 md:-left-8 w-12 h-12 md:w-24 md:h-24 bg-indigo-500 rounded-full flex items-center justify-center text-2xl md:text-5xl shadow-2xl animate-bounce z-20">✨</div>
        <div className="overflow-hidden rounded-[1.5rem] md:rounded-[3rem] shadow-inner border-[4px] md:border-[6px] border-white ring-2 md:ring-4 ring-indigo-50 mx-auto max-w-[300px] md:max-w-[400px]">
           <img 
              src={pet.imageUrl} 
              alt={pet.name} 
              className={`w-full aspect-square object-cover transform transition-all duration-1000 ${interactionEmoji ? 'scale-110 rotate-3' : 'scale-100 hover:scale-105'}`}
           />
        </div>
      </div>
      
      <div className="text-center space-y-4 md:space-y-6 flex-1 overflow-y-auto scrollbar-hide">
        <h2 className="text-3xl md:text-6xl font-black text-indigo-700 tracking-tighter drop-shadow-xl uppercase">{pet.name}</h2>
        
        <div className="bg-indigo-50 p-4 md:p-8 rounded-[1.5rem] md:rounded-[3rem] text-lg md:text-2xl text-indigo-900 leading-relaxed relative border-2 border-indigo-100 shadow-inner group">
          <button 
            onClick={handleSpeak}
            className={`absolute -top-6 -right-2 md:-top-10 md:-right-6 w-12 h-12 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-2xl transition-all ${isSpeaking ? 'bg-pink-600 scale-110 text-white animate-pulse' : 'bg-white text-2xl md:text-4xl hover:scale-110 active:scale-90 border-2 border-indigo-100'}`}
          >
            {isSpeaking ? '🔊' : '🗣️'}
          </button>
          <p className="italic">"{pet.story}"</p>
        </div>

        <div className="flex gap-3 md:gap-6 justify-center">
          {[
            {e: '🍪', c: 'bg-orange-100 hover:bg-orange-200'}, 
            {e: '🎾', c: 'bg-green-100 hover:bg-green-200'}, 
            {e: '❤️', c: 'bg-red-100 hover:bg-red-200'}
          ].map(item => (
            <button 
              key={item.e}
              onClick={() => {
                setInteractionEmoji(item.e);
                setTimeout(() => setInteractionEmoji(null), 1500);
              }} 
              className={`${item.c} p-4 md:p-6 rounded-full text-3xl md:text-5xl hover:scale-110 active:scale-90 transition-all shadow-xl border-2 border-white`}
            >
              {item.e}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-4">
          <MagicButton onClick={() => setState('SELECT_TEMPLATE')} variant="secondary" className="flex-1 text-lg md:text-2xl py-3 md:py-6">
            Hacer Otro 🎨
          </MagicButton>
          <MagicButton onClick={handleDownload} variant="primary" className="flex-1 text-lg md:text-2xl py-3 md:py-6">
            Descargar 📸
          </MagicButton>
        </div>
      </div>
    </div>
  );

  const renderGallery = () => (
    <div className="max-w-7xl mx-auto p-2 md:p-4 animate-fade-in h-full flex flex-col overflow-hidden">
      <div className="flex flex-row justify-between items-center mb-4 md:mb-8 gap-4 shrink-0">
        <h2 className="text-2xl md:text-5xl font-black text-indigo-700 tracking-tighter drop-shadow-xl uppercase">MI ÁLBUM MÁGICO</h2>
        <MagicButton onClick={() => setState('SELECT_TEMPLATE')} variant="primary" className="text-sm md:text-xl px-4 md:px-8 py-2 md:py-4">
          + Nuevo Amigo
        </MagicButton>
      </div>

      {gallery.length === 0 ? (
        <div className="text-center py-8 md:py-16 bg-white/50 rounded-[1.5rem] md:rounded-[3rem] border-4 border-dashed border-indigo-200 flex-1 flex flex-col justify-center">
           <span className="text-5xl md:text-8xl mb-4 md:mb-6 block opacity-50">🖼️</span>
           <p className="text-xl md:text-3xl font-black text-indigo-300">¡Aún no tienes amigos!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8 overflow-y-auto pr-2 scrollbar-hide flex-1">
          {gallery.map((p, idx) => (
            <div 
              key={idx} 
              className="bg-white p-3 md:p-6 rounded-[1.5rem] md:rounded-[3rem] shadow-xl hover:scale-105 transition-all cursor-pointer group border-b-[6px] md:border-b-[12px] border-indigo-100 flex flex-col" 
              onClick={() => { setPet(p); setState('RESULT'); }}
            >
              <div className="overflow-hidden rounded-[1rem] md:rounded-[2rem] mb-3 md:mb-6 aspect-square shadow-inner border-2 border-indigo-50">
                <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
              </div>
              <h3 className="text-lg md:text-2xl font-black text-indigo-700 text-center uppercase tracking-tighter group-hover:text-pink-500 transition-colors truncate">{p.name}</h3>
              <p className="text-center text-xs md:text-sm font-bold text-indigo-300 mt-1 mb-2 md:mb-4">{p.baseAnimal} de {p.element}</p>
              
              <MagicButton 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setPet(p); 
                  setState('LEVEL_SELECT'); 
                }} 
                variant="accent" 
                className="w-full text-xs md:text-base py-2 md:py-3 rounded-[1rem] md:rounded-[1.5rem] mt-auto"
              >
                ¡JUGAR! 🎮
              </MagicButton>
            </div>
          ))}
        </div>
      )}
      
      <button onClick={() => setState('HOME')} className="mt-4 md:mt-8 block mx-auto text-lg md:text-2xl font-black text-indigo-200 hover:text-indigo-600 transition-colors uppercase tracking-widest shrink-0">← Volver al Inicio</button>
    </div>
  );

  const renderLevelSelect = () => (
    <div className="max-w-5xl mx-auto p-2 md:p-4 text-center animate-fade-in h-full flex flex-col overflow-hidden">
      <div className="flex flex-row justify-between items-center mb-4 md:mb-8 gap-4 shrink-0">
        <h2 className="text-2xl md:text-5xl font-black text-indigo-700 tracking-tighter drop-shadow-xl uppercase">Escoge un Nivel</h2>
        <MagicButton onClick={() => setState('GALLERY')} variant="secondary" className="text-sm md:text-xl px-4 md:px-8 py-2 md:py-4">
          Atrás 🏠
        </MagicButton>
      </div>
      
      <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-4 overflow-y-auto pr-2 scrollbar-hide flex-1">
        {GAME_LEVELS.map((level, idx) => {
          const isUnlocked = unlockedLevels.includes(idx);
          return (
            <button
              key={level.id}
              disabled={!isUnlocked}
              onClick={() => {
                setSelectedLevelIdx(idx);
                setState('GAME');
              }}
              className={`
                relative h-16 md:h-24 rounded-[1rem] md:rounded-[1.5rem] flex flex-col items-center justify-center transition-all duration-300
                ${isUnlocked 
                  ? 'bg-white shadow-lg hover:scale-110 hover:bg-indigo-50 border-b-2 md:border-b-4 border-indigo-100 cursor-pointer' 
                  : 'bg-gray-100 opacity-50 cursor-not-allowed border-b-2 md:border-b-4 border-gray-200'}
              `}
            >
              {!isUnlocked && <span className="absolute top-1 right-1 md:top-2 md:right-2 text-xs md:text-sm">🔒</span>}
              <span className={`text-xl md:text-3xl font-black ${isUnlocked ? 'text-indigo-600' : 'text-gray-400'}`}>{level.id}</span>
              <span className={`text-[8px] md:text-[10px] font-bold uppercase tracking-widest ${isUnlocked ? 'text-indigo-300' : 'text-gray-300'}`}>Nivel</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderGame = () => (
    <div className="max-w-full mx-auto p-1 md:p-4 animate-fade-in h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-2 md:mb-4 shrink-0">
        <h2 className="text-xl md:text-4xl font-black text-indigo-700 tracking-tighter drop-shadow-xl uppercase truncate max-w-[60%]">{pet.name}</h2>
        <MagicButton onClick={() => setState('LEVEL_SELECT')} variant="secondary" className="text-sm md:text-xl px-4 md:px-8 py-1 md:py-2">
          Salir 🏠
        </MagicButton>
      </div>
      <div className="flex-1 min-h-0">
        <PlatformerGame 
          pet={pet} 
          onExit={() => setState('LEVEL_SELECT')} 
          startLevelIdx={selectedLevelIdx}
          onLevelComplete={(idx) => {
            if (idx < GAME_LEVELS.length - 1) {
              setUnlockedLevels(prev => {
                if (prev.includes(idx + 1)) return prev;
                return [...prev, idx + 1];
              });
            }
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col magic-bg overflow-hidden">
      <SparkleTrail />
      <header className="p-2 md:p-4 flex justify-between items-center bg-white/60 backdrop-blur-3xl z-50 border-b-4 md:border-b-8 border-white shadow-lg shrink-0">
        <div className="text-2xl md:text-4xl font-black text-indigo-700 cursor-pointer flex items-center gap-2 md:gap-4 group" onClick={() => setState('HOME')}>
          <img
            src="/logo-mundo-magico.png"
            alt=""
            className="h-10 w-auto md:h-14 object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-300"
            draggable={false}
          />
          <span className="hidden sm:block tracking-tighter text-lg md:text-2xl">Crea tu mascota</span>
        </div>
        <div className="flex gap-2 md:gap-4">
          {gallery.length > 0 && (
            <button onClick={() => setState('GALLERY')} className="bg-white p-2 md:p-4 rounded-full shadow-2xl text-2xl md:text-4xl hover:scale-110 active:scale-90 transition-all border-2 md:border-4 border-indigo-50">🖼️</button>
          )}
          <button onClick={() => setState('HOME')} className="bg-white p-2 md:p-4 rounded-full shadow-2xl text-2xl md:text-4xl hover:scale-110 active:scale-90 transition-all border-2 md:border-4 border-indigo-50 flex items-center justify-center">
            <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-indigo-500" />
          </button>
          <button 
            onClick={toggleMute}
            className="bg-white p-2 md:p-4 rounded-full shadow-2xl text-2xl md:text-4xl hover:scale-110 active:scale-90 transition-all border-2 md:border-4 border-indigo-50 flex items-center justify-center"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-6 h-6 md:w-8 md:h-8 text-indigo-500" /> : <Volume2 className="w-6 h-6 md:w-8 md:h-8 text-indigo-500" />}
          </button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 md:px-6 py-4 relative z-10 overflow-y-auto scrollbar-hide" onClick={startMusic}>
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-80 h-80 relative flex items-center justify-center">
               <div className="absolute inset-0 border-x-[20px] border-indigo-600 rounded-full animate-spin"></div>
               <div className="absolute inset-6 border-y-[20px] border-pink-400 rounded-full animate-spin-slow"></div>
               <span className="text-[10rem] animate-bounce drop-shadow-2xl">✨</span>
            </div>
            <p className="mt-24 text-6xl font-black text-indigo-700 animate-pulse px-10 leading-tight drop-shadow-xl">{loadingMsg}</p>
          </div>
        ) : (
          <>
            {state === 'HOME' && renderHome()}
            {state === 'SELECT_TEMPLATE' && renderSelectTemplate()}
            {state === 'CREATOR' && renderCreator()}
            {state === 'RESULT' && renderResult()}
            {state === 'GALLERY' && renderGallery()}
            {state === 'LEVEL_SELECT' && renderLevelSelect()}
            {state === 'GAME' && renderGame()}
          </>
        )}
      </main>
    </div>
  );
};

export default App;
