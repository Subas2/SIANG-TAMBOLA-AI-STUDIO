import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Game } from '../../types';
import { Timer, Trophy, Calendar, Clock, Info } from 'lucide-react';
import { GamePreviewBanner } from '../admin/GamePreviewBanner';

interface UpcomingGameCountdownProps {
  games: Game[];
}

const UpcomingGameCountdown: React.FC<UpcomingGameCountdownProps> = ({ games }) => {
  const [nextGame, setNextGame] = useState<Game | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    const findNextGame = () => {
      const now = new Date();
      const upcomingGames = games
        .filter(g => g.status === 'upcoming')
        .map(g => {
          const gameDate = new Date(`${g.date}T${g.time}`);
          return { ...g, fullDate: gameDate };
        })
        .filter(g => g.fullDate > now)
        .sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());

      if (upcomingGames.length > 0) {
        setNextGame(upcomingGames[0]);
      } else {
        setNextGame(null);
      }
    };

    findNextGame();
    const interval = setInterval(findNextGame, 60000); // Check for next game every minute
    return () => clearInterval(interval);
  }, [games]);

  useEffect(() => {
    if (!nextGame) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const gameTime = new Date(`${nextGame.date}T${nextGame.time}`).getTime();
      const difference = gameTime - now;

      if (difference <= 0) {
        setTimeLeft(null);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [nextGame]);

  if (!nextGame || !timeLeft) return null;

  // Map game.prizes to PrizeInfo[] for GamePreviewBanner
  const bannerPrizes = nextGame.prizes.map(p => ({
    name: p.name,
    value: String(p.value),
    enabled: true
  }));

  const bannerData = {
    title: nextGame.title,
    place: nextGame.place,
    subTitle: nextGame.subTitle,
    date: nextGame.date,
    time: nextGame.time,
    ticketPrice: nextGame.ticketPrice,
    ticketLimit: nextGame.ticketLimit,
    theme: nextGame.theme,
    bannerStyle: nextGame.bannerStyle || 'classic_gold',
    description: nextGame.description,
    backgroundImage: nextGame.backgroundImage,
    website: nextGame.website
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mb-6 relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-1 shadow-xl"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 rounded-xl bg-white/10 backdrop-blur-md p-4 md:p-6 text-white border border-white/20">
            {/* Left Side: Game Info */}
            <div className="flex items-center gap-4 flex-1">
              <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white shadow-inner">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center rounded-full bg-yellow-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-300 border border-yellow-400/30">
                    Next Game
                  </span>
                  <button 
                    onClick={() => setShowBanner(true)}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors text-white/80 hover:text-white"
                    title="View Game Banner"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  <h3 className="text-lg font-bold leading-none tracking-tight">
                    {nextGame.title}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-indigo-100 font-medium opacity-90">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{new Date(nextGame.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{nextGame.time}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Countdown */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <TimeUnit value={timeLeft.days} label="Days" />
                <span className="text-2xl font-bold text-white/50 mb-4">:</span>
                <TimeUnit value={timeLeft.hours} label="Hrs" />
                <span className="text-2xl font-bold text-white/50 mb-4">:</span>
                <TimeUnit value={timeLeft.minutes} label="Min" />
                <span className="text-2xl font-bold text-white/50 mb-4">:</span>
                <TimeUnit value={timeLeft.seconds} label="Sec" />
              </div>
              
              <div className="hidden lg:block ml-4 pl-4 border-l border-white/20">
                <div className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-1">Price</div>
                <div className="text-xl font-black text-white">₹{nextGame.ticketPrice}</div>
              </div>
            </div>
          </div>

          {/* Animated Progress Bar (Optional) */}
          <motion.div 
            className="absolute bottom-0 left-0 h-1 bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showBanner && (
          <GamePreviewBanner 
            gameData={bannerData}
            prizes={bannerPrizes}
            onClose={() => setShowBanner(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

const TimeUnit = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center min-w-[50px]">
    <div className="relative flex h-12 w-12 items-center justify-center rounded-lg bg-white/20 text-xl font-black shadow-lg backdrop-blur-sm border border-white/10">
      {value.toString().padStart(2, '0')}
    </div>
    <span className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-100 opacity-80">
      {label}
    </span>
  </div>
);

export default UpcomingGameCountdown;
