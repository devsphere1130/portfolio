import { useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { formatDuration } from '../../lib/caseStudy';
import { Reveal, SectionHeader } from './Primitives';

const sameOrigin = (url) => {
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return true;
  }
};

/**
 * Play-to-load: nothing is downloaded (no <video> or <iframe> exists) until the visitor presses play.
 * Uploaded files use the browser's native, accessible controls; YouTube/Vimeo load their own player.
 */
export const VideoPlayer = ({ video, compact = false }) => {
  const [state, setState] = useState('idle'); // idle | loading | playing | error
  const [attempt, setAttempt] = useState(0);
  const duration = formatDuration(video.duration_seconds);
  const start = () => setState('loading');

  if (state === 'idle') {
    return (
      <div className="cs-player">
        <button type="button" className="cs-poster" onClick={start} aria-label={`Play video: ${video.title}${duration ? ` (${duration})` : ''}`}>
          {video.poster && <img src={video.poster.url} alt="" loading="lazy" decoding="async" />}
          <span className="cs-play" aria-hidden="true"><Play size={compact ? 22 : 28} fill="currentColor" /></span>
          {!video.poster && duration && <span className="cs-poster-fallback" aria-hidden="true"><span className="cs-counter">{duration}</span></span>}
        </button>
      </div>
    );
  }

  if (video.embed_url) {
    const src = `${video.embed_url}${video.embed_url.includes('?') ? '&' : '?'}autoplay=1`;
    return (
      <div className="cs-player">
        <iframe src={src} title={video.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      </div>
    );
  }

  const crossOrigin = video.captions && !sameOrigin(video.captions.src) ? 'anonymous' : undefined;
  return (
    <div className="cs-player">
      <video
        key={attempt}
        controls
        autoPlay
        playsInline
        preload="auto"
        poster={video.poster?.url}
        crossOrigin={crossOrigin}
        onPlaying={() => setState('playing')}
        onCanPlay={() => setState((s) => (s === 'loading' ? 'playing' : s))}
        onError={() => setState('error')}
        aria-label={video.title}
      >
        <source src={video.src} type={video.mime_type || 'video/mp4'} onError={() => setState('error')} />
        {video.captions && <track kind="captions" src={video.captions.src} srcLang={video.captions.language} label={video.captions.label} default />}
      </video>
      {state === 'loading' && <div className="cs-player-state" role="status"><span className="cs-spinner" aria-hidden="true" /><span>Loading video…</span></div>}
      {state === 'error' && (
        <div className="cs-player-state" role="alert">
          <span>This video couldn’t be played right now.</span>
          <button type="button" className="cs-link" onClick={() => { setAttempt((n) => n + 1); setState('loading'); }}>
            <RotateCcw size={16} aria-hidden="true" />Try again
          </button>
        </div>
      )}
    </div>
  );
};

export const ProjectVideoSection = ({ videos, index }) => {
  const [currentId, setCurrentId] = useState(videos[0].id);
  const current = videos.find((v) => v.id === currentId) || videos[0];
  const many = videos.length > 1;
  return (
    <section className="cs-section" aria-labelledby="cs-video-title">
      <div className="cs-shell">
        <SectionHeader id="cs-video-title" index={index} eyebrow="Demo" title="See it" highlight="in action." />
        <Reveal className={`cs-video-layout ${many ? 'has-list' : ''}`}>
          <div>
            <VideoPlayer key={current.id} video={current} />
          </div>
          <div className="cs-video-info">
            <h3>{current.title}</h3>
            {current.description && <p>{current.description}</p>}
            {many && (
              <ul className="cs-video-list" aria-label="Videos">
                {videos.map((video) => (
                  <li key={video.id}>
                    <button type="button" className="cs-video-pick" aria-pressed={video.id === current.id} onClick={() => setCurrentId(video.id)}>
                      {video.title}
                      {formatDuration(video.duration_seconds) && <span>{formatDuration(video.duration_seconds)}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
};
