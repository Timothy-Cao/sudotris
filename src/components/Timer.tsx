'use client';

interface TimerProps {
  timeRemaining: number; // ms
}

export default function Timer({ timeRemaining }: TimerProps) {
  const totalSeconds = Math.max(0, Math.ceil(timeRemaining / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const display = `${minutes}:${String(seconds).padStart(2, '0')}`;
  const isLow = totalSeconds <= 30;

  return (
    <div className={`text-3xl font-mono font-bold ${isLow ? 'text-red-500' : 'text-white'}`}>
      {display}
    </div>
  );
}
