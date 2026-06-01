import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (opts: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export interface LoginProps {
  onSuccess: (idToken: string) => void;
  initialError?: string | null;
}

export function Login({ onSuccess, initialError }: LoginProps) {
  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
  const btnRef = useRef<HTMLDivElement>(null);
  const [error] = useState<string | null>(initialError ?? null);

  useEffect(() => {
    if (!clientId) return;
    const id = "g-identity-script";
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = id;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const init = () => {
      if (!window.google?.accounts?.id || !btnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response?.credential) onSuccess(response.credential);
        },
      });
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "rectangular",
        width: 280,
      });
    };

    if (window.google?.accounts?.id) init();
    else script.addEventListener("load", init);
    return () => script.removeEventListener("load", init);
  }, [clientId, onSuccess]);

  return (
    <div className="login-screen">
      <div className="login-card">
        <img
          src="https://casavertical.biomainc.com.br/wp-content/uploads/2024/11/Layer_1.png"
          alt="Casa Vertical"
          className="login-logo"
        />
        <h1 className="login-title">Dashboard Bioma</h1>
        <p className="login-subtitle">
          Faça login com seu Google corporativo. Acesso restrito ao time autorizado.
        </p>

        {!clientId && (
          <div className="login-error">
            <strong>VITE_GOOGLE_CLIENT_ID</strong> não está configurada no build.
            Adicione a env var no Vercel.
          </div>
        )}

        {error && <div className="login-error">{error}</div>}

        <div ref={btnRef} className="login-button-slot" />

        <p className="login-footnote">
          Problemas? Solicite ao admin que adicione seu email à lista autorizada.
        </p>
      </div>
    </div>
  );
}
