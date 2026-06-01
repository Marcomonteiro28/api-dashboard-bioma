export function Header() {
  return (
    <header>
      <div className="brand-bar">
        <img
          src="https://casavertical.biomainc.com.br/wp-content/uploads/2024/11/Layer_1.png"
          alt="Casa Vertical"
          className="brand-logo"
        />
        <img
          src="https://casavertical.biomainc.com.br/wp-content/uploads/2024/11/Group-16921.svg"
          alt=""
          className="brand-mark"
          aria-hidden="true"
        />
      </div>
      <div className="hero">
        <div className="hero-content">
          <p className="hero-eyebrow">Bioma - Casa Vertical - Morá</p>
          <h1>Performance do Funil</h1>
          <p className="subtitle">
            ActiveCampaign · pipeline pré-vendas + vendas · dados ao vivo via API
          </p>
        </div>
      </div>
    </header>
  );
}
