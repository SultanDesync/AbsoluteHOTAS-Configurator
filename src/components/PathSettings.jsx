import React from "react";

export function PathSettings({
  iniPath,
  setIniPath,
  controlMapPath,
  setControlMapPath,
  browseIniPath,
  browseControlMapPath,
  loadIni,
  saveIni,
  profileName,
  setProfileName,
  loadBackup,
  createBackup
}) {
  return (
    <section className="profile-deployment-panel">
      <div className="deployment-paths-column">
        <h3>Profile & Target Paths</h3>
        
        <div className="profile-name-group">
          <label htmlFor="profileName">Active Profile Name</label>
          <input
            id="profileName"
            value={profileName}
            onChange={(event) => setProfileName(event.target.value)}
            placeholder="e.g. HOSAS, HOTAS, Gamepad"
            spellCheck="false"
            className="profile-name-input"
          />
        </div>
        
        <div className="path-inputs">
          <div className="path-group">
            <label htmlFor="iniPath">AbsoluteHOTAS.ini Path</label>
            <div className="input-with-btn">
              <input
                id="iniPath"
                value={iniPath}
                onChange={(event) => setIniPath(event.target.value)}
                spellCheck="false"
              />
              <button type="button" onClick={browseIniPath} className="btn-secondary">Browse</button>
            </div>
          </div>
          <div className="path-group">
            <label htmlFor="controlMapPath">ControlMapCustom Path</label>
            <div className="input-with-btn">
              <input
                id="controlMapPath"
                value={controlMapPath}
                onChange={(event) => setControlMapPath(event.target.value)}
                spellCheck="false"
              />
              <button type="button" onClick={browseControlMapPath} className="btn-secondary">Browse</button>
            </div>
          </div>
        </div>
      </div>

      <div className="actions-column">
        <div className="action-card">
          <h4>Backups & Profiles</h4>
          <p className="card-desc">Save your configurations safely outside game directories or load an external profile layout.</p>
          <div className="btn-group">
            <button type="button" onClick={loadBackup} className="btn-action btn-secondary">Load Backup</button>
            <button type="button" onClick={createBackup} className="btn-action btn-secondary">Create Backup</button>
          </div>
        </div>

        <div className="action-card live-deployment">
          <h4>Game Live Deploy</h4>
          <p className="card-desc">Apply your active settings directly into Starfield's core folders so they take effect in-game.</p>
          <div className="btn-group">
            <button type="button" onClick={loadIni} className="btn-action btn-secondary">Reload Live Config</button>
            <button type="button" onClick={saveIni} className="btn-action btn-primary">Deploy to Game</button>
          </div>
        </div>
      </div>
    </section>
  );
}
