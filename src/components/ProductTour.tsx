import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS } from "react-joyride";
import { useTour } from "@/hooks/useTour";

const tourSteps: Step[] = [
  {
    target: "body",
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">Dobrodošli u Diadonum! 👋</h3>
        <p>
          Ova platforma vam pomaže da pronađete arbitražne prilike na kripto tržištima.
          Hajde da vam pokažemo kako sve funkcioniše.
        </p>
      </div>
    ),
    placement: "center",
    disableBeacon: true,
  },
  {
    target: '[data-tour="profit-calculator"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">💰 Kalkulator profita</h3>
        <p>
          Izračunajte potencijalnu zaradu na osnovu vaše investicije, perioda i leverage-a.
          Vidite koliko možete zaraditi pre nego što uložite.
        </p>
      </div>
    ),
    placement: "bottom",
  },
  {
    target: '[data-tour="funding-tab"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">📊 Funding Rates</h3>
        <p>
          Ovaj tab prikazuje trenutne stope finansiranja na svim berzama.
          Zelene stope = plaćate, crvene stope = dobijate.
        </p>
      </div>
    ),
    placement: "bottom",
  },
  {
    target: '[data-tour="funding-arb-tab"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">🔄 Funding Arbitrage</h3>
        <p>
          Ovde vidite mogućnosti za funding arbitražu - long na jednoj berzi gde plaćaju vama,
          short na drugoj gde vi plaćate manje. Razlika je vaš profit!
        </p>
      </div>
    ),
    placement: "bottom",
  },
  {
    target: '[data-tour="price-arb-tab"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">💹 Price Arbitrage</h3>
        <p>
          Price Arbitrage prikazuje cenovne razlike između berzi.
          Kupite jeftinije na jednoj, prodajte skuplje na drugoj.
        </p>
      </div>
    ),
    placement: "bottom",
  },
  {
    target: '[data-tour="risk-badge"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">🛡️ Risk Score</h3>
        <p>
          Svaka prilika je ocenjena po riziku:
        </p>
        <ul className="mt-2 text-sm">
          <li><span className="text-green-500 font-bold">Safe</span> - Nizak rizik, pouzdane berze</li>
          <li><span className="text-yellow-500 font-bold">Medium</span> - Srednji rizik</li>
          <li><span className="text-red-500 font-bold">High</span> - Visok rizik, budite oprezni</li>
        </ul>
      </div>
    ),
    placement: "left",
  },
  {
    target: '[data-tour="paper-trading"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">📝 Paper Trading</h3>
        <p>
          Testirajte strategije sa virtualnim novcem pre nego što rizikujete pravi kapital.
          Savršen način za učenje bez rizika!
        </p>
      </div>
    ),
    placement: "bottom",
  },
  {
    target: "body",
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2 text-destructive">⚠️ VAŽNO UPOZORENJE</h3>
        <p className="mb-3">
          <strong>Ovo NIJE finansijski savet.</strong>
        </p>
        <p className="mb-3">
          Trgovanje kriptovalutama nosi značajan rizik gubitka. Možete izgubiti DEO ili CELOKUPAN
          uloženi kapital.
        </p>
        <p className="text-sm text-muted-foreground">
          Pre trgovanja, pročitajte naše{" "}
          <a href="/risk-disclosure" className="text-primary underline">Upozorenje o riziku</a>.
        </p>
      </div>
    ),
    placement: "center",
  },
];

interface ProductTourProps {
  isRunning: boolean;
  onComplete: () => void;
  onSkip?: () => void;
}

export function ProductTour({ isRunning, onComplete, onSkip }: ProductTourProps) {
  const handleCallback = (data: CallBackProps) => {
    const { status, action, type } = data;
    
    // Tour finished or skipped
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      onComplete();
      return;
    }

    // Close button clicked
    if (action === ACTIONS.CLOSE && type === EVENTS.STEP_AFTER) {
      onSkip?.();
      onComplete();
    }
  };

  return (
    <Joyride
      steps={tourSteps}
      run={isRunning}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      spotlightClicks
      callback={handleCallback}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          backgroundColor: "hsl(var(--card))",
          textColor: "hsl(var(--foreground))",
          arrowColor: "hsl(var(--card))",
          overlayColor: "rgba(0, 0, 0, 0.7)",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: "0.5rem",
          padding: "1rem",
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
          borderRadius: "0.375rem",
          padding: "0.5rem 1rem",
        },
        buttonBack: {
          color: "hsl(var(--muted-foreground))",
          marginRight: "0.5rem",
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
        },
        spotlight: {
          borderRadius: "0.5rem",
        },
      }}
      locale={{
        back: "Nazad",
        close: "Zatvori",
        last: "Završi",
        next: "Dalje",
        skip: "Preskoči",
      }}
    />
  );
}

// Wrapper component that manages tour state
export function ProductTourWrapper() {
  const { isRunning, completeTour } = useTour();

  return <ProductTour isRunning={isRunning} onComplete={completeTour} />;
}
