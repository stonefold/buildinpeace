function WorkspaceLoader({
  eyebrow = 'Workspace',
  title = 'Build In Peace',
  message = 'Chargement en cours...',
  detail = 'Synchronisation des espaces, discussions et donnees chantier.',
}) {
  return (
    <main className="workspace-auth-screen workspace-loader-screen">
      <section className="workspace-auth-card workspace-loader-card">
        <div className="workspace-loader-visual" aria-hidden="true">
          <div className="workspace-loader-orbit workspace-loader-orbit-outer" />
          <div className="workspace-loader-orbit workspace-loader-orbit-inner" />
          <div className="workspace-loader-core">
            <img src="/assets/logo.jfif" alt="" className="workspace-loader-logo" />
          </div>
          <div className="workspace-loader-pulse workspace-loader-pulse-one" />
          <div className="workspace-loader-pulse workspace-loader-pulse-two" />
        </div>

        <div className="workspace-loader-copy">
          <span className="workspace-loader-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{message}</p>
          <small>{detail}</small>
        </div>

        <div className="workspace-loader-status" aria-hidden="true">
          <div className="workspace-loader-bar">
            <span className="workspace-loader-bar-fill" />
          </div>
          <div className="workspace-loader-steps">
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>
    </main>
  );
}

export default WorkspaceLoader;
