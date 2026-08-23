import { useState, useEffect } from "react";

export function getWeekendRemainingTime() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday

  // If not weekend, return null
  if (day !== 0 && day !== 6) {
    return null;
  }

  // Calculate milliseconds until Sunday 23:59:59.999
  const endOfSunday = new Date(now);
  const daysUntilSundayEnd = day === 6 ? 1 : 0;
  endOfSunday.setDate(now.getDate() + daysUntilSundayEnd);
  endOfSunday.setHours(23, 59, 59, 999);

  const diffMs = Math.max(0, endOfSunday.getTime() - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    isHotWeekend: true,
    totalSeconds,
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
}

interface HotWeekendBannerProps {
  compact?: boolean;
}

export function HotWeekendBanner({ compact = false }: HotWeekendBannerProps) {
  const [timeLeft, setTimeLeft] = useState(getWeekendRemainingTime);

  useEffect(() => {
    const update = () => {
      const remaining = getWeekendRemainingTime();
      setTimeLeft(remaining);
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!timeLeft || !timeLeft.isHotWeekend) {
    return null;
  }

  return (
    <section
      className={`mp-hot-weekend-banner ${compact ? "compact" : ""}`}
      aria-label="Evento Hot Weekend"
    >
      <div className="mp-hot-weekend-inner">
        <div className="mp-hot-weekend-left">
          <div className="mp-hot-weekend-flame-icon">🔥</div>
          <div className="mp-hot-weekend-info">
            <div className="mp-hot-weekend-title-row">
              <span className="mp-hot-weekend-badge">HOT WEEKEND</span>
              <strong className="mp-hot-weekend-title">
                {compact ? "¡Doble XP Activa!" : "¡Doble Experiencia Activa!"}
              </strong>
            </div>
            {!compact && (
              <p className="mp-hot-weekend-desc">
                Aprovecha el bono de <strong>doble experiencia</strong> al leer mangas y libros durante todo el fin de semana.
              </p>
            )}
            {compact && (
              <span className="mp-hot-weekend-compact-sub">
                Bono <strong>x2 XP</strong> en mangas y libros
              </span>
            )}
          </div>
        </div>

        <div className="mp-hot-weekend-right">
          <span className="mp-hot-weekend-countdown-label">TERMINA EN</span>
          <div className="mp-hot-weekend-timer">
            <div className="mp-timer-unit">
              <span className="mp-timer-val">{timeLeft.hours}</span>
              <span className="mp-timer-lbl">HRS</span>
            </div>
            <span className="mp-timer-sep">:</span>
            <div className="mp-timer-unit">
              <span className="mp-timer-val">{timeLeft.minutes}</span>
              <span className="mp-timer-lbl">MIN</span>
            </div>
            <span className="mp-timer-sep">:</span>
            <div className="mp-timer-unit">
              <span className="mp-timer-val">{timeLeft.seconds}</span>
              <span className="mp-timer-lbl">SEG</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
