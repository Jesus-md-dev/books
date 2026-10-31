import { useEffect, useId, useMemo, useState } from 'react';
import { useBooksActions } from '../data/BooksContext';

const MEMBER_KEY = 'bahia-lectora:socio';
const ENDPOINT = '/.netlify/functions/vote';

// -5 to 5 in steps of 0.25, best first.
const OPTIONS = Array.from({ length: 41 }, (_, index) => 5 - index * 0.25);
const formatVote = (value) => String(value).replace('.', ',');

function readSavedMember() {
    try {
        return localStorage.getItem(MEMBER_KEY) || '';
    } catch {
        return '';
    }
}

function saveMember(name) {
    try {
        localStorage.setItem(MEMBER_KEY, name);
    } catch {
        /* private mode or blocked storage: the choice is just not remembered */
    }
}

const sameName = (a, b) => String(a).trim().toLocaleLowerCase('es') === String(b).trim().toLocaleLowerCase('es');

/**
 * Form to rate a read book from the web. The sheet stays the source of truth:
 * the vote is written by the Netlify function and shown here at once.
 * @param {{ book: object }} props
 */
const RateBook = ({ book }) => {
    const { applyVote } = useBooksActions();
    const id = useId();
    const { titulo, votos = [] } = book;
    const [members, setMembers] = useState([]);
    // false when the function answers with an error (not configured yet, Google down): shows the maintenance notice.
    const [available, setAvailable] = useState(true);
    const [member, setMember] = useState(readSavedMember);
    const [rating, setRating] = useState('');
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState({ type: '', text: '' });

    // Members come from the sheet; the names that already voted are the fallback.
    // A failing endpoint means voting is not working right now.
    useEffect(() => {
        let active = true;
        fetch(ENDPOINT, { cache: 'no-store' })
            .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`))))
            .then((data) => { if (active && Array.isArray(data.socios)) setMembers(data.socios); })
            .catch((error) => {
                console.warn('[vote] No se pudo cargar la lista de socios:', error);
                if (active) setAvailable(false);
            });
        return () => { active = false; };
    }, []);

    const names = useMemo(() => (members.length ? members : votos.map((voto) => voto.nombre)), [members, votos]);
    const selected = names.find((name) => sameName(name, member)) || '';
    const currentVote = votos.find((voto) => selected && sameName(voto.nombre, selected));
    const currentValue = currentVote ? Number.parseFloat(String(currentVote.voto).replace(',', '.')) : null;

    // Pre-select the member's current vote when the member or the book changes.
    useEffect(() => {
        setRating(currentValue === null || Number.isNaN(currentValue) ? '' : String(currentValue));
    }, [selected, titulo, currentValue]);

    useEffect(() => { setStatus({ type: '', text: '' }); }, [selected, titulo]);

    const send = async (voto, honeypot = '') => {
        setSending(true);
        setStatus({ type: '', text: 'Enviando…' });
        try {
            const response = await fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ titulo, socio: selected, voto, web: honeypot }),
            });
            const result = await response.json().catch(() => ({}));
            if (response.status >= 502) setAvailable(false);
            if (!response.ok) throw new Error(result.error || `Error ${response.status}`);
            saveMember(selected);
            applyVote(titulo, selected, result.voto);
            setStatus({
                type: 'ok',
                text: result.voto === null ? 'Tu voto se ha quitado.' : `Voto guardado: ${formatVote(result.voto)}.`,
            });
        } catch (error) {
            setStatus({ type: 'error', text: error.message || 'No se pudo guardar el voto.' });
        } finally {
            setSending(false);
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!selected || rating === '') return;
        send(Number(rating), event.currentTarget.elements.web?.value);
    };

    if (!available) {
        return (
            <section className="mt-10 w-full max-w-md" aria-labelledby={`${id}-title`}>
                <h2 id={`${id}-title`} className="section-title">Puntúa este libro</h2>
                <p className="card text-left text-muted" role="status">
                    Estamos en mantenimiento: ahora mismo no se puede puntuar desde la web. Vuelve a intentarlo más tarde.
                </p>
            </section>
        );
    }

    return (
        <section className="mt-10 w-full max-w-md" aria-labelledby={`${id}-title`}>
            <h2 id={`${id}-title`} className="section-title">Puntúa este libro</h2>
            <form className="card flex flex-col gap-4 text-left" onSubmit={handleSubmit}>
                {/* Honeypot for bots: hidden from people and screen readers, never filled by the app. */}
                <input type="text" name="web" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
                <label className="flex flex-col gap-1 font-semibold" htmlFor={`${id}-socio`}>
                    Socio
                    <select
                        id={`${id}-socio`}
                        className="rounded-md border border-line bg-surface px-3 py-2 font-normal"
                        value={selected}
                        onChange={(event) => { setMember(event.target.value); }}
                        disabled={sending}
                    >
                        <option value="">Elige tu nombre</option>
                        {names.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                </label>
                <label className="flex flex-col gap-1 font-semibold" htmlFor={`${id}-nota`}>
                    Nota (de -5 a 5)
                    <select
                        id={`${id}-nota`}
                        className="rounded-md border border-line bg-surface px-3 py-2 font-normal"
                        value={rating}
                        onChange={(event) => setRating(event.target.value)}
                        disabled={sending || !selected}
                    >
                        <option value="">Elige una nota</option>
                        {OPTIONS.map((value) => <option key={value} value={String(value)}>{formatVote(value)}</option>)}
                    </select>
                </label>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="submit"
                        className="rounded-md bg-primary px-4 py-2 font-bold text-on-primary disabled:opacity-60"
                        disabled={sending || !selected || rating === ''}
                    >
                        {currentVote ? 'Cambiar mi voto' : 'Enviar mi voto'}
                    </button>
                    {currentVote && (
                        <button
                            type="button"
                            className="rounded-md border border-line px-4 py-2 font-semibold text-danger disabled:opacity-60"
                            disabled={sending}
                            onClick={() => send(null)}
                        >
                            Quitar mi voto
                        </button>
                    )}
                </div>
                <p
                    role="status"
                    aria-live="polite"
                    className={`min-h-[1.5em] text-sm ${status.type === 'error' ? 'font-semibold text-danger' : 'text-muted'}`}
                >
                    {status.text}
                </p>
            </form>
        </section>
    );
};

export default RateBook;
