import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, VolumeX, Download, X, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Recording } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InlineAudioPlayerProps {
  recording: Recording;
  audioUrl: string;
  onClose: () => void;
  onDownload?: () => void;
}

export function InlineAudioPlayer({ recording, audioUrl, onClose, onDownload }: InlineAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const waveformBars = useMemo(() => {
    return Array.from({ length: 60 }).map(() => Math.random() * 50 + 30);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error('Auto-play failed:', err);
      });
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setIsLoading(false);
      console.error('Audio loading error');
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.playbackRate = playbackRate;
    }
  }, [volume, isMuted, playbackRate]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className="bg-card/50 backdrop-blur-sm border-l-2 border-primary/40 rounded-md shadow-sm animate-in slide-in-from-bottom-2 duration-200"
      data-testid={`audio-player-${recording.id}`}
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <div className="p-2 space-y-1.5">
        {/* Minimal Header - Single Line */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Play/Pause Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePlayPause}
              disabled={isLoading}
              className="h-7 w-7 p-0 rounded-md flex-shrink-0"
              data-testid="button-play-pause"
            >
              {isLoading ? (
                <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />
              ) : isPlaying ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3 ml-0.5" />
              )}
            </Button>

            {/* Caller Info - Compact */}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate">
                {recording.phone}
              </div>
            </div>

            {/* Time Display - Inline */}
            <div className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5">
            {/* Playback Speed */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  data-testid="button-playback-rate"
                >
                  <Gauge className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[80px]">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                  <DropdownMenuItem
                    key={rate}
                    onClick={() => handlePlaybackRateChange(rate)}
                    className={cn(
                      "text-xs cursor-pointer",
                      playbackRate === rate && "bg-primary/10 font-semibold"
                    )}
                  >
                    {rate}x
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Volume */}
            <div 
              className="relative flex items-center"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="h-6 w-6 p-0"
                data-testid="button-toggle-mute"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-3 w-3" />
                ) : (
                  <Volume2 className="h-3 w-3" />
                )}
              </Button>
              
              <div 
                className={cn(
                  "absolute left-full ml-1 transition-all duration-200",
                  showVolumeSlider ? "opacity-100 w-16" : "opacity-0 w-0 pointer-events-none"
                )}
              >
                <div className="bg-popover/95 backdrop-blur-sm border rounded-md p-1.5 shadow-lg">
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    max={1}
                    step={0.01}
                    onValueChange={handleVolumeChange}
                    className="w-12"
                  />
                </div>
              </div>
            </div>

            {/* Download */}
            {onDownload && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDownload}
                className="h-6 w-6 p-0"
                data-testid="button-download-from-player"
              >
                <Download className="h-3 w-3" />
              </Button>
            )}

            {/* Close */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
              data-testid="button-close-player"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Slim Waveform Progress Bar */}
        <div className="relative h-8">
          <div className="h-full flex items-end gap-[1px]">
            {waveformBars.map((height, i) => {
              const isActive = (i / 60) * 100 < progress;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded-sm transition-colors duration-75",
                    isActive 
                      ? "bg-primary/80" 
                      : "bg-muted/40"
                  )}
                  style={{ height: `${height}%` }}
                />
              );
            })}
          </div>
          
          {/* Progress Slider Overlay */}
          <div className="absolute inset-0 flex items-center opacity-0 hover:opacity-100 transition-opacity">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="w-full cursor-pointer"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
