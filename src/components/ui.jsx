import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, CheckCircle2, Plus, X, XCircle } from 'lucide-react';

/*
 * Shape rule, applied everywhere:
 *   sheets and dialogs -> 10px
 *   buttons and inputs -> 6px
 *   status tags        -> full pill
 */

export const cn = (...parts) => parts.filter(Boolean).join(' ');

/* ----------------------------------------------------------------- Button */

const BUTTON_VARIANTS = {
  primary:
    'border border-accent bg-accent text-white hover:bg-accent-strong hover:border-accent-strong disabled:border-rule disabled:bg-rule disabled:text-ink-2',
  secondary:
    'border border-rule-strong bg-white text-ink hover:border-ink-3 hover:bg-paper disabled:text-ink-3 disabled:hover:bg-white disabled:hover:border-rule-strong',
  ghost: 'border border-transparent text-ink-2 hover:bg-ink/[0.05] hover:text-ink disabled:text-ink-3',
  danger: 'border border-bad/40 bg-white text-bad hover:bg-bad-soft hover:border-bad/60',
};

const BUTTON_SIZES = {
  sm: 'h-8 gap-1.5 px-3 text-[13px]',
  md: 'h-9 gap-2 px-3.5 text-sm',
  lg: 'h-10 gap-2 px-4 text-sm',
};

export const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', icon: Icon, className, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md font-medium',
        'transition-[background-color,border-color,color,transform] duration-150 ease-out',
        'active:translate-y-px disabled:cursor-not-allowed disabled:active:translate-y-0',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />}
      {children}
    </button>
  );
});

export const IconButton = forwardRef(function IconButton({ label, icon: Icon, className, size = 'md', ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md border border-transparent text-ink-2',
        'transition-[background-color,border-color,color] duration-150 ease-out',
        'hover:border-rule hover:bg-paper hover:text-ink disabled:pointer-events-none disabled:opacity-30',
        size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
        className,
      )}
      {...props}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
});

/* ------------------------------------------------------------------ Sheet */

export function Sheet({ as: Tag = 'section', className, children, ...props }) {
  return (
    <Tag className={cn('sheet', className)} {...props}>
      {children}
    </Tag>
  );
}

export function SheetHeader({ title, description, action, className, titleAs: Title = 'h2', id }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-5 pt-5', className)}>
      <div className="min-w-0">
        <Title id={id} className="text-[15px] font-semibold text-ink">
          {title}
        </Title>
        {description && <p className="mt-0.5 max-w-[60ch] text-[13px] leading-5 text-ink-2">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* -------------------------------------------------------------------- Tag */

const TAG_TONES = {
  ok: 'bg-ok-soft text-ok',
  bad: 'bg-bad-soft text-bad',
  warn: 'bg-warn-soft text-warn',
  accent: 'bg-accent-soft text-accent-strong',
  neutral: 'bg-ink/[0.06] text-ink-2',
};

export function Tag({ tone = 'neutral', icon: Icon, className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
        TAG_TONES[tone],
        className,
      )}
    >
      {Icon && <Icon className="h-3 w-3" strokeWidth={2.25} aria-hidden="true" />}
      {children}
    </span>
  );
}

/* ---------------------------------------------------------- Avatar, marks */

const hashString = (value) => [...value].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);

const MARK_TINTS = [
  'bg-[#E3E8F4] text-[#23365F]',
  'bg-[#E2EEEA] text-[#1D4A3A]',
  'bg-[#F1E8DC] text-[#5C3D17]',
  'bg-[#EDE4E6] text-[#5B2A33]',
  'bg-[#E5E9EC] text-[#2C3A45]',
];

const initialsOf = (name) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

export function Avatar({ name, size = 'md', className }) {
  const sizing = { sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-xs', lg: 'h-12 w-12 text-base' }[size];
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        MARK_TINTS[hashString(name) % MARK_TINTS.length],
        sizing,
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}

export function CompanyMark({ name, size = 'md' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md border border-ink/10 font-semibold',
        MARK_TINTS[hashString(name) % MARK_TINTS.length],
        size === 'lg' ? 'h-10 w-10 text-base' : 'h-8 w-8 text-sm',
      )}
    >
      {name[0]}
    </span>
  );
}

/* ------------------------------------------------------------ Form pieces */

export function Field({ label, hint, error, htmlFor, children, className, action }) {
  const LabelTag = htmlFor ? 'label' : 'p';
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <LabelTag htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
          {label}
        </LabelTag>
        {action}
      </div>
      {children}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="flex items-center gap-1.5 text-xs text-bad">
          <XCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="text-xs leading-5 text-ink-2">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function PillMultiSelect({ label, options, value, onChange, allowCustom = false, customLabel = 'Add another', error, id }) {
  const [draft, setDraft] = useState('');
  const known = useMemo(() => new Set(options), [options]);
  const all = [...options, ...value.filter((item) => !known.has(item))];

  const toggle = (item) => onChange(value.includes(item) ? value.filter((v) => v !== item) : [...value, item]);

  const commit = () => {
    const clean = draft.trim();
    if (!clean) return;
    const existing = all.find((item) => item.toLowerCase() === clean.toLowerCase()) || clean;
    if (!value.includes(existing)) onChange([...value, existing]);
    setDraft('');
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        id={id}
        role="group"
        tabIndex={-1}
        aria-label={label}
        aria-invalid={error ? 'true' : undefined}
        className="flex flex-wrap gap-1.5"
      >
        {all.map((item) => {
          const active = value.includes(item);
          return (
            <button
              key={item}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(item)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px]',
                'transition-[background-color,border-color,color] duration-150 ease-out',
                active ? 'border-accent bg-accent text-white' : 'border-rule-strong bg-white text-ink hover:border-ink-3',
              )}
            >
              {active && <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />}
              {item}
            </button>
          );
        })}
      </div>
      {allowCustom && (
        <div className="flex items-center gap-2">
          <input
            className="field max-w-[15rem]"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commit();
              }
            }}
            placeholder={customLabel}
            aria-label={customLabel}
            autoComplete="off"
            spellCheck={false}
          />
          <Button icon={Plus} onClick={commit} disabled={!draft.trim()}>
            Add
          </Button>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------- Segmented and underline tabs */

const useArrowKeys = (options, value, onChange) => {
  const refs = useRef([]);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const onKeyDown = (event) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };
  return { refs, index, onKeyDown };
};

/** Boxed toggle for filters and small choices. */
export function Segmented({ label, options, value, onChange, className, stretch = false }) {
  const { refs, onKeyDown } = useArrowKeys(options, value, onChange);
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        'rounded-md border border-rule-strong bg-white p-0.5',
        stretch ? 'flex w-full' : 'inline-flex',
        className,
      )}
    >
      {options.map((option, i) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-7 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded px-3 text-[13px]',
              'transition-colors duration-150 ease-out',
              active ? 'bg-ink text-white' : 'text-ink-2 hover:bg-paper hover:text-ink',
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={cn('figure text-xs', active ? 'text-white/70' : 'text-ink-3')}>{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Underlined tabs. The indicator slides between tabs, measured from the DOM. */
export function Tabs({ label, options, value, onChange, tone = 'light', className, collapseLabels = false }) {
  const { refs, index, onKeyDown } = useArrowKeys(options, value, onChange);
  const [bar, setBar] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current[index];
      if (el) setBar({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    const fonts = document.fonts;
    fonts?.ready.then(measure);
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [index, refs, options]);

  const dark = tone === 'dark';

  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className={cn('relative flex', className)}>
      {options.map((option, i) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative inline-flex h-12 items-center gap-2 whitespace-nowrap px-3 text-sm',
              'transition-colors duration-150 ease-out',
              dark
                ? active
                  ? 'font-medium text-white'
                  : 'text-white/60 hover:text-white'
                : active
                  ? 'font-medium text-ink'
                  : 'text-ink-2 hover:text-ink',
              dark && 'focus-visible:ring-offset-ink',
            )}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />}
            <span className={collapseLabels ? 'sr-only sm:not-sr-only' : undefined}>{option.label}</span>
            {option.count !== undefined && option.count > 0 && (
              <span
                className={cn(
                  'figure rounded-full px-1.5 text-xs',
                  option.tone === 'warn' ? 'bg-warn-soft text-warn' : 'bg-ink/[0.07] text-ink-2',
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute bottom-0 left-0 h-[3px] transition-[transform,width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          dark ? 'bg-white' : 'bg-accent',
        )}
        style={{ width: bar.width, transform: `translateX(${bar.left}px)` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------ Empty state */

export function EmptyState({ icon: Icon, title, body, action, className }) {
  return (
    <div className={cn('flex flex-col items-start px-5 py-10', className)}>
      <Icon className="h-5 w-5 text-ink-3" strokeWidth={1.5} aria-hidden="true" />
      <h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] leading-5 text-ink-2">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ Modal */

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, description, children, footer, width = 'max-w-lg' }) {
  const panelRef = useRef(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = window.setTimeout(() => {
      const target = panelRef.current?.querySelector('[data-autofocus]') || panelRef.current?.querySelector(FOCUSABLE);
      (target || panelRef.current)?.focus();
    }, 20);

    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const nodes = [...panelRef.current.querySelectorAll(FOCUSABLE)];
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[90dvh] w-full animate-pop-in flex-col rounded-t-sheet border border-rule bg-sheet',
          'shadow-[0_24px_60px_-20px_rgb(var(--ink)/0.45)] sm:rounded-sheet',
          width,
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-ink">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-[13px] leading-5 text-ink-2">
                {description}
              </p>
            )}
          </div>
          <IconButton label="Close dialog" icon={X} size="sm" onClick={onClose} />
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-rule px-5 py-5">
          {children}
        </div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-rule px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------- Menu */

export function Menu({ label, icon: TriggerIcon, items }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();
  const width = 240;

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    const estimated = items.length * 54 + 10;
    const up = rect.bottom + estimated > window.innerHeight - 8 && rect.top > estimated;
    setPosition({ left, top: up ? rect.top - estimated - 6 : rect.bottom + 6 });
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return undefined;
    menuRef.current?.querySelector('[role="menuitem"]:not([disabled])')?.focus();
    const onPointer = (event) => {
      if (menuRef.current?.contains(event.target) || triggerRef.current?.contains(event.target)) return;
      close(false);
    };
    const onDismiss = () => close(false);
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('resize', onDismiss);
    window.addEventListener('scroll', onDismiss, true);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('resize', onDismiss);
      window.removeEventListener('scroll', onDismiss, true);
    };
  }, [open, close]);

  const onMenuKey = (event) => {
    const nodes = [...menuRef.current.querySelectorAll('[role="menuitem"]:not([disabled])')];
    const current = nodes.indexOf(document.activeElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      nodes[(current + 1) % nodes.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      nodes[(current - 1 + nodes.length) % nodes.length]?.focus();
    } else if (event.key === 'Tab') {
      close(false);
    }
  };

  return (
    <>
      <IconButton
        ref={triggerRef}
        label={label}
        icon={TriggerIcon}
        size="sm"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={open ? 'border-rule bg-paper text-ink' : undefined}
      />
      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={onMenuKey}
            style={{ top: position.top, left: position.left, width }}
            className="fixed z-30 animate-pop-in rounded-sheet border border-rule bg-sheet p-1 shadow-[0_16px_40px_-16px_rgb(var(--ink)/0.4)]"
          >
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    close(false);
                    item.onSelect();
                  }}
                  className={cn(
                    'flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors duration-100',
                    'hover:bg-paper focus-visible:bg-paper focus-visible:ring-0 focus-visible:ring-offset-0',
                    'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent',
                  )}
                >
                  <Icon
                    className={cn('mt-0.5 h-4 w-4 shrink-0', item.accent ? 'text-accent' : 'text-ink-2')}
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-ink">{item.label}</span>
                    {item.hint && <span className="mt-0.5 block text-xs leading-4 text-ink-2">{item.hint}</span>}
                  </span>
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}

/* ------------------------------------------------------------------ Toast */

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);
  const dismiss = useCallback((id) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (message, tone = 'success') => {
      counter.current += 1;
      const id = counter.current;
      setToasts((all) => [...all.slice(-2), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex max-w-md animate-pop-in items-start gap-3 rounded-sheet bg-ink py-3 pl-4 pr-2 text-white shadow-[0_16px_40px_-12px_rgb(var(--ink)/0.6)]"
          >
            {toast.tone === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#86D7AE]" strokeWidth={2} aria-hidden="true" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#F2A39B]" strokeWidth={2} aria-hidden="true" />
            )}
            <p className="text-[13px] leading-5">{toast.message}</p>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(toast.id)}
              className="rounded p-1 text-white/60 transition-colors hover:text-white focus-visible:ring-offset-ink"
            >
              <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context.push;
}

/* ------------------------------------------------------------- Mini parts */

/** A labelled figure for rows of figures separated by rules. Must sit inside a <dl>. */
export function Figure({ label, value, caption, tone, size = 'md', className }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-xs text-ink-2">{label}</dt>
      <dd
        className={cn(
          'figure mt-1 font-medium',
          size === 'lg' ? 'text-3xl sm:text-[2.5rem] sm:leading-none' : 'text-2xl',
          tone === 'warn' ? 'text-warn' : tone === 'accent' ? 'text-accent' : 'text-ink',
        )}
      >
        {value}
      </dd>
      {caption && <dd className="mt-1.5 text-xs leading-5 text-ink-2">{caption}</dd>}
    </div>
  );
}

export function SkillChip({ children, state = 'neutral' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs',
        state === 'neutral' && 'border-rule-strong bg-white text-ink',
        state === 'matched' && 'border-ok/25 bg-ok-soft text-ok',
        state === 'missing' && 'border-dashed border-bad/50 bg-white text-bad',
      )}
    >
      {state === 'matched' && <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />}
      {state === 'missing' && <X className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />}
      {children}
    </span>
  );
}

/* ---------------------------------------------------- Loading and failure */

export function Skeleton({ className }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-ink/[0.07]', className)} />;
}

/** Shaped like the page it stands in for, so nothing jumps when data arrives. */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-8">
      <Skeleton className="h-14 w-2/3 max-w-xl" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function ErrorNote({ error }) {
  return (
    <div role="alert" className="sheet flex items-start gap-3 p-5">
      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-bad" strokeWidth={1.75} aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-ink">The database did not answer</p>
        <p className="mt-1 text-[13px] leading-5 text-ink-2">
          {error?.message || 'Unknown error.'} Start the API with <span className="figure">npm run dev</span> and check the
          password in <span className="figure">.env</span>.
        </p>
      </div>
    </div>
  );
}
