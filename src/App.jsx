import { useCallback, useEffect, useState } from 'react';
import { DataProvider } from './store/DataContext.jsx';
import { Avatar, ToastProvider } from './components/ui.jsx';
import Gate from './views/Gate.jsx';
import StudentView from './views/StudentView.jsx';
import RecruiterView from './views/RecruiterView.jsx';
import PlacementCellView from './views/PlacementCellView.jsx';

const ROLE_LABEL = { student: 'Student', recruiter: 'Recruiter', cell: 'Placement cell' };
const STORE_KEY = 'spit-placement-session';

/* The chosen identity lives for this browser tab only. A new tab starts at the entry screen. */
const readSession = () => {
  try {
    return JSON.parse(window.sessionStorage.getItem(STORE_KEY));
  } catch {
    return null;
  }
};
const writeSession = (session) => {
  try {
    window.sessionStorage.setItem(STORE_KEY, JSON.stringify(session));
  } catch {
    /* private mode: the session simply will not survive a refresh */
  }
};

function Shell() {
  const [session, setSession] = useState(readSession);
  const [gateOpen, setGateOpen] = useState(() => !readSession());
  const [gateRun, setGateRun] = useState(0); // new run = the entry screen starts again from step one

  useEffect(() => {
    document.title = session ? `${session.name} | Placement Desk` : 'Placement Desk';
  }, [session]);

  const pick = useCallback((selection) => {
    setSession(selection);
    writeSession(selection);
  }, []);
  const closeGate = useCallback(() => setGateOpen(false), []);

  return (
    <div className="min-h-[100dvh]">
      {session && (
        // While the entry screen is open the page behind it is inert: no focus, no screen reader.
        <div inert={gateOpen}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-ink"
          >
            Skip to content
          </a>

          <header className="sticky top-0 z-20 bg-ink text-white">
            <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-8">
              <div className="flex min-w-0 items-baseline gap-3">
                <p className="truncate text-[15px] font-semibold">Placement Desk</p>
                <p className="hidden truncate text-[13px] text-white/55 md:block">Sardar Patel Institute of Technology, class of 2027</p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={session.name} size="sm" className="!bg-white !text-ink" />
                  <p className="hidden text-right leading-tight sm:block">
                    <span className="block text-[13px] font-medium">{session.name}</span>
                    <span className="block text-xs text-white/55">{ROLE_LABEL[session.role]}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setGateRun((n) => n + 1);
                    setGateOpen(true);
                  }}
                  className="h-8 rounded-md border border-white/20 px-3 text-[13px] text-white/85 transition-colors duration-150 hover:bg-white/10 hover:text-white focus-visible:ring-offset-ink"
                >
                  Switch user
                </button>
              </div>
            </div>
          </header>

          <main id="main" className="mx-auto max-w-[1280px] px-4 pb-24 pt-10 sm:px-8">
            <div key={`${session.role}-${session.id}`} className="page-in">
              {session.role === 'student' && <StudentView studentId={session.id} />}
              {session.role === 'recruiter' && <RecruiterView companyId={session.id} />}
              {session.role === 'cell' && <PlacementCellView />}
            </div>
          </main>
        </div>
      )}

      {gateOpen && <Gate key={gateRun} onPick={pick} onDone={closeGate} />}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <DataProvider>
        <Shell />
      </DataProvider>
    </ToastProvider>
  );
}
