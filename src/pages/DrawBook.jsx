import { useEffect, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import './DrawBook.css';
import initialCandidates from '../data/candidatos.json';
import { createWheelSounds } from '../utils/wheelSounds';
import tokens from '../theme/tokens.json';

const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = 150;
const MUTED_KEY = 'ruleta-silenciada';
// Segment colours keep white labels at 4.5:1 or more (WCAG AA).
const COLORS = tokens.wheel.segments;
const LABEL = tokens.wheel.text;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Angles are measured clockwise from the top, where the pointer is.
const polar = (angle, r) => {
  const rad = (angle * Math.PI) / 180;
  return [CENTER + r * Math.sin(rad), CENTER - r * Math.cos(rad)];
};

const segmentPath = (start, end) => {
  const [x1, y1] = polar(start, RADIUS);
  const [x2, y2] = polar(end, RADIUS);
  const large = end - start > 180 ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${large} 1 ${x2} ${y2} Z`;
};

const readMuted = () => {
  try {
    return localStorage.getItem(MUTED_KEY) === '1';
  } catch {
    return false;
  }
};

// Current rotation of an element, in degrees, read from its computed transform matrix.
const currentAngle = (element) => {
  const transform = getComputedStyle(element).transform;
  if (!transform || transform === 'none') return 0;
  const [a, b] = transform.match(/matrix\(([^)]+)\)/)[1].split(',').map(Number);
  return (Math.atan2(b, a) * 180) / Math.PI;
};

const shorten = (text, max) => (text.length > max ? text.slice(0, max - 1) + '…' : text);

const Wheel = ({ books, rotation, duration, animate, svgRef }) => {
  const step = 360 / books.length;
  const n = books.length;
  const fontSize = n <= 6 ? 12 : n <= 10 ? 10 : n <= 16 ? 8 : n <= 30 ? 6 : 4.5;
  const maxChars = n <= 8 ? 22 : n <= 16 ? 18 : n <= 30 ? 14 : 8;
  return (
    <div className='wheel-wrapper'>
      <div className='wheel-pointer' aria-hidden='true' />
      <svg
        ref={svgRef}
        className='wheel'
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: animate ? `transform ${duration}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)` : 'none',
        }}
        role='img'
        aria-label={'Ruleta con ' + books.length + ' libros'}
      >
        {books.map((book, i) => {
          const start = i * step;
          const center = start + step / 2;
          return (
            <g key={book.id}>
              <path d={segmentPath(start, start + step)} fill={COLORS[i % COLORS.length]} stroke={LABEL} strokeWidth='2' />
              <g transform={`rotate(${center - 90} ${CENTER} ${CENTER})`}>
                <text x={CENTER + RADIUS - 10} y={CENTER} textAnchor='end' dominantBaseline='middle' fill={LABEL} fontSize={fontSize}>
                  {shorten(book.titulo, maxChars)}
                </text>
              </g>
            </g>
          );
        })}
        <circle cx={CENTER} cy={CENTER} r='12' fill={LABEL} />
      </svg>
    </div>
  );
};

const DrawBook = () => {
  const [candidates, setCandidates] = useState(initialCandidates);
  const [remaining, setRemaining] = useState(initialCandidates);
  const [eliminated, setEliminated] = useState([]);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(readMuted);
  const timer = useRef(null);
  const frame = useRef(null);
  const svg = useRef(null);
  const sounds = useRef(null);
  if (!sounds.current) sounds.current = createWheelSounds();

  // Live refresh of the "Candidatos" tab; the build-time data is the fallback.
  useEffect(() => {
    let active = true;
    fetch('/.netlify/functions/books?tab=candidatos', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then((latest) => {
        if (active && Array.isArray(latest)) setCandidates(latest);
      })
      .catch((error) => console.warn('[candidatos] No se pudo actualizar:', error));
    return () => {
      active = false;
      clearTimeout(timer.current);
      cancelAnimationFrame(frame.current);
      sounds.current.close();
    };
  }, []);

  useEffect(() => {
    candidates.forEach((book) => {
      if (!book.imagen) return;
      const img = new Image();
      img.src = book.imagen;
    });
    // Do not change the wheel in the middle of a draw; Reiniciar picks up the new list.
    if (eliminated.length === 0 && !spinning) setRemaining(candidates);
  }, [candidates]);

  const newDraw = () => {
    clearTimeout(timer.current);
    cancelAnimationFrame(frame.current);
    setRemaining(candidates);
    setEliminated([]);
    setRotation(0);
    setAnimate(false);
    setSpinning(false);
  };

  if (candidates.length === 0) {
    return (
      <div className='content-center-straight draw-page'>
        <h1 className='page-title'>Sorteo del próximo libro</h1>
        <p className='card mx-auto max-w-md text-center'>Añade candidatos en la hoja Candidatos</p>
      </div>
    );
  }

  const winner = remaining.length === 1 ? remaining[0] : null;

  const toggleMuted = () => {
    const next = !muted;
    setMuted(next);
    try {
      localStorage.setItem(MUTED_KEY, next ? '1' : '0');
    } catch {
      // The preference just won't persist.
    }
  };

  // Tick each time a segment boundary passes the pointer while the wheel turns.
  const startTicks = (step) => {
    let lastSegment = null;
    let lastTick = 0;
    const loop = (now) => {
      if (svg.current) {
        const pointer = (((-currentAngle(svg.current)) % 360) + 360) % 360;
        const segment = Math.floor(pointer / step);
        if (lastSegment !== null && segment !== lastSegment && now - lastTick > 40) {
          sounds.current.tick();
          lastTick = now;
        }
        lastSegment = segment;
      }
      frame.current = requestAnimationFrame(loop);
    };
    frame.current = requestAnimationFrame(loop);
  };

  const spin = () => {
    if (spinning || remaining.length < 2) return;
    const step = 360 / remaining.length;
    // Fair draw: pick the eliminated book uniformly first, then aim the pointer at it.
    const index = Math.floor(Math.random() * remaining.length);
    const jitter = (Math.random() - 0.5) * step * 0.7;
    const target = (((-(index * step + step / 2 + jitter)) % 360) + 360) % 360;
    const current = ((rotation % 360) + 360) % 360;
    const reduced = prefersReducedMotion();
    const turns = reduced ? 0 : 4 + Math.floor(Math.random() * 3);
    const ms = reduced ? 300 : 4500;
    setDuration(ms);
    setAnimate(true);
    setSpinning(true);
    setRotation(rotation + ((target - current + 360) % 360) + turns * 360);
    if (!muted) {
      sounds.current.unlock();
      startTicks(step);
    }
    timer.current = setTimeout(() => {
      const out = remaining[index];
      cancelAnimationFrame(frame.current);
      if (!muted) {
        if (remaining.length === 2) sounds.current.win();
        else sounds.current.eliminate();
      }
      setAnimate(false);
      setRotation(0);
      setEliminated((prev) => [...prev, out]);
      setRemaining((prev) => prev.filter((b) => b.id !== out.id));
      setSpinning(false);
    }, ms + 200);
  };

  return (
    <div className='draw-page flex flex-col items-center px-2'>
      <h1 className='page-title'>Sorteo del próximo libro</h1>
      {winner ? (
        <div className='card result-card flex flex-col items-center justify-center text-center' role='status'>
          <h2 className='mb-3 text-2xl'>¡Próximo libro!</h2>
          {winner['imagen'] && <img className='cover-img my-1 w-32' src={winner['imagen']} alt={`Portada de ${winner['titulo']}`} />}
          <p className='mt-3 font-display text-lg font-bold'>{winner['titulo']}</p>
          <p className='text-muted'>{[winner['autor'], winner['n_paginas'] ? winner['n_paginas'] + ' páginas' : ''].filter(Boolean).join(' · ')}</p>
        </div>
      ) : (
        <>
          <Wheel books={remaining} rotation={rotation} duration={duration} animate={animate} svgRef={svg} />
          <div className='mt-4 flex items-center gap-2'>
            <Button variant='contained' color='primary' size='large' onClick={spin} disabled={spinning}>
              {spinning ? 'Girando…' : eliminated.length === 0 ? 'Girar la ruleta' : 'Eliminar otro libro'}
            </Button>
            <IconButton onClick={toggleMuted} aria-label={muted ? 'Activar sonido' : 'Silenciar'} aria-pressed={muted}>
              {muted ? <VolumeOffIcon /> : <VolumeUpIcon />}
            </IconButton>
          </div>
        </>
      )}
      {eliminated.length > 0 && (
        <section className='eliminated card mt-6' aria-labelledby='eliminados-title' aria-live='polite'>
          <h2 id='eliminados-title' className='mb-2 text-lg'>Eliminados</h2>
          <ol>
            {eliminated.map((book) => (
              <li key={book.id}>{book.titulo}</li>
            ))}
          </ol>
        </section>
      )}
      {(eliminated.length > 0) && (
        <div className='mt-4 mb-8'>
          <Button variant='outlined' color='primary' onClick={newDraw} disabled={spinning}>
            Reiniciar
          </Button>
        </div>
      )}
    </div>
  );
};

export default DrawBook;
